import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import moment from 'moment';

// Load environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const accuWeatherApiKey = import.meta.env.VITE_ACCUWEATHER_API_KEY;

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// List of Metro Manila locations with their AccuWeather IDs
const metroManilaCities = [
  { name: 'Manila', id: '264885', district: '1st District' },
  { name: 'Mandaluyong', id: '768148', district: '2nd District' },
  { name: 'Marikina', id: '264874', district: '2nd District' },
  { name: 'Pasig', id: '264876', district: '2nd District' },
  { name: 'Quezon City', id: '264873', district: '2nd District' },
  { name: 'San Juan', id: '264882', district: '2nd District' },
  { name: 'Caloocan', id: '264875', district: '3rd District' },
  { name: 'Malabon', id: '761333', district: '3rd District' },
  { name: 'Navotas', id: '765956', district: '3rd District' },
  { name: 'Valenzuela', id: '3424474', district: '3rd District' },
  { name: 'Las Piñas', id: '264877', district: '4th District' },
  { name: 'Makati', id: '21-264878_1_al', district: '4th District' },
  { name: 'Muntinlupa', id: '264879', district: '4th District' },
  { name: 'Parañaque', id: '3424484', district: '4th District' },
  { name: 'Pasay', id: '2-264881_1_al', district: '4th District' },
  { name: 'Pateros', id: '764136', district: '4th District' },
  { name: 'Taguig', id: '759349', district: '4th District' }
];

// Protected GET endpoint - returns weather data from Supabase
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

// POST endpoint - fetches AccuWeather data and stores in Supabase
export async function POST({ request }) {
  // Basic security check - verify request is from our own site
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');
  
  // Only allow requests from our own website
  if (!referer || !referer.includes(host)) {
    console.warn('Potential unauthorized Weather API POST attempt');
    return json({ error: 'Unauthorized access' }, { status: 403 });
  }
  
  try {
    // Get current date and calculate four days ago (needed for cleanup)
    const today = new Date();
    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(today.getDate() - 4);
    
    // Format dates for query
    const todayStr = today.toISOString().split('T')[0];
    const fourDaysAgoStr = fourDaysAgo.toISOString().split('T')[0];
    
    // Track overall status
    const results = {
      successful: [],
      failed: [],
      totalProcessed: 0,
      totalInserted: 0,
      totalUpdated: 0
    };

    // Process each city
    for (const city of metroManilaCities) {
      try {
        // Fetch 5-day forecast from AccuWeather
        const apiUrl = `https://dataservice.accuweather.com/forecasts/v1/daily/5day/${city.id}?apikey=${accuWeatherApiKey}&language=en-us&details=true&metric=true`;
        
        const response = await fetch(apiUrl);
        if (!response.ok) {
          results.failed.push({
            city: city.name, 
            error: `HTTP error: ${response.status}`
          });
          continue;
        }
        
        const weatherData = await response.json();
        
        // Current date for reference
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        // Process each forecast day and prepare for DB insertion
        const forecasts = weatherData.DailyForecasts.map(forecast => {
          // Process the data according to database schema
          const forecastDate = moment(forecast.Date).format('YYYY-MM-DD');
          
          // Calculate average values for combined Day/Night data
          const avgTemp = (forecast.Temperature.Minimum.Value + forecast.Temperature.Maximum.Value) / 2;
          const avgRealFeelTemp = (forecast.RealFeelTemperature.Minimum.Value + forecast.RealFeelTemperature.Maximum.Value) / 2;
          const avgRealFeelShadeTemp = (forecast.RealFeelTemperatureShade.Minimum.Value + forecast.RealFeelTemperatureShade.Maximum.Value) / 2;
          
          // Calculate total precipitation values
          const totalLiquid = (forecast.Day.TotalLiquid?.Value || 0) + (forecast.Night.TotalLiquid?.Value || 0);
          const totalRain = (forecast.Day.Rain?.Value || 0) + (forecast.Night.Rain?.Value || 0);
          const totalIce = (forecast.Day.Ice?.Value || 0) + (forecast.Night.Ice?.Value || 0);
          const totalHoursPrecipitation = (forecast.Day.HoursOfPrecipitation || 0) + (forecast.Night.HoursOfPrecipitation || 0);
          const totalHoursRain = (forecast.Day.HoursOfRain || 0) + (forecast.Night.HoursOfRain || 0);
          const totalHoursIce = (forecast.Day.HoursOfIce || 0) + (forecast.Night.HoursOfIce || 0);
          
          // Calculate wind speed average
          const avgWindSpeed = ((forecast.Day.Wind?.Speed?.Value || 0) + (forecast.Night.Wind?.Speed?.Value || 0)) / 2;
          
          // Get max wind gust between day and night
          const dayWindGust = forecast.Day.WindGust?.Speed?.Value || 0;
          const nightWindGust = forecast.Night.WindGust?.Speed?.Value || 0;
          const maxWindGust = Math.max(dayWindGust, nightWindGust);
          
          // Calculate min, max and avg humidity
          const minHumidity = forecast.Day.RelativeHumidity?.Minimum || forecast.Night.RelativeHumidity?.Minimum || 0;
          const maxHumidity = forecast.Day.RelativeHumidity?.Maximum || forecast.Night.RelativeHumidity?.Maximum || 0;
          const avgHumidity = ((forecast.Day.RelativeHumidity?.Average || 0) + (forecast.Night.RelativeHumidity?.Average || 0)) / 2;
          
          // Calculate average cloud cover
          const avgCloudCover = ((forecast.Day.CloudCover || 0) + (forecast.Night.CloudCover || 0)) / 2;
          
          // Total evapotranspiration
          const totalEvapotranspiration = (forecast.Day.Evapotranspiration?.Value || 0) + (forecast.Night.Evapotranspiration?.Value || 0);

          // Process wetbulb and WBGT data
          const minWetBulb = forecast.Day.WetBulbTemperature?.Minimum?.Value || forecast.Night.WetBulbTemperature?.Minimum?.Value || 0;
          const maxWetBulb = forecast.Day.WetBulbTemperature?.Maximum?.Value || forecast.Night.WetBulbTemperature?.Maximum?.Value || 0;
          const avgWetBulb = ((forecast.Day.WetBulbTemperature?.Average?.Value || 0) + (forecast.Night.WetBulbTemperature?.Average?.Value || 0)) / 2;
          
          const minWBGT = forecast.Day.WetBulbGlobeTemperature?.Minimum?.Value || forecast.Night.WetBulbGlobeTemperature?.Minimum?.Value || 0;
          const maxWBGT = forecast.Day.WetBulbGlobeTemperature?.Maximum?.Value || forecast.Night.WetBulbGlobeTemperature?.Maximum?.Value || 0;
          const avgWBGT = ((forecast.Day.WetBulbGlobeTemperature?.Average?.Value || 0) + (forecast.Night.WetBulbGlobeTemperature?.Average?.Value || 0)) / 2;
          
          // Headline data (if available)
          let headlineData = {};
          if (weatherData.Headline) {
            headlineData = {
              headline_effective_date: weatherData.Headline.EffectiveDate,
              headline_end_date: weatherData.Headline.EndDate,
              headline_severity: weatherData.Headline.Severity,
              headline_text: weatherData.Headline.Text,
              headline_category: weatherData.Headline.Category
            };
          }
          
          return {
            // City metadata
            city_id: city.id,
            city_name: city.name,
            fetched_at: new Date().toISOString(),
            
            // Date information
            forecast_date: forecastDate,
            epoch_date: forecast.EpochDate,
            sunrise_time: forecast.Sun?.Rise,
            sunset_time: forecast.Sun?.Set,
            moon_phase: forecast.Moon?.Phase,
            
            // Temperature data
            min_temp_c: forecast.Temperature.Minimum.Value,
            max_temp_c: forecast.Temperature.Maximum.Value,
            avg_temp_c: avgTemp,
            min_realfeel_temp_c: forecast.RealFeelTemperature.Minimum.Value,
            max_realfeel_temp_c: forecast.RealFeelTemperature.Maximum.Value,
            avg_realfeel_temp_c: avgRealFeelTemp,
            min_realfeel_temp_shade_c: forecast.RealFeelTemperatureShade.Minimum.Value,
            max_realfeel_temp_shade_c: forecast.RealFeelTemperatureShade.Maximum.Value,
            avg_realfeel_temp_shade_c: avgRealFeelShadeTemp,
            
            // Precipitation data
            total_liquid_mm: totalLiquid,
            total_rain_mm: totalRain,
            total_ice_mm: totalIce,
            total_hours_precipitation: totalHoursPrecipitation,
            total_hours_rain: totalHoursRain,
            total_hours_ice: totalHoursIce,
            
            // Probability columns
            day_precipitation_probability: forecast.Day.PrecipitationProbability,
            night_precipitation_probability: forecast.Night.PrecipitationProbability,
            day_thunderstorm_probability: forecast.Day.ThunderstormProbability,
            night_thunderstorm_probability: forecast.Night.ThunderstormProbability,
            day_rain_probability: forecast.Day.RainProbability,
            night_rain_probability: forecast.Night.RainProbability,
            day_ice_probability: forecast.Day.IceProbability,
            night_ice_probability: forecast.Night.IceProbability,
            
            // Wind data
            avg_wind_speed_kmh: avgWindSpeed,
            max_wind_gust_kmh: maxWindGust,
            day_wind_direction_deg: forecast.Day.Wind?.Direction?.Degrees,
            day_wind_direction_loc: forecast.Day.Wind?.Direction?.Localized,
            night_wind_direction_deg: forecast.Night.Wind?.Direction?.Degrees,
            night_wind_direction_loc: forecast.Night.Wind?.Direction?.Localized,
            
            // Humidity and atmosphere
            min_relative_humidity_percent: minHumidity,
            max_relative_humidity_percent: maxHumidity,
            avg_relative_humidity_percent: avgHumidity,
            avg_cloud_cover_percent: avgCloudCover,
            total_evapotranspiration_mm: totalEvapotranspiration,
            min_wetbulb_temp_c: minWetBulb,
            max_wetbulb_temp_c: maxWetBulb,
            avg_wetbulb_temp_c: avgWetBulb,
            min_wbgt_c: minWBGT,
            max_wbgt_c: maxWBGT,
            avg_wbgt_c: avgWBGT,
            
            // Descriptive data
            day_icon: forecast.Day.Icon,
            day_icon_phrase: forecast.Day.IconPhrase,
            day_short_phrase: forecast.Day.ShortPhrase,
            day_long_phrase: forecast.Day.LongPhrase,
            day_has_precipitation: forecast.Day.HasPrecipitation,
            day_precipitation_type: forecast.Day.PrecipitationType,
            day_precipitation_intensity: forecast.Day.PrecipitationIntensity,
            night_icon: forecast.Night.Icon,
            night_icon_phrase: forecast.Night.IconPhrase,
            night_short_phrase: forecast.Night.ShortPhrase,
            night_long_phrase: forecast.Night.LongPhrase,
            night_has_precipitation: forecast.Night.HasPrecipitation,
            
            // Additional data
            hours_of_sun: forecast.HoursOfSun,
            link: forecast.Link,
            
            // Headlines
            ...headlineData
          };
        });
        
        // Update database with new forecasts
        for (const forecast of forecasts) {
          results.totalProcessed++;
          
          // Check if this forecast already exists
          const { data: existingData, error: checkError } = await supabase
            .from('apaw_weather_forecasts')
            .select('id')
            .eq('city_id', city.id)
            .eq('forecast_date', forecast.forecast_date);
            
          if (checkError) {
            console.error(`Error checking for existing forecast for ${city.name}:`, checkError);
            results.failed.push({
              city: city.name,
              date: forecast.forecast_date,
              error: 'Database check error'
            });
            continue;
          }
          
          // If forecast exists, update it
          if (existingData && existingData.length > 0) {
            const { error: updateError } = await supabase
              .from('apaw_weather_forecasts')
              .update(forecast)
              .eq('id', existingData[0].id);
              
            if (updateError) {
              console.error(`Error updating forecast for ${city.name}:`, updateError);
              results.failed.push({
                city: city.name,
                date: forecast.forecast_date,
                error: 'Update error'
              });
            } else {
              results.totalUpdated++;
            }
          } 
          // Otherwise insert a new record
          else {
            const { error: insertError } = await supabase
              .from('apaw_weather_forecasts')
              .insert([forecast]);
              
            if (insertError) {
              console.error(`Error inserting forecast for ${city.name}:`, insertError);
              results.failed.push({
                city: city.name,
                date: forecast.forecast_date,
                error: 'Insert error'
              });
            } else {
              results.totalInserted++;
            }
          }
        }
        
        // Delete forecasts older than 4 days ago
        const { error: deleteError, count: deleteCount } = await supabase
          .from('apaw_weather_forecasts')
          .delete()
          .eq('city_id', city.id)
          .lt('forecast_date', fourDaysAgoStr)
          .select('count');
          
        if (deleteError) {
          console.error(`Error deleting old forecasts for ${city.name}:`, deleteError);
        } else {
          console.log(`Deleted ${deleteCount} old forecasts for ${city.name}`);
        }
        
        results.successful.push(city.name);
        
      } catch (cityError) {
        console.error(`Error processing ${city.name}:`, cityError);
        results.failed.push({
          city: city.name,
          error: cityError.message
        });
      }
    }
    
    return json({
      success: true,
      message: 'Weather data processing completed',
      results
    });
    
  } catch (error) {
    console.error('Error in weather data fetch:', error);
    return json({
      success: false,
      error: 'Failed to fetch and process weather data'
    }, { status: 500 });
  }
}
