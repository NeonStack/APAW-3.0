import { json } from '@sveltejs/kit';
import { APAW_HF_API_KEY, VITE_HF_TOKEN } from '$env/static/private';

const API_URL = 'https://hunterexist2-apaw-hourly-docker-2.hf.space/predict_flood_with_data';

async function fetchElevation(lat, lng) {
    // 1. Try Open-Meteo first
    try {
        const response = await fetch(
            `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`
        );
        if (!response.ok) {
            throw new Error(`Open-Meteo API failed with status: ${response.status}`);
        }
        const data = await response.json();
        if (data.elevation && Array.isArray(data.elevation) && data.elevation[0] !== null) {
            return { elevation: data.elevation[0] };
        } else {
            throw new Error('Invalid data format from Open-Meteo.');
        }
    } catch (error) {
        console.warn(`Could not fetch elevation from Open-Meteo: ${error.message}. Falling back...`);

        // 2. Fallback to Open Topo Data
        try {
            const fallbackResponse = await fetch(
                `https://api.opentopodata.org/v1/srtm30m?locations=${lat},${lng}`
            );
            if (!fallbackResponse.ok) {
                return {
                    error: 'Failed to fetch elevation data from fallback API.',
                    status: fallbackResponse.status
                };
            }
            const fallbackData = await fallbackResponse.json();
            if (
                fallbackData.results &&
                fallbackData.results.length > 0 &&
                fallbackData.results[0].elevation !== null
            ) {
                return { elevation: fallbackData.results[0].elevation };
            } else {
                const errorMessage =
                    fallbackData.error || 'Elevation data not found for the selected coordinates.';
                return { error: errorMessage, status: 404 };
            }
        } catch (fallbackError) {
            console.error('Internal error fetching elevation from fallback:', fallbackError);
            return { error: 'Internal server error while fetching elevation from all sources.', status: 500 };
        }
    }
}

export async function POST({ request }) {
    const body = await request.json();

    const { lat, lng, date, water_station_data } = body;

    if (!lat || !lng) {
        return json({ error: 'Latitude and longitude parameters are required' }, { status: 400 });
    }

    if (!VITE_HF_TOKEN || !APAW_HF_API_KEY) {
        return json({ error: 'Configuration error: Server API keys not found' }, { status: 500 });
    }

    try {
        // --- NEW: Fetch elevation on the server before prediction ---
        const elevationResult = await fetchElevation(parseFloat(lat), parseFloat(lng));
        if (elevationResult.error) {
            // If elevation fetch fails, return that error to the client.
            return json(
                {
                    status: 'error',
                    message: elevationResult.error,
                    error_type: 'invalid_location'
                },
                { status: elevationResult.status }
            );
        }
        const elevation = elevationResult.elevation;
        // --- END NEW ---

        console.log(`Calling FastAPI endpoint: ${API_URL}`);

		console.log(JSON.stringify({
			latitude: parseFloat(lat),
			longitude: parseFloat(lng),
			date_str: date,
			elevation_m: elevation,
			water_station_data,
			api_key: APAW_HF_API_KEY
		}));

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
                elevation_m: elevation,
                water_station_data,
                api_key: APAW_HF_API_KEY
            })
        });

        console.log(`Received response with status: ${response.status}`);

        // Parse the JSON response from the API
        const result = await response.json();

        if (!response.ok || result.status === 'error' || result.status === 'invalid') {
            console.error('API returned an error:', result);
            // Forward the detailed error from FastAPI.
            // The client-side code is already set up to handle this structure.
            const statusCode = response.status >= 500 ? 500 : 400;
            return json(result, { status: statusCode });
        }

        console.log('Prediction successful, returning data');

        return json(result);
    } catch (error) {
        //  handles network failures or JSON parsing errors.
        console.error('Fatal error in flood-prediction proxy:', error);

        return json(
            {
                status: 'error', // Ensure the response has the 'status' key
                message: 'Could not connect to the prediction service. Please try again later',
                details: error.message
            },
            { status: 503 }
        );
    }
}