import { json } from '@sveltejs/kit';
import { Client } from '@gradio/client';
import { APAW_HF_API_KEY, VITE_HF_TOKEN } from '$env/static/private';

// NEW: Changed from GET to POST
export async function POST({ request }) {
    // NEW: Parse the JSON body from the request
    const body = await request.json();
    const { lat, lng, date, elevation, water_station_data } = body;

    if (!lat || !lng) {
        return json({ error: 'Latitude and longitude parameters are required' }, { status: 400 });
    }

    // Environment variable checks remain the same
    if (!VITE_HF_TOKEN || !APAW_HF_API_KEY) {
        return json(
            { error: 'Configuration error: Server API keys not found' },
            { status: 500 }
        );
    }

    try {
        const client = await Client.connect('HunterExist2/apaw-hourly', {
            hf_token: VITE_HF_TOKEN
        });

        console.log('Successfully connected to Hugging Face Space');

        // NEW: The endpoint name and payload structure are updated
        const result = await client.predict('/predict_flood_with_data', {
            latitude: parseFloat(lat),
            longitude: parseFloat(lng),
            date_str: date,
            elevation_m: parseFloat(elevation),
            water_station_data: JSON.stringify(water_station_data),
            api_key: APAW_HF_API_KEY
        });

        console.log('Prediction successful, returning data');
        let responseData = result.data;
        if (Array.isArray(responseData) && responseData.length > 0) {
            responseData = responseData[0];
        }

        return json(responseData);
    } catch (error) {
        console.error('Detailed error information:', error);
        // Error handling remains the same
        let errorMessage = 'Failed to fetch flood prediction';
        let statusCode = 500;

        if (error.message.includes('Space metadata could not be loaded')) {
            errorMessage = 'Unable to access the AI model. The service may be temporarily unavailable.';
            statusCode = 503;
        } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            errorMessage = 'Authentication failed. Invalid access token.';
            statusCode = 401;
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