import { json } from '@sveltejs/kit';

export async function GET({ url, request }) {
  // Basic security check - verify request is from our own site
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');
  
  // Only allow requests from our own website
  if (!referer || !referer.includes(host)) {
    console.warn('Potential unauthorized Elevation API access attempt');
    return json({ error: 'Unauthorized access' }, { status: 403 });
  }
  
  const lat = url.searchParams.get('lat');
  const lng = url.searchParams.get('lng');

  if (!lat || !lng) {
    return json({ error: 'Latitude and longitude parameters are required' }, { status: 400 });
  }

  try {
    // Using Mapzen dataset from Open Topo Data
    const response = await fetch(`https://api.opentopodata.org/v1/mapzen?locations=${lat},${lng}`);

    if (!response.ok) {
      console.error(`Open Topo Data API error! status: ${response.status}`);
      return json({ error: 'Failed to fetch elevation data from external API' }, { status: response.status });
    }

    const data = await response.json();

    if (data.results && data.results.length > 0 && data.results[0].elevation !== null) {
      return json({ elevation: data.results[0].elevation });
    } else {
      console.error('Elevation data not found in Open Topo Data response:', data);
      // Check if there's an error message from the API
      const errorMessage = data.error || 'Elevation data not found or invalid coordinates.';
      // Return a specific error if elevation is null or results are empty
      return json({ error: errorMessage }, { status: 404 });
    }
  } catch (error) {
    console.error('Error fetching elevation:', error);
    return json({ error: 'Internal server error while fetching elevation' }, { status: 500 });
  }
}
