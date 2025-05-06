import { createClient } from '@supabase/supabase-js';
import { json } from '@sveltejs/kit';
import moment from 'moment-timezone'; // Import moment-timezone directly

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
	{ name: 'Quezon City', id: '264873', district: '2nd District', lat: 14.676, lon: 121.0437 },
	{ name: 'San Juan', id: '264882', district: '2nd District', lat: 14.6017, lon: 121.0245 },
	{ name: 'Caloocan', id: '264875', district: '3rd District', lat: 14.75, lon: 120.9797 },
	{ name: 'Malabon', id: '761333', district: '3rd District', lat: 14.77, lon: 120.937 },
	{ name: 'Navotas', id: '765956', district: '3rd District', lat: 14.747, lon: 120.917 },
	{ name: 'Valenzuela', id: '3424474', district: '3rd District', lat: 14.7011, lon: 120.9847 },
	{ name: 'Las Piñas', id: '264877', district: '4th District', lat: 14.4497, lon: 120.9833 },
	{ name: 'Makati', id: '21-264878_1_al', district: '4th District', lat: 14.5547, lon: 121.0244 },
	{ name: 'Muntinlupa', id: '264879', district: '4th District', lat: 14.36, lon: 121.042 },
	{ name: 'Parañaque', id: '3424484', district: '4th District', lat: 14.4889, lon: 121.0142 },
	{ name: 'Pasay', id: '2-264881_1_al', district: '4th District', lat: 14.535, lon: 121.003 },
	{ name: 'Pateros', id: '764136', district: '4th District', lat: 14.556, lon: 121.072 },
	{ name: 'Taguig', id: '759349', district: '4th District', lat: 14.5167, lon: 121.05 }
];

// Helper function to fetch soil data from Open-Meteo API
async function fetchSoilData(latitude, longitude) {
	try {
		const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=soil_temperature_6cm,soil_moisture_3_to_9cm&timezone=Asia%2FSingapore&forecast_days=5`;
		console.log(`Fetching soil data for ${latitude}, ${longitude} from ${apiUrl}`); // Log API call
		const response = await fetch(apiUrl);
		if (!response.ok) {
			console.error(
				`Open-Meteo API error for ${latitude}, ${longitude}: ${response.status} ${response.statusText}`
			);
			const errorBody = await response.text();
			console.error('Open-Meteo Error Body:', errorBody);
			return null; // Return null instead of throwing to allow partial success
		}
		const data = await response.json();
		console.log(`Successfully fetched soil data for ${latitude}, ${longitude}`);
		return data;
	} catch (error) {
		console.error(`Error fetching soil data from Open-Meteo for ${latitude}, ${longitude}:`, error);
		return null; // Return null on fetch error
	}
}

// Helper function to calculate daily averages from hourly data
function calculateDailyAverages(hourlyData) {
	if (!hourlyData || !hourlyData.hourly || !hourlyData.hourly.time) {
		console.warn('Cannot calculate daily soil averages: Invalid or missing hourly data.');
		return {};
	}
	const dailyAverages = {};
	const hoursByDate = {};

	try {
		for (let i = 0; i < hourlyData.hourly.time.length; i++) {
			const dateTime = hourlyData.hourly.time[i];
			// Robust date extraction
			const dateMatch = dateTime.match(/^(\d{4}-\d{2}-\d{2})/);
			if (!dateMatch) {
				console.warn(`Could not parse date from Open-Meteo time: ${dateTime}`);
				continue;
			}
			const date = dateMatch[1];

			if (!hoursByDate[date]) {
				hoursByDate[date] = { soilTemp: [], soilMoisture: [] };
			}

			// Add the hourly values, checking for null/undefined
			const temp = hourlyData.hourly.soil_temperature_6cm?.[i];
			const moisture = hourlyData.hourly.soil_moisture_3_to_9cm?.[i];

			if (temp !== null && temp !== undefined) {
				hoursByDate[date].soilTemp.push(temp);
			}
			if (moisture !== null && moisture !== undefined) {
				hoursByDate[date].soilMoisture.push(moisture);
			}
		}

		// Calculate averages for each date
		for (const date in hoursByDate) {
			const soilTempSum = hoursByDate[date].soilTemp.reduce((sum, temp) => sum + temp, 0);
			const soilMoistureSum = hoursByDate[date].soilMoisture.reduce(
				(sum, moisture) => sum + moisture,
				0
			);

			// Avoid division by zero if no valid data points were found for a day
			const soilTempCount = hoursByDate[date].soilTemp.length;
			const soilMoistureCount = hoursByDate[date].soilMoisture.length;

			const soilTempAvg = soilTempCount > 0 ? soilTempSum / soilTempCount : null;
			const soilMoistureAvg = soilMoistureCount > 0 ? soilMoistureSum / soilMoistureCount : null;

			dailyAverages[date] = {
				avg_soil_temp_6cm_c: soilTempAvg,
				avg_soil_moisture_3_9cm_m3m3: soilMoistureAvg
			};
		}
		// *** ADDED LOGGING ***
		console.log(
			`Calculated soil daily averages for dates: ${Object.keys(dailyAverages).join(', ')}`
		);
	} catch (error) {
		console.error('Error calculating daily soil averages:', error);
		return {}; // Return empty object on error
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
		// Use moment with the Philippines timezone
		const today = moment().tz('Asia/Manila');
		const fourDaysAgo = moment().tz('Asia/Manila').subtract(4, 'days');

		// Format dates for query
		const todayStr = today.format('YYYY-MM-DD');
		const fourDaysAgoStr = fourDaysAgo.format('YYYY-MM-DD');

		// Log detailed timezone information
		console.log('Timezone Information:', {
			serverUTC: moment.utc().format(),
			serverUTCDate: moment.utc().format('YYYY-MM-DD'),
			philippinesTime: today.format(),
			philippinesDate: todayStr,
			philippinesFourDaysAgo: fourDaysAgoStr,
			momentVersion: moment.version,
			defaultTimezone: moment.tz.guess(),
			manuallySetTimezone: 'Asia/Manila'
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
			const start = batchIndex * batchSize;
			const end = start + batchSize;
			citiesToProcess = metroManilaCities.slice(start, end);
			console.log(
				`Processing batch ${batchIndex + 1}: Cities ${start + 1} to ${Math.min(end, metroManilaCities.length)}`
			);
		} else {
			console.log('Processing all cities.');
		}
		results.citiesToProcess = citiesToProcess.map((c) => c.name);

		// Process cities in parallel
		const cityProcessingPromises = citiesToProcess.map(async (city) => {
			const cityStartTime = Date.now();
			let cityInsertedCount = 0;
			let cityUpdatedCount = 0;

			// Check timeout before processing each city
			if (Date.now() - startTime > TIMEOUT_THRESHOLD) {
				console.warn(`TIMEOUT reached before processing ${city.name}. Skipping.`);
				results.failed.push({ city: city.name, error: 'Timeout before processing' });
				return;
			}

			try {
				console.log(`--- Processing ${city.name} (ID: ${city.id}) ---`);

				// 1. Fetch AccuWeather Data
				const accuWeatherUrl = `http://dataservice.accuweather.com/forecasts/v1/daily/5day/${city.id}?apikey=${accuWeatherApiKey}&language=en-us&details=true&metric=true`;
				const weatherResponse = await fetch(accuWeatherUrl);
				if (!weatherResponse.ok) {
					throw new Error(
						`AccuWeather API error: ${weatherResponse.status} ${weatherResponse.statusText}`
					);
				}
				const weatherData = await weatherResponse.json();

				// *** ADDED LOGGING ***
				if (weatherData && weatherData.DailyForecasts) {
					const forecastDates = weatherData.DailyForecasts.map((f) =>
						moment(f.Date).tz('Asia/Manila').format('YYYY-MM-DD')
					);
					console.log(
						`AccuWeather for ${city.name}: Received ${weatherData.DailyForecasts.length} forecasts for dates: ${forecastDates.join(', ')}`
					);
				} else {
					console.warn(`AccuWeather for ${city.name}: No DailyForecasts array found in response.`);
					results.failed.push({
						city: city.name,
						error: 'Missing DailyForecasts from AccuWeather'
					});
					return; // Skip this city if no forecasts
				}

				// 2. Fetch Soil Data
				const soilRawData = await fetchSoilData(city.lat, city.lon);
				const soilDailyAverages = calculateDailyAverages(soilRawData); // Now handles potential null data

				// 3. Process Forecasts and Prepare for DB
				const forecastsToInsert = [];
				const forecastsToUpdate = [];
				const forecastDatesToCheck = [];

				// *** ADDED LOGGING ***
				console.log(
					`Processing ${weatherData.DailyForecasts.length} daily forecasts for ${city.name}...`
				);

				let forecasts = weatherData.DailyForecasts.map((forecast) => {
					try {
						const forecastDate = moment(forecast.Date).tz('Asia/Manila');
						const forecastDateStr = forecastDate.format('YYYY-MM-DD');
						// *** ADDED LOGGING ***
						console.log(` -> [${city.name}] Processing forecast for date: ${forecastDateStr}`);

						forecastDatesToCheck.push(forecastDateStr); // Add date for DB check

						const soilDataForDay = soilDailyAverages[forecastDateStr] || {}; // Use empty object if no soil data for the day

						// Helper to safely access nested properties
						const get = (obj, path, defaultValue = null) =>
							path
								.split('.')
								.reduce(
									(o, k) => (o && o[k] !== undefined && o[k] !== null ? o[k] : defaultValue),
									obj
								);

						// Map AccuWeather data to Supabase columns
						return {
							city_id: city.id,
							city_name: city.name,
							forecast_date: forecastDateStr,
							epoch_date: get(forecast, 'EpochDate'),
							sunrise_time: get(forecast, 'Sun.Rise')
								? moment(get(forecast, 'Sun.Rise')).toISOString()
								: null,
							sunset_time: get(forecast, 'Sun.Set')
								? moment(get(forecast, 'Sun.Set')).toISOString()
								: null,
							moon_phase: get(forecast, 'Moon.Phase'),

							// Temperatures
							min_temp_c: get(forecast, 'Temperature.Minimum.Value'),
							max_temp_c: get(forecast, 'Temperature.Maximum.Value'),
							avg_temp_c:
								(get(forecast, 'Temperature.Minimum.Value') +
									get(forecast, 'Temperature.Maximum.Value')) /
								2,
							min_realfeel_temp_c: get(forecast, 'RealFeelTemperature.Minimum.Value'),
							max_realfeel_temp_c: get(forecast, 'RealFeelTemperature.Maximum.Value'),
							avg_realfeel_temp_c:
								(get(forecast, 'RealFeelTemperature.Minimum.Value') +
									get(forecast, 'RealFeelTemperature.Maximum.Value')) /
								2, // Simplified avg
							min_realfeel_temp_shade_c: get(forecast, 'RealFeelTemperatureShade.Minimum.Value'),
							max_realfeel_temp_shade_c: get(forecast, 'RealFeelTemperatureShade.Maximum.Value'),
							avg_realfeel_temp_shade_c:
								(get(forecast, 'RealFeelTemperatureShade.Minimum.Value') +
									get(forecast, 'RealFeelTemperatureShade.Maximum.Value')) /
								2, // Simplified avg

							// Precipitation (Sum Day/Night)
							total_liquid_mm:
								(get(forecast, 'Day.TotalLiquid.Value', 0) ?? 0) +
								(get(forecast, 'Night.TotalLiquid.Value', 0) ?? 0),
							total_rain_mm:
								(get(forecast, 'Day.Rain.Value', 0) ?? 0) +
								(get(forecast, 'Night.Rain.Value', 0) ?? 0),
							total_ice_mm:
								(get(forecast, 'Day.Ice.Value', 0) ?? 0) +
								(get(forecast, 'Night.Ice.Value', 0) ?? 0),
							total_hours_precipitation:
								(get(forecast, 'Day.HoursOfPrecipitation', 0) ?? 0) +
								(get(forecast, 'Night.HoursOfPrecipitation', 0) ?? 0),
							total_hours_rain:
								(get(forecast, 'Day.HoursOfRain', 0) ?? 0) +
								(get(forecast, 'Night.HoursOfRain', 0) ?? 0),
							total_hours_ice:
								(get(forecast, 'Day.HoursOfIce', 0) ?? 0) +
								(get(forecast, 'Night.HoursOfIce', 0) ?? 0),

							// Probabilities (Day/Night separate)
							day_precipitation_probability: get(forecast, 'Day.PrecipitationProbability'),
							night_precipitation_probability: get(forecast, 'Night.PrecipitationProbability'),
							day_thunderstorm_probability: get(forecast, 'Day.ThunderstormProbability'),
							night_thunderstorm_probability: get(forecast, 'Night.ThunderstormProbability'),
							day_rain_probability: get(forecast, 'Day.RainProbability'),
							night_rain_probability: get(forecast, 'Night.RainProbability'),
							day_ice_probability: get(forecast, 'Day.IceProbability'),
							night_ice_probability: get(forecast, 'Night.IceProbability'),

							// Wind (Average Speed, Max Gust, Day/Night Direction)
							avg_wind_speed_kmh:
								((get(forecast, 'Day.Wind.Speed.Value', 0) ?? 0) +
									(get(forecast, 'Night.Wind.Speed.Value', 0) ?? 0)) /
								2,
							max_wind_gust_kmh: Math.max(
								get(forecast, 'Day.WindGust.Speed.Value', 0) ?? 0,
								get(forecast, 'Night.WindGust.Speed.Value', 0) ?? 0
							),
							day_wind_direction_deg: get(forecast, 'Day.Wind.Direction.Degrees'),
							day_wind_direction_loc: get(forecast, 'Day.Wind.Direction.Localized'),
							night_wind_direction_deg: get(forecast, 'Night.Wind.Direction.Degrees'),
							night_wind_direction_loc: get(forecast, 'Night.Wind.Direction.Localized'),

							// Humidity & Atmospheric (Min/Max/Avg RH, Avg Cloud, Total Evapo, Min/Max/Avg WetBulb)
							min_relative_humidity_percent: Math.min(
								get(forecast, 'Day.RelativeHumidity.Minimum', 101) ?? 101,
								get(forecast, 'Night.RelativeHumidity.Minimum', 101) ?? 101
							),
							max_relative_humidity_percent: Math.max(
								get(forecast, 'Day.RelativeHumidity.Maximum', -1) ?? -1,
								get(forecast, 'Night.RelativeHumidity.Maximum', -1) ?? -1
							),
							avg_relative_humidity_percent:
								((get(forecast, 'Day.RelativeHumidity.Average', 0) ?? 0) +
									(get(forecast, 'Night.RelativeHumidity.Average', 0) ?? 0)) /
								2,
							avg_cloud_cover_percent:
								((get(forecast, 'Day.CloudCover', 0) ?? 0) +
									(get(forecast, 'Night.CloudCover', 0) ?? 0)) /
								2,
							total_evapotranspiration_mm:
								(get(forecast, 'Day.Evapotranspiration.Value', 0) ?? 0) +
								(get(forecast, 'Night.Evapotranspiration.Value', 0) ?? 0),
							min_wetbulb_temp_c: Math.min(
								get(forecast, 'Day.WetBulbTemperature.Minimum.Value', 999) ?? 999,
								get(forecast, 'Night.WetBulbTemperature.Minimum.Value', 999) ?? 999
							),
							max_wetbulb_temp_c: Math.max(
								get(forecast, 'Day.WetBulbTemperature.Maximum.Value', -999) ?? -999,
								get(forecast, 'Night.WetBulbTemperature.Maximum.Value', -999) ?? -999
							),
							avg_wetbulb_temp_c:
								((get(forecast, 'Day.WetBulbTemperature.Average.Value', 0) ?? 0) +
									(get(forecast, 'Night.WetBulbTemperature.Average.Value', 0) ?? 0)) /
								2,

							// Soil Data (from Open-Meteo)
							avg_soil_temp_6cm_c: soilDataForDay.avg_soil_temp_6cm_c,
							avg_soil_moisture_3_9cm_m3m3: soilDataForDay.avg_soil_moisture_3_9cm_m3m3,

							// Meta
							fetched_at: new Date().toISOString() // Record when this specific processing happened
						};
					} catch (mapError) {
						// *** ADDED LOGGING ***
						const errorDate =
							forecast && forecast.Date
								? moment(forecast.Date).tz('Asia/Manila').format('YYYY-MM-DD')
								: 'unknown date';
						console.error(
							`Error mapping forecast data for ${city.name} on ${errorDate}:`,
							mapError
						);
						return null; // Return null if mapping fails for a specific day
					}
				}).filter((f) => f !== null); // Filter out any nulls caused by mapping errors

				// *** ADDED LOGGING ***
				console.log(`Successfully mapped ${forecasts.length} forecasts for ${city.name}.`);
				if (forecasts.length !== weatherData.DailyForecasts.length) {
					console.warn(
						`[${city.name}] Mismatch: Received ${weatherData.DailyForecasts.length} forecasts, but only mapped ${forecasts.length}. Check mapping errors above.`
					);
				}

				// 4. Check Existing Records in Supabase
				// *** ADDED LOGGING ***
				console.log(
					`Checking Supabase for existing records for ${city.name} on dates: ${forecastDatesToCheck.join(', ')}`
				);
				const { data: existingForecasts, error: selectError } = await supabase
					.from('apaw_weather_forecasts')
					.select('id, forecast_date') // Select id and date
					.eq('city_id', city.id)
					.in('forecast_date', forecastDatesToCheck);

				if (selectError) {
					console.error(`Supabase select error for ${city.name}:`, selectError);
					throw new Error(`Supabase select error: ${selectError.message}`);
				}

				const existingDates = new Map(existingForecasts.map((f) => [f.forecast_date, f.id]));
				// *** ADDED LOGGING ***
				console.log(
					`Found ${existingDates.size} existing records for ${city.name} for the checked dates.`
				);

				// 5. Segregate forecasts for insert or update
				forecasts.forEach((forecast) => {
					const existingId = existingDates.get(forecast.forecast_date);
					if (existingId) {
						// *** ADDED LOGGING ***
						console.log(
							` -> [${city.name}] Preparing UPDATE for date: ${forecast.forecast_date} (ID: ${existingId})`
						);
						forecastsToUpdate.push({ ...forecast, id: existingId }); // Add existing ID for update
					} else {
						// *** ADDED LOGGING ***
						console.log(` -> [${city.name}] Preparing INSERT for date: ${forecast.forecast_date}`);
						forecastsToInsert.push(forecast);
					}
				});

				// 6. Perform Database Operations (Update/Insert)
				if (forecastsToUpdate.length > 0) {
					// *** ADDED LOGGING ***
					console.log(
						`Attempting to UPSERT ${forecastsToUpdate.length} records for ${city.name}...`
					);
					const { error: upsertError } = await supabase
						.from('apaw_weather_forecasts')
						.upsert(forecastsToUpdate, { onConflict: 'city_id, forecast_date' }); // Use upsert for simplicity, matching on city_id and date

					if (upsertError) {
						console.error(`Supabase upsert error for ${city.name}:`, upsertError);
						// Decide if this should be a fatal error for the city or just logged
						// throw new Error(`Supabase upsert error: ${upsertError.message}`);
					} else {
						cityUpdatedCount = forecastsToUpdate.length;
						console.log(`Successfully UPSERTED ${cityUpdatedCount} records for ${city.name}.`);
					}
				}

				if (forecastsToInsert.length > 0) {
					// *** ADDED LOGGING ***
					console.log(
						`Attempting to INSERT ${forecastsToInsert.length} records for ${city.name}...`
					);
					const { error: insertError } = await supabase
						.from('apaw_weather_forecasts')
						.insert(forecastsToInsert);

					if (insertError) {
						console.error(`Supabase insert error for ${city.name}:`, insertError);
						// Decide if this should be a fatal error for the city or just logged
						// throw new Error(`Supabase insert error: ${insertError.message}`);
					} else {
						cityInsertedCount = forecastsToInsert.length;
						console.log(`Successfully INSERTED ${cityInsertedCount} records for ${city.name}.`);
					}
				}

				// 7. Perform Cleanup (Optional)
				if (!skipCleanup) {
					await performDatabaseCleanup(city, fourDaysAgoStr);
				} else {
					console.log(`Skipping database cleanup for ${city.name}.`);
				}

				// Record success for this city
				results.successful.push(city.name);
				results.totalInserted += cityInsertedCount;
				results.totalUpdated += cityUpdatedCount; // Assuming upsert counts as update
				results.totalProcessed++;
				console.log(`--- Finished processing ${city.name} in ${Date.now() - cityStartTime}ms ---`);
			} catch (cityError) {
				console.error(`!!! Error processing ${city.name}:`, cityError);
				results.failed.push({ city: city.name, error: cityError.message });
			}
		});

		// Wait for all city processing to complete
		await Promise.all(cityProcessingPromises);

		// Final results
		results.timeElapsed = (Date.now() - startTime) / 1000; // In seconds
		console.log('--- Weather Update Summary ---');
		console.log(`Total time: ${results.timeElapsed}s`);
		console.log(`Processed: ${results.totalProcessed} cities`);
		console.log(`Successful: ${results.successful.join(', ') || 'None'}`);
		console.log(
			`Failed: ${results.failed.map((f) => `${f.city} (${f.error})`).join(', ') || 'None'}`
		);
		console.log(`Total Records Inserted: ${results.totalInserted}`);
		console.log(`Total Records Updated/Upserted: ${results.totalUpdated}`);
		console.log('-----------------------------');

		return json(results);
	} catch (error) {
		console.error('!!! Unhandled error in POST /api/weather/update:', error);
		return json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
	}
}

// Helper function to perform database cleanup for a city
async function performDatabaseCleanup(city, cutoffDate) {
	console.log(
		`DATABASE CLEANUP for ${city.name}: Removing records with forecast_date < ${cutoffDate}`
	);
	try {
		const { data, error } = await supabase
			.from('apaw_weather_forecasts')
			.delete()
			.eq('city_id', city.id)
			.lt('forecast_date', cutoffDate); // Less than the cutoff date

		if (error) {
			console.error(`Database cleanup error for ${city.name}:`, error);
		} else {
			// Supabase delete doesn't directly return count in v2, data might be empty array or contain deleted records depending on RETURNING
			// We can infer count if needed by selecting before deleting, but for now, just log success.
			console.log(`Database cleanup successful for ${city.name} (records before ${cutoffDate}).`);
		}
	} catch (err) {
		// Catch potential network or other errors during cleanup
		console.error(`Exception during database cleanup for ${city.name}:`, err);
	}
}
