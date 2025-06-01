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
	
	// Streamlined sort options with both high-to-low and low-to-high options
	let sortOptions = [
		{ value: 'name', label: 'City Name (A-Z)' },
		{ value: 'name-desc', label: 'City Name (Z-A)' },
		{ value: 'precipitation', label: 'Rain Probability (High-Low)' },
		{ value: 'precipitation-asc', label: 'Rain Probability (Low-High)' },
		{ value: 'temperature', label: 'Temperature (High-Low)' },
		{ value: 'temperature-asc', label: 'Temperature (Low-High)' },
		{ value: 'rainfall', label: 'Rainfall mm (High-Low)' },
		{ value: 'rainfall-asc', label: 'Rainfall mm (Low-High)' },
		{ value: 'windgust', label: 'Wind Gust (High-Low)' },
		{ value: 'windgust-asc', label: 'Wind Gust (Low-High)' }
	];

	// Access store values directly in Svelte 5
	let weatherDataValue = $derived($weatherData);
	
	// Global date selection
	let selectedDate = $state(moment().format('YYYY-MM-DD'));
	let availableDates = $derived(getAvailableDates(weatherDataValue.data));
	
	// Function to get all available dates from weather data (today and future only)
	function getAvailableDates(cities) {
		if (!cities || cities.length === 0) return [];
		
		// Collect all unique dates from all cities
		const dateSet = new Set();
		const today = moment().startOf('day');
		
		cities.forEach(city => {
			city.forecasts.forEach(forecast => {
				const forecastDate = moment(forecast.forecast_date);
				// Only include today and future dates
				if (forecastDate.isSameOrAfter(today)) {
					dateSet.add(forecast.forecast_date);
				}
			});
		});
		
		// Convert to array and sort
		return [...dateSet].sort();
	}
	
	// Function to get forecast for the selected date
	function getForecastForDate(cityData, dateStr) {
		return cityData.forecasts.find(f => f.forecast_date === dateStr) || null;
	}

	// Helper function to get today's forecast from city data - improved for accuracy
	function getTodayForecast(cityData) {
		const todayFormatted = moment().format('YYYY-MM-DD');
		const todayForecast = cityData.forecasts.find(f => 
			moment(f.forecast_date).format('YYYY-MM-DD') === todayFormatted
		);
		
		// Return today's forecast if found, otherwise return the first forecast
		return todayForecast || cityData.forecasts[0];
	}

	// Filter forecasts to only show today and future dates
	function filterForecastsFromToday(forecasts) {
		const todayStart = moment().startOf('day');
		return forecasts.filter(forecast => 
			moment(forecast.forecast_date).isSameOrAfter(todayStart)
		);
	}

	// Watch for sort option changes and refresh data
	$effect(() => {
		if (sortOption || selectedDate) {
			// Small delay to allow reactivity to settle
			setTimeout(() => {
				// Force refresh of the derived value
				weatherData.update(data => ({...data}));
			}, 10);
		}
	});

	// Updated filtered cities list with sorting based on selected date - now includes ascending options
	let filteredCities = $derived(
		weatherDataValue.data
			.filter((city) => {
				if (selectedDistrict === 'all') return true;

				// Match by city name instead of ID for more reliable filtering
				const cityInfo = metroManilaCities.find(
					(c) => c.name.toLowerCase() === city.city_name.toLowerCase()
				);
				return cityInfo && cityInfo.district === selectedDistrict;
			})
			.sort((a, b) => {
				// Get selected date's forecast for each city for accurate sorting
				const aForecast = getForecastForDate(a, selectedDate);
				const bForecast = getForecastForDate(b, selectedDate);

				// Check if forecasts exist
				if (!aForecast && !bForecast) return 0;
				if (!aForecast) return 1;
				if (!bForecast) return -1;

				if (sortOption === 'name') {
					return a.city_name.localeCompare(b.city_name);
				} else if (sortOption === 'name-desc') {
					return b.city_name.localeCompare(a.city_name);
				} else if (sortOption === 'precipitation') {
					// Convert to numbers and compare
					const aPrecip = Number(aForecast.day_precipitation_probability) || 0;
					const bPrecip = Number(bForecast.day_precipitation_probability) || 0;
					return bPrecip - aPrecip;
				} else if (sortOption === 'precipitation-asc') {
					const aPrecip = Number(aForecast.day_precipitation_probability) || 0;
					const bPrecip = Number(bForecast.day_precipitation_probability) || 0;
					return aPrecip - bPrecip;
				} else if (sortOption === 'temperature') {
					const aTemp = Number(aForecast.max_temp_c) || 0;
					const bTemp = Number(bForecast.max_temp_c) || 0;
					return bTemp - aTemp;
				} else if (sortOption === 'temperature-asc') {
					const aTemp = Number(aForecast.max_temp_c) || 0;
					const bTemp = Number(bForecast.max_temp_c) || 0;
					return aTemp - bTemp;
				} else if (sortOption === 'rainfall') {
					const aRain = Number(aForecast.total_rain_mm) || 0;
					const bRain = Number(bForecast.total_rain_mm) || 0;
					return bRain - aRain;
				} else if (sortOption === 'rainfall-asc') {
					const aRain = Number(aForecast.total_rain_mm) || 0;
					const bRain = Number(bForecast.total_rain_mm) || 0;
					return aRain - bRain;
				} else if (sortOption === 'windgust') {
					const aGust = Number(aForecast.max_wind_gust_kmh) || 0;
					const bGust = Number(bForecast.max_wind_gust_kmh) || 0;
					return bGust - aGust;
				} else if (sortOption === 'windgust-asc') {
					const aGust = Number(aForecast.max_wind_gust_kmh) || 0;
					const bGust = Number(bForecast.max_wind_gust_kmh) || 0;
					return aGust - bGust;
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

	// Function to determine if a date is in the future
	function isFutureDate(dateStr) {
		return moment(dateStr).isAfter(moment().startOf('day'));
	}

	// Format a date for display
	function formatDate(dateStr) {
		return moment(dateStr).format('MMMM D, YYYY');
	}

	// Format a date with day of week
	function formatFullDate(dateStr) {
		return moment(dateStr).format('MMMM D, YYYY - dddd');
	}

	// Format timestamp for display
	function formatTimestamp(timestamp) {
		return moment(timestamp).format('MMMM D, YYYY - dddd [at] h:mm A');
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

			// Manual update from website (no API key needed, uses referer check)
			const response = await fetch('/api/weather/update', {
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
	
	// Selected date index tracking (per city)
	let selectedDateIndexes = $state({});
	
	// Improved toggle function for day details - show selected date and hide others
	function toggleDayDetails(cityIndex, dateIndex) {
		// Store the selected date index for this city
		selectedDateIndexes[cityIndex] = dateIndex;
		
		// Force component update
		selectedDateIndexes = {...selectedDateIndexes};
	}
	
	// Screen size detection for responsive layout
	let isMobile = $state(false);
	
	onMount(() => {
		// Check initial screen size
		checkScreenSize();
		
		// Add event listener for screen size changes
		window.addEventListener('resize', checkScreenSize);
		
		// Cleanup on component destroy
		return () => {
			window.removeEventListener('resize', checkScreenSize);
		};
	});
	
	function checkScreenSize() {
		isMobile = window.innerWidth < 768;
	}

	// Format a date with a more user-friendly label
	function formatDateWithLabel(dateStr) {
		const dateObj = moment(dateStr);
		const today = moment().startOf('day');
		const tomorrow = moment().add(1, 'day').startOf('day');
		
		if (dateObj.isSame(today, 'day')) {
			return `Today (${dateObj.format('MMMM D, YYYY')})`;
		} else if (dateObj.isSame(tomorrow, 'day')) {
			return `Tomorrow (${dateObj.format('MMMM D, YYYY')})`;
		} else {
			return `${dateObj.format('MMMM D, YYYY - dddd')}`;
		}
	}

	// Add filter visibility toggle
	let showFilters = $state(false);
</script>

<div class="weather-tab flex h-full flex-col">
	<div class="mb-2 flex items-center justify-between flex-wrap gap-2">
		<h2 class="text-xl font-semibold text-gray-800">Metro Manila Weather</h2>

		<div class="flex gap-2">
			<button
				class="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-sm text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-900"
				on:click={fetchWeatherData}
				disabled={weatherDataValue.loading}
			>
				<Icon icon="mdi:refresh" />
				Refresh
			</button>
			
			<!-- Filter toggle button -->
			<button
				class="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-sm text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-900"
				on:click={() => showFilters = !showFilters}
			>
				<Icon icon={showFilters ? "mdi:filter-off" : "mdi:filter"} />
				{showFilters ? 'Hide Filters' : 'Show Filters'}
			</button>
		</div>
	</div>

	<!-- Collapsible filter section -->
	{#if showFilters}
		<div class="mb-2 bg-gray-50 p-2 rounded-md border border-gray-200 transition-all">
			<div class="flex flex-wrap gap-3 text-xs">
				<div class="filter-group">
					<div class="font-medium mb-1 text-gray-700">Date</div>
					<select bind:value={selectedDate} class="rounded border bg-white px-2 py-1.5 text-xs w-full min-w-[180px]">
						{#each availableDates as date}
							<option value={date}>{formatDateWithLabel(date)}</option>
						{/each}
					</select>
				</div>
				
				<div class="filter-group">
					<div class="font-medium mb-1 text-gray-700">District</div>
					<select bind:value={selectedDistrict} class="rounded border bg-white px-2 py-1.5 text-xs w-full min-w-[150px]">
						{#each districts as district}
							<option value={district}>{district === 'all' ? 'All Districts' : district}</option>
						{/each}
					</select>
				</div>

				<div class="filter-group">
					<div class="font-medium mb-1 text-gray-700">Sort by</div>
					<select bind:value={sortOption} class="rounded border bg-white px-2 py-1.5 text-xs w-full min-w-[180px]">
						<optgroup label="Name">
							{#each sortOptions.filter(o => o.value.includes('name')) as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</optgroup>
						<optgroup label="Temperature">
							{#each sortOptions.filter(o => o.value.includes('temperature')) as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</optgroup>
						<optgroup label="Precipitation">
							{#each sortOptions.filter(o => o.value.includes('precipitation')) as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</optgroup>
						<optgroup label="Rainfall">
							{#each sortOptions.filter(o => o.value.includes('rainfall')) as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</optgroup>
						<optgroup label="Wind">
							{#each sortOptions.filter(o => o.value.includes('windgust')) as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</optgroup>
					</select>
				</div>
				
				<div class="ml-auto text-right text-xs text-gray-500 self-end">
					<div>Showing {filteredCities.length} of {weatherDataValue.data.length} cities</div>
					{#if weatherDataValue.lastUpdated}
						<div class="mt-1">Last updated: {moment(weatherDataValue.lastUpdated).format('MMM D, h:mm A')}</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
	
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
					{@const forecast = getForecastForDate(city, selectedDate)}
					
					{#if forecast}
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
								
								<!-- Date and Fetched timestamp -->
								<div class="flex flex-col text-xs text-gray-500">
									<div>
										<Icon icon="mdi:calendar" class="mr-0.5 inline-block text-xs" />
										<span class="font-medium">{formatFullDate(forecast.forecast_date)}</span> • 
										Last updated: {formatTimestamp(forecast.fetched_at)}
									</div>
								</div>
							</div>

							<!-- Weather info for the selected date -->
							<div class="border-t border-gray-100 p-3">
								<!-- Weather summary - simplified layout -->
								<div class="mb-3 flex flex-wrap md:items-center justify-between gap-2">
									<!-- Left: Temperature and conditions -->
									<div class="flex items-center gap-3">
										<!-- Weather icon -->
										<div class="flex h-12 w-12 items-center justify-center text-blue-500">
											<Icon icon={getWeatherIcon(forecast.day_icon)} width="40" />
										</div>

										<!-- Temperature -->
										<div>
											<div class="flex items-baseline">
												<span class="text-2xl font-bold"
													>{Math.round(forecast.max_temp_c)}°C</span
												>
												<span class="ml-1 text-sm text-gray-500"
													>/ {Math.round(forecast.min_temp_c)}°C</span
												>
											</div>
											<div class="text-sm">{forecast.day_icon_phrase}</div>
											<div class="text-xs text-gray-600">{forecast.day_short_phrase}</div>
										</div>
									</div>

									<!-- Right: Precipitation data -->
									<div class="flex flex-col">
										<div class="flex items-center">
											<Icon icon="mdi:water" class="mr-1 text-blue-500" />
											<span class="font-medium">
												{forecast.day_precipitation_probability !== undefined
													? `${forecast.day_precipitation_probability}%`
													: 'N/A'}
												<span class="text-sm ml-1">chance of rain</span>
											</span>
										</div>
									</div>
								</div>

								<!-- Key weather metrics - Cleaned up layout -->
								<div class="mb-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
									<div class="rounded border border-blue-100 bg-blue-50 p-2">
										<div class="text-blue-700">Rain</div>
										<div class="font-medium">{formatValue(forecast.total_rain_mm, 'mm')}</div>
									</div>
									<div class="rounded bg-gray-50 p-2 border">
										<div class="text-gray-500">Humidity</div>
										<div class="font-medium">{forecast.avg_relative_humidity_percent}%</div>
									</div>
									<div class="rounded bg-gray-50 p-2 border">
										<div class="text-gray-500">Wind Speed</div>
										<div class="font-medium">
											{Math.round(forecast.avg_wind_speed_kmh)} km/h
										</div>
									</div>
									<div class="rounded bg-gray-50 p-2 border">
										<div class="text-gray-500">Wind Gust</div>
										<div class="font-medium">
											{Math.round(forecast.max_wind_gust_kmh)} km/h
										</div>
									</div>
								</div>

								<!-- Additional weather metrics -->
								<div class="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm mb-3">
									<div class="rounded border border-blue-100 bg-blue-50 p-2">
											<div class="text-blue-700">Hours of Rain</div>
											<div class="font-medium">{forecast.total_hours_rain || 0} hrs</div>
										</div>
										<div class="rounded border border-blue-100 bg-blue-50 p-2">
											<div class="text-blue-700">Thunder Prob.</div>
											<div class="font-medium">{forecast.day_thunderstorm_probability}%</div>
										</div>
										<div class="rounded border border-blue-100 bg-blue-50 p-2">
											<div class="text-blue-700">Cloud Cover</div>
											<div class="font-medium">{forecast.avg_cloud_cover_percent}%</div>
										</div>
								</div>

								<!-- Detailed weather data accordion -->
								<details class="border rounded mb-2">
									<summary class="cursor-pointer px-3 py-2 bg-gray-50 text-sm font-medium">
										Detailed Weather Data
									</summary>
									<div class="p-3">
										<!-- Sunrise/Sunset information -->
										<div class="border rounded p-2 bg-gray-50 flex flex-wrap justify-around text-sm mb-3">
											<div class="flex items-center">
												<Icon icon="mdi:weather-sunset-up" class="mr-1 text-orange-500" />
												Sunrise: {moment(forecast.sunrise_time).format('h:mm A')}
											</div>
											<div class="flex items-center">
												<Icon icon="mdi:weather-sunset-down" class="mr-1 text-purple-500" />
												Sunset: {moment(forecast.sunset_time).format('h:mm A')}
											</div>
											<div class="flex items-center">
												<Icon icon="mdi:moon-waning-gibbous" class="mr-1 text-blue-500" />
												Moon: {forecast.moon_phase}
											</div>
										</div>
										
										<!-- Detailed metrics grid -->
										<div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
											<!-- Temperature data -->
											<div class="rounded border bg-white p-2">
												<h4 class="mb-1 font-medium text-gray-700">Temperature</h4>
												<div class="space-y-1">
													<div class="flex justify-between">
														<span>Min:</span>
														<span>{formatValue(forecast.min_temp_c, '°C')}</span>
													</div>
													<div class="flex justify-between">
														<span>Max:</span>
														<span>{formatValue(forecast.max_temp_c, '°C')}</span>
													</div>
													<div class="flex justify-between">
														<span>Avg:</span>
														<span>{formatValue(forecast.avg_temp_c, '°C')}</span>
													</div>
													<div class="flex justify-between">
														<span>RealFeel Min:</span>
														<span>{formatValue(forecast.min_realfeel_temp_c, '°C')}</span>
													</div>
													<div class="flex justify-between">
														<span>RealFeel Max:</span>
														<span>{formatValue(forecast.max_realfeel_temp_c, '°C')}</span>
													</div>
												</div>
											</div>

											<!-- Precipitation data - added Total Liquid -->
											<div class="rounded border bg-white p-2">
												<h4 class="mb-1 font-medium text-gray-700">Precipitation</h4>
												<div class="space-y-1">
													<div class="flex justify-between">
														<span>Total Liquid:</span>
														<span>{formatValue(forecast.total_liquid_mm, 'mm')}</span>
													</div>
													<div class="flex justify-between">
														<span>Rain:</span>
														<span>{formatValue(forecast.total_rain_mm, 'mm')}</span>
													</div>
													<div class="flex justify-between">
														<span>Ice:</span>
														<span>{formatValue(forecast.total_ice_mm, 'mm')}</span>
													</div>
													<div class="flex justify-between">
														<span>Hours Precip:</span>
														<span>{forecast.total_hours_precipitation || 0} hrs</span>
													</div>
													<div class="flex justify-between">
														<span>Hours Rain:</span>
														<span>{forecast.total_hours_rain || 0} hrs</span>
													</div>
												</div>
											</div>

											<!-- Probabilities -->
											<div class="rounded border bg-white p-2">
												<h4 class="mb-1 font-medium text-gray-700">Probabilities</h4>
												<div class="space-y-1">
													<div class="flex justify-between">
														<span>Precipitation (Day):</span>
														<span>{forecast.day_precipitation_probability}%</span>
													</div>
													<div class="flex justify-between">
														<span>Precipitation (Night):</span>
														<span>{forecast.night_precipitation_probability}%</span>
													</div>
													<div class="flex justify-between">
														<span>Thunderstorm (Day):</span>
														<span>{forecast.day_thunderstorm_probability}%</span>
													</div>
													<div class="flex justify-between">
														<span>Thunderstorm (Night):</span>
														<span>{forecast.night_thunderstorm_probability}%</span>
													</div>
												</div>
											</div>

											<!-- Wind data -->
											<div class="rounded border bg-white p-2">
												<h4 class="mb-1 font-medium text-gray-700">Wind</h4>
												<div class="space-y-1">
													<div class="flex justify-between">
														<span>Avg Speed:</span>
														<span>{formatValue(forecast.avg_wind_speed_kmh, 'km/h', 0)}</span>
													</div>
													<div class="flex justify-between">
														<span>Max Gust:</span>
														<span>{formatValue(forecast.max_wind_gust_kmh, 'km/h', 0)}</span>
													</div>
													<div class="flex justify-between">
														<span>Day Direction:</span>
														<span>{forecast.day_wind_direction_loc || 'N/A'}</span>
													</div>
													<div class="flex justify-between">
														<span>Night Direction:</span>
														<span>{forecast.night_wind_direction_loc || 'N/A'}</span>
													</div>
												</div>
											</div>

											<!-- Humidity data -->
											<div class="rounded border bg-white p-2">
												<h4 class="mb-1 font-medium text-gray-700">Humidity & Atmosphere</h4>
												<div class="space-y-1">
													<div class="flex justify-between">
														<span>Min Humidity:</span>
														<span>{forecast.min_relative_humidity_percent}%</span>
													</div>
													<div class="flex justify-between">
														<span>Max Humidity:</span>
														<span>{forecast.max_relative_humidity_percent}%</span>
													</div>
													<div class="flex justify-between">
														<span>Avg Humidity:</span>
														<span>{forecast.avg_relative_humidity_percent}%</span>
													</div>
													<div class="flex justify-between">
														<span>Cloud Cover:</span>
														<span>{forecast.avg_cloud_cover_percent}%</span>
													</div>
													<div class="flex justify-between">
														<span>Evapotranspiration:</span>
														<span>{formatValue(forecast.total_evapotranspiration_mm, 'mm')}</span>
													</div>
												</div>
											</div>

											<!-- Additional meteorological data -->
											<div class="rounded border bg-white p-2">
												<h4 class="mb-1 font-medium text-gray-700">Heat Indices</h4>
												<div class="space-y-1">
													<div class="flex justify-between">
														<span>Avg WetBulb Temp:</span>
														<span>{formatValue(forecast.avg_wetbulb_temp_c, '°C')}</span>
													</div>
													<div class="flex justify-between">
														<span>Min WetBulb Temp:</span>
														<span>{formatValue(forecast.min_wetbulb_temp_c, '°C')}</span>
													</div>
													<div class="flex justify-between">
														<span>Max WetBulb Temp:</span>
														<span>{formatValue(forecast.max_wetbulb_temp_c, '°C')}</span>
													</div>
													<div class="flex justify-between">
														<span>Avg WBGT:</span>
														<span>{formatValue(forecast.avg_wbgt_c, '°C')}</span>
													</div>
												</div>
											</div>
										</div>

										<!-- Headline data if available -->
										{#if forecast.headline_text}
											<div class="mt-3 rounded border border-yellow-200 bg-yellow-50 p-2">
												<div class="font-medium text-yellow-800">{forecast.headline_text}</div>
												{#if forecast.headline_category}
													<div class="text-yellow-600 text-xs">
														Category: {forecast.headline_category} (Severity: {forecast.headline_severity})
													</div>
												{/if}
											</div>
										{/if}
									</div>
								</details>
							</div>
						</div>
					{:else}
						<div class="mb-5 rounded border border-gray-200 bg-white p-3 text-center shadow-sm">
							<h3 class="font-medium text-gray-800">{city.city_name}</h3>
							<p class="text-sm text-gray-500">No forecast data available for this date</p>
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

	/* Mobile optimizations */
	@media (max-width: 768px) {
		.weather-tab {
			font-size: 0.9rem;
		}
	}
	
	/* Add styles for filter layout */
	.filter-group {
		display: flex;
		flex-direction: column;
		min-width: 150px;
		flex: 1;
		max-width: 220px;
	}
	
	/* Prevent filters from becoming too large on wide screens */
	@media (min-width: 1200px) {
		.filter-group {
			max-width: 200px;
		}
	}
	
	/* Adjust for very small screens */
	@media (max-width: 480px) {
		.filter-group {
			min-width: 100%;
			max-width: 100%;
		}
	}
</style>
