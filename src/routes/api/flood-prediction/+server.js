import { json } from '@sveltejs/kit';
// We no longer need the Gradio client!
// import { Client } from '@gradio/client';
import { APAW_HF_API_KEY, VITE_HF_TOKEN } from '$env/static/private';

// The URL of your Hugging Face Space API
// Replace 'HunterExist2/apaw-hourly' with your space name
const API_URL = 'https://hunterexist2-apaw-hourly-docker.hf.space/predict_flood_with_data';

export async function POST({ request }) {
	const body = await request.json();
	const { lat, lng, date, elevation, water_station_data } = body;

	if (!lat || !lng) {
		return json({ error: 'Latitude and longitude parameters are required' }, { status: 400 });
	}

	if (!VITE_HF_TOKEN || !APAW_HF_API_KEY) {
		return json(
			{ error: 'Configuration error: Server API keys not found' },
			{ status: 500 }
		);
	}

	try {
		console.log(`Calling FastAPI endpoint: ${API_URL}`);

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
				water_station_data: water_station_data,
				// Your custom API key, passed in the request body
				api_key: APAW_HF_API_KEY
			})
		});

		console.log(`Received response with status: ${response.status}`);
		
		// Parse the JSON response from the API
		const result = await response.json();

		// Check for errors returned by our FastAPI endpoint
		// This logic handles the custom error formats you defined.
		if (!response.ok || result.status === 'error') {
			console.error('API returned an error:', result);
			// Re-throw an error to be caught by the catch block below,
			// using the message from your Python code.
			throw new Error(result.message || 'Prediction API returned an error.');
		}
		
		console.log('Prediction successful, returning data');
		
		// The FastAPI response is already the data object, no need for `result.data`
		return json(result);

	} catch (error) {
		console.error('Detailed error information:', error);
		
		// Your existing error handling should work perfectly, as the error
		// messages are preserved.
		let errorMessage = 'Failed to fetch flood prediction';
		let statusCode = 500;

		if (error.message.includes('Authentication failed')) {
			errorMessage = 'Authentication failed. Invalid access token to model.';
			statusCode = 401;
		} else if (error.message.includes('outside_service_area') || error.message.includes('invalid_location')) {
			errorMessage = error.message; // Use the specific message from the API
			statusCode = 400; // Bad Request is appropriate for invalid user input
		}

		return json(
			{
				error: errorMessage,
				details: error.message
			},
			{ status: statusCode }
		);
	}
}