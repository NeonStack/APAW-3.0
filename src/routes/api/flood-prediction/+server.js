import { json } from '@sveltejs/kit';
import { VITE_HF_API_PASSWORD } from '$env/static/private';

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
  const model = url.searchParams.get('model') || 'rf';

  if (!lat || !lng) {
    return json({ error: 'Latitude and longitude parameters are required' }, { status: 400 });
  }

  try {
    // Call Hugging Face API directly
    const response = await fetch('https://api-inference.huggingface.co/models/HunterExist2/apaw_predict_v3/api/predict_flood_sequence', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        api_key_input: VITE_HF_API_PASSWORD,
        model_choice: model
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Hugging Face API error:', errorText);
      return json({ 
        error: 'Failed to fetch prediction from Hugging Face API', 
        details: errorText 
      }, { status: response.status });
    }

    const data = await response.json();
    
    // Return successful prediction data
    return json(data);
  } catch (error) {
    console.error('Error fetching flood prediction:', error);
    return json({ 
      error: 'Internal server error while fetching flood prediction',
      details: error.message
    }, { status: 500 });
  }
}
