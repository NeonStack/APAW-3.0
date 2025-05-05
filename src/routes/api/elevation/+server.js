import { json } from '@sveltejs/kit';

const NCR_BOUNDS = {
	minLat: 14.35, // Approximate South
	maxLat: 14.78, // Approximate North (Adjusted slightly based on common NCR maps)
	minLng: 120.9, // Approximate West
	maxLng: 121.15 // Approximate East
};

export async function GET({ url, request }) {
	// Basic security check - verify request is from our own site
	const referer = request.headers.get('referer');
	const host = request.headers.get('host');

	// Only allow requests from our own website
	if (!referer || !referer.includes(host)) {
		console.warn('Potential unauthorized Elevation API access attempt');
		return json({ error: 'Unauthorized access' }, { status: 403 });
	}

	const latStr = url.searchParams.get('lat');
	const lngStr = url.searchParams.get('lng');

	if (!latStr || !lngStr) {
		return json({ error: 'Latitude and longitude parameters are required' }, { status: 400 });
	}

	const lat = parseFloat(latStr);
	const lng = parseFloat(lngStr);

	if (isNaN(lat) || isNaN(lng)) {
		return json({ error: 'Invalid latitude or longitude format' }, { status: 400 });
	}

	if (
		lat < NCR_BOUNDS.minLat ||
		lat > NCR_BOUNDS.maxLat ||
		lng < NCR_BOUNDS.minLng ||
		lng > NCR_BOUNDS.maxLng
	) {
		console.log(`Elevation request rejected: Coordinates (${lat}, ${lng}) outside NCR bounds.`);
		// Return a specific error message for out-of-bounds requests
		return json(
			{ error: 'Please select a location near the National Capital Region (NCR).' },
			{ status: 400 }
		);
	}

	try {
		// Using Mapzen dataset from Open Topo Data
		const response = await fetch(`https://api.opentopodata.org/v1/mapzen?locations=${lat},${lng}`);

		if (!response.ok) {
			console.error(`Open Topo Data API error! status: ${response.status}`);
			// Try to parse error from OpenTopoData if possible
			let externalError = 'Failed to fetch elevation data from external API';
			try {
				const errorData = await response.json();
				if (errorData && errorData.error) {
					externalError = `External API Error: ${errorData.error}`;
				}
			} catch (parseError) {
				// Ignore if response is not JSON
			}
			return json({ error: externalError }, { status: response.status });
		}

		const data = await response.json();

		if (data.results && data.results.length > 0 && data.results[0].elevation !== null) {
			return json({ elevation: data.results[0].elevation });
		} else {
			console.error('Elevation data not found in Open Topo Data response:', data);
			const errorMessage = data.error || 'Elevation data not found or invalid coordinates.';
			return json({ error: errorMessage }, { status: 404 }); // Use 404 if OpenTopoData says not found
		}
	} catch (error) {
		console.error('Error fetching elevation:', error);
		return json({ error: 'Internal server error while fetching elevation' }, { status: 500 });
	}
}
