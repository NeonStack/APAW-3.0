import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Protected GET endpoint - simply returns weather data from Supabase
export async function GET({ request }) {
  // Basic security check - verify request is from our own site
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');
  
  // Only allow requests from our own website
  if (!referer || !referer.includes(host)) {
    console.warn('Potential unauthorized Weather API access attempt');
    return json({ error: 'Unauthorized access' }, { status: 403 });
  }

  try {
    // Get current date to filter relevant forecasts
    const today = new Date();
    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(today.getDate() - 4);
    
    // Format dates for query
    const todayStr = today.toISOString().split('T')[0];
    const fourDaysAgoStr = fourDaysAgo.toISOString().split('T')[0];
    
    // Query database for weather forecasts
    const { data, error } = await supabase
      .from('apaw_weather_forecasts')
      .select('*')
      .gte('forecast_date', fourDaysAgoStr)
      .order('forecast_date', { ascending: true })
      .order('city_name', { ascending: true });
    
    if (error) {
      console.error('Error retrieving weather data:', error);
      return json({ error: 'Database error' }, { status: 500 });
    }
    
    // Group forecasts by city
    const citiesData = {};
    data.forEach(forecast => {
      if (!citiesData[forecast.city_id]) {
        citiesData[forecast.city_id] = {
          city_name: forecast.city_name,
          forecasts: []
        };
      }
      
      citiesData[forecast.city_id].forecasts.push(forecast);
    });
    
    return json(Object.values(citiesData));
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return json({ error: 'Service temporarily unavailable' }, { status: 500 });
  }
}
