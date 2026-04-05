import { json } from '@sveltejs/kit';
import {
	SUPABASE_URL,
	SUPABASE_SERVICE_KEY,
	VISUAL_CROSSING_API_KEY,
	JOB_TRIGGER_SECRET
} from '$env/static/private';
import { getSupabaseServiceClient } from '$lib/server/supabaseClient.js';
import { METRO_MANILA_COORDINATES } from '$lib/constants/metroManila.js';

// --- CONFIGURATION ---
function getMissingConfig() {
	const missing = [];
	if (!SUPABASE_URL) missing.push('SUPABASE_URL');
	if (!SUPABASE_SERVICE_KEY) missing.push('SUPABASE_SERVICE_KEY');
	if (!VISUAL_CROSSING_API_KEY) missing.push('VISUAL_CROSSING_API_KEY');
	if (!JOB_TRIGGER_SECRET) missing.push('JOB_TRIGGER_SECRET');
	return missing;
}
const TARGET_TABLE = 'hourly_weather_forecasts';

export async function POST({ request }) {
	const requestId = globalThis.crypto?.randomUUID?.() ?? `req-${Date.now()}`;
	console.log(`[update-weather][${requestId}] Incoming POST request`);

	const missingConfig = getMissingConfig();
	if (missingConfig.length > 0) {
		console.error(
			`[update-weather][${requestId}] Missing required environment variables: ${missingConfig.join(', ')}`
		);
		return json(
			{
				error: 'Server misconfiguration',
				details: `Missing required env vars: ${missingConfig.join(', ')}`
			},
			{ status: 500 }
		);
	}

	// 1. --- SECURITY CHECK ---
	const authHeader = request.headers.get('Authorization');
	if (authHeader !== `Bearer ${JOB_TRIGGER_SECRET}`) {
		console.warn(
			`[update-weather][${requestId}] Unauthorized request. Authorization header present: ${Boolean(authHeader)}`
		);
		return json({ error: 'Unauthorized: Invalid or missing secret token.' }, { status: 401 });
	}

	console.log(
		`[update-weather][${requestId}] Job trigger authorized. Starting weather data update...`
	);
	const jobSummary = [];
	const supabase = getSupabaseServiceClient();
	if (!supabase) {
		console.error(`[update-weather][${requestId}] Failed to initialize Supabase client.`);
		return json({ error: 'Supabase client initialization failed.' }, { status: 500 });
	}

	try {
		for (const location of METRO_MANILA_COORDINATES) {
			console.log(`[update-weather][${requestId}] Processing location: ${location.name}`);

			// 2. --- FETCH DATA FROM VISUAL CROSSING ---
			// The API URL now includes `&include=hours` to ensure we get hourly details
			const apiUrl = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${location.lat}%2C%20${location.lon}?unitGroup=metric&include=hours&key=${VISUAL_CROSSING_API_KEY}&contentType=json`;
			const response = await fetch(apiUrl);
			if (!response.ok) {
				const responseBody = await response.text();
				console.error(
					`[update-weather][${requestId}] Visual Crossing API error for ${location.name}: ${response.status} ${response.statusText}. Body: ${responseBody.slice(0, 300)}`
				);
				jobSummary.push({
					location: location.name,
					status: 'api_error',
					message: `${response.status} ${response.statusText}`
				});
				continue;
			}
			const data = await response.json();

			// 3. --- DELETE EXISTING FORECAST FOR THE SAME PERIOD ---
			// We'll fetch a 5-day forecast, so we delete the next 5 days of data
			const fiveDaysOfForecasts = data.days.slice(0, 5);
			if (fiveDaysOfForecasts.length === 0) {
				console.log(`No forecast data returned for ${location.name}. Skipping.`);
				jobSummary.push({ location: location.name, status: 'no_data' });
				continue;
			}

			const startDate = fiveDaysOfForecasts[0].datetime;
			const endDate = fiveDaysOfForecasts[fiveDaysOfForecasts.length - 1].datetime;

			const endDatePlusOne = new Date(endDate);
			endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
			const endDatePlusOneStr = endDatePlusOne.toISOString().split('T')[0]; // Calculate the next day string

			console.log(
				`[update-weather][${requestId}] Deleting existing forecast for ${location.name} from ${startDate} to ${endDatePlusOneStr}...`
			);
			const { error: deleteError } = await supabase
				.from(TARGET_TABLE)
				.delete()
				.eq('location_name', location.name)
				.gte('datetime', startDate) // e.g., '2025-09-28'
				.lt('datetime', endDatePlusOneStr); // e.g., '2025-10-03'

			if (deleteError) {
				throw new Error(`Supabase delete error for ${location.name}: ${deleteError.message}`);
			}

			// 4. --- TRANSFORM AND UPSERT NEW DATA (WITH ENRICHED FIELDS) ---
			const recordsToUpsert = [];
			for (const day of fiveDaysOfForecasts) {
				for (const hour of day.hours) {
					recordsToUpsert.push({
						// --- Core Model Features ---
						location_name: location.name,
						latitude: location.lat,
						longitude: location.lon,
						datetime: `${day.datetime}T${hour.datetime}`,
						temp_c: hour.temp,
						feelslike_c: hour.feelslike,
						humidity: hour.humidity,
						precip_mm: hour.precip,
						windspeed_kmh: hour.windspeed,
						pressure_mb: hour.pressure,
						cloudcover: hour.cloudcover,

						// --- NEW: User-Facing Display Features ---
						conditions: hour.conditions,
						icon: hour.icon,
						precipprob: hour.precipprob,
						windgust_kmh: hour.windgust,
						uvindex: hour.uvindex,
						solarradiation: hour.solarradiation
					});
				}
			}

			if (recordsToUpsert.length > 0) {
				const { error: upsertError } = await supabase.from(TARGET_TABLE).upsert(recordsToUpsert);
				if (upsertError) {
					throw new Error(`Supabase upsert error for ${location.name}: ${upsertError.message}`);
				}
				jobSummary.push({
					location: location.name,
					status: 'success',
					records_processed: recordsToUpsert.length
				});
				console.log(
					`[update-weather][${requestId}] Successfully updated ${recordsToUpsert.length} records for ${location.name}.`
				);
			}
		}

		// 5. --- LONG-TERM DATA RETENTION ---
		const threeYearsAgo = new Date();
		threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
		await supabase.from(TARGET_TABLE).delete().lt('datetime', threeYearsAgo.toISOString());
		console.log(`[update-weather][${requestId}] Successfully pruned data older than 3 years.`);
		jobSummary.push({ task: 'pruning', status: 'success' });
		console.log(`[update-weather][${requestId}] Job completed successfully.`);

		return json(
			{ message: 'Weather data update job completed.', summary: jobSummary },
			{ status: 200 }
		);
	} catch (error) {
		console.error(`[update-weather][${requestId}] A critical error occurred in the webhook:`, {
			message: error.message,
			stack: error.stack
		});
		return json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
	}
}
