import { createClient } from '@supabase/supabase-js';
import { json } from '@sveltejs/kit';

// --- CONFIGURATION ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const VISUAL_CROSSING_API_KEY = process.env.VISUAL_CROSSING_API_KEY;
const JOB_TRIGGER_SECRET = process.env.JOB_TRIGGER_SECRET;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const NCR_LOCATIONS = [
	{ name: 'Manila', lat: 14.604595, lon: 120.982569 },
	{ name: 'Mandaluyong', lat: 14.582112, lon: 121.039043 },
	{ name: 'Marikina', lat: 14.64806, lon: 121.104192 },
	{ name: 'Pasig', lat: 14.572916, lon: 121.081955 },
	{ name: 'Quezon City', lat: 14.649734, lon: 121.039224 },
	{ name: 'San Juan', lat: 14.602108, lon: 121.035626 },
	{ name: 'Caloocan (North)', lat: 14.761262, lon: 121.045706 },
	{ name: 'Caloocan (South)', lat: 14.651013, lon: 120.980904 },
	{ name: 'Malabon', lat: 14.67242, lon: 120.957245 },
	{ name: 'Navotas', lat: 14.666291, lon: 120.941 },
	{ name: 'Valenzuela', lat: 14.707549, lon: 120.982046 },
	{ name: 'Las Piñas', lat: 14.443451, lon: 120.994801 },
	{ name: 'Makati', lat: 14.551987, lon: 121.024302 },
	{ name: 'Muntinlupa', lat: 14.402166, lon: 121.030928 },
	{ name: 'Parañaque', lat: 14.473714, lon: 121.020472 },
	{ name: 'Pasay', lat: 14.534401, lon: 121.001278 },
	{ name: 'Pateros', lat: 14.54508, lon: 121.069831 },
	{ name: 'Taguig', lat: 14.517084, lon: 121.0572 }
];

const TARGET_TABLE = 'hourly_weather_forecasts';

export async function POST({ request }) {
	// 1. --- SECURITY CHECK ---
	const authHeader = request.headers.get('Authorization');
	if (authHeader !== `Bearer ${JOB_TRIGGER_SECRET}`) {
		return json({ error: 'Unauthorized: Invalid or missing secret token.' }, { status: 401 });
	}

	console.log('Job Trigger authorized. Starting weather data update...');
	const jobSummary = [];

	try {
		for (const location of NCR_LOCATIONS) {
			// 2. --- FETCH DATA FROM VISUAL CROSSING ---
			// The API URL now includes `&include=hours` to ensure we get hourly details
			const apiUrl = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${location.lat}%2C%20${location.lon}?unitGroup=metric&include=hours&key=${VISUAL_CROSSING_API_KEY}&contentType=json`;
			const response = await fetch(apiUrl);
			if (!response.ok) {
				console.error(`Visual Crossing API error for ${location.name}: ${response.statusText}`);
				jobSummary.push({
					location: location.name,
					status: 'api_error',
					message: response.statusText
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
				`Deleting existing forecast for ${location.name} from ${startDate} to ${endDatePlusOneStr}...`
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
				console.log(`Successfully updated ${recordsToUpsert.length} records for ${location.name}.`);
			}
		}

		// 5. --- LONG-TERM DATA RETENTION ---
		const threeYearsAgo = new Date();
		threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
		await supabase.from(TARGET_TABLE).delete().lt('datetime', threeYearsAgo.toISOString());
		console.log('Successfully pruned data older than 3 years.');
		jobSummary.push({ task: 'pruning', status: 'success' });

		return json(
			{ message: 'Weather data update job completed.', summary: jobSummary },
			{ status: 200 }
		);
	} catch (error) {
		console.error('A critical error occurred in the webhook:', error.message);
		return json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
	}
}
