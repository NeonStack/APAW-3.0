<script>
	import {
		weatherData,
		fetchWeatherData,
		fetchLocationForecast
	} from '$lib/stores/weatherStore.js';
	import Icon from '@iconify/svelte';
	import moment from 'moment';
	import FilterButton from '$lib/components/FilterButton.svelte';

	// Define districts
	const districts = {
		'1st District': ['Manila'],
		'2nd District': ['Mandaluyong', 'Marikina', 'Pasig', 'Quezon City', 'San Juan'],
		'3rd District': ['Caloocan (North)', 'Caloocan (South)', 'Malabon', 'Navotas', 'Valenzuela'],
		'4th District': ['Las Piñas', 'Makati', 'Muntinlupa', 'Parañaque', 'Pasay', 'Pateros', 'Taguig']
	};

	// Icon mapping
	const iconMap = {
		snow: 'meteocons:snowflake-fill',
		rain: 'meteocons:extreme-rain-fill',
		fog: 'meteocons:fog-fill',
		wind: 'meteocons:wind-fill',
		cloudy: 'meteocons:cloudy-fill',
		'partly-cloudy-day': 'meteocons:partly-cloudy-day-fill',
		'partly-cloudy-night': 'meteocons:partly-cloudy-night-fill',
		'clear-day': 'meteocons:clear-day-fill',
		'clear-night': 'meteocons:clear-night-fill'
	};

	// Get current Manila time and find closest hour
	function getCurrentHourData(locationData) {
		const now = moment().utcOffset('+08:00'); // Manila time
		const currentHour = now.startOf('hour');
		return (
			locationData.find((item) =>
				moment(item.datetime, 'YYYY-MM-DD HH:mm:ss').isSame(currentHour, 'hour')
			) || locationData[0]
		);
	}

	// Group data by location
	function groupWeatherData(data) {
		const grouped = {};
		data.forEach((item) => {
			if (!grouped[item.location_name]) grouped[item.location_name] = [];
			grouped[item.location_name].push(item);
		});
		// Sort hours for each location
		Object.keys(grouped).forEach((location) => {
			grouped[location].sort((a, b) =>
				moment(a.datetime, 'YYYY-MM-DD HH:mm:ss').diff(moment(b.datetime, 'YYYY-MM-DD HH:mm:ss'))
			);
		});
		return grouped;
	}

	// Filters
	let districtFilter = $state('all'); // Changed default to 'all'
	let sortOption = $state('location-asc');

	// Cache for 5-day forecasts per location
	let locationForecasts = $state({});
	let loadingForecasts = $state({});

	// Derived filtered and sorted data
	let filteredData = $derived(() => {
		if (!$weatherData.data.length) return {};

		let filtered = $weatherData.data;

		// Filter by district
		if (districtFilter !== 'all') {
			const districtLocations = districts[districtFilter];
			filtered = filtered.filter((item) => districtLocations.includes(item.location_name));
		}

		const grouped = groupWeatherData(filtered);

		// Sort locations
		const sortedLocations = Object.keys(grouped).sort((a, b) => {
			const aData = getCurrentHourData(grouped[a]);
			const bData = getCurrentHourData(grouped[b]);
			if (sortOption === 'location-asc') return a.localeCompare(b);
			if (sortOption === 'location-desc') return b.localeCompare(a);
			if (sortOption === 'temp-high') return (bData?.temp_c || 0) - (aData?.temp_c || 0);
			if (sortOption === 'temp-low') return (aData?.temp_c || 0) - (bData?.temp_c || 0);
			if (sortOption === 'precip-high') return (bData?.precipprob || 0) - (aData?.precipprob || 0);
			if (sortOption === 'humidity-high') return (bData?.humidity || 0) - (aData?.humidity || 0);
			if (sortOption === 'wind-high')
				return (bData?.windspeed_kmh || 0) - (aData?.windspeed_kmh || 0);
			return 0;
		});

		const sortedGrouped = {};
		sortedLocations.forEach((loc) => (sortedGrouped[loc] = grouped[loc]));
		return sortedGrouped;
	});

	// Refresh function
	async function refreshWeather() {
		await fetchWeatherData();
	}

	// Load 5-day forecast for a specific location
	async function loadLocationForecast(location) {
		if (locationForecasts[location]) {
			return; // Already loaded
		}

		loadingForecasts[location] = true;
		try {
			const data = await fetchLocationForecast(location);
			locationForecasts[location] = data;
		} catch (error) {
			console.error(`Failed to load forecast for ${location}:`, error);
			locationForecasts[location] = [];
		} finally {
			loadingForecasts[location] = false;
		}
	}

	// Toggle filters
	let showFilters = $state(false);
</script>

<div class="weather-tab space-y-3">
	<div class="flex items-center justify-center gap-5">
		<FilterButton onclick={refreshWeather} className="grow max-w-48">
			<Icon icon="mdi:refresh" width="15" />
			<span class="hidden sm:inline">Refresh</span>
		</FilterButton>

		<FilterButton onclick={() => (showFilters = !showFilters)} className="grow max-w-48">
			<Icon icon={showFilters ? 'mdi:filter-off' : 'mdi:filter'} width="15" />
			<span class="hidden sm:inline">{showFilters ? 'Hide' : 'Filters'}</span>
		</FilterButton>
	</div>

	<!-- Filters -->
	{#if showFilters}
		<div class="rounded-lg border border-gray-200 bg-gray-50 p-3 shadow-sm">
			<div class="mb-2 flex items-center space-x-2">
				<div class="bg-primary rounded p-1">
					<Icon icon="mdi:filter" class="text-white" width="12" />
				</div>
				<h3 class="text-primary text-sm font-semibold">Filter & Sort</h3>
			</div>

			<div class="space-y-2">
				<div>
					<label class="mb-1 block text-xs font-medium text-gray-600" for="distict-filter"
						>District</label
					>
					<select
						bind:value={districtFilter}
						id="distict-filter"
						class="w-full cursor-pointer rounded border border-gray-300 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
					>
						<option value="all">All Districts</option>
						{#each Object.keys(districts) as district}
							<option value={district}>{district}</option>
						{/each}
					</select>
				</div>

				<div>
					<label class="mb-1 block text-xs font-medium text-gray-600" for="sort-option"
						>Sort by</label
					>
					<select
						bind:value={sortOption}
						id="sort-option"
						class="w-full cursor-pointer rounded border border-gray-300 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
					>
						<option value="location-asc">Location A-Z</option>
						<option value="location-desc">Location Z-A</option>
						<option value="temp-high">Highest Temperature</option>
						<option value="temp-low">Lowest Temperature</option>
						<option value="precip-high">Highest Rain Chance</option>
						<option value="humidity-high">Highest Humidity</option>
						<option value="wind-high">Highest Wind Speed</option>
					</select>
				</div>
			</div>
		</div>
	{/if}

	<!-- Loading/Error States -->
	{#if $weatherData.loading}
		<div class="rounded-lg border border-blue-200 bg-blue-50 p-6">
			<div class="flex items-center justify-center">
				<Icon icon="eos-icons:loading" class="mr-2 animate-spin text-blue-600" width="20" />
				<div>
					<p class="text-sm font-semibold text-blue-800">Loading Weather Data</p>
					<p class="text-xs text-blue-600">Fetching latest forecasts...</p>
				</div>
			</div>
		</div>
	{:else if $weatherData.error}
		<div class="rounded-lg border border-red-200 bg-red-50 p-4">
			<div class="flex items-start">
				<Icon icon="mdi:alert-circle" class="mt-0.5 mr-2 flex-shrink-0 text-red-500" width="18" />
				<div>
					<h4 class="text-sm font-bold text-red-900">Error Loading Data</h4>
					<p class="mt-1 text-xs text-red-700">{$weatherData.error}</p>
					<button
						class="mt-2 flex items-center gap-1 rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-800 transition-colors hover:bg-red-200"
						onclick={refreshWeather}
					>
						<Icon icon="mdi:refresh" width="12" />
						Try Again
					</button>
				</div>
			</div>
		</div>
	{:else if $weatherData.data.length === 0}
		<div class="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
			<Icon icon="mdi:weather-cloudy" class="mx-auto mb-2 text-gray-400" width="24" />
			<p class="text-sm text-gray-600">No weather data available</p>
		</div>
	{:else if Object.keys(filteredData()).length === 0}
		<div class="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
			<Icon icon="mdi:filter-off" class="mx-auto mb-2 text-gray-400" width="24" />
			<p class="text-sm text-gray-600">No data matches the current filters</p>
		</div>
	{:else}
		<!-- Weather Cards -->
		<div class="space-y-5">
			{#each Object.entries(filteredData()) as [location, days]}
				{@const currentData = getCurrentHourData(days)}
				<div class="rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
					<!-- Location Header -->
					<div class="rounded-t-lg px-3 py-2 sm:px-4">
						<div class="flex items-start justify-between gap-2 sm:items-center">
							<h3 class="min-w-0 flex-shrink truncate text-sm font-bold sm:text-base">
								{location}
							</h3>

							<div class="flex flex-shrink-0 items-center text-xs whitespace-nowrap opacity-80">
								<Icon icon="mdi:clock-outline" class="mr-1" width="12" />
								<span
									>{moment(currentData.datetime, 'YYYY-MM-DD HH:mm:ss').format(
										'MMM D • h:mm A'
									)}</span
								>
							</div>
						</div>
					</div>

					<div class="p-2 sm:p-3">
						<!-- Main Temperature & Condition -->
						<div
							class="mb-2 flex items-center justify-between rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 p-2 shadow-md sm:p-3"
						>
							<div class="flex min-w-0 flex-1 items-center">
								<Icon
									icon={iconMap[currentData.icon] || 'mdi:weather-partly-cloudy'}
									class="mr-2 flex-shrink-0 text-blue-600 drop-shadow-[0_0_1px_#000] filter sm:mr-3"
									width="40"
								/>
								<div class="min-w-0">
									<div class="flex items-baseline">
										<span class="text-2xl font-bold text-gray-800 sm:text-3xl"
											>{currentData.temp_c}</span
										>
										<span class="ml-1 text-base text-gray-600 sm:text-lg">°C</span>
									</div>
									<div class="mt-0.5 text-xs text-gray-600 sm:mt-1">
										Feels like <span class="font-semibold">{currentData.feelslike_c}°C</span>
									</div>
								</div>
							</div>

							<div class="ml-2 flex-shrink-0 text-right">
								<span
									class="inline-flex max-w-[120px] items-center truncate rounded-full border border-blue-300 bg-white px-2 py-1 text-xs font-semibold text-blue-800 shadow-sm sm:max-w-none sm:px-3"
								>
									{currentData.conditions}
								</span>
							</div>
						</div>

						<!-- Weather Metrics Grid - Mobile Optimized -->
						<div class="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 lg:grid-cols-4">
							<!-- Rain Probability -->
							<div class="rounded-lg border border-blue-200 bg-blue-50 p-2 shadow-md">
								<div class="mb-1 flex items-center justify-between">
									<Icon icon="mdi:water-percent" class="flex-shrink-0 text-blue-600" width="14" />
									<span class="ml-1 truncate text-xs font-medium text-gray-600">Rain</span>
								</div>
								<div class="text-base font-bold text-blue-700 sm:text-lg">
									{currentData.precipprob}%
								</div>
								<div class="truncate text-xs text-gray-500">{currentData.precip_mm} mm</div>
							</div>

							<!-- Humidity -->
							<div class="rounded-lg border border-cyan-200 bg-cyan-50 p-2 shadow-md">
								<div class="mb-1 flex items-center justify-between">
									<Icon icon="mdi:water" class="flex-shrink-0 text-cyan-600" width="14" />
									<span class="ml-1 truncate text-xs font-medium text-gray-600">Humidity</span>
								</div>
								<div class="text-base font-bold text-cyan-700 sm:text-lg">
									{currentData.humidity}%
								</div>
								<div class="truncate text-xs text-gray-500">Moisture</div>
							</div>

							<!-- Wind Speed -->
							<div class="rounded-lg border border-gray-200 bg-gray-50 p-2 shadow-md">
								<div class="mb-1 flex items-center justify-between">
									<Icon icon="mdi:weather-windy" class="flex-shrink-0 text-gray-600" width="14" />
									<span class="ml-1 truncate text-xs font-medium text-gray-600">Wind</span>
								</div>
								<div class="text-base font-bold text-gray-700 sm:text-lg">
									{currentData.windspeed_kmh}
								</div>
								<div class="truncate text-xs text-gray-500">km/h</div>
							</div>

							<!-- Wind Gust -->
							<div class="rounded-lg border border-slate-200 bg-slate-50 p-2 shadow-md">
								<div class="mb-1 flex items-center justify-between">
									<Icon
										icon="mdi:weather-windy-variant"
										class="flex-shrink-0 text-slate-600"
										width="14"
									/>
									<span class="ml-1 truncate text-xs font-medium text-gray-600">Gust</span>
								</div>
								<div class="text-base font-bold text-slate-700 sm:text-lg">
									{currentData.windgust_kmh}
								</div>
								<div class="truncate text-xs text-gray-500">km/h</div>
							</div>

							<!-- Pressure -->
							<div class="rounded-lg border border-purple-200 bg-purple-50 p-2 shadow-md">
								<div class="mb-1 flex items-center justify-between">
									<Icon icon="mdi:gauge" class="flex-shrink-0 text-purple-600" width="14" />
									<span class="ml-1 truncate text-xs font-medium text-gray-600">Pressure</span>
								</div>
								<div class="text-base font-bold text-purple-700 sm:text-lg">
									{currentData.pressure_mb}
								</div>
								<div class="truncate text-xs text-gray-500">mb</div>
							</div>

							<!-- Cloud Cover -->
							<div class="rounded-lg border border-gray-200 bg-gray-50 p-2 shadow-md">
								<div class="mb-1 flex items-center justify-between">
									<Icon icon="mdi:weather-cloudy" class="flex-shrink-0 text-gray-500" width="14" />
									<span class="ml-1 truncate text-xs font-medium text-gray-600">Clouds</span>
								</div>
								<div class="text-base font-bold text-gray-700 sm:text-lg">
									{currentData.cloudcover}%
								</div>
								<div class="truncate text-xs text-gray-500">Cover</div>
							</div>

							<!-- UV Index -->
							<div class="rounded-lg border border-yellow-200 bg-yellow-50 p-2 shadow-md">
								<div class="mb-1 flex items-center justify-between">
									<Icon icon="mdi:weather-sunny" class="flex-shrink-0 text-yellow-600" width="14" />
									<span class="ml-1 truncate text-xs font-medium text-gray-600">UV Index</span>
								</div>
								<div class="text-base font-bold text-yellow-700 sm:text-lg">
									{currentData.uvindex}
								</div>
								<div class="truncate text-xs text-gray-500">
									{currentData.uvindex <= 2
										? 'Low'
										: currentData.uvindex <= 5
											? 'Moderate'
											: currentData.uvindex <= 7
												? 'High'
												: 'Very High'}
								</div>
							</div>

							<!-- Solar Radiation -->
							<div class="rounded-lg border border-orange-200 bg-orange-50 p-2 shadow-md">
								<div class="mb-1 flex items-center justify-between">
									<Icon icon="mdi:solar-power" class="flex-shrink-0 text-orange-600" width="14" />
									<span class="ml-1 truncate text-xs font-medium text-gray-600">Solar</span>
								</div>
								<div class="text-base font-bold text-orange-700 sm:text-lg">
									{currentData.solarradiation}
								</div>
								<div class="truncate text-xs text-gray-500">W/m²</div>
							</div>
						</div>
					</div>

					<!-- Compact Expand/Collapse Section for Hourly Forecast -->
					<div class="border-t border-gray-200/50 bg-white/50 p-2">
						<details
							class="group"
							ontoggle={(e) => {
								if (e.target.open && !locationForecasts[location]) {
									loadLocationForecast(location);
								}
							}}
						>
							<summary
								class="flex w-full cursor-pointer items-center justify-center rounded border border-dashed border-blue-300 bg-blue-50/50 px-2 py-1.5 text-xs font-medium text-blue-700 transition-all duration-200 hover:bg-blue-100"
							>
								<Icon icon="mdi:chart-timeline-variant" class="mr-1 flex-shrink-0" width="14" />
								<span class="truncate group-open:hidden">Show 5-Day Hourly Forecast</span>
								<span class="hidden truncate group-open:inline">Hide 5-Day Hourly Forecast</span>
								<Icon
									icon="mdi:chevron-down"
									class="ml-1 flex-shrink-0 transition-transform group-open:rotate-180"
									width="14"
								/>
							</summary>

							<!-- 5-Day Hourly Forecast -->
							<div class="mt-2 space-y-2 p-2">
								{#if loadingForecasts[location]}
									<div class="rounded border border-blue-200 bg-blue-50 p-4 text-center">
										<Icon
											icon="eos-icons:loading"
											class="mx-auto mb-2 animate-spin text-blue-600"
											width="20"
										/>
										<p class="text-xs text-blue-700">Loading 5-day forecast...</p>
									</div>
								{:else if locationForecasts[location]}
									{@const forecastData = locationForecasts[location]}
									<div class="rounded border border-blue-200 bg-blue-50 p-2">
										<h6
											class="mb-2 flex items-center justify-between text-xs font-bold text-blue-800"
										>
											<span class="flex min-w-0 items-center truncate">
												<Icon
													icon="mdi:chart-timeline-variant"
													class="mr-1 flex-shrink-0"
													width="12"
												/>
												<span class="truncate">Hourly Forecast ({forecastData.length} hours)</span>
											</span>
											<span class="ml-2 flex-shrink-0 font-medium whitespace-nowrap text-blue-600"
												>Scroll →</span
											>
										</h6>

										<!-- Horizontal scrollable container -->
										<div class="-mx-1 overflow-x-auto px-1 pb-2">
											<div class="flex min-w-max gap-2">
												{#each forecastData as hour, index}
													{@const isCurrentHour = moment(
														hour.datetime,
														'YYYY-MM-DD HH:mm:ss'
													).isSame(moment().utcOffset('+08:00').startOf('hour'), 'hour')}
													<div class="w-24 flex-shrink-0 sm:w-28">
														<div
															class="rounded-lg border-2 {isCurrentHour
																? 'border-blue-500 bg-blue-100'
																: 'border-gray-300 bg-white'} h-full p-2 shadow transition-all hover:shadow-md"
														>
															<!-- Time -->
															<div class="mb-2 text-center">
																<div class="truncate text-xs font-bold text-gray-800">
																	{moment(hour.datetime, 'YYYY-MM-DD HH:mm:ss').format('h:mm A')}
																</div>
																<div class="truncate text-xs text-gray-500">
																	{moment(hour.datetime, 'YYYY-MM-DD HH:mm:ss').format('MMM D')}
																</div>
															</div>

															<!-- Icon -->
															<div class="mb-2 text-center">
																<Icon
																	icon={iconMap[hour.icon] || 'mdi:weather-partly-cloudy'}
																	class="mx-auto text-blue-600 drop-shadow-[0_0_0.1px_#000] filter"
																	width="28"
																/>
															</div>

															<!-- Temperature -->
															<div class="mb-2 text-center">
																<div class="text-lg font-bold text-gray-800 sm:text-xl">
																	{hour.temp_c}°
																</div>
																<div class="truncate text-xs text-gray-500">
																	Feels {hour.feelslike_c}°
																</div>
															</div>

															<!-- Compact metrics -->
															<div class="space-y-1 text-xs">
																<div class="flex items-center justify-between">
																	<Icon
																		icon="mdi:water-percent"
																		class="flex-shrink-0 text-blue-500"
																		width="12"
																	/>
																	<span class="ml-1 font-semibold text-blue-700"
																		>{hour.precipprob}%</span
																	>
																</div>
																<div class="flex items-center justify-between">
																	<Icon
																		icon="mdi:water"
																		class="flex-shrink-0 text-cyan-500"
																		width="12"
																	/>
																	<span class="ml-1">{hour.humidity}%</span>
																</div>
																<div class="flex items-center justify-between">
																	<Icon
																		icon="mdi:weather-windy"
																		class="flex-shrink-0 text-gray-500"
																		width="12"
																	/>
																	<span class="ml-1 truncate">{hour.windspeed_kmh} km/h</span>
																</div>
															</div>

															<!-- Expandable details -->
															<details class="mt-2">
																<summary
																	class="cursor-pointer text-center text-xs font-medium text-blue-600 hover:text-blue-800"
																>
																	+ More
																</summary>
																<div class="mt-2 space-y-1 border-t border-gray-200 pt-2 text-xs">
																	<div class="flex justify-between">
																		<span class="text-gray-600">Precip:</span>
																		<span class="ml-1 truncate font-medium"
																			>{hour.precip_mm} mm</span
																		>
																	</div>
																	<div class="flex justify-between">
																		<span class="text-gray-600">Gust:</span>
																		<span class="ml-1 truncate font-medium"
																			>{hour.windgust_kmh} km/h</span
																		>
																	</div>
																	<div class="flex justify-between">
																		<span class="text-gray-600">Pressure:</span>
																		<span class="ml-1 truncate font-medium"
																			>{hour.pressure_mb} mb</span
																		>
																	</div>
																	<div class="flex justify-between">
																		<span class="text-gray-600">Clouds:</span>
																		<span class="font-medium">{hour.cloudcover}%</span>
																	</div>
																	<div class="flex justify-between">
																		<span class="text-gray-600">UV:</span>
																		<span class="font-medium">{hour.uvindex}</span>
																	</div>
																	<div class="flex justify-between">
																		<span class="text-gray-600">Solar:</span>
																		<span class="ml-1 truncate font-medium"
																			>{hour.solarradiation} W/m²</span
																		>
																	</div>
																	<div class="mt-2 border-t border-gray-200 pt-1">
																		<div
																			class="text-center text-xs font-medium break-words text-gray-700"
																		>
																			{hour.conditions}
																		</div>
																	</div>
																</div>
															</details>
														</div>
													</div>
												{/each}
											</div>
										</div>

										<!-- Scroll indicator -->
										<div class="mt-2 flex items-center justify-center gap-2 text-center">
											<Icon
												icon="mdi:gesture-swipe-horizontal"
												class="flex-shrink-0 text-blue-500"
												width="16"
											/>
											<p class="truncate text-xs font-medium text-blue-700">
												Swipe or scroll to view all forecasts
											</p>
										</div>
									</div>
								{/if}
							</div>
						</details>
					</div>

					<!-- Visual Crossing Attribution -->
					<div class="border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white px-3 py-2">
						<a
							href="https://www.visualcrossing.com"
							target="_blank"
							rel="noopener noreferrer"
							class="group flex items-center justify-center gap-2 text-xs text-gray-600 transition-all hover:text-gray-900"
							title="Weather data provided by Visual Crossing"
						>
							<span class="font-medium">Powered by</span>
							<img
								src="/logo/visual-crossing-short.png"
								alt="Visual Crossing Weather"
								class="h-5 w-auto transition-transform group-hover:scale-105"
							/>
							<span class="font-semibold text-gray-700 group-hover:text-gray-900"
								>Visual Crossing</span
							>
						</a>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.weather-tab button {
		transition: all 0.2s ease-in-out;
	}

	.weather-tab button:hover:not(:disabled) {
		transform: translateY(-0.5px);
	}

	.weather-tab button:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 1px;
	}

	details summary {
		list-style: none;
	}

	details summary::-webkit-details-marker {
		display: none;
	}

	.space-y-3 > :not([hidden]) ~ :not([hidden]) {
		margin-top: 0.75rem;
	}

	.space-y-2 > :not([hidden]) ~ :not([hidden]) {
		margin-top: 0.5rem;
	}

	/* Improve scrollbar for horizontal scroll */
	.overflow-x-auto {
		scrollbar-width: thin;
		scrollbar-color: #cbd5e1 #f1f5f9;
	}

	.overflow-x-auto::-webkit-scrollbar {
		height: 6px;
	}

	.overflow-x-auto::-webkit-scrollbar-track {
		background: #f1f5f9;
		border-radius: 3px;
	}

	.overflow-x-auto::-webkit-scrollbar-thumb {
		background: #cbd5e1;
		border-radius: 3px;
	}

	.overflow-x-auto::-webkit-scrollbar-thumb:hover {
		background: #94a3b8;
	}
</style>
