<script>
	import { invalidateAll } from '$app/navigation';
	import { callPredictPageAction } from '$lib/utils/predictPageActionClient.js';
	import { weatherData } from '$lib/stores/weatherStore.js';
	import Icon from '@iconify/svelte';
	import moment from 'moment';
	import TabActionButton from '$lib/components/predict-tabs/shared/TabActionButton.svelte';
	import TabFilterCard from '$lib/components/predict-tabs/shared/TabFilterCard.svelte';

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
	let sortMetric = $state('location');
	let sortDirection = $state('asc');

	const sortMetricOptions = [
		{ value: 'location', label: 'Location' },
		{ value: 'precipprob', label: 'Rain Chance' },
		{ value: 'precip_mm', label: 'Precipitation (mm)' },
		{ value: 'windgust_kmh', label: 'Wind Gust' },
		{ value: 'windspeed_kmh', label: 'Wind Speed' },
		{ value: 'cloudcover', label: 'Cloud Cover' },
		{ value: 'humidity', label: 'Humidity' },
		{ value: 'temp_c', label: 'Temperature' }
	];

	let totalLocationCount = $derived(
		new Set($weatherData.data.map((item) => item.location_name)).size
	);

	// Cache for 5-day forecasts per location
	let locationForecasts = $state({});
	let loadingForecasts = $state({});
	let locationForecastErrors = $state({});

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
			const directionMultiplier = sortDirection === 'asc' ? 1 : -1;

			if (sortMetric === 'location') {
				return directionMultiplier * a.localeCompare(b);
			}

			const aValue = parseFloat(aData?.[sortMetric]) || 0;
			const bValue = parseFloat(bData?.[sortMetric]) || 0;
			return directionMultiplier * (aValue - bValue);
		});

		const sortedGrouped = {};
		sortedLocations.forEach((loc) => (sortedGrouped[loc] = grouped[loc]));
		return sortedGrouped;
	});

	// Refresh function
	async function refreshWeather() {
		weatherData.update((store) => ({ ...store, loading: true, error: null }));

		try {
			await invalidateAll();
			locationForecasts = {};
			loadingForecasts = {};
			locationForecastErrors = {};
		} catch (error) {
			console.error('Failed to refresh weather data:', error);
			weatherData.update((store) => ({
				...store,
				loading: false,
				error: error?.message || 'Unable to refresh weather data'
			}));
		}
	}

	function resetWeatherFilters() {
		districtFilter = 'all';
		sortMetric = 'location';
		sortDirection = 'asc';
	}

	function getMetricBorderClass(metricKey, defaultBorderClass) {
		return sortMetric === metricKey ? 'border-primary-light border-2' : defaultBorderClass;
	}

	function getWeatherMetrics(currentData) {
		return [
			{
				key: 'precipprob',
				icon: 'mdi:weather-heavy-rain',
				iconClass: 'text-blue-500',
				label: 'Rain Chance:',
				labelClass: 'text-slate-500',
				value: currentData?.precipprob,
				unit: '%',
				containerBorderClass: 'border border-blue-100',
				containerBgClass: 'bg-blue-50/30',
				hoverClass: 'hover:bg-blue-50/60',
				valueChipClass: 'bg-blue-100/50 text-blue-600/80'
			},
			{
				key: 'precip_mm',
				icon: 'mdi:water',
				iconClass: 'text-cyan-500',
				label: 'Precip:',
				labelClass: 'text-slate-500',
				value: currentData?.precip_mm,
				unit: 'mm',
				containerBorderClass: 'border border-cyan-100',
				containerBgClass: 'bg-cyan-50/30',
				hoverClass: 'hover:bg-cyan-50/60',
				valueChipClass: 'bg-cyan-100/50 text-cyan-600/80'
			},
			{
				key: 'windgust_kmh',
				icon: 'mdi:weather-windy-variant',
				iconClass: 'text-slate-500',
				label: 'Gust:',
				labelClass: 'text-slate-600',
				value: currentData?.windgust_kmh,
				unit: 'km/h',
				containerBorderClass: 'border border-slate-200',
				containerBgClass: 'bg-slate-50/80',
				hoverClass: 'hover:bg-slate-100/80',
				valueChipClass: 'bg-slate-200/50 text-slate-600'
			},
			{
				key: 'windspeed_kmh',
				icon: 'mdi:weather-windy',
				iconClass: 'text-slate-400',
				label: 'Wind:',
				labelClass: 'text-slate-500',
				value: currentData?.windspeed_kmh,
				unit: 'km/h',
				containerBorderClass: 'border border-slate-100',
				containerBgClass: 'bg-slate-50/50',
				hoverClass: 'hover:bg-slate-100/50',
				valueChipClass: 'bg-slate-200/50 text-slate-500'
			},
			{
				key: 'cloudcover',
				icon: 'mdi:weather-cloudy',
				iconClass: 'text-gray-400',
				label: 'Clouds:',
				labelClass: 'text-slate-500',
				value: currentData?.cloudcover,
				unit: '%',
				containerBorderClass: 'border border-gray-200',
				containerBgClass: 'bg-white',
				hoverClass: 'hover:bg-gray-50/60',
				valueChipClass: 'bg-gray-100 text-gray-500'
			},
			{
				key: 'humidity',
				icon: 'mdi:humidity',
				iconClass: 'text-cyan-500',
				label: 'Humidity:',
				labelClass: 'text-slate-500',
				value: currentData?.humidity,
				unit: '%',
				containerBorderClass: 'border border-cyan-100',
				containerBgClass: 'bg-cyan-50/30',
				hoverClass: 'hover:bg-cyan-50/60',
				valueChipClass: 'bg-cyan-100/50 text-cyan-600/80'
			},
			{
				key: 'temp_c',
				icon: 'mdi:thermometer',
				iconClass: 'text-orange-500',
				label: 'Temp:',
				labelClass: 'text-slate-500',
				value: currentData?.temp_c,
				unit: '°C',
				containerBorderClass: 'border border-orange-100',
				containerBgClass: 'bg-orange-50/30',
				hoverClass: 'hover:bg-orange-50/60',
				valueChipClass: 'bg-orange-100/50 text-orange-600/80'
			}
		];
	}

	function getHourlyDetailRows(hour) {
		return [
			{ label: 'Precip', value: hour?.precip_mm ?? '--', unit: 'mm' },
			{ label: 'Gust', value: hour?.windgust_kmh ?? '--', unit: 'km/h' },
			{ label: 'Press', value: hour?.pressure_mb ?? '--', unit: 'mb' },
			{ label: 'Clouds', value: hour?.cloudcover ?? '--' },
			{ label: 'UV', value: hour?.uvindex ?? '--' },
			{ label: 'Solar', value: hour?.solarradiation ?? '--', unit: 'W/m²' }
		];
	}

	// Load 5-day forecast for a specific location
	async function loadLocationForecast(location) {
		if (Array.isArray(locationForecasts[location])) {
			setTimeout(() => scrollToCurrentHour(location), 100);
			return; // Already loaded
		}

		locationForecastErrors[location] = null;
		loadingForecasts[location] = true;
		try {
			const result = await callPredictPageAction('weatherLocationForecast', { location });
			const data = Array.isArray(result?.payload) ? result.payload : [];
			locationForecasts[location] = data;
			locationForecastErrors[location] = null;
			setTimeout(() => scrollToCurrentHour(location), 100);
		} catch (error) {
			console.error(`Failed to load forecast for ${location}:`, error);
			const details = error?.details?.details;
			locationForecastErrors[location] =
				details?.message || error?.details?.message || error?.message || 'Unable to load forecast';
			locationForecasts[location] = null;
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
		<TabActionButton
			onclick={refreshWeather}
			disabled={$weatherData.loading}
			icon="mdi:refresh"
			label="Refresh"
		/>

		<TabActionButton
			onclick={() => (showFilters = !showFilters)}
			icon={showFilters ? 'mdi:filter-off' : 'mdi:filter'}
			label={showFilters ? 'Hide' : 'Filters'}
		/>
	</div>

	<!-- Filters -->
	{#if showFilters}
		<TabFilterCard>
			<div class="space-y-3">
				<div class="grid grid-cols-1 gap-3 md:grid-cols-3">
					<div>
						<label class="mb-1 block text-xs font-medium text-gray-600" for="district-filter"
							>District</label
						>
						<select
							bind:value={districtFilter}
							id="district-filter"
							class="w-full cursor-pointer rounded border border-gray-300 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
						>
							<option value="all">All Districts</option>
							{#each Object.keys(districts) as district}
								<option value={district}>{district}</option>
							{/each}
						</select>
					</div>

					<div>
						<label class="mb-1 block text-xs font-medium text-gray-600" for="sort-metric"
							>Sort metric</label
						>
						<select
							bind:value={sortMetric}
							id="sort-metric"
							class="w-full cursor-pointer rounded border border-gray-300 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
						>
							{#each sortMetricOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>

					<div>
						<label class="mb-1 block text-xs font-medium text-gray-600" for="sort-direction"
							>Sort order</label
						>
						<select
							bind:value={sortDirection}
							id="sort-direction"
							class="w-full cursor-pointer rounded border border-gray-300 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
						>
							<option value="asc">{sortMetric === 'location' ? 'A-Z' : 'Low to High'}</option>
							<option value="desc">{sortMetric === 'location' ? 'Z-A' : 'High to Low'}</option>
						</select>
					</div>
				</div>

				<div class="flex items-center justify-between border-t border-gray-200 pt-2">
					<div class="text-xs text-gray-500">
						Showing {Object.keys(filteredData()).length} of {totalLocationCount} locations
					</div>
					<button
						type="button"
						class="flex cursor-pointer items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200"
						onclick={resetWeatherFilters}
					>
						<Icon icon="mdi:filter-remove-outline" width="12" />
						Reset
					</button>
				</div>
			</div>
		</TabFilterCard>
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
	{:else if $weatherData.error && $weatherData.data.length === 0}
		<div class="rounded-lg border border-red-200 bg-red-50 p-4">
			<div class="flex items-start">
				<Icon icon="mdi:alert-circle" class="mt-0.5 mr-2 flex-shrink-0 text-red-500" width="18" />
				<div>
					<h4 class="text-sm font-bold text-red-900">Error Loading Data</h4>
					<p class="mt-1 text-xs text-red-700">{$weatherData.error}</p>
					<button
						class="mt-2 flex cursor-pointer items-center gap-1 rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-800 transition-colors hover:bg-red-200"
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
			{#if $weatherData.error}
				<div class="rounded-lg border border-amber-200 bg-amber-50 p-3">
					<div class="flex items-start">
						<Icon
							icon="mdi:alert-outline"
							class="mt-0.5 mr-2 flex-shrink-0 text-amber-600"
							width="16"
						/>
						<div>
							<p class="text-xs font-semibold text-amber-800">Refresh temporarily limited</p>
							<p class="mt-1 text-xs text-amber-700">{$weatherData.error}</p>
							<p class="mt-1 text-[11px] text-amber-700/90">Showing last available weather data.</p>
						</div>
					</div>
				</div>
			{/if}

			{#each Object.entries(filteredData()) as [location, days]}
				{@const currentData = getCurrentHourData(days)}
				{@const metrics = getWeatherMetrics(currentData)}
				<div
					class="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
				>
					<!-- Color accent bar at the top -->
					<div class="bg-primary-light absolute top-0 left-0 h-1 w-full"></div>

					<!-- Location Header -->
					<div class="px-3 py-2 pt-4 sm:px-4">
						<div class="flex items-center justify-between gap-2">
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
						<!-- Weather Condition -->

						<div
							class="mb-3 flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-colors hover:bg-gray-50/60 sm:p-4"
						>
							<Icon
								icon={iconMap[currentData.icon] || 'mdi:weather-partly-cloudy'}
								class="flex-shrink-0 text-slate-500"
								width="44"
							/>
							<div class="min-w-0 flex-1">
								<div class="text-[10px] font-bold text-slate-500 sm:text-xs">Condition</div>
								<div
									class="mt-1 line-clamp-2 truncate text-base font-extrabold text-slate-800 sm:text-lg"
								>
									{currentData.conditions}
								</div>
							</div>
						</div>

						<!-- Weather Metrics Grid -->
						<div class="metrics-grid grid w-full grid-cols-1 items-stretch gap-3 md:grid-cols-2">
							{#each metrics as metric}
								<div
									class={`metric-card flex w-full items-center justify-between rounded-xl ${getMetricBorderClass(metric.key, metric.containerBorderClass)} ${metric.containerBgClass} p-2.5 shadow-sm transition-colors ${metric.hoverClass}`}
								>
									<div class="flex items-center justify-start gap-1">
										<Icon
											icon={metric.icon}
											class={`flex-shrink-0 ${metric.iconClass}`}
											width="16"
										/>
										<p class={`truncate text-xs font-semibold ${metric.labelClass}`}>
											{metric.label}
										</p>
									</div>
									<div class="flex items-center justify-end gap-1">
										<div
											class={`flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-[10px] font-bold ${metric.valueChipClass}`}
										>
											<div class="text-[15px] font-extrabold">{metric.value ?? '--'}</div>
											{metric.unit}
										</div>
									</div>
								</div>
							{/each}
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
								{:else if locationForecastErrors[location]}
									<div class="rounded-xl border border-red-200 bg-red-50 p-4 text-center shadow-sm">
										<Icon icon="mdi:alert-circle" class="mx-auto mb-2 text-red-500" width="20" />
										<p class="text-xs font-semibold text-red-700">
											{locationForecastErrors[location]}
										</p>
										<button
											class="mx-auto mt-2 flex cursor-pointer items-center gap-1 rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-800 transition-colors hover:bg-red-200"
											onclick={() => loadLocationForecast(location)}
										>
											<Icon icon="mdi:refresh" width="12" />
											Try Again
										</button>
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
												{#each forecastData as hour}
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
																	{#each getHourlyDetailRows(hour) as row}
																		<div
																			class="flex items-center justify-between rounded bg-slate-50 px-1.5 py-1"
																		>
																			<span class="text-slate-500">{row.label}</span>
																			<span class="truncate font-bold text-slate-700"
																				>{row.value}{#if row.unit}<span
																						class="text-[9px] font-medium text-slate-400"
																						>{row.unit}</span
																					>{/if}</span
																			>
																		</div>
																	{/each}
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
					<div class="flex justify-center border-t border-slate-100 bg-slate-50/80 px-4 py-2.5">
						<a
							href="https://www.visualcrossing.com"
							target="_blank"
							rel="noopener noreferrer"
							class="group flex items-center justify-center gap-2 px-2 py-1 text-xs text-slate-500 transition-all hover:text-slate-800"
							title="Weather data provided by Visual Crossing"
						>
							<span class="font-medium">Powered by</span>
							<img
								src="/logo/visual-crossing-short.png"
								alt="Visual Crossing"
								class="h-4 w-auto transition-transform group-hover:scale-105"
							/>
							<span class="font-medium">Visual Crossing</span>
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

	.metrics-grid > .metric-card:last-child:nth-child(odd) {
		grid-column: 1 / -1;
	}

	.metric-card {
		flex: 1 1 7.5rem;
		min-width: 0;
	}
</style>
