import { json } from '@sveltejs/kit';
import { Client } from '@gradio/client';
import { VITE_APAW_API_KEY, VITE_HF_TOKEN } from '$env/static/private';

export async function GET({ url, request }) {
  // Basic security check - verify request is from our own site
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');
  
  // Only allow requests from our own website
  if (!referer || !referer.includes(host)) {
    console.warn('Potential unauthorized Flood Prediction API access attempt');
    return json({ error: 'Unauthorized access' }, { status: 403 });
  }
  
  const lat = url.searchParams.get('lat');
  const lng = url.searchParams.get('lng');
  const elevation = url.searchParams.get('elevation') || null;

  if (!lat || !lng) {
    return json({ error: 'Latitude and longitude parameters are required' }, { status: 400 });
  }

  try {
    // Connect to the Hugging Face model using Gradio client
    const client = await Client.connect("HunterExist2/apaw_predict_v7", {
      hf_token: VITE_HF_TOKEN // Token to access private model
    });

    // Make the prediction
    const result = await client.predict("/predict_flood_outlook", {
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      elevation_m: elevation ? parseFloat(elevation) : null,
      api_key_input: VITE_APAW_API_KEY
    });

    // Return the prediction data
    return json(result.data);
  } catch (error) {
    console.error('Error making flood prediction:', error);
    return json({ 
      error: 'Failed to fetch flood prediction', 
      details: error.message 
    }, { status: 500 });
  }
}
