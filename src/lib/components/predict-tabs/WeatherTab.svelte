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

<div class="weather-tab space-y-3">
	<!-- Compact Header -->
	<div class="flex items-center space-x-2">
		<div class="rounded-md bg-gradient-to-br from-[#0c3143] to-[#1a4a5a] p-1.5">
			<Icon icon="mdi:weather-partly-cloudy" class="text-white" width="18" />
		</div>
		<h2 class="text-lg font-bold text-[#0c3143]">Metro Manila Weather</h2>
		
		<!-- Action buttons aligned to the right -->
		<div class="ml-auto flex gap-2">
			<button
				class="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-900"
				on:click={fetchWeatherData}
				disabled={weatherDataValue.loading}
			>
				<Icon icon="mdi:refresh" width="12" />
				Refresh
			</button>
			
			<button
				class="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-900"
				on:click={() => showFilters = !showFilters}
			>
				<Icon icon={showFilters ? "mdi:filter-off" : "mdi:filter"} width="12" />
				{showFilters ? 'Hide' : 'Filters'}
			</button>
		</div>
	</div>

	<!-- Compact Filter Section -->
	{#if showFilters}
		<div class="rounded-lg border border-gray-200 bg-gray-50 p-3 shadow-sm">
			<div class="mb-2 flex items-center space-x-2">
				<div class="rounded bg-[#0c3143] p-1">
					<Icon icon="mdi:filter" class="text-white" width="12" />
				</div>
				<h3 class="text-sm font-semibold text-[#0c3143]">Filter & Sort</h3>
			</div>

			<div class="space-y-2">
				<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
					<!-- Date Filter -->
					<div>
						<label class="block text-xs font-medium text-gray-600 mb-1">Select Date</label>
						<select bind:value={selectedDate} class="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none">
							{#each availableDates as date}
								<option value={date}>{formatDateWithLabel(date)}</option>
							{/each}
						</select>
					</div>
					
					<!-- District Filter -->
					<div>
						<label class="block text-xs font-medium text-gray-600 mb-1">Filter by District</label>
						<select bind:value={selectedDistrict} class="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none">
							{#each districts as district}
								<option value={district}>{district === 'all' ? 'All Districts' : district}</option>
							{/each}
						</select>
					</div>

					<!-- Sort Options -->
					<div>
						<label class="block text-xs font-medium text-gray-600 mb-1">Sort by</label>
						<select bind:value={sortOption} class="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none">
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
				</div>
				
				<!-- Status Info and Count -->
				<div class="flex items-center justify-between pt-2 border-t border-gray-200">
					<div class="flex flex-wrap gap-3 text-xs">
						<div class="flex items-center">
							<Icon icon="mdi:calendar" class="mr-1 text-blue-600" width="12" />
							<span>Viewing: {formatDate(selectedDate)}</span>
						</div>
						{#if weatherDataValue.lastUpdated}
							<div class="flex items-center">
								<Icon icon="mdi:clock-outline" class="mr-1 text-gray-500" width="12" />
								<span>Updated: {moment(weatherDataValue.lastUpdated).format('MMM D, h:mm A')}</span>
							</div>
						{/if}
					</div>
					
					<div class="text-xs text-gray-500">
						Showing {filteredCities.length} of {weatherDataValue.data.length} cities
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Loading State -->
	{#if weatherDataValue.loading}
		<div class="rounded-lg border border-blue-200 bg-blue-50 p-6">
			<div class="flex items-center justify-center">
				<Icon icon="eos-icons:loading" class="mr-2 animate-spin text-blue-600" width="20" />
				<div>
					<p class="text-sm font-semibold text-blue-800">Loading Weather Data</p>
					<p class="text-xs text-blue-600">Fetching latest forecasts...</p>
				</div>
			</div>
		</div>
	{:else if weatherDataValue.error}
		<!-- Error State -->
		<div class="rounded-lg border border-red-200 bg-red-50 p-4">
			<div class="flex items-start">
				<Icon icon="mdi:alert-circle" class="mr-2 mt-0.5 flex-shrink-0 text-red-500" width="18" />
				<div>
					<h4 class="text-sm font-bold text-red-900">Error Loading Data</h4>
					<p class="text-xs text-red-700 mt-1">{weatherDataValue.error}</p>
					<button 
						class="mt-2 flex items-center gap-1 rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-800 transition-colors hover:bg-red-200"
						on:click={fetchWeatherData}
					>
						<Icon icon="mdi:refresh" width="12" />
						Try Again
					</button>
				</div>
			</div>
		</div>
	{:else if weatherDataValue.data.length === 0}
		<!-- No Data State -->
		<div class="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
			<Icon icon="mdi:weather-cloudy-alert" class="mx-auto mb-2 text-gray-400" width="24" />
			<p class="text-sm text-gray-600">No weather data available</p>
			<button 
				class="mt-2 flex items-center gap-1 mx-auto rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 transition-colors hover:bg-blue-200"
				on:click={updateWeatherFromAccuweather}
			>
				<Icon icon="mdi:download" width="12" />
				Fetch Weather Data
			</button>
		</div>
	{:else if filteredCities.length === 0}
		<!-- No Results State -->
		<div class="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-center">
			<Icon icon="mdi:filter-off" class="mx-auto mb-2 text-yellow-600" width="20" />
			<p class="text-sm text-gray-700">No cities match your filters</p>
			<button 
				class="mt-2 flex items-center gap-1 mx-auto rounded bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800 transition-colors hover:bg-yellow-200"
				on:click={() => selectedDistrict = 'all'}
			>
				<Icon icon="mdi:filter-remove" width="12" />
				Clear Filters
			</button>
		</div>
	{:else}
		<!-- Compact Weather Cards -->
		<div class="space-y-2">
			{#each filteredCities as city}
				{@const forecast = getForecastForDate(city, selectedDate)}
				
				{#if forecast}
					<div class="rounded-lg border shadow-sm bg-white">
						<!-- Compact City Header -->
						<div class="p-3">
							<div class="mb-2">
								<div class="flex items-center justify-between mb-1">
									<h4 class="flex items-center text-sm font-bold text-gray-800">
										<Icon icon="mdi:city" class="mr-1.5 text-blue-600" width="14" />
										{city.city_name}
									</h4>
									
									<!-- District Badge -->
									<span class="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
										{getDistrictByName(city.city_name)}
									</span>
								</div>
								
								<!-- Date and Time Row -->
								<div class="flex items-center justify-between">
									<div class="flex items-center text-xs text-gray-500">
										<Icon icon="mdi:calendar" class="mr-1" width="12" />
										{formatFullDate(forecast.forecast_date)}
									</div>
									
									<div class="flex items-center text-xs text-gray-500">
										<Icon icon="mdi:clock-outline" class="mr-1" width="12" />
										Updated: {formatTimestamp(forecast.fetched_at)}
									</div>
								</div>
							</div>
							
							<!-- Weather Summary Display -->
							<div class="rounded bg-white/70 p-3 border border-gray-200">
								<div class="flex items-center justify-between mb-2">
									<div class="flex items-center">
										<div class="mr-3 flex h-16 w-16 items-center justify-center text-blue-500">
											<Icon icon={getWeatherIcon(forecast.day_icon)} width="48" />
										</div>
										<div>
											<div class="flex items-baseline">
												<span class="text-2xl font-bold text-gray-800">{Math.round(forecast.max_temp_c)}°C</span>
												<span class="ml-1 text-sm text-gray-500">/ {Math.round(forecast.min_temp_c)}°C</span>
											</div>
											<div class="text-sm font-medium text-gray-700">{forecast.day_icon_phrase}</div>
											<div class="text-xs text-gray-600">{forecast.day_short_phrase}</div>
										</div>
									</div>
									
									<div class="text-right">
										<div class="flex items-center text-sm font-medium text-blue-700 mb-1">
											<Icon icon="mdi:water-percent" class="mr-1" width="14" />
											{forecast.day_precipitation_probability !== undefined
												? `${forecast.day_precipitation_probability}%`
												: 'N/A'}
										</div>
										<div class="text-xs text-gray-600">rain chance</div>
									</div>
								</div>
								
								<!-- Key Metrics Row -->
								<div class="grid grid-cols-4 gap-2 text-xs">
									<div class="text-center">
										<div class="font-medium text-blue-700">{formatValue(forecast.total_rain_mm, 'mm')}</div>
										<div class="text-gray-500">Rainfall</div>
									</div>
									<div class="text-center">
										<div class="font-medium text-gray-700">{forecast.avg_relative_humidity_percent}%</div>
										<div class="text-gray-500">Humidity</div>
									</div>
									<div class="text-center">
										<div class="font-medium text-gray-700">{Math.round(forecast.avg_wind_speed_kmh)} km/h</div>
										<div class="text-gray-500">Wind</div>
									</div>
									<div class="text-center">
										<div class="font-medium text-gray-700">{Math.round(forecast.max_wind_gust_kmh)} km/h</div>
										<div class="text-gray-500">Gusts</div>
									</div>
								</div>
							</div>
							
							<!-- Additional Weather Info (if significant) -->
							<div class="mt-2 grid grid-cols-3 gap-2 text-xs">
								<div class="rounded bg-blue-50 border border-blue-200 p-2 text-center">
									<div class="font-medium text-blue-700">{forecast.total_hours_rain || 0} hrs</div>
									<div class="text-blue-600">Rain Duration</div>
								</div>
								<div class="rounded bg-gray-50 border border-gray-200 p-2 text-center">
									<div class="font-medium text-gray-700">{forecast.day_thunderstorm_probability}%</div>
									<div class="text-gray-600">Thunder</div>
								</div>
								<div class="rounded bg-gray-50 border border-gray-200 p-2 text-center">
									<div class="font-medium text-gray-700">{forecast.avg_cloud_cover_percent}%</div>
									<div class="text-gray-600">Clouds</div>
								</div>
							</div>
						</div>

						<!-- Compact Expand/Collapse Section -->
						<div class="border-t border-gray-200/50 bg-white/50 p-2">
							<details class="group">
								<summary class="flex w-full cursor-pointer items-center justify-center rounded border border-dashed border-blue-300 bg-blue-50/50 px-2 py-1.5 text-xs font-medium text-blue-700 transition-all duration-200 hover:bg-blue-100">
									<Icon icon="mdi:weather-partly-cloudy" class="mr-1" width="14" />
									<span class="group-open:hidden">Show Detailed Weather</span>
									<span class="hidden group-open:inline">Hide Detailed Weather</span>
									<Icon icon="mdi:chevron-down" class="ml-1 transition-transform group-open:rotate-180" width="14" />
								</summary>
								
								<!-- Detailed Weather Section -->
								<div class="mt-2 space-y-2 p-2">
									<!-- Sunrise/Sunset Info -->
									<div class="rounded border border-blue-200 bg-blue-50 p-2">
										<h6 class="mb-2 flex items-center text-xs font-bold text-blue-800">
											<Icon icon="mdi:weather-sunset" class="mr-1" width="12" />
											Sun & Moon Information
										</h6>
										<div class="space-y-1">
											<div class="flex items-center justify-between rounded bg-white border border-gray-200 px-2 py-1">
												<div class="flex items-center">
													<Icon icon="mdi:weather-sunset-up" class="mr-1.5 text-orange-500" width="12" />
													<span class="text-xs text-gray-600">Sunrise:</span>
												</div>
												<span class="text-xs font-bold text-gray-800">{moment(forecast.sunrise_time).format('h:mm A')}</span>
											</div>
											<div class="flex items-center justify-between rounded bg-white border border-gray-200 px-2 py-1">
												<div class="flex items-center">
													<Icon icon="mdi:weather-sunset-down" class="mr-1.5 text-purple-500" width="12" />
													<span class="text-xs text-gray-600">Sunset:</span>
												</div>
												<span class="text-xs font-bold text-gray-800">{moment(forecast.sunset_time).format('h:mm A')}</span>
											</div>
											<div class="flex items-center justify-between rounded bg-white border border-gray-200 px-2 py-1">
												<div class="flex items-center">
													<Icon icon="mdi:moon-waning-gibbous" class="mr-1.5 text-blue-500" width="12" />
													<span class="text-xs text-gray-600">Moon Phase:</span>
												</div>
												<span class="text-xs font-bold text-gray-800">{forecast.moon_phase}</span>
											</div>
										</div>
									</div>

									<!-- Temperature Details -->
									<div class="rounded border border-blue-200 bg-blue-50 p-2">
										<h6 class="mb-2 flex items-center text-xs font-bold text-blue-800">
											<Icon icon="mdi:thermometer" class="mr-1" width="12" />
											Temperature Details
										</h6>
										<div class="space-y-1">
											<div class="flex items-center justify-between rounded bg-white border border-gray-200 px-2 py-1">
												<span class="text-xs text-gray-600">Minimum:</span>
												<span class="text-xs font-bold text-gray-800">{formatValue(forecast.min_temp_c, '°C')}</span>
											</div>
											<div class="flex items-center justify-between rounded bg-white border border-gray-200 px-2 py-1">
												<span class="text-xs text-gray-600">Maximum:</span>
												<span class="text-xs font-bold text-gray-800">{formatValue(forecast.max_temp_c, '°C')}</span>
											</div>
											<div class="flex items-center justify-between rounded bg-white border border-gray-200 px-2 py-1">
												<span class="text-xs text-gray-600">Average:</span>
												<span class="text-xs font-bold text-gray-800">{formatValue(forecast.avg_temp_c, '°C')}</span>
											</div>
											<div class="flex items-center justify-between rounded bg-white border border-gray-200 px-2 py-1">
												<span class="text-xs text-gray-600">RealFeel Min:</span>
												<span class="text-xs font-bold text-gray-800">{formatValue(forecast.min_realfeel_temp_c, '°C')}</span>
											</div>
											<div class="flex items-center justify-between rounded bg-white border border-gray-200 px-2 py-1">
												<span class="text-xs text-gray-600">RealFeel Max:</span>
												<span class="text-xs font-bold text-gray-800">{formatValue(forecast.max_realfeel_temp_c, '°C')}</span>
											</div>
										</div>
									</div>

									<!-- Precipitation Details -->
									<div class="rounded border border-blue-200 bg-blue-50 p-2">
										<h6 class="mb-2 flex items-center text-xs font-bold text-blue-800">
											<Icon icon="mdi:water" class="mr-1" width="12" />
											Precipitation Details
										</h6>
										<div class="space-y-1">
											<div class="flex items-center justify-between rounded bg-white border border-gray-200 px-2 py-1">
												<span class="text-xs text-gray-600">Total Liquid:</span>
												<span class="text-xs font-bold text-gray-800">{formatValue(forecast.total_liquid_mm, 'mm')}</span>
											</div>
											<div class="flex items-center justify-between rounded bg-white border border-gray-200 px-2 py-1">
												<span class="text-xs text-gray-600">Rain Amount:</span>
												<span class="text-xs font-bold text-gray-800">{formatValue(forecast.total_rain_mm, 'mm')}</span>
											</div>
											<div class="flex items-center justify-between rounded bg-white border border-gray-200 px-2 py-1">
												<span class="text-xs text-gray-600">Ice Amount:</span>
												<span class="text-xs font-bold text-gray-800">{formatValue(forecast.total_ice_mm, 'mm')}</span>
											</div>
											<div class="flex items-center justify-between rounded bg-white border border-gray-200 px-2 py-1">
												<span class="text-xs text-gray-600">Hours Precipitation:</span>
												<span class="text-xs font-bold text-gray-800">{forecast.total_hours_precipitation || 0} hrs</span>
											</div>
											<div class="flex items-center justify-between rounded bg-white border border-gray-200 px-2 py-1">
												<span class="text-xs text-gray-600">Hours Rain:</span>
												<span class="text-xs font-bold text-gray-800">{forecast.total_hours_rain || 0} hrs</span>
											</div>
										</div>
									</div>

									<!-- Wind & Atmosphere -->
									<div class="rounded border border-blue-200 bg-blue-50 p-2">
										<h6 class="mb-2 flex items-center text-xs font-bold text-blue-800">
											<Icon icon="mdi:weather-windy" class="mr-1" width="12" />
											Wind & Atmosphere
										</h6>
										<div class="space-y-1">
											<div class="flex items-center justify-between rounded bg-white border border-gray-200 px-2 py-1">
												<span class="text-xs text-gray-600">Avg Wind Speed:</span>
												<span class="text-xs font-bold text-gray-800">{formatValue(forecast.avg_wind_speed_kmh, 'km/h', 0)}</span>
											</div>
											<div class="flex items-center justify-between rounded bg-white border border-gray-200 px-2 py-1">
												<span class="text-xs text-gray-600">Max Wind Gust:</span>
												<span class="text-xs font-bold text-gray-800">{formatValue(forecast.max_wind_gust_kmh, 'km/h', 0)}</span>
											</div>
											<div class="flex items-center justify-between rounded bg-white border border-gray-200 px-2 py-1">
												<span class="text-xs text-gray-600">Day Wind Direction:</span>
												<span class="text-xs font-bold text-gray-800">{forecast.day_wind_direction_loc || 'N/A'}</span>
											</div>
											<div class="flex items-center justify-between rounded bg-white border border-gray-200 px-2 py-1">
												<span class="text-xs text-gray-600">Night Wind Direction:</span>
												<span class="text-xs font-bold text-gray-800">{forecast.night_wind_direction_loc || 'N/A'}</span>
											</div>
											<div class="flex items-center justify-between rounded bg-white border border-gray-200 px-2 py-1">
												<span class="text-xs text-gray-600">Cloud Cover:</span>
												<span class="text-xs font-bold text-gray-800">{forecast.avg_cloud_cover_percent}%</span>
											</div>
										</div>
									</div>

									<!-- Probabilities -->
									<div class="rounded border border-blue-200 bg-blue-50 p-2">
										<h6 class="mb-2 flex items-center text-xs font-bold text-blue-800">
											<Icon icon="mdi:percent" class="mr-1" width="12" />
											Weather Probabilities
										</h6>
										<div class="space-y-1">
											<div class="flex items-center justify-between rounded bg-white border border-gray-200 px-2 py-1">
												<span class="text-xs text-gray-600">Rain (Day):</span>
												<span class="text-xs font-bold text-gray-800">{forecast.day_precipitation_probability}%</span>
											</div>
											<div class="flex items-center justify-between rounded bg-white border border-gray-200 px-2 py-1">
												<span class="text-xs text-gray-600">Rain (Night):</span>
												<span class="text-xs font-bold text-gray-800">{forecast.night_precipitation_probability}%</span>
											</div>
											<div class="flex items-center justify-between rounded bg-white border border-gray-200 px-2 py-1">
												<span class="text-xs text-gray-600">Thunderstorm (Day):</span>
												<span class="text-xs font-bold text-gray-800">{forecast.day_thunderstorm_probability}%</span>
											</div>
											<div class="flex items-center justify-between rounded bg-white border border-gray-200 px-2 py-1">
												<span class="text-xs text-gray-600">Thunderstorm (Night):</span>
												<span class="text-xs font-bold text-gray-800">{forecast.night_thunderstorm_probability}%</span>
											</div>
										</div>
									</div>

									<!-- Humidity & Heat Index -->
									<div class="rounded border border-blue-200 bg-blue-50 p-2">
										<h6 class="mb-2 flex items-center text-xs font-bold text-blue-800">
											<Icon icon="mdi:water-percent" class="mr-1" width="12" />
											Humidity & Heat Index
										</h6>
										<div class="space-y-1">
											<div class="flex items-center justify-between rounded bg-white border border-gray-200 px-2 py-1">
												<span class="text-xs text-gray-600">Min Humidity:</span>
												<span class="text-xs font-bold text-gray-800">{forecast.min_relative_humidity_percent}%</span>
											</div>
											<div class="flex items-center justify-between rounded bg-white border border-gray-200 px-2 py-1">
												<span class="text-xs text-gray-600">Max Humidity:</span>
												<span class="text-xs font-bold text-gray-800">{forecast.max_relative_humidity_percent}%</span>
											</div>
											<div class="flex items-center justify-between rounded bg-white border border-gray-200 px-2 py-1">
												<span class="text-xs text-gray-600">Avg Humidity:</span>
												<span class="text-xs font-bold text-gray-800">{forecast.avg_relative_humidity_percent}%</span>
											</div>
											<div class="flex items-center justify-between rounded bg-white border border-gray-200 px-2 py-1">
												<span class="text-xs text-gray-600">Evapotranspiration:</span>
												<span class="text-xs font-bold text-gray-800">{formatValue(forecast.total_evapotranspiration_mm, 'mm')}</span>
											</div>
											<div class="flex items-center justify-between rounded bg-white border border-gray-200 px-2 py-1">
												<span class="text-xs text-gray-600">Avg WBGT:</span>
												<span class="text-xs font-bold text-gray-800">{formatValue(forecast.avg_wbgt_c, '°C')}</span>
											</div>
										</div>
									</div>

									<!-- Weather Headline (if available) -->
									{#if forecast.headline_text}
										<div class="rounded border border-yellow-200 bg-yellow-50 p-2">
											<h6 class="mb-1 flex items-center text-xs font-bold text-yellow-800">
												<Icon icon="mdi:alert" class="mr-1" width="12" />
												Weather Alert
											</h6>
											<div class="text-xs font-medium text-yellow-800 mb-1">{forecast.headline_text}</div>
											{#if forecast.headline_category}
												<div class="text-xs text-yellow-600">
													Category: {forecast.headline_category} • Severity: {forecast.headline_severity}
												</div>
											{/if}
										</div>
									{/if}
								</div>
							</details>
						</div>
					</div>
				{:else}
					<!-- No Forecast Available -->
					<div class="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
						<Icon icon="mdi:weather-cloudy-alert" class="mx-auto mb-2 text-gray-400" width="20" />
						<h4 class="text-sm font-medium text-gray-700">{city.city_name}</h4>
						<p class="text-xs text-gray-500">No forecast data available for this date</p>
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>

<style>
	/* Enhanced styles for narrow containers */
	.text-2xs {
		font-size: 0.625rem;
		line-height: 0.875rem;
	}
	
	/* Smooth transitions */
	.weather-tab button {
		transition: all 0.2s ease-in-out;
	}
	
	/* Compact hover effects */
	.weather-tab button:hover:not(:disabled) {
		transform: translateY(-0.5px);
	}
	
	/* Better focus states */
	.weather-tab button:focus-visible {
		outline: 2px solid #0c3143;
		outline-offset: 1px;
	}
	
	/* Details/summary styling */
	details summary {
		list-style: none;
	}
	
	details summary::-webkit-details-marker {
		display: none;
	}
	
	/* Compact spacing for narrow layouts */
	.space-y-3 > :not([hidden]) ~ :not([hidden]) {
		margin-top: 0.75rem;
	}
	
	.space-y-2 > :not([hidden]) ~ :not([hidden]) {
		margin-top: 0.5rem;
	}
	
	.space-y-1 > :not([hidden]) ~ :not([hidden]) {
		margin-top: 0.25rem;
	}
</style>
