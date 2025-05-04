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
  { name: 'Manila', id: '264885', district: '1st District', lat: 14.5958, lon: 120.9772 },
  { name: 'Mandaluyong', id: '768148', district: '2nd District', lat: 14.5798, lon: 121.0326 },
  { name: 'Marikina', id: '264874', district: '2nd District', lat: 14.6404, lon: 121.1063 },
  { name: 'Pasig', id: '264876', district: '2nd District', lat: 14.5764, lon: 121.0813 },
  { name: 'Quezon City', id: '264873', district: '2nd District', lat: 14.6760, lon: 121.0437 },
  { name: 'San Juan', id: '264882', district: '2nd District', lat: 14.6017, lon: 121.0245 },
  { name: 'Caloocan', id: '264875', district: '3rd District', lat: 14.7500, lon: 120.9797 },
  { name: 'Malabon', id: '761333', district: '3rd District', lat: 14.7700, lon: 120.9370 },
  { name: 'Navotas', id: '765956', district: '3rd District', lat: 14.7470, lon: 120.9170 },
  { name: 'Valenzuela', id: '3424474', district: '3rd District', lat: 14.7011, lon: 120.9847 },
  { name: 'Las Piñas', id: '264877', district: '4th District', lat: 14.4497, lon: 120.9833 },
  { name: 'Makati', id: '21-264878_1_al', district: '4th District', lat: 14.5547, lon: 121.0244 },
  { name: 'Muntinlupa', id: '264879', district: '4th District', lat: 14.3600, lon: 121.0420 },
  { name: 'Parañaque', id: '3424484', district: '4th District', lat: 14.4889, lon: 121.0142 },
  { name: 'Pasay', id: '2-264881_1_al', district: '4th District', lat: 14.5350, lon: 121.0030 },
  { name: 'Pateros', id: '764136', district: '4th District', lat: 14.5560, lon: 121.0720 },
  { name: 'Taguig', id: '759349', district: '4th District', lat: 14.5167, lon: 121.0500 }
];

// Helper function to fetch soil data from Open-Meteo API
async function fetchSoilData(latitude, longitude) {
  try {
    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=soil_temperature_6cm,soil_moisture_3_to_9cm&timezone=Asia%2FSingapore&forecast_days=5`;
    
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching soil data from Open-Meteo:', error);
    throw error;
  }
}

// Helper function to calculate daily averages from hourly data
function calculateDailyAverages(hourlyData) {
  const dailyAverages = {};
  
  // Group hourly data by date
  const hoursByDate = {};
  
  for (let i = 0; i < hourlyData.hourly.time.length; i++) {
    const dateTime = hourlyData.hourly.time[i];
    const date = dateTime.split('T')[0]; // Extract the date part
    
    if (!hoursByDate[date]) {
      hoursByDate[date] = {
        soilTemp: [],
        soilMoisture: []
      };
    }
    
    // Add the hourly values to the respective date's array
    hoursByDate[date].soilTemp.push(hourlyData.hourly.soil_temperature_6cm[i]);
    hoursByDate[date].soilMoisture.push(hourlyData.hourly.soil_moisture_3_to_9cm[i]);
  }
  
  // Calculate averages for each date
  for (const date in hoursByDate) {
    const soilTempSum = hoursByDate[date].soilTemp.reduce((sum, temp) => sum + temp, 0);
    const soilMoistureSum = hoursByDate[date].soilMoisture.reduce((sum, moisture) => sum + moisture, 0);
    
    const soilTempAvg = soilTempSum / hoursByDate[date].soilTemp.length;
    const soilMoistureAvg = soilMoistureSum / hoursByDate[date].soilMoisture.length;
    
    dailyAverages[date] = {
      avg_soil_temp_6cm_c: soilTempAvg,
      avg_soil_moisture_3_9cm_m3m3: soilMoistureAvg
    };
  }
  
  return dailyAverages;
}

// POST endpoint - fetches weather data from external APIs and updates Supabase
export async function POST({ request, url }) {
  // Basic security check - verify request is from our own site
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');
  
  // Only allow requests from our own website
  if (!referer || !referer.includes(host)) {
    console.warn('Potential unauthorized Weather API update attempt');
    return json({ error: 'Unauthorized access' }, { status: 403 });
  }
  
  // Extract query parameters for optimization
  const batchSize = parseInt(url.searchParams.get('batchSize') || '0'); // 0 means all cities
  const batchIndex = parseInt(url.searchParams.get('batchIndex') || '0');
  const skipCleanup = url.searchParams.get('skipCleanup') === 'true';
  const startTime = Date.now();
  const TIMEOUT_THRESHOLD = 50000; // 50 seconds (to be safe)
  
  try {
    // Get current date and calculate four days ago (needed for cleanup)
    const today = new Date();
    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(today.getDate() - 4);
    
    // Format dates for query
    const todayStr = today.toISOString().split('T')[0];
    const fourDaysAgoStr = fourDaysAgo.toISOString().split('T')[0];
    
    // Log detailed server time information
    console.log('Server Date/Time Information:', {
      isoString: today.toISOString(),
      utcString: today.toUTCString(),
      localString: today.toString(),
      timezoneOffset: today.getTimezoneOffset() / 60, // Convert to hours
      todayFormatted: todayStr,
      fourDaysAgoFormatted: fourDaysAgoStr
    });
    
    // Track overall status
    const results = {
      successful: [],
      failed: [],
      totalProcessed: 0,
      totalInserted: 0,
      totalUpdated: 0,
      citiesToProcess: [],
      allCitiesCount: metroManilaCities.length,
      skipCleanup,
      timeElapsed: 0
    };

    // Determine which cities to process based on batch parameters
    let citiesToProcess = [...metroManilaCities];
    if (batchSize > 0 && batchSize < metroManilaCities.length) {
      const startIndex = batchIndex * batchSize;
      citiesToProcess = metroManilaCities.slice(startIndex, startIndex + batchSize);
    }
    results.citiesToProcess = citiesToProcess.map(c => c.name);

    // Process cities in parallel
    const cityProcessingPromises = citiesToProcess.map(async (city) => {
      try {
        // Check if we're approaching the timeout limit
        if (Date.now() - startTime > TIMEOUT_THRESHOLD) {
          throw new Error("Approaching timeout limit - operation aborted");
        }
        
        // Fetch 5-day forecast from AccuWeather
        const apiUrl = `https://dataservice.accuweather.com/forecasts/v1/daily/5day/${city.id}?apikey=${accuWeatherApiKey}&language=en-us&details=true&metric=true`;
        
        const response = await fetch(apiUrl);
        if (!response.ok) {
          return {
            status: 'failed',
            city: city.name, 
            error: `HTTP error: ${response.status}`
          };
        }
        
        const weatherData = await response.json();
        
        // Log the headline data, particularly the effective date
        if (weatherData.Headline) {
          console.log(`AccuWeather Headline for ${city.name}:`, {
            EffectiveDate: weatherData.Headline.EffectiveDate,
            EndDate: weatherData.Headline.EndDate,
            Text: weatherData.Headline.Text,
            Category: weatherData.Headline.Category,
            CurrentDateTime: new Date().toISOString(),
            CurrentDateTimeUTC: new Date().toUTCString(),
            CurrentDateTimeLocal: new Date().toString()
          });
        } else {
          console.log(`No headline data for ${city.name}`);
        }
        
        // Fetch soil data from Open-Meteo
        let soilDailyAverages = {};
        try {
          const soilData = await fetchSoilData(city.lat, city.lon);
          soilDailyAverages = calculateDailyAverages(soilData);
        } catch (soilError) {
          console.warn(`Failed to fetch soil data for ${city.name}:`, soilError);
          // Continue without soil data if it fails
        }
        
        // Process forecasts - same as before but preparing for bulk operations
        let forecasts = weatherData.DailyForecasts.map(forecast => {
          // Process the data according to database schema
          const forecastDate = moment(forecast.Date).format('YYYY-MM-DD');
          
          // Get soil data for this date if available
          const soilData = soilDailyAverages[forecastDate] || {
            avg_soil_temp_6cm_c: null,
            avg_soil_moisture_3_9cm_m3m3: null
          };
          
          // All the same processing as before for each forecast
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
            
            // Soil data from Open-Meteo
            avg_soil_moisture_3_9cm_m3m3: soilData.avg_soil_moisture_3_9cm_m3m3,
            avg_soil_temp_6cm_c: soilData.avg_soil_temp_6cm_c,
            
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
        
        // OPTIMIZATION: Get all existing forecasts for this city in one query
        const { data: existingForecasts, error: checkError } = await supabase
          .from('apaw_weather_forecasts')
          .select('id, forecast_date')
          .eq('city_id', city.id)
          .gte('forecast_date', fourDaysAgoStr);
          
        if (checkError) {
          return {
            status: 'failed',
            city: city.name,
            error: 'Database check error'
          };
        }
        
        // Create lookup table for faster matching
        const existingForecastMap = {};
        existingForecasts.forEach(ef => {
          existingForecastMap[ef.forecast_date] = ef.id;
        });
        
        // Separate forecasts into those to update and those to insert
        const forecastsToUpdate = [];
        const forecastsToInsert = [];
        
        forecasts.forEach(forecast => {
          if (existingForecastMap[forecast.forecast_date]) {
            forecastsToUpdate.push({
              ...forecast,
              id: existingForecastMap[forecast.forecast_date]
            });
          } else {
            forecastsToInsert.push(forecast);
          }
        });
        
        // Perform bulk operations
        let updateCount = 0;
        let insertCount = 0;
        
        // Update existing forecasts
        if (forecastsToUpdate.length > 0) {
          const { error: updateError, count } = await supabase
            .from('apaw_weather_forecasts')
            .upsert(forecastsToUpdate);
            
          if (updateError) {
            console.error(`Error updating forecasts for ${city.name}:`, updateError);
          } else {
            updateCount = count || forecastsToUpdate.length;
          }
        }
        
        // Insert new forecasts
        if (forecastsToInsert.length > 0) {
          const { error: insertError, count } = await supabase
            .from('apaw_weather_forecasts')
            .insert(forecastsToInsert);
            
          if (insertError) {
            console.error(`Error inserting forecasts for ${city.name}:`, insertError);
          } else {
            insertCount = count || forecastsToInsert.length;
          }
        }
        
        // Perform cleanup only if not explicitly skipped
        let deleteCount = 0;
        if (!skipCleanup) {
          // Fix: Remove the .select('count') that was causing the PostgreSQL error
          const { error: deleteError, count } = await supabase
            .from('apaw_weather_forecasts')
            .delete()
            .eq('city_id', city.id)
            .lt('forecast_date', fourDaysAgoStr);
            
          if (deleteError) {
            console.error(`Error deleting old forecasts for ${city.name}:`, deleteError);
          } else {
            deleteCount = count || 0;
          }
        }
        
        return {
          status: 'success',
          city: city.name,
          processed: forecastsToUpdate.length + forecastsToInsert.length,
          updated: updateCount,
          inserted: insertCount,
          deleted: deleteCount
        };
        
      } catch (cityError) {
        return {
          status: 'failed',
          city: city.name,
          error: cityError.message
        };
      }
    });
    
    // Wait for all cities to be processed
    const cityResults = await Promise.all(cityProcessingPromises);
    
    // Process results
    cityResults.forEach(result => {
      if (result.status === 'success') {
        results.successful.push(result.city);
        results.totalProcessed += result.processed;
        results.totalUpdated += result.updated;
        results.totalInserted += result.inserted;
      } else {
        results.failed.push({
          city: result.city,
          error: result.error
        });
      }
    });
    
    results.timeElapsed = Date.now() - startTime;
    
    return json({
      success: true,
      message: 'Weather data processing completed',
      results
    });
    
  } catch (error) {
    const timeElapsed = Date.now() - startTime;
    console.error('Error in weather data fetch:', error);
    return json({
      success: false,
      error: 'Failed to fetch and process weather data',
      message: error.message,
      timeElapsed
    }, { status: 500 });
  }
}