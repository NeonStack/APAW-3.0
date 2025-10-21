import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_KEY } from '$env/static/private';
import { json } from '@sveltejs/kit';

export async function GET({ request }) {
	const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
	const url = new URL(request.url);
	const location = url.searchParams.get('location');

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

	// List of all location names
	const locations = [
		'Manila',
		'Mandaluyong',
		'Marikina',
		'Pasig',
		'Quezon City',
		'San Juan',
		'Caloocan (North)',
		'Caloocan (South)',
		'Malabon',
		'Navotas',
		'Valenzuela',
		'Las Piñas',
		'Makati',
		'Muntinlupa',
		'Parañaque',
		'Pasay',
		'Pateros',
		'Taguig'
	];

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
		query = query.in('location_name', locations).order('location_name', { ascending: true });
	}

	const { data, error } = await query;

	if (error) {
		console.log(error);
		return json({ error: error.message }, { status: 500 });
	}

	return json(data);
}
