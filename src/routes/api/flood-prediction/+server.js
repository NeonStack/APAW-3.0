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
        console.log(`Calling FastAPI endpoint: ${API_URL}`);

		const payloadBuildStart = performance.now();
		const payload = {
			latitude: parseFloat(lat),
			longitude: parseFloat(lng),
			date_str: date,
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

        // Read response body once and stream it back to the browser unchanged.
        const hfBodyReadStart = performance.now();
        const responseText = await response.text();
        timingLog('proxy_post_hf_body_read', hfBodyReadStart, `bytes=${responseText.length}`);

        const contentType = response.headers.get('content-type') || 'application/json';
        const statusCode = response.ok ? response.status : response.status >= 500 ? 500 : 400;

        if (!response.ok) {
            console.error('API returned an error payload from HF service');
            timingLog('proxy_post_total', endpointStart, 'status=error_forwarded');
            return new Response(responseText, {
                status: statusCode,
                headers: { 'Content-Type': contentType }
            });
        }

        console.log('Prediction successful, returning data');
		timingLog('proxy_post_total', endpointStart, 'status=success');

        return new Response(responseText, {
            status: statusCode,
            headers: { 'Content-Type': contentType }
        });
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