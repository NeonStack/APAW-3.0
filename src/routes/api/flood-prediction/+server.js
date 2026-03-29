import { json } from '@sveltejs/kit';
import { APAW_HF_API_KEY, VITE_HF_TOKEN } from '$env/static/private';

const API_URL = 'https://hunterexist2-apaw-hourly-docker-2.hf.space/predict_flood_with_data';

function elapsedMs(start) {
    return (performance.now() - start).toFixed(2);
}

function timingLog(stage, start, extra = '') {
    const suffix = extra ? ` | ${extra}` : '';
    console.log(`⏱️ [timing] ${stage}_ms=${elapsedMs(start)}${suffix}`);
}

async function fetchElevation(lat, lng) {
	const fnStart = performance.now();
    // 1. Try Open-Meteo first
    try {
		const openMeteoStart = performance.now();
        const response = await fetch(
            `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`
        );
		timingLog('proxy_fetchElevation_open_meteo_fetch', openMeteoStart, `status=${response.status}`);
        if (!response.ok) {
            throw new Error(`Open-Meteo API failed with status: ${response.status}`);
        }
		const openMeteoJsonStart = performance.now();
        const data = await response.json();
		timingLog('proxy_fetchElevation_open_meteo_json_parse', openMeteoJsonStart);
        if (data.elevation && Array.isArray(data.elevation) && data.elevation[0] !== null) {
			timingLog('proxy_fetchElevation_total', fnStart, 'source=open-meteo');
            return { elevation: data.elevation[0] };
        } else {
            throw new Error('Invalid data format from Open-Meteo.');
        }
    } catch (error) {
        console.warn(`Could not fetch elevation from Open-Meteo: ${error.message}. Falling back...`);

        // 2. Fallback to Open Topo Data
        try {
			const fallbackFetchStart = performance.now();
            const fallbackResponse = await fetch(
                `https://api.opentopodata.org/v1/srtm30m?locations=${lat},${lng}`
            );
			timingLog(
				'proxy_fetchElevation_opentopodata_fetch',
				fallbackFetchStart,
				`status=${fallbackResponse.status}`
			);
            if (!fallbackResponse.ok) {
				timingLog('proxy_fetchElevation_total', fnStart, 'source=opentopodata_error_response');
                return {
                    error: 'Failed to fetch elevation data from fallback API.',
                    status: fallbackResponse.status
                };
            }
			const fallbackJsonStart = performance.now();
            const fallbackData = await fallbackResponse.json();
			timingLog('proxy_fetchElevation_opentopodata_json_parse', fallbackJsonStart);
            if (
                fallbackData.results &&
                fallbackData.results.length > 0 &&
                fallbackData.results[0].elevation !== null
            ) {
				timingLog('proxy_fetchElevation_total', fnStart, 'source=opentopodata');
                return { elevation: fallbackData.results[0].elevation };
            } else {
                const errorMessage =
                    fallbackData.error || 'Elevation data not found for the selected coordinates.';
				timingLog('proxy_fetchElevation_total', fnStart, 'source=opentopodata_no_elevation');
                return { error: errorMessage, status: 404 };
            }
        } catch (fallbackError) {
            console.error('Internal error fetching elevation from fallback:', fallbackError);
			timingLog('proxy_fetchElevation_total', fnStart, 'source=error_all_sources');
            return { error: 'Internal server error while fetching elevation from all sources.', status: 500 };
        }
    }
}

export async function POST({ request }) {
	const endpointStart = performance.now();
	const parseStart = performance.now();
    const body = await request.json();
	timingLog('proxy_post_request_json_parse', parseStart);

    const { lat, lng, date, water_station_data } = body;

    if (!lat || !lng) {
        return json({ error: 'Latitude and longitude parameters are required' }, { status: 400 });
    }

    if (!VITE_HF_TOKEN || !APAW_HF_API_KEY) {
        return json({ error: 'Configuration error: Server API keys not found' }, { status: 500 });
    }

    try {
        // --- NEW: Fetch elevation on the server before prediction ---
		const elevationStart = performance.now();
        const elevationResult = await fetchElevation(parseFloat(lat), parseFloat(lng));
		timingLog('proxy_post_fetchElevation', elevationStart);
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

		const payloadBuildStart = performance.now();
		const payload = {
			latitude: parseFloat(lat),
			longitude: parseFloat(lng),
			date_str: date,
			elevation_m: elevation,
			water_station_data,
			api_key: APAW_HF_API_KEY
		};
		timingLog(
			'proxy_post_payload_build',
			payloadBuildStart,
			`station_count=${Array.isArray(water_station_data) ? water_station_data.length : 0}`
		);

        // Use the standard fetch API for a direct, fast HTTP request
		const hfFetchStart = performance.now();
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                // Header to authenticate with the private Hugging Face Space
                Authorization: `Bearer ${VITE_HF_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
		timingLog('proxy_post_hf_fetch', hfFetchStart, `status=${response.status}`);

        console.log(`Received response with status: ${response.status}`);

        // Parse the JSON response from the API
		const hfJsonParseStart = performance.now();
        const result = await response.json();
		timingLog('proxy_post_hf_json_parse', hfJsonParseStart);

        if (!response.ok || result.status === 'error' || result.status === 'invalid') {
            console.error('API returned an error:', result);
            // Forward the detailed error from FastAPI.
            // The client-side code is already set up to handle this structure.
            const statusCode = response.status >= 500 ? 500 : 400;
			timingLog('proxy_post_total', endpointStart, 'status=error_forwarded');
            return json(result, { status: statusCode });
        }

        console.log('Prediction successful, returning data');
		timingLog('proxy_post_total', endpointStart, 'status=success');

        return json(result);
    } catch (error) {
        //  handles network failures or JSON parsing errors.
        console.error('Fatal error in flood-prediction proxy:', error);
		timingLog('proxy_post_total', endpointStart, 'status=exception');

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