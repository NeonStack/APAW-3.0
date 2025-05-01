<script>
	import { onMount } from 'svelte';
	import { weatherData, selectedCity } from '$lib/stores/weatherStore.js';
	import Icon from '@iconify/svelte';
	import moment from 'moment';

	// Weather icon mappings (AccuWeather icon codes to Iconify icons)
	const weatherIcons = {
		1: 'wi:day-sunny', // Sunny
		2: 'wi:day-sunny', // Mostly Sunny
		3: 'wi:day-cloudy', // Partly Sunny
		4: 'wi:day-cloudy', // Intermittent Clouds
		5: 'wi:day-haze', // Hazy Sunshine
		6: 'wi:day-cloudy', // Mostly Cloudy
		7: 'wi:cloudy', // Cloudy
		8: 'wi:cloudy', // Dreary (Overcast)
		11: 'wi:fog', // Fog
		12: 'wi:showers', // Showers
		13: 'wi:day-showers', // Mostly Cloudy w/ Showers
		14: 'wi:day-rain', // Partly Sunny w/ Showers
		15: 'wi:thunderstorm', // T-Storms
		16: 'wi:day-thunderstorm', // Mostly Cloudy w/ T-Storms
		17: 'wi:day-thunderstorm', // Partly Sunny w/ T-Storms
		18: 'wi:rain', // Rain
		19: 'wi:snow', // Flurries
		20: 'wi:day-snow', // Mostly Cloudy w/ Flurries
		21: 'wi:day-snow', // Partly Sunny w/ Flurries
		22: 'wi:snow', // Snow
		23: 'wi:day-snow', // Mostly Cloudy w/ Snow
		24: 'wi:sleet', // Ice
		25: 'wi:sleet', // Sleet
		26: 'wi:rain-mix', // Freezing Rain
		29: 'wi:rain-mix', // Rain and Snow
		30: 'wi:hot', // Hot
		31: 'wi:snowflake-cold', // Cold
		32: 'wi:strong-wind', // Windy
		33: 'wi:night-clear', // Clear
		34: 'wi:night-alt-partly-cloudy', // Mostly Clear
		35: 'wi:night-alt-cloudy', // Partly Cloudy
		36: 'wi:night-alt-cloudy', // Intermittent Clouds
		37: 'wi:night-alt-haze', // Hazy Moonlight
		38: 'wi:night-alt-cloudy', // Mostly Cloudy
		39: 'wi:night-alt-showers', // Partly Cloudy w/ Showers
		40: 'wi:night-alt-showers', // Mostly Cloudy w/ Showers
		41: 'wi:night-alt-thunderstorm', // Partly Cloudy w/ T-Storms
		42: 'wi:night-alt-thunderstorm', // Mostly Cloudy w/ T-Storms
		43: 'wi:night-alt-snow', // Mostly Cloudy w/ Flurries
		44: 'wi:night-alt-snow', // Mostly Cloudy w/ Snow
		default: 'wi:na' // Not Available
	};

	// Helper to get appropriate weather icon
	function getWeatherIcon(iconCode) {
		return weatherIcons[iconCode] || weatherIcons.default;
	}

	// Data sorting and filtering
	let selectedDistrict = $state('all');
	let districts = ['all', '1st District', '2nd District', '3rd District', '4th District'];
	let sortOption = $state('name');
	let sortOptions = [
		{ value: 'name', label: 'City Name (A-Z)' },
		{ value: 'precipitation', label: 'Rain Probability (High-Low)' },
		{ value: 'temperature', label: 'Temperature (High-Low)' },
		{ value: 'rainfall', label: 'Rainfall mm (High-Low)' }
	];

	// Access store values directly in Svelte 5
	let weatherDataValue = $derived($weatherData);

	// Filtered cities list
	let filteredCities = $derived(
		weatherDataValue.data
			.filter((city) => {
				if (selectedDistrict === 'all') return true;

				// Fix: Match by city name instead of ID for more reliable filtering
				const cityInfo = metroManilaCities.find(
					(c) => c.name.toLowerCase() === city.city_name.toLowerCase()
				);
				return cityInfo && cityInfo.district === selectedDistrict;
			})
			.sort((a, b) => {
				if (sortOption === 'name') {
					return a.city_name.localeCompare(b.city_name);
				} else if (sortOption === 'precipitation') {
					// Sort by today's precipitation probability
					const aPrecip = a.forecasts?.[0]?.day_precipitation_probability || 0;
					const bPrecip = b.forecasts?.[0]?.day_precipitation_probability || 0;
					return bPrecip - aPrecip;
				} else if (sortOption === 'temperature') {
					// Sort by today's max temperature
					const aTemp = a.forecasts?.[0]?.max_temp_c || 0;
					const bTemp = b.forecasts?.[0]?.max_temp_c || 0;
					return bTemp - aTemp;
				} else if (sortOption === 'rainfall') {
					// Sort by rainfall mm
					const aRain = a.forecasts?.[0]?.total_rain_mm || 0;
					const bRain = b.forecasts?.[0]?.total_rain_mm || 0;
					return bRain - aRain;
				}
				return 0;
			})
	);

	// List of Metro Manila cities with their AccuWeather IDs (same as server side)
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

	// Function to get district based on city name
	function getDistrictByName(cityName) {
		if (!cityName) return ''; // Handle cases where name might be missing

		// Find matching city in metroManilaCities by name (case-insensitive)
		const cityInfo = metroManilaCities.find((c) => c.name.toLowerCase() === cityName.toLowerCase());

		return cityInfo ? cityInfo.district : ''; // Return district or empty string if not found
	}

	// Get today's date for comparison
	const today = $state(moment().format('YYYY-MM-DD'));

	// Function to determine if a date is today
	function isToday(dateStr) {
		return moment(dateStr).format('YYYY-MM-DD') === today;
	}

	// Format a date for display
	function formatDate(dateStr) {
		return moment(dateStr).format('MMM D');
	}

	// Format a date with day of week
	function formatFullDate(dateStr) {
		return moment(dateStr).format('dddd, MMMM D');
	}

	// Function to refresh weather data
	async function fetchWeatherData() {
		try {
			weatherData.update((current) => ({ ...current, loading: true, error: null }));

			const response = await fetch('/api/weather');
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			weatherData.set({
				loading: false,
				data,
				error: null,
				lastUpdated: new Date()
			});
		} catch (error) {
			console.error('Failed to load weather data:', error);
			weatherData.set({
				loading: false,
				data: [],
				error: error.message,
				lastUpdated: weatherDataValue.lastUpdated
			});
		}
	}

	// Function to update weather data from AccuWeather
	async function updateWeatherFromAccuweather() {
		try {
			weatherData.update((current) => ({ ...current, loading: true, error: null }));

			const response = await fetch('/api/weather', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
			}

			// After successful update, fetch the new data
			await fetchWeatherData();
		} catch (error) {
			console.error('Failed to update weather data:', error);
			weatherData.update((current) => ({
				...current,
				loading: false,
				error: `Update failed: ${error.message}`
			}));
		}
	}

	// Load weather data on component mount
	onMount(async () => {
		if (weatherDataValue.data.length === 0 && !weatherDataValue.loading) {
			await fetchWeatherData();
		}
	});

	// Helper function to get precipitation status
	function getPrecipitationStatus(probability) {
		if (probability === undefined || probability === null)
			return { text: 'N/A', color: 'gray-500' };

		if (probability >= 70) {
			return { text: 'High', color: 'red-600' };
		} else if (probability >= 30) {
			return { text: 'Moderate', color: 'orange-500' };
		} else if (probability > 0) {
			return { text: 'Low', color: 'green-600' };
		} else {
			return { text: 'None', color: 'blue-500' };
		}
	}

	// Helper function to format values with units
	function formatValue(value, unit, precision = 1) {
		if (value === undefined || value === null) return 'N/A';
		return `${Number(value).toFixed(precision)} ${unit}`;
	}
</script>

<div class="weather-tab flex h-full flex-col">
	<div class="mb-2 flex items-center justify-between">
		<h2 class="text-xl font-semibold text-gray-800">Metro Manila Weather</h2>

		<div class="flex space-x-2">
			<button
				class="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-sm text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-900"
				on:click={fetchWeatherData}
				disabled={weatherDataValue.loading}
			>
				<Icon icon="mdi:refresh" />
				Refresh
			</button>

			<button
				class="flex items-center gap-1 rounded bg-blue-600 px-2 py-1 text-sm text-white transition-colors hover:bg-blue-700"
				on:click={updateWeatherFromAccuweather}
				disabled={weatherDataValue.loading}
			>
				<Icon icon="mdi:cloud-download" />
				Update Forecast
			</button>
		</div>
	</div>

	{#if weatherDataValue.lastUpdated}
		<div class="mb-2 text-xs text-gray-500">
			Last updated: {moment(weatherDataValue.lastUpdated).format('MMM D, YYYY [at] h:mm A')}
		</div>
	{/if}

	<!-- Filters and sorting -->
	<div class="mb-3 flex flex-wrap gap-2 text-xs">
		<div class="flex items-center">
			<span class="mr-1">District:</span>
			<select bind:value={selectedDistrict} class="rounded border bg-white px-1.5 py-1 text-xs">
				{#each districts as district}
					<option value={district}>{district === 'all' ? 'All Districts' : district}</option>
				{/each}
			</select>
		</div>

		<div class="flex items-center">
			<span class="mr-1">Sort by:</span>
			<select bind:value={sortOption} class="rounded border bg-white px-1.5 py-1 text-xs">
				{#each sortOptions as option}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</div>
	</div>

	<!-- Content wrapper - Main scrollable area -->
	<div class="flex-1 overflow-auto">
		{#if weatherDataValue.loading}
			<div class="flex h-36 flex-col items-center justify-center">
				<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
				<p class="mt-2 text-sm text-gray-600">Loading weather data...</p>
			</div>
		{:else if weatherDataValue.error}
			<div class="rounded border border-gray-200 bg-gray-50 p-3 text-center">
				<Icon icon="mdi:alert-circle" class="text-lg text-red-600" />
				<p class="mt-1 text-sm text-gray-700">{weatherDataValue.error}</p>
				<button
					class="mt-2 rounded bg-blue-600 px-3 py-1 text-xs text-white"
					on:click={fetchWeatherData}>Try Again</button
				>
			</div>
		{:else if weatherDataValue.data.length === 0}
			<div class="rounded border border-gray-200 bg-gray-50 p-4 text-center">
				<p class="text-gray-600">No weather data available.</p>
				<button
					class="mt-2 rounded bg-blue-600 px-3 py-1 text-xs text-white"
					on:click={updateWeatherFromAccuweather}>Fetch Weather Data</button
				>
			</div>
		{:else if filteredCities.length === 0}
			<div class="rounded border border-gray-200 bg-gray-50 p-4 text-center">
				<p class="text-gray-600">No cities found for the selected district.</p>
				<button
					class="mt-2 rounded bg-blue-600 px-3 py-1 text-xs text-white"
					on:click={() => (selectedDistrict = 'all')}>Show All Districts</button
				>
			</div>
		{:else}
			<div class="space-y-1 pb-4">
				{#each filteredCities as city}
					{@const todayForecast = city.forecasts.find((f) => isToday(f.forecast_date))}

					{#if todayForecast}
						<div class="mb-5 rounded border border-gray-200 bg-white shadow-sm transition-all">
							<!-- City header - With district information -->
							<div class="flex flex-col border-l-3 border-l-blue-500 p-2">
								<div class="mb-1 flex items-center justify-between">
									<div class="flex items-center gap-1.5">
										<h3 class="font-medium text-gray-800">{city.city_name}</h3>
										<div
											class="rounded-sm bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600"
										>
                    {getDistrictByName(city.city_name)}
										</div>
									</div>
								</div>
								<!-- Add date on its own line with smaller text -->
								<div class="text-xs text-gray-500">
									<Icon icon="mdi:calendar" class="mr-0.5 inline-block text-xs" />
									{formatFullDate(todayForecast.forecast_date)}
								</div>
							</div>

							<!-- Weather info - Enhanced to show precipitation data prominently -->
							<div class="border-t border-gray-100 px-2 py-1.5">
								<!-- Today's weather summary -->
								<div class="mb-2 flex items-center justify-between">
									<!-- Left: Temperature and conditions -->
									<div class="flex items-center gap-3">
										<!-- Weather icon -->
										<div class="flex h-10 w-10 items-center justify-center text-blue-500">
											<Icon icon={getWeatherIcon(todayForecast.day_icon)} width="32" />
										</div>

										<!-- Temperature -->
										<div>
											<div class="flex items-baseline">
												<span class="text-xl font-bold"
													>{Math.round(todayForecast.max_temp_c)}°C</span
												>
												<span class="ml-1 text-xs text-gray-500"
													>/ {Math.round(todayForecast.min_temp_c)}°C</span
												>
											</div>
											<div class="text-sm text-gray-700">{todayForecast.day_icon_phrase}</div>
										</div>
									</div>

									<!-- Right: Precipitation data (both probability and amount) -->
									<div class="flex flex-col items-end">
										<div class="flex items-center">
											<Icon icon="mdi:water" class="mr-1 text-blue-500" />
											<span class="font-medium">
												{todayForecast.day_precipitation_probability !== undefined
													? `${todayForecast.day_precipitation_probability}%`
													: 'N/A'}
											</span>
										</div>
										<div class="text-xs font-medium text-blue-600">
											{formatValue(todayForecast.total_rain_mm, 'mm')} rainfall
										</div>
									</div>
								</div>

								<!-- Forecast metrics - Enhanced with more precipitation data -->
								<div class="mb-2 grid grid-cols-4 gap-1 text-xs">
									<div class="rounded border border-blue-100 bg-blue-50 p-1">
										<div class="text-blue-700">Rain</div>
										<div class="font-medium">{formatValue(todayForecast.total_rain_mm, 'mm')}</div>
									</div>
									<div class="rounded bg-gray-50 p-1">
										<div class="text-gray-500">Humidity</div>
										<div class="font-medium">{todayForecast.avg_relative_humidity_percent}%</div>
									</div>
									<div class="rounded bg-gray-50 p-1">
										<div class="text-gray-500">Wind</div>
										<div class="font-medium">
											{Math.round(todayForecast.avg_wind_speed_kmh)} km/h
										</div>
									</div>
									<div class="rounded bg-gray-50 p-1">
										<div class="text-gray-500">Hours of Rain</div>
										<div class="font-medium">{todayForecast.total_hours_rain || 0} hrs</div>
									</div>
								</div>

								<!-- Additional precipitation metrics focused on flood prediction -->
								<div class="grid grid-cols-3 gap-1 text-xs">
									<div class="rounded border border-blue-100 bg-blue-50 p-1">
										<div class="text-blue-700">Total Liquid</div>
										<div class="font-medium">
											{formatValue(todayForecast.total_liquid_mm, 'mm')}
										</div>
									</div>
									<div class="rounded border border-blue-100 bg-blue-50 p-1">
										<div class="text-blue-700">Thunder Prob.</div>
										<div class="font-medium">{todayForecast.day_thunderstorm_probability}%</div>
									</div>
									<div class="rounded border border-blue-100 bg-blue-50 p-1">
										<div class="text-blue-700">Max Gust</div>
										<div class="font-medium">
											{formatValue(todayForecast.max_wind_gust_kmh, 'km/h', 0)}
										</div>
									</div>
								</div>
							</div>

							<!-- Forecast details - Expanded to show all available data -->
							<details class="border-t border-gray-100 text-sm">
								<summary
									class="flex cursor-pointer items-center bg-gray-50 px-2 py-1 text-xs text-gray-600 hover:text-gray-900"
								>
									<Icon icon="mdi:calendar-range" class="mr-1 text-xs" /> 4-Day Forecast
								</summary>
								<div class="grid grid-cols-4 gap-1 bg-gray-50 p-2 text-xs">
									{#each city.forecasts.filter((f) => !isToday(f.forecast_date)) as forecast}
										<div class="flex flex-col items-center rounded border bg-white p-1">
											<div class="text-gray-500">{formatDate(forecast.forecast_date)}</div>
											<div class="my-1">
												<Icon
													icon={getWeatherIcon(forecast.day_icon)}
													class="text-blue-500"
													width="20"
												/>
											</div>
											<div class="font-medium">{Math.round(forecast.max_temp_c)}°</div>
											<div class="font-medium text-blue-600">
												{formatValue(forecast.total_rain_mm, 'mm')}
											</div>
											<div class="text-xs text-gray-500">
												{forecast.day_precipitation_probability}%</div>
										</div>
									{/each}
								</div>
							</details>

							<!-- All detailed weather data -->
							<details class="border-t border-gray-100 text-sm">
								<summary
									class="flex cursor-pointer items-center bg-gray-50 px-2 py-1 text-xs text-gray-600 hover:text-gray-900"
								>
									<Icon icon="mdi:information-outline" class="mr-1 text-xs" /> All Weather Data
								</summary>
								<div class="bg-gray-50 p-2 text-xs">
									<div class="grid grid-cols-2 gap-1 md:grid-cols-3">
										<!-- Temperature data -->
										<div class="rounded border bg-white p-2">
											<h4 class="mb-1 font-medium text-gray-700">Temperature</h4>
											<div class="space-y-1">
												<div class="flex justify-between">
													<span>Min:</span>
													<span>{formatValue(todayForecast.min_temp_c, '°C')}</span>
												</div>
												<div class="flex justify-between">
													<span>Max:</span>
													<span>{formatValue(todayForecast.max_temp_c, '°C')}</span>
												</div>
												<div class="flex justify-between">
													<span>Avg:</span>
													<span>{formatValue(todayForecast.avg_temp_c, '°C')}</span>
												</div>
												<div class="flex justify-between">
													<span>RealFeel Min:</span>
													<span>{formatValue(todayForecast.min_realfeel_temp_c, '°C')}</span>
												</div>
												<div class="flex justify-between">
													<span>RealFeel Max:</span>
													<span>{formatValue(todayForecast.max_realfeel_temp_c, '°C')}</span>
												</div>
											</div>
										</div>

										<!-- Precipitation data -->
										<div class="rounded border bg-white p-2">
											<h4 class="mb-1 font-medium text-gray-700">Precipitation</h4>
											<div class="space-y-1">
												<div class="flex justify-between">
													<span>Total Liquid:</span>
													<span>{formatValue(todayForecast.total_liquid_mm, 'mm')}</span>
												</div>
												<div class="flex justify-between">
													<span>Rain:</span>
													<span>{formatValue(todayForecast.total_rain_mm, 'mm')}</span>
												</div>
												<div class="flex justify-between">
													<span>Ice:</span>
													<span>{formatValue(todayForecast.total_ice_mm, 'mm')}</span>
												</div>
												<div class="flex justify-between">
													<span>Hours Precip:</span>
													<span>{todayForecast.total_hours_precipitation || 0} hrs</span>
												</div>
												<div class="flex justify-between">
													<span>Hours Rain:</span>
													<span>{todayForecast.total_hours_rain || 0} hrs</span>
												</div>
											</div>
										</div>

										<!-- Probabilities -->
										<div class="rounded border bg-white p-2">
											<h4 class="mb-1 font-medium text-gray-700">Probabilities</h4>
											<div class="space-y-1">
												<div class="flex justify-between">
													<span>Precipitation (Day):</span>
													<span>{todayForecast.day_precipitation_probability}%</span>
												</div>
												<div class="flex justify-between">
													<span>Precipitation (Night):</span>
													<span>{todayForecast.night_precipitation_probability}%</span>
												</div>
												<div class="flex justify-between">
													<span>Thunderstorm (Day):</span>
													<span>{todayForecast.day_thunderstorm_probability}%</span>
												</div>
												<div class="flex justify-between">
													<span>Thunderstorm (Night):</span>
													<span>{todayForecast.night_thunderstorm_probability}%</span>
												</div>
											</div>
										</div>

										<!-- Wind data -->
										<div class="rounded border bg-white p-2">
											<h4 class="mb-1 font-medium text-gray-700">Wind</h4>
											<div class="space-y-1">
												<div class="flex justify-between">
													<span>Avg Speed:</span>
													<span>{formatValue(todayForecast.avg_wind_speed_kmh, 'km/h', 0)}</span>
												</div>
												<div class="flex justify-between">
													<span>Max Gust:</span>
													<span>{formatValue(todayForecast.max_wind_gust_kmh, 'km/h', 0)}</span>
												</div>
												<div class="flex justify-between">
													<span>Day Direction:</span>
													<span>{todayForecast.day_wind_direction_loc || 'N/A'}</span>
												</div>
												<div class="flex justify-between">
													<span>Night Direction:</span>
													<span>{todayForecast.night_wind_direction_loc || 'N/A'}</span>
												</div>
											</div>
										</div>

										<!-- Humidity data -->
										<div class="rounded border bg-white p-2">
											<h4 class="mb-1 font-medium text-gray-700">Humidity & Atmosphere</h4>
											<div class="space-y-1">
												<div class="flex justify-between">
													<span>Min Humidity:</span>
													<span>{todayForecast.min_relative_humidity_percent}%</span>
												</div>
												<div class="flex justify-between">
													<span>Max Humidity:</span>
													<span>{todayForecast.max_relative_humidity_percent}%</span>
												</div>
												<div class="flex justify-between">
													<span>Avg Humidity:</span>
													<span>{todayForecast.avg_relative_humidity_percent}%</span>
												</div>
												<div class="flex justify-between">
													<span>Cloud Cover:</span>
													<span>{todayForecast.avg_cloud_cover_percent}%</span>
												</div>
												<div class="flex justify-between">
													<span>Evapotranspiration:</span>
													<span>{formatValue(todayForecast.total_evapotranspiration_mm, 'mm')}</span
													>
												</div>
											</div>
										</div>

										<!-- Additional meteorological data -->
										<div class="rounded border bg-white p-2">
											<h4 class="mb-1 font-medium text-gray-700">Heat Indices</h4>
											<div class="space-y-1">
												<div class="flex justify-between">
													<span>Avg WetBulb Temp:</span>
													<span>{formatValue(todayForecast.avg_wetbulb_temp_c, '°C')}</span>
												</div>
												<div class="flex justify-between">
													<span>Min WetBulb Temp:</span>
													<span>{formatValue(todayForecast.min_wetbulb_temp_c, '°C')}</span>
												</div>
												<div class="flex justify-between">
													<span>Max WetBulb Temp:</span>
													<span>{formatValue(todayForecast.max_wetbulb_temp_c, '°C')}</span>
												</div>
												<div class="flex justify-between">
													<span>Avg WBGT:</span>
													<span>{formatValue(todayForecast.avg_wbgt_c, '°C')}</span>
												</div>
											</div>
										</div>
									</div>

									<!-- Headline data if available -->
									{#if todayForecast.headline_text}
										<div class="mt-2 rounded border border-yellow-200 bg-yellow-50 p-2">
											<div class="font-medium text-yellow-800">{todayForecast.headline_text}</div>
											{#if todayForecast.headline_category}
												<div class="text-yellow-600">
													Category: {todayForecast.headline_category} (Severity: {todayForecast.headline_severity})
												</div>
											{/if}
										</div>
									{/if}
								</div>
							</details>
						</div>
					{/if}
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	/* Add custom border width */
	.border-l-3 {
		border-left-width: 3px;
	}
</style>
