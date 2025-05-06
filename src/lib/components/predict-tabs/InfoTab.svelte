<script>
	import {
		selectedLocation,
		findNearestPoint,
		locationLoadingStatus,
		nearestFacilities
	} from '$lib/stores/locationStore.js';
	import { waterStations, nearestWaterStation } from '$lib/stores/waterStationStore.js';
	import { metroManilaCities, nearestWeatherCity } from '$lib/stores/weatherStore.js';
	import { onMount, afterUpdate, createEventDispatcher } from 'svelte';
	import Icon from '@iconify/svelte';

	const dispatch = createEventDispatcher();

	// Flood prediction state
	let floodPrediction = null;
	let isPredicting = false;
	let predictionError = null;
	let selectedModel = 'rf'; // Default model (Random Forest)
	let locationLoadingState = false;
	let locationLoadingMessage = '';

	// Subscribe to location loading status
	locationLoadingStatus.subscribe((status) => {
		locationLoadingState = status.isLoading;
		locationLoadingMessage = status.message;
	});

	// When prediction status changes, emit event for Map component
	$: {
		dispatch('predictionStatusChange', { isPredicting });
	}

	const modelOptions = [
		{ value: 'rf', label: 'Random Forest (Recommended)' },
		{ value: 'lgbm', label: 'LightGBM' },
		{ value: 'lstm', label: 'LSTM Neural Network' }
	];

	// Update nearest points whenever selectedLocation changes
	$: if ($selectedLocation.lat !== null && $selectedLocation.lng !== null) {
		// Find nearest water station
		if ($waterStations.data && $waterStations.data.length > 0) {
			const nearest = findNearestPoint(
				$selectedLocation.lat,
				$selectedLocation.lng,
				$waterStations.data
			);
			nearestWaterStation.set(nearest);
		}

		// Find nearest weather city
		const nearestCity = findNearestPoint(
			$selectedLocation.lat,
			$selectedLocation.lng,
			metroManilaCities
		);
		nearestWeatherCity.set(nearestCity);
	}

	// Request flood prediction from API
	async function predictFlood() {
		if (!$selectedLocation.lat || !$selectedLocation.lng) {
			predictionError = 'Please select a location on the map first';
			return;
		}

		isPredicting = true;
		predictionError = null;
		floodPrediction = null;

		try {
			const response = await fetch(
				`/api/flood-prediction?lat=${$selectedLocation.lat}&lng=${$selectedLocation.lng}&model=${selectedModel}`
			);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to fetch prediction');
			}

			const data = await response.json();
			console.log('Flood prediction received:', data);

			// Handle response that could be an array or direct object
			if (Array.isArray(data) && data.length > 0) {
				floodPrediction = data[0]; // Extract the object from the array
			} else {
				floodPrediction = data; // Direct assignment if it's already an object
			}
		} catch (error) {
			console.error('Error predicting flood:', error);
			predictionError = error.message || 'Failed to fetch flood prediction';
			floodPrediction = null; // Ensure we clear any partial data
		} finally {
			isPredicting = false;
		}
	}

	// Manage expanded state for each prediction
	let expandedPredictions = {};

	function toggleExpand(date) {
		expandedPredictions[date] = !expandedPredictions[date];
	}

	// Format distance for display
	function formatDistance(distance) {
		if (distance === null || distance === undefined) return 'Unknown';

		// Always display in meters, round to whole number
		return `${Math.round(distance)}m`;
	}

	// Format date to more readable format
	function formatDate(dateString) {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		});
	}

	// Get color based on flood probability
	function getFloodProbabilityColor(probability, prediction) {
		if (prediction === 'FLOODED') return 'text-red-600 font-bold';
		if (probability > 0.15) return 'text-orange-500 font-medium';
		return 'text-green-600';
	}

	// Get background color for prediction card
	function getPredictionCardStyle(prediction) {
		if (prediction === 'FLOODED') return 'bg-red-50 border-red-200';
		return 'bg-green-50 border-green-200';
	}

	// Get feature display name for better readability
	function getFeatureDisplayName(key) {
		const displayNames = {
			Latitude: 'Latitude',
			Longitude: 'Longitude',
			Elevation_m: 'Elevation (m)',
			Distance_to_Water_Station_m: 'Distance to Water Station (m)',
			Water_Station_Rank: 'Water Station Rank',
			Precip_mm_Today: 'Precipitation (mm)',
			Precipitation_Hours_Today: 'Precipitation Hours',
			Temp_Mean_2m_C_Today: 'Mean Temperature (°C)',
			Temp_Max_2m_C_Today: 'Max Temperature (°C)',
			Temp_Min_2m_C_Today: 'Min Temperature (°C)',
			'Relative_Humidity_Mean_2m_%_Today': 'Relative Humidity (%)',
			Wind_Gusts_Max_10m_kmh_Today: 'Max Wind Gusts (km/h)',
			'Cloud_Cover_Mean_%_Today': 'Cloud Cover (%)',
			Soil_Temp_0_to_7cm_C_Today: 'Soil Temperature (°C)',
			Soil_Moisture_0_to_7cm_m3m3_Today: 'Soil Moisture (m³/m³)',
			Total_Precip_Last2Days_mm: 'Total Rain Last 2 Days (mm)',
			Total_Precip_Last3Days_mm: 'Total Rain Last 3 Days (mm)',
			Total_Precip_Last4Days_mm: 'Total Rain Last 4 Days (mm)',
			Total_Precip_Last5Days_mm: 'Total Rain Last 5 Days (mm)',
			Water_Level_Water_Station_Today_m: 'Water Level (m)'
		};

		// Handle lag days
		if (key.includes('Lag')) {
			const baseName = key.replace(/_Lag\d+/, '_Today');
			const lagNumber = key.match(/_Lag(\d+)/)[1];
			const baseDisplay = displayNames[baseName] || key;
			return baseDisplay.replace('(', `Day -${lagNumber} (`);
		}

		return displayNames[key] || key;
	}

	// Group features by categories for better organization
	function groupFeatures(features) {
		const groups = {
			Location: [
				'Latitude',
				'Longitude',
				'Elevation_m',
				'Distance_to_Water_Station_m',
				'Water_Station_Rank'
			],
			'Current Day': Object.keys(features).filter((k) => k.includes('_Today')),
			'Previous Days': Object.keys(features).filter((k) => k.includes('_Lag')),
			'Accumulated Precipitation': Object.keys(features).filter((k) =>
				k.includes('Total_Precip_Last')
			),
			'Water Levels': Object.keys(features).filter((k) => k.includes('Water_Level_Water_Station'))
		};

		// Sort keys within groups
		for (const group in groups) {
			groups[group].sort();
		}

		return groups;
	}

	// Check if a feature has a valid value
	function hasValidValue(value) {
		return value !== null && value !== undefined;
	}

	// Format value with appropriate units
	function formatValue(key, value) {
		if (!hasValidValue(value)) return 'N/A';

		if (typeof value === 'number') {
			// Preserve full precision for lat/lng
			if (key === 'Latitude' || key === 'Longitude') {
				return value;
			}

			// Format percentages with 1 decimal place
			if (key.includes('%') || key.includes('Humidity') || key.includes('Cloud_Cover')) {
				return Math.round(value * 10) / 10;
			}

			// Handle soil moisture specially
			if (key.includes('Soil_Moisture')) {
				return (Math.round(value * 1000) / 1000).toFixed(3);
			}

			// For most values, limit to 1 decimal place
			return (Math.round(value * 10) / 10).toFixed(1);
		}

		return value;
	}

	// Format key weather indicators with better labels
	function getIndicatorLabel(key) {
		const labels = {
			Precip_mm_Today: 'Rainfall',
			Precipitation_Hours_Today: 'Rain Hours',
			Total_Precip_Last3Days_mm: '3-Day Rain',
			Soil_Moisture_0_to_7cm_m3m3_Today: 'Soil Moisture'
		};
		return labels[key] || key;
	}

	// Format indicator units properly
	function getIndicatorUnit(key) {
		const units = {
			Precip_mm_Today: 'mm',
			Precipitation_Hours_Today: 'hrs',
			Total_Precip_Last3Days_mm: 'mm',
			Soil_Moisture_0_to_7cm_m3m3_Today: 'm³/m³'
		};
		return units[key] || '';
	}
</script>

<div class="info-tab">
	<h2 class="mb-2 flex items-center text-lg font-semibold text-[#0c3143]">
		<Icon icon="mdi:weather-flood" class="mr-2" width="22" />
		Flood Prediction Tool
	</h2>

	<!-- Location Information Card: Redesigned layout -->
	<div class="mb-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
		<h3 class="mb-2 flex items-center text-sm font-medium text-[#0c3143]">
			<Icon icon="mdi:map-marker" class="mr-1.5" width="16" />
			Location Information
		</h3>

		{#if locationLoadingState}
			<!-- Loading indicator for location -->
			<div class="flex items-center justify-center py-2">
				<Icon icon="eos-icons:loading" class="mr-2 animate-spin text-blue-500" width="18" />
				<p class="text-sm text-blue-700">{locationLoadingMessage || 'Loading location data...'}</p>
			</div>
		{:else if !$selectedLocation.lat}
			<!-- No location selected -->
			<div class="flex items-center rounded-md border border-yellow-200 bg-yellow-50 p-2">
				<Icon icon="mdi:gesture-tap" class="mr-2 flex-shrink-0 text-yellow-600" width="16" />
				<p class="text-sm text-gray-700">
					Click on the map to select a location or use the search bar.
				</p>
			</div>
		{:else}
			<!-- Location details with improved layout -->
			<div class="space-y-2">
				<!-- Location name with icon -->
				{#if $selectedLocation.locationName}
					<div class="flex items-start">
						<Icon icon="mdi:map-marker" class="mt-0.5 mr-1 flex-shrink-0 text-red-500" width="14" />
						<p class="text-sm font-medium text-gray-700">{$selectedLocation.locationName}</p>
					</div>
				{/if}

				<!-- Location coordinates and elevation in a compact row -->
				<div class="flex flex-wrap gap-2">
					<div class="flex items-center rounded-md bg-gray-50 px-2 py-1 text-sm">
						<span class="font-medium text-gray-500">Lat:</span>
						<span class="ml-1">{$selectedLocation.lat}</span>
					</div>

					<div class="flex items-center rounded-md bg-gray-50 px-2 py-1 text-sm">
						<span class="font-medium text-gray-500">Lng:</span>
						<span class="ml-1">{$selectedLocation.lng}</span>
					</div>

					<div class="flex items-center rounded-md bg-gray-50 px-2 py-1 text-sm">
						<span class="font-medium text-gray-500">Elevation:</span>
						{#if $selectedLocation.error}
							<span class="ml-1 text-red-600">Error</span>
						{:else}
							<span class="ml-1">{$selectedLocation.elevation} m</span>
						{/if}
					</div>
				</div>

				<!-- Reference data in cards with clear spacing -->
				<div class="flex flex-wrap gap-2">
					{#if $nearestWeatherCity}
						<div
							class="min-w-[150px] flex-1 rounded-md border border-blue-100 bg-blue-50 px-2 py-1"
						>
							<div class="flex items-center justify-between">
								<div class="flex items-center">
									<Icon
										icon="mdi:weather-partly-cloudy"
										class="mr-1 flex-shrink-0 text-blue-500"
										width="14"
									/>
									<span class="text-sm font-medium">Weather Forecast</span>
								</div>
								<span class="rounded-full bg-blue-100 px-1.5 py-0.5 text-xs text-blue-800">
									{formatDistance($nearestWeatherCity.distance)}
								</span>
							</div>
							<div class="mt-0.5 ml-5 text-sm text-blue-800">
								{$nearestWeatherCity.name}
							</div>
						</div>
					{/if}

					{#if $nearestWaterStation}
						<div
							class="min-w-[150px] flex-1 rounded-md border border-blue-100 bg-blue-50 px-2 py-1"
						>
							<div class="flex items-center justify-between">
								<div class="flex items-center">
									<Icon icon="mdi:water" class="mr-1 flex-shrink-0 text-blue-500" width="14" />
									<span class="text-sm font-medium">Water Station</span>
								</div>
								<span class="rounded-full bg-blue-100 px-1.5 py-0.5 text-xs text-blue-800">
									{formatDistance($nearestWaterStation.distance)}
								</span>
							</div>
							<div class="mt-0.5 ml-5 text-sm text-blue-800">
								{$nearestWaterStation.obsnm}
								{#if $nearestWaterStation.wl}
									<span class="ml-1 text-xs">(Level: {$nearestWaterStation.wl} m)</span>
								{/if}
							</div>
						</div>
					{/if}
				</div>
			</div>
			<div class="bg-base-200 rounded-lg p-3 shadow">
				<h3 class="text-primary-focus mb-2 flex items-center text-base font-semibold">
					<Icon icon="mdi:near-me" class="mr-1.5" width="16" />
					5 Nearest Facilities
				</h3>
				{#if $nearestFacilities.length > 0}
					<ul class="list-none space-y-1.5 pl-0">
						{#each $nearestFacilities as facility}
							<li class="flex items-center">
								<Icon
									icon={facility.icon || 'mdi:map-marker'}
									style="color: {facility.color || '#777'};"
									class="mr-2 flex-shrink-0"
									width="18"
								/>
								<div class="flex-1">
									<span class="font-medium">{facility.name}</span>
									<span class="text-xs text-gray-600"> ({facility.type})</span>
								</div>
								<span class="ml-2 rounded-full bg-gray-200 px-1.5 py-0.5 text-xs text-gray-700">
									{formatDistance(facility.distance)}
								</span>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="text-sm text-gray-500">
						No nearby facilities found within the search radius for active layers.
					</p>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Prediction Controls: Compact design -->
	<div
		class="mb-2 rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 p-3 shadow-sm"
	>
		<h3 class="mb-2 flex items-center text-sm font-medium text-[#0c3143]">
			<div class="mr-1.5 rounded-full bg-[#0c3143] p-1">
				<Icon icon="mdi:chart-box" class="text-white" width="14" />
			</div>
			Get Flood Prediction
		</h3>

		<div class="flex flex-wrap items-stretch gap-2 md:flex-nowrap">
			<div class="w-full md:flex-1">
				<label for="model-select" class="mb-1 block text-sm font-medium text-gray-700">
					Model
				</label>
				<select
					id="model-select"
					bind:value={selectedModel}
					class="block w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
					disabled={isPredicting || !$selectedLocation.lat}
				>
					{#each modelOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</div>

			<div class="flex w-full flex-col md:w-auto">
				<label class="mb-1 text-sm font-medium whitespace-nowrap text-gray-700"> Action </label>
				<button
					on:click={predictFlood}
					disabled={isPredicting || !$selectedLocation.lat || locationLoadingState}
					class="flex flex-1 items-center justify-center rounded-md bg-[#0c3143] px-4 py-1.5 text-sm text-white shadow-sm transition duration-150 hover:bg-[#1a4a5a] focus:ring-2 focus:ring-[#0c3143] focus:ring-offset-2 focus:outline-none disabled:opacity-50"
				>
					{#if isPredicting}
						<span class="mr-1.5 inline-block animate-spin">
							<Icon icon="eos-icons:loading" width="16" />
						</span>
						Predicting...
					{:else}
						<span class="mr-1.5">
							<Icon icon="mdi:weather-flood" width="16" />
						</span>
						Predict Flooding
					{/if}
				</button>
			</div>
		</div>

		{#if predictionError}
			<p class="mt-1.5 flex items-center text-sm text-red-600">
				<Icon icon="mdi:alert-circle" class="mr-1" width="14" />
				{predictionError}
			</p>
		{/if}
	</div>

	<!-- Prediction Results: Redesigned cards -->
	{#if isPredicting}
		<!-- Loading indicator for prediction -->
		<div class="mb-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
			<div class="flex items-center justify-center">
				<Icon icon="eos-icons:loading" class="mr-2 animate-spin text-blue-500" width="20" />
				<p class="text-sm text-blue-700">Processing prediction data...</p>
			</div>
		</div>
	{:else if floodPrediction && Array.isArray(floodPrediction.predictions) && floodPrediction.predictions.length > 0}
		<!-- Results display with improved card layout -->
		<div class="mb-2">
			<div class="mb-2 flex items-center justify-between">
				<h3 class="flex items-center text-sm font-medium text-[#0c3143]">
					<Icon icon="mdi:calendar-clock" class="mr-1.5" width="16" />
					Flood Prediction Results
				</h3>
				<span class="rounded-full bg-blue-100 px-1.5 py-0.5 text-xs text-blue-800">
					{floodPrediction.request_details?.request_time?.split(' ')[0] || 'Next 5 Days'}
				</span>
			</div>

			<div
				class="mb-2 flex flex-wrap justify-between rounded border border-gray-200 bg-gray-50 p-2 text-xs text-gray-500"
			>
				<div>
					<span class="font-medium text-gray-600">Model:</span>
					<span class="ml-1">{floodPrediction.request_details?.model_used || selectedModel}</span>
				</div>
				<div>
					<span class="font-medium text-gray-600">Prediction Time:</span>
					<span class="ml-1">{floodPrediction.request_details?.request_time || 'N/A'}</span>
				</div>
			</div>

			<!-- Prediction cards in a grid -->
			<div class="grid grid-cols-1 gap-2">
				{#each floodPrediction.predictions as day, index}
					<div
						class={`rounded-md border p-2.5 shadow-sm ${getPredictionCardStyle(day.prediction)}`}
					>
						<!-- Header with date and prediction -->
						<div class="mb-2 flex items-start justify-between">
							<div>
								<h4 class="flex items-center text-base font-medium">
									<Icon icon="mdi:calendar" class="mr-1.5" width="16" />
									{formatDate(day.date)}
								</h4>
								<p
									class={`${getFloodProbabilityColor(day.probability_flood, day.prediction)} mt-0.5 flex items-center text-sm`}
								>
									<Icon
										icon={day.prediction === 'FLOODED' ? 'mdi:alert-circle' : 'mdi:check-circle'}
										class="mr-1.5"
										width="16"
									/>
									{day.prediction}
									<span class="ml-1">({(day.probability_flood * 100).toFixed(1)}% probability)</span
									>
								</p>
							</div>
							<div class="text-right">
								{#if day.predicted_depth_inches}
									<div
										class="flex items-center rounded-md bg-red-100 px-2 py-1 text-sm text-red-800"
									>
										<Icon icon="mdi:water" class="mr-1.5" width="16" />
										<span class="font-medium"
											>{(day.predicted_depth_inches * 2.54).toFixed(1)} cm depth</span
										>
									</div>
								{/if}
							</div>
						</div>

						<!-- Key Weather Indicators: Redesigned with better layout -->
						<div class="mb-2 grid grid-cols-2 gap-2">
							{#if hasValidValue(day.features_used.Precip_mm_Today)}
								<div class="flex items-center rounded bg-white p-2 text-sm shadow-md">
									<Icon icon="mdi:weather-pouring" class="mr-1.5 text-blue-500" width="16" />
									<div class="flex-1">
										<div class="flex justify-between">
											<span class="text-gray-700">Rainfall:</span>
											<span class="font-medium"
												>{formatValue('Precip_mm_Today', day.features_used.Precip_mm_Today)} mm</span
											>
										</div>
									</div>
								</div>
							{/if}
							{#if hasValidValue(day.features_used.Precipitation_Hours_Today)}
								<div class="flex items-center rounded bg-white p-2 text-sm shadow-md">
									<Icon icon="mdi:clock-outline" class="mr-1.5 text-blue-500" width="16" />
									<div class="flex-1">
										<div class="flex justify-between">
											<span class="text-gray-700">Rain Hours:</span>
											<span class="font-medium"
												>{formatValue(
													'Precipitation_Hours_Today',
													day.features_used.Precipitation_Hours_Today
												)} hrs</span
											>
										</div>
									</div>
								</div>
							{/if}
							{#if hasValidValue(day.features_used.Total_Precip_Last3Days_mm)}
								<div class="flex items-center rounded bg-white p-2 text-sm shadow-md">
									<Icon icon="mdi:history" class="mr-1.5 text-blue-500" width="16" />
									<div class="flex-1">
										<div class="flex justify-between">
											<span class="text-gray-700">3-Day Rain:</span>
											<span class="font-medium"
												>{formatValue(
													'Total_Precip_Last3Days_mm',
													day.features_used.Total_Precip_Last3Days_mm
												)} mm</span
											>
										</div>
									</div>
								</div>
							{/if}
							{#if hasValidValue(day.features_used.Soil_Moisture_0_to_7cm_m3m3_Today)}
								<div class="flex items-center rounded bg-white p-2 text-sm shadow-md">
									<Icon icon="mdi:terrain" class="mr-1.5 text-blue-500" width="16" />
									<div class="flex-1">
										<div class="flex justify-between">
											<span class="text-gray-700">Soil Moisture:</span>
											<span class="font-medium"
												>{formatValue(
													'Soil_Moisture_0_to_7cm_m3m3_Today',
													day.features_used.Soil_Moisture_0_to_7cm_m3m3_Today
												)} m³/m³</span
											>
										</div>
									</div>
								</div>
							{/if}
						</div>

						<!-- Expand/Collapse Button -->
						<button
							on:click={() => toggleExpand(day.date)}
							class="flex w-full items-center justify-center rounded-md border border-blue-200 px-2 py-1 text-sm text-blue-600 transition-colors duration-150 hover:bg-blue-50 hover:text-blue-800 focus:outline-none"
						>
							<Icon
								icon={expandedPredictions[day.date] ? 'mdi:chevron-up' : 'mdi:chevron-down'}
								width="16"
								class="mr-1.5"
							/>
							{expandedPredictions[day.date] ? 'Hide detailed data' : 'Show detailed data'}
						</button>

						<!-- Expanded Details: More efficient layout -->
						{#if expandedPredictions[day.date] && day.features_used}
							<div class="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
								<!-- Feature groups displayed in a better layout -->
								<div class="rounded border border-gray-200 bg-gray-50 p-2">
									<h5 class="mb-1 flex items-center text-sm font-medium text-gray-700">
										<Icon icon="mdi:map-marker" class="mr-1 text-gray-600" width="14" />
										Location Data
									</h5>
									<div class="space-y-1 text-sm">
										{#each groupFeatures(day.features_used)['Location'] as key}
											{#if hasValidValue(day.features_used[key])}
												<div class="flex justify-between">
													<span class="text-gray-500">{getFeatureDisplayName(key)}:</span>
													<span class="font-medium">{formatValue(key, day.features_used[key])}</span
													>
												</div>
											{/if}
										{/each}
									</div>
								</div>

								<!-- Current Day Weather -->
								<div class="rounded border border-gray-200 bg-gray-50 p-2">
									<h5 class="mb-1 flex items-center text-sm font-medium text-gray-700">
										<Icon icon="mdi:weather-partly-cloudy" class="mr-1 text-gray-600" width="14" />
										Forecast Day Weather
									</h5>
									<div class="space-y-1 text-sm">
										{#each groupFeatures(day.features_used)['Current Day'] as key}
											{#if hasValidValue(day.features_used[key])}
												<div class="flex justify-between">
													<span class="text-gray-500">{getFeatureDisplayName(key)}:</span>
													<span class="font-medium">{formatValue(key, day.features_used[key])}</span
													>
												</div>
											{/if}
										{/each}
									</div>
								</div>

								<!-- Previous Days Weather -->
								<div class="rounded border border-gray-200 bg-gray-50 p-2">
									<h5 class="mb-1 flex items-center text-sm font-medium text-gray-700">
										<Icon icon="mdi:history" class="mr-1 text-gray-600" width="14" />
										Previous Days Weather
									</h5>
									<div class="space-y-1 text-sm">
										{#each groupFeatures(day.features_used)['Previous Days'] as key}
											{#if hasValidValue(day.features_used[key])}
												<div class="flex justify-between">
													<span class="text-gray-500">{getFeatureDisplayName(key)}:</span>
													<span class="font-medium">{formatValue(key, day.features_used[key])}</span
													>
												</div>
											{/if}
										{/each}
									</div>
								</div>

								<!-- Accumulated Precipitation -->
								<div class="rounded border border-gray-200 bg-gray-50 p-2">
									<h5 class="mb-1 flex items-center text-sm font-medium text-gray-700">
										<Icon icon="mdi:water-percent" class="mr-1 text-gray-600" width="14" />
										Accumulated Precipitation
									</h5>
									<div class="space-y-1 text-sm">
										{#each groupFeatures(day.features_used)['Accumulated Precipitation'] as key}
											{#if hasValidValue(day.features_used[key])}
												<div class="flex justify-between">
													<span class="text-gray-500">{getFeatureDisplayName(key)}:</span>
													<span class="font-medium">{formatValue(key, day.features_used[key])}</span
													>
												</div>
											{/if}
										{/each}
									</div>
								</div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Instructions Card: More compact design -->
	<div class="mb-2 rounded-lg border border-gray-200 bg-white p-2.5">
		<h3 class="mb-1.5 flex items-center text-sm font-medium text-[#0c3143]">
			<Icon icon="mdi:help-circle-outline" class="mr-1.5" width="16" />
			How to Use This Tool
		</h3>

		<div class="flex flex-wrap gap-2">
			<div class="flex flex-1 items-center rounded-md bg-gray-50 p-1.5 text-sm">
				<span
					class="mr-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-800"
					>1</span
				>
				<span>Select a location on map or use search</span>
			</div>
			<div class="flex flex-1 items-center rounded-md bg-gray-50 p-1.5 text-sm">
				<span
					class="mr-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-800"
					>2</span
				>
				<span>Choose prediction model</span>
			</div>
			<div class="flex flex-1 items-center rounded-md bg-gray-50 p-1.5 text-sm">
				<span
					class="mr-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-800"
					>3</span
				>
				<span>Click "Predict Flooding" button</span>
			</div>
			<div class="flex flex-1 items-center rounded-md bg-gray-50 p-1.5 text-sm">
				<span
					class="mr-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-800"
					>4</span
				>
				<span>View 5-day flood risk prediction results</span>
			</div>
		</div>
	</div>
</div>

<style>
	/* Add an even smaller text size */
	.text-2xs {
		font-size: 0.625rem; /* 10px */
		line-height: 0.875rem; /* 14px */
	}
</style>
