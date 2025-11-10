import { json } from '@sveltejs/kit';
// We no longer need the Gradio client!
// import { Client } from '@gradio/client';
import { APAW_HF_API_KEY, VITE_HF_TOKEN } from '$env/static/private';

// The URL of your Hugging Face Space API
// Replace 'HunterExist2/apaw-hourly' with your space name
const API_URL = 'https://hunterexist2-apaw-hourly-docker-2.hf.space/predict_flood_with_data';

export async function POST({ request }) {
	const body = await request.json();
	const { lat, lng, date, elevation, water_station_data } = body;

	if (!lat || !lng) {
		return json({ error: 'Latitude and longitude parameters are required' }, { status: 400 });
	}

	if (!VITE_HF_TOKEN || !APAW_HF_API_KEY) {
		return json({ error: 'Configuration error: Server API keys not found' }, { status: 500 });
	}

	try {
		console.log(`Calling FastAPI endpoint: ${API_URL}`);
		console.log(
			JSON.stringify({
				latitude: parseFloat(lat),
				longitude: parseFloat(lng),
				date_str: date,
				elevation_m: parseFloat(elevation),
				// The water station data is already a JS object, FastAPI will handle it
				water_station_data,
				// Your custom API key, passed in the request body
				api_key: APAW_HF_API_KEY
			})
		);

		// Use the standard fetch API for a direct, fast HTTP request
		const response = await fetch(API_URL, {
			method: 'POST',
			headers: {
				// Header to authenticate with the private Hugging Face Space
				Authorization: `Bearer ${VITE_HF_TOKEN}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				latitude: parseFloat(lat),
				longitude: parseFloat(lng),
				date_str: date,
				elevation_m: parseFloat(elevation),
				// The water station data is already a JS object, FastAPI will handle it
				water_station_data,
				// Your custom API key, passed in the request body
				api_key: APAW_HF_API_KEY
			})
		});

		console.log(`Received response with status: ${response.status}`);

		// Parse the JSON response from the API
		const result = await response.json();

		if (!response.ok || result.status === 'error') {
			console.error('API returned an error:', result);
			// Forward the detailed error from FastAPI.
			// The client-side code is already set up to handle this structure.
			const statusCode = response.status >= 500 ? 500 : 400;
			return json(result, { status: statusCode });
		}

		console.log('Prediction successful, returning data');

		// The FastAPI response is already the data object, no need for `result.data`
		return json(result);
	} catch (error) {
		// This catch block now primarily handles network failures or JSON parsing errors.
		console.error('Fatal error in flood-prediction proxy:', error);

		return json(
			{
				status: 'error', // Ensure the response has the 'status' key
				message: 'Could not connect to the prediction service. Please try again later',
				details: error.message
			},
			{ status: 503 } // 503 Service Unavailable is appropriate here
		);
	}
}
