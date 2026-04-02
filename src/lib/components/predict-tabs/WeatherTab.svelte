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
		snow: 'mdi:snowflake',
		rain: 'mdi:weather-pouring',
		fog: 'mdi:weather-fog',
		wind: 'mdi:weather-windy',
		cloudy: 'mdi:weather-cloudy',
		'partly-cloudy-day': 'mdi:weather-partly-cloudy',
		'partly-cloudy-night': 'mdi:weather-night-partly-cloudy',
		'clear-day': 'mdi:weather-sunny',
		'clear-night': 'mdi:weather-night'
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
			setTimeout(() => scrollToCurrentHour(location), 100);
			return; // Already loaded
		}

		loadingForecasts[location] = true;
		try {
			const data = await fetchLocationForecast(location);
			locationForecasts[location] = data;
			setTimeout(() => scrollToCurrentHour(location), 100);
		} catch (error) {
			console.error(`Failed to load forecast for ${location}:`, error);
			locationForecasts[location] = [];
		} finally {
			loadingForecasts[location] = false;
		}
	}

	// Function to cleanly scroll to the current hour
	function scrollToCurrentHour(location) {
		requestAnimationFrame(() => {
			const safeLocationId = location.replace(/[^a-zA-Z0-9]/g, '-');
			const element = document.getElementById(`current-hour-${safeLocationId}`);
			if (element) {
				element.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
			}
		});
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
				<div
					class="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
				>
					<!-- Color accent bar at the top -->
					<div class="absolute top-0 left-0 h-1 w-full bg-blue-500"></div>

					<!-- Location Header -->
					<div class="px-3 py-2 pt-4 sm:px-4">
						<div class="flex items-start justify-between gap-2 sm:items-center">
							<h3
								class="flex min-w-0 flex-shrink items-center text-[15px] font-extrabold text-slate-800"
							>
								<Icon icon="mdi:map-marker-outline" class="mr-1 text-blue-500" width="16" />
								{location}
							</h3>

							<div
								class="flex flex-shrink-0 items-center text-xs font-semibold whitespace-nowrap text-slate-500"
							>
								<Icon icon="mdi:clock-outline" class="mr-1" width="12" />
								<span
									>{moment(currentData.datetime, 'YYYY-MM-DD HH:mm:ss').format(
										'MMM D • h:mm A'
									)}</span
								>
							</div>
						</div>
					</div>

					<div class="p-3 pt-1 sm:p-4">
						<!-- Rainfall Overview Title -->
						<div class="mb-2 flex items-center gap-2">
							<div class="h-1 w-1 rounded-full bg-blue-500"></div>
							<p class="text-xs font-bold text-slate-600">RAINFALL OVERVIEW</p>
						</div>

						<!-- Main Rain & Condition -->
						<div
							class="mb-4 grid grid-cols-3 gap-2 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/60 to-blue-100/40 p-3 shadow-sm sm:gap-3 sm:p-4"
						>
							<!-- Rainfall Percentage -->
							<div class="flex flex-col items-center justify-center rounded-lg border border-blue-200/50 bg-white/40 p-2 sm:p-3">
								<Icon
									icon="mdi:water-percent"
									class="mb-1.5 text-blue-500 sm:mb-2"
									width="36"
								/>
								<div class="text-center">
									<div class="text-2xl font-extrabold text-slate-800 sm:text-3xl">
										{currentData.precipprob}
									</div>
									<div class="text-[10px] font-bold text-blue-600 sm:text-xs">Rain %</div>
								</div>
							</div>

							<!-- Precipitation Amount -->
							<div class="flex flex-col items-center justify-center rounded-lg border border-blue-200/50 bg-white/40 p-2 sm:p-3">
								<Icon
									icon="mdi:water"
									class="mb-1.5 text-cyan-500 sm:mb-2"
									width="36"
								/>
								<div class="text-center">
									<div class="text-2xl font-extrabold text-slate-800 sm:text-3xl">
										{currentData.precip_mm}
									</div>
									<div class="text-[10px] font-bold text-cyan-600 sm:text-xs">mm</div>
								</div>
							</div>

							<!-- Condition Badge -->
							<div class="flex flex-col items-center justify-center rounded-lg border border-blue-300 bg-gradient-to-b from-blue-100 to-blue-50 p-2 sm:p-3">
								<Icon
									icon="mdi:cloud"
									class="mb-1.5 text-blue-600 sm:mb-2"
									width="36"
								/>
								<div class="text-center">
									<div class="truncate text-[10px] font-extrabold text-blue-800 line-clamp-2 sm:text-xs">
										{currentData.conditions}
									</div>
									<div class="text-[9px] font-semibold text-blue-600/70 sm:text-[10px]">Status</div>
								</div>
							</div>
						</div>

						<!-- Weather Metrics Grid - Mobile Optimized -->
						<div class="flex w-full flex-wrap gap-2 items-stretch">
							<!-- Temperature -->
							<div
								class="metric-card rounded-xl border border-orange-100 bg-orange-50/30 p-2.5 shadow-sm transition-colors hover:bg-orange-50/60"
							>
								<div class="mb-1.5 flex items-center justify-between">
									<Icon icon="mdi:thermometer" class="flex-shrink-0 text-orange-500" width="16" />
									<span class="ml-1 truncate text-xs font-semibold text-slate-500">Temp</span>
								</div>
								<div class="mt-1 flex items-baseline justify-between">
									<div class="text-[15px] font-extrabold text-slate-800">
										{currentData.temp_c}
									</div>
									<div
										class="truncate rounded bg-orange-100/50 px-1.5 py-0.5 text-[10px] font-bold text-orange-600/80"
									>
										°C
									</div>
								</div>
							</div>

							<!-- Humidity -->
							<div
								class="metric-card rounded-xl border border-cyan-100 bg-cyan-50/30 p-2.5 shadow-sm transition-colors hover:bg-cyan-50/60"
							>
								<div class="mb-1.5 flex items-center justify-between">
									<Icon icon="mdi:water" class="flex-shrink-0 text-cyan-500" width="16" />
									<span class="ml-1 truncate text-xs font-semibold text-slate-500">Humidity</span>
								</div>
								<div class="mt-1 flex items-baseline justify-between">
									<div class="text-[15px] font-extrabold text-slate-800">
										{currentData.humidity}%
									</div>
									<div
										class="truncate rounded bg-cyan-100/50 px-1.5 py-0.5 text-[10px] font-bold text-cyan-600/80"
									>
										Moist
									</div>
								</div>
							</div>

							<!-- Wind Speed -->
							<div
								class="metric-card rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 shadow-sm transition-colors hover:bg-slate-100/50"
							>
								<div class="mb-1.5 flex items-center justify-between">
									<Icon icon="mdi:weather-windy" class="flex-shrink-0 text-slate-400" width="16" />
									<span class="ml-1 truncate text-xs font-semibold text-slate-500">Wind</span>
								</div>
								<div class="mt-1 flex items-baseline justify-between">
									<div class="text-[15px] font-extrabold text-slate-800">
										{currentData.windspeed_kmh}
									</div>
									<div
										class="truncate rounded bg-slate-200/50 px-1.5 py-0.5 text-[10px] font-bold text-slate-500"
									>
										km/h
									</div>
								</div>
							</div>

							<!-- Wind Gust -->
							<div
								class="metric-card rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 shadow-sm transition-colors hover:bg-slate-100/80"
							>
								<div class="mb-1.5 flex items-center justify-between">
									<Icon
										icon="mdi:weather-windy-variant"
										class="flex-shrink-0 text-slate-500"
										width="16"
									/>
									<span class="ml-1 truncate text-xs font-semibold text-slate-600">Gust</span>
								</div>
								<div class="mt-1 flex items-baseline justify-between">
									<div class="text-[15px] font-extrabold text-slate-800">
										{currentData.windgust_kmh}
									</div>
									<div
										class="truncate rounded bg-slate-200/50 px-1.5 py-0.5 text-[10px] font-bold text-slate-600"
									>
										km/h
									</div>
								</div>
							</div>

							<!-- Cloud Cover -->
							<div
								class="metric-card rounded-xl border border-gray-200 bg-white p-2.5 shadow-sm transition-colors hover:bg-gray-50/60"
							>
								<div class="mb-1.5 flex items-center justify-between">
									<Icon icon="mdi:weather-cloudy" class="flex-shrink-0 text-gray-400" width="16" />
									<span class="ml-1 truncate text-xs font-semibold text-slate-500">Clouds</span>
								</div>
								<div class="mt-1 flex items-baseline justify-between">
									<div class="text-[15px] font-extrabold text-slate-800">
										{currentData.cloudcover}%
									</div>
									<div
										class="truncate rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500"
									>
										Cover
									</div>
								</div>
							</div>
						</div>
					</div>

					<!-- Compact Expand/Collapse Section for Hourly Forecast -->
					<div class="border-t border-slate-100 bg-slate-50/30 p-3 sm:p-4">
						<details
							class="group"
							ontoggle={(e) => {
								if (e.target.open) {
									loadLocationForecast(location);
								}
							}}
						>
							<summary
								class="flex w-full cursor-pointer items-center justify-center rounded-xl border border-dashed border-blue-300 bg-blue-50/50 px-3 py-2 text-xs font-bold text-blue-700 transition-all duration-200 hover:bg-blue-100/50"
							>
								<Icon icon="mdi:chart-timeline-variant" class="mr-1.5 flex-shrink-0" width="16" />
								<span class="truncate group-open:hidden">Show 5-Day Hourly Forecast</span>
								<span class="hidden truncate group-open:inline">Hide 5-Day Hourly Forecast</span>
								<Icon
									icon="mdi:chevron-down"
									class="ml-1.5 flex-shrink-0 transition-transform duration-300 group-open:rotate-180"
									width="16"
								/>
							</summary>

							<!-- 5-Day Hourly Forecast -->
							<div class="mt-3 space-y-3">
								{#if loadingForecasts[location]}
									<div class="rounded-xl border border-blue-100 bg-white p-6 text-center shadow-sm">
										<Icon
											icon="eos-icons:loading"
											class="mx-auto mb-2 animate-spin text-blue-500"
											width="24"
										/>
										<p class="text-xs font-semibold text-blue-600">Loading 5-day forecast...</p>
									</div>
								{:else if locationForecasts[location]}
									{@const forecastData = locationForecasts[location]}
									<div class="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
										<h6
											class="mb-3 flex items-center justify-between text-xs font-extrabold text-slate-700"
										>
											<span class="flex min-w-0 items-center truncate">
												<Icon
													icon="mdi:chart-timeline-variant"
													class="mr-1.5 flex-shrink-0 text-blue-500"
													width="14"
												/>
												<span class="truncate">Hourly Forecast ({forecastData.length} hours)</span>
											</span>
											<span
												class="ml-2 flex-shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold whitespace-nowrap text-slate-500"
												>Scroll →</span
											>
										</h6>

										<!-- Horizontal scrollable container -->
										<div class="forecast-scroll -mx-1 overflow-x-scroll px-1 pb-3">
											<div class="flex min-w-max gap-3">
												{#each forecastData as hour, index}
													{@const isCurrentHour = moment(
														hour.datetime,
														'YYYY-MM-DD HH:mm:ss'
													).isSame(moment().utcOffset('+08:00').startOf('hour'), 'hour')}
													<div
														class="w-32 flex-shrink-0 sm:w-36"
														id={isCurrentHour
															? `current-hour-${location.replace(/[^a-zA-Z0-9]/g, '-')}`
															: ''}
													>
														<div
															class="rounded-xl border-2 {isCurrentHour
																? 'border-blue-400 bg-gradient-to-b from-blue-50 to-white'
																: 'border-slate-100 bg-slate-50/50'} relative h-full overflow-hidden p-3 shadow-sm transition-all hover:border-slate-200 hover:shadow-md"
														>
															{#if isCurrentHour}
																<div
																	class="absolute top-0 right-0 rounded-bl-lg bg-blue-500 px-1.5 py-0.5 text-[8px] font-bold tracking-wider text-white uppercase"
																>
																	Now
																</div>
															{/if}

															<!-- Time -->
															<div class="mt-1 mb-3 text-center">
																<div
																	class="truncate text-sm font-extrabold {isCurrentHour
																		? 'text-blue-800'
																		: 'text-slate-800'}"
																>
																	{moment(hour.datetime, 'YYYY-MM-DD HH:mm:ss').format('h:mm A')}
																</div>
																<div
																	class="truncate text-[10px] font-bold {isCurrentHour
																		? 'text-blue-600/80'
																		: 'text-slate-500'}"
																>
																	{moment(hour.datetime, 'YYYY-MM-DD HH:mm:ss').format('MMM D')}
																</div>
															</div>

															<!-- Icon -->
															<div class="mb-3 text-center">
																<Icon
																	icon={iconMap[hour.icon] || 'mdi:weather-partly-cloudy'}
																	class="mx-auto {isCurrentHour
																		? 'text-blue-600'
																		: 'text-slate-600'}"
																	width="36"
																/>
															</div>

															<!-- Rain -->
															<div class="mb-3 text-center">
																<div
																	class="text-2xl font-extrabold {isCurrentHour
																		? 'text-blue-900'
																		: 'text-slate-800'}"
																>
																	{hour.precipprob}%
																</div>
																<div
																	class="inline-block truncate rounded border border-slate-100 bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-500"
																>
																	Precip {hour.precip_mm} mm
																</div>
															</div>

															<!-- Compact metrics -->
															<div
																class="space-y-1.5 rounded-lg border border-slate-100 bg-white p-2 text-[11px] font-semibold"
															>
																<div class="flex items-center justify-between">
																	<div class="flex items-center text-slate-500">
																		<Icon
																			icon="mdi:thermometer"
																			class="mr-1 text-orange-500"
																			width="14"
																		/>
																		Temp
																	</div>
																	<span class="font-bold text-orange-700">{hour.temp_c}°</span>
																</div>
																<div class="flex items-center justify-between">
																	<div class="flex items-center text-slate-500">
																		<Icon icon="mdi:water" class="mr-1 text-cyan-500" width="14" />
																		Hum
																	</div>
																	<span class="text-slate-700">{hour.humidity}%</span>
																</div>
																<div class="flex items-center justify-between">
																	<div class="flex items-center text-slate-500">
																		<Icon
																			icon="mdi:weather-windy"
																			class="mr-1 text-gray-400"
																			width="14"
																		/>
																		Wind
																	</div>
																	<span class="ml-1 truncate text-slate-700"
																		>{hour.windspeed_kmh}
																		<span class="text-[9px] text-slate-400">km/h</span></span
																	>
																</div>
															</div>

															<!-- Expandable details -->
															<details class="group/more mt-3">
																<summary
																	class="cursor-pointer list-none text-center text-[10px] font-bold tracking-wider text-slate-500 uppercase transition-colors hover:text-blue-600"
																>
																	<span
																		class="flex items-center justify-center group-open/more:hidden"
																		><Icon icon="mdi:chevron-down" class="mr-0.5" width="12" /> More</span
																	>
																	<span
																		class="hidden items-center justify-center group-open/more:flex"
																		><Icon icon="mdi:chevron-up" class="mr-0.5" width="12" /> Less</span
																	>
																</summary>
																<div
																	class="mt-2 space-y-1.5 border-t border-slate-100 pt-2 text-[10px] font-semibold"
																>
																	<div
																		class="flex items-center justify-between rounded bg-slate-50 px-1.5 py-1"
																	>
																		<span class="text-slate-500">Precip</span>
																		<span class="truncate font-bold text-slate-700"
																			>{hour.precip_mm}
																			<span class="text-[9px] font-medium text-slate-400">mm</span
																			></span
																		>
																	</div>
																	<div
																		class="flex items-center justify-between rounded bg-slate-50 px-1.5 py-1"
																	>
																		<span class="text-slate-500">Gust</span>
																		<span class="truncate font-bold text-slate-700"
																			>{hour.windgust_kmh}
																			<span class="text-[9px] font-medium text-slate-400">km/h</span
																			></span
																		>
																	</div>
																	<div
																		class="flex items-center justify-between rounded bg-slate-50 px-1.5 py-1"
																	>
																		<span class="text-slate-500">Press</span>
																		<span class="truncate font-bold text-slate-700"
																			>{hour.pressure_mb}
																			<span class="text-[9px] font-medium text-slate-400">mb</span
																			></span
																		>
																	</div>
																	<div
																		class="flex items-center justify-between rounded bg-slate-50 px-1.5 py-1"
																	>
																		<span class="text-slate-500">Clouds</span>
																		<span class="font-bold text-slate-700">{hour.cloudcover}%</span>
																	</div>
																	<div
																		class="flex items-center justify-between rounded bg-slate-50 px-1.5 py-1"
																	>
																		<span class="text-slate-500">UV</span>
																		<span class="font-bold text-slate-700">{hour.uvindex}</span>
																	</div>
																	<div
																		class="flex items-center justify-between rounded bg-slate-50 px-1.5 py-1"
																	>
																		<span class="text-slate-500">Solar</span>
																		<span class="truncate font-bold text-slate-700"
																			>{hour.solarradiation}
																			<span class="text-[9px] font-medium text-slate-400">W/m²</span
																			></span
																		>
																	</div>
																	<div
																		class="mt-2 rounded-lg border border-blue-100 bg-blue-50 p-1.5 text-center text-[10px] font-bold break-words text-blue-700"
																	>
																		{hour.conditions}
																	</div>
																</div>
															</details>
														</div>
													</div>
												{/each}
											</div>
										</div>

										<!-- Scroll indicator -->
										<div class="mt-3 flex items-center justify-center gap-2 text-center">
											<Icon
												icon="mdi:gesture-swipe-horizontal"
												class="flex-shrink-0 text-blue-500"
												width="16"
											/>
											<p class="truncate text-[11px] font-bold text-blue-600/80">
												Swipe horizontally to view all forecasts
											</p>
										</div>
									</div>
								{/if}
							</div>
						</details>
					</div>

					<!-- Visual Crossing Attribution -->
					<div class="border-t border-slate-100 bg-slate-50/50 px-3 py-2.5">
						<a
							href="https://www.visualcrossing.com"
							target="_blank"
							rel="noopener noreferrer"
							class="group flex items-center justify-center gap-2 text-[10px] font-bold text-slate-500 transition-all hover:text-slate-700"
							title="Weather data provided by Visual Crossing"
						>
							<span>Powered by</span>
							<img
								src="/logo/visual-crossing-short.png"
								alt="Visual Crossing Weather"
								class="h-4 w-auto opacity-70 grayscale transition-all group-hover:scale-105 group-hover:opacity-100 group-hover:grayscale-0"
							/>
							<span class="text-slate-600 group-hover:text-slate-800">Visual Crossing</span>
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
	.forecast-scroll {
		scrollbar-width: thin;
		scrollbar-color: #cbd5e1 #f1f5f9;
	}

	.forecast-scroll::-webkit-scrollbar {
		height: 10px;
	}

	.forecast-scroll::-webkit-scrollbar-track {
		background: #f1f5f9;
		border-radius: 3px;
	}

	.forecast-scroll::-webkit-scrollbar-thumb {
		background: #cbd5e1;
		border-radius: 3px;
	}

	.forecast-scroll::-webkit-scrollbar-thumb:hover {
		background: #94a3b8;
	}

	.metric-card {
		flex: 1 1 7.5rem;
		min-width: 0;
	}
</style>
