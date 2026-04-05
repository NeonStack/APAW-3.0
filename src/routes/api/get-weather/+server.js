import { json } from '@sveltejs/kit';
import { consumeRequestRateLimit } from '$lib/utils/api/requestRateLimiter.js';
import { createRateLimitResponse } from '$lib/utils/api/rateLimitResponse.js';
import { getSupabaseServiceClient } from '$lib/server/supabaseClient.js';
import { METRO_MANILA_LOCATION_NAMES } from '$lib/constants/metroManila.js';

export async function GET({ request, getClientAddress }) {
	const supabase = getSupabaseServiceClient();
	const url = new URL(request.url);
	const location = url.searchParams.get('location');

	const rateLimitVerdict = consumeRequestRateLimit({
		request,
		getClientAddress,
		scope: location ? 'api:get-weather:location' : 'api:get-weather:summary',
		maxRequests: location ? 20 : 10,
		windowMs: 60 * 1000
	});

	if (!rateLimitVerdict.allowed) {
		return createRateLimitResponse(rateLimitVerdict);
	}

	// Get current date in Manila timezone
	const today = new Date();

	// Format to Manila timezone (UTC+8)
	const manilaOffset = 8 * 60; // 8 hours in minutes
	const localTime = new Date(today.getTime() + manilaOffset * 60 * 1000);

	// Set to start of day
	localTime.setUTCHours(0, 0, 0, 0);

	// If specific location requested, return 5 days; otherwise just today
	const endDate = new Date(localTime);
	if (location) {
		endDate.setDate(localTime.getDate() + 5); // 5 days ahead for specific location
	} else {
		endDate.setDate(localTime.getDate() + 1); // Just today for all locations
	}

	// Build query
	let query = supabase
		.from('hourly_weather_forecasts')
		.select('*')
		.gte('datetime', localTime.toISOString().split('T')[0])
		.lt('datetime', endDate.toISOString().split('T')[0])
		.order('datetime', { ascending: true });

	// Filter by location if specified
	if (location) {
		query = query.eq('location_name', location);
	} else {
		query = query
			.in('location_name', METRO_MANILA_LOCATION_NAMES)
			.order('location_name', { ascending: true });
	}

	const { data, error } = await query;

	if (error) {
		console.log(error);
		return json({ error: error.message }, { status: 500 });
	}

	return json(data);
}
