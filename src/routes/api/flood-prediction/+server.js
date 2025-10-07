import { json } from '@sveltejs/kit';
import { Client } from '@gradio/client';
import { APAW_HF_API_KEY, VITE_HF_TOKEN } from '$env/static/private';

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
  const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0]; // Default to today if no date provided

  if (!lat || !lng) {
    return json({ error: 'Latitude and longitude parameters are required' }, { status: 400 });
  }

  // Check if environment variables are available
  console.log('Environment variables check:');
  console.log('VITE_HF_TOKEN:', VITE_HF_TOKEN ? 'Present' : 'Missing');
  console.log('APAW_HF_API_KEY:', APAW_HF_API_KEY ? 'Present' : 'Missing');

  if (!VITE_HF_TOKEN) {
    return json({ 
      error: 'Configuration error: HF token not found',
      details: 'Please check your environment variables'
    }, { status: 500 });
  }

  if (!APAW_HF_API_KEY) {
    return json({ 
      error: 'Configuration error: API key not found',
      details: 'Please check your environment variables'
    }, { status: 500 });
  }

  try {
    console.log('Attempting to connect to Hugging Face Space: HunterExist2/apaw-hourly');
    
    const client = await Client.connect("HunterExist2/apaw-hourly", {
      hf_token: VITE_HF_TOKEN
    });

    console.log('Successfully connected to Hugging Face Space');

    const result = await client.predict("/predict_flood", {
      lat: parseFloat(lat),
      lon: parseFloat(lng),
      date_str: date,
      api_key: APAW_HF_API_KEY
    });

    console.log('Prediction successful, returning data');
    console.log('Raw result.data:', result.data);
    
    // Handle the array response - extract the first element if it's an array
    let responseData = result.data;
    if (Array.isArray(responseData) && responseData.length > 0) {
      responseData = responseData[0];
      console.log('Extracted data from array:', responseData);
    }
    
    return json(responseData);
  } catch (error) {
    console.error('Detailed error information:');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Provide more specific error messages based on the error type
    let errorMessage = 'Failed to fetch flood prediction';
    let statusCode = 500;
    
    if (error.message.includes('Space metadata could not be loaded')) {
      errorMessage = 'Unable to access the AI model. The service may be temporarily unavailable.';
      statusCode = 503;
    } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      errorMessage = 'Authentication failed. Invalid access token.';
      statusCode = 401;
    } else if (error.message.includes('404') || error.message.includes('Not Found')) {
      errorMessage = 'AI model not found. The service may have been moved or renamed.';
      statusCode = 404;
    }
    
    return json({ 
      error: errorMessage,
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: statusCode });
  }
}
