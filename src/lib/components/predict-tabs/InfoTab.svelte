<script>
	import {
		selectedLocation,
		findNearestPoint,
		locationLoadingStatus,
		nearestFacilities,
		facilitiesLayerActive
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
	let locationLoadingState = false;
	let locationLoadingMessage = '';
	let expandedFacilities = {}; // Track expanded state of facilities
	
	// Fake progress bar state
	let fakeProgress = 0;
	let progressInterval = null;
	let predictingStartTime = null;
	
	// Start the fake progress animation
	function startFakeProgress() {
		// Reset progress
		fakeProgress = 0;
		predictingStartTime = Date.now();
		
		// Clear any existing interval
		if (progressInterval) clearInterval(progressInterval);
		
		// Set up new interval
		progressInterval = setInterval(() => {
			const elapsedTime = Date.now() - predictingStartTime;
			
			// Different phases of the progress simulation:
			// Phase 1 (0-15s): Progress quickly to 40%
			// Phase 2 (15-40s): Slow down, reach 75%
			// Phase 3 (40-80s): Very slow progress, reach 90%
			// After 80s: Stay at 90% until completion
			
			if (elapsedTime < 15000) {
				// Phase 1: Quick initial progress (builds confidence)
				fakeProgress = Math.min(40, elapsedTime / 15000 * 40);
			} else if (elapsedTime < 40000) {
				// Phase 2: Moderate progress
				fakeProgress = 40 + Math.min(35, (elapsedTime - 15000) / 25000 * 35);
			} else if (elapsedTime < 80000) {
				// Phase 3: Slow finishing progress
				fakeProgress = 75 + Math.min(15, (elapsedTime - 40000) / 40000 * 15);
			} else {
				// Maximum progress before completion
				fakeProgress = 90;
			}
		}, 100); // Update every 100ms for smooth animation
	}
	
	// Stop progress and set to 100%
	function completeProgress() {
		// Clear the interval
		if (progressInterval) {
			clearInterval(progressInterval);
			progressInterval = null;
		}
		
		// Set to 100%
		fakeProgress = 100;
		
		// After showing 100% for a moment, reset it
		setTimeout(() => {
			fakeProgress = 0;
		}, 1000);
	}

	// Subscribe to location loading status
	locationLoadingStatus.subscribe((status) => {
		locationLoadingState = status.isLoading;
		locationLoadingMessage = status.message;
	});

	// When prediction status changes, emit event for Map component
	$: {
		dispatch('predictionStatusChange', { isPredicting });
	}

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

	// Reset flood prediction when location changes
	$: if ($selectedLocation) {
		floodPrediction = null;
		predictionError = null;
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
		
		// Start the fake progress animation
		startFakeProgress();

		try {
			const response = await fetch(
				`/api/flood-prediction?lat=${$selectedLocation.lat}&lng=${$selectedLocation.lng}&elevation=${$selectedLocation.elevation || ''}`
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
			// Complete the progress animation
			completeProgress();
			isPredicting = false;
		}
	}

	// On component unmount, clear any running intervals
	onMount(() => {
		return () => {
			if (progressInterval) clearInterval(progressInterval);
		};
	});

	// Manage expanded state for each prediction
	let expandedPredictions = {};

	function toggleExpand(date) {
		expandedPredictions[date] = !expandedPredictions[date];
	}

	// Toggle expanded state for facility details
	function toggleFacilityDetails(facilityId) {
		expandedFacilities[facilityId] = !expandedFacilities[facilityId];
	}

	// Format distance for display
	function formatDistance(distance) {
		if (distance === null || distance === undefined) return 'Unknown';

		// Always display in meters, round to whole number
		return `${Math.round(distance)}m`;
	}

	// Format date to more readable format for prediction cards
	function formatDate(dateString) {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		}) + ' - ' + date.toLocaleDateString('en-US', { weekday: 'long' });
	}
	
	// Format date for header display (shorter format)
	function formatHeaderDate(dateString) {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		});
	}

	// Get color based on flood prediction status
	function getPredictionColor(prediction) {
		if (prediction === 'FLOODED') return 'text-red-600 font-bold';
		if (prediction === 'LOCATION_ON_WATER') return 'text-blue-600 font-medium';
		return 'text-green-600';
	}

	// Get risk level color based on risk level
	function getRiskLevelColor(riskLevel) {
		switch(riskLevel) {
			case 'High': return 'text-red-600 font-bold';
			case 'Medium': return 'text-orange-500 font-medium';
			case 'Low': return 'text-yellow-600 font-medium';
			case 'Very Low': return 'text-green-600';
			default: return 'text-gray-600';
		}
	}

	// Get background color for prediction card based on risk level
	function getPredictionCardStyle(prediction, riskLevel) {
		if (prediction === 'FLOODED') return 'bg-red-50 border-red-200';
		if (prediction === 'LOCATION_ON_WATER') return 'bg-blue-50 border-blue-200';
		
		switch(riskLevel) {
			case 'High': return 'bg-red-50 border-red-200';
			case 'Medium': return 'bg-orange-50 border-orange-200';
			case 'Low': return 'bg-yellow-50 border-yellow-200';
			case 'Very Low': return 'bg-green-50 border-green-200';
			default: return 'bg-gray-50 border-gray-200';
		}
	}

	// Get risk level badge style
	function getRiskLevelBadgeStyle(riskLevel) {
		switch(riskLevel) {
			case 'High': return 'bg-red-100 text-red-800';
			case 'Medium': return 'bg-orange-100 text-orange-800';
			case 'Low': return 'bg-yellow-100 text-yellow-800';
			case 'Very Low': return 'bg-green-100 text-green-800';
			default: return 'bg-gray-100 text-gray-800';
		}
	}

	// Get icon for prediction
	function getPredictionIcon(prediction, riskLevel) {
		if (prediction === 'FLOODED') return 'mdi:alert-circle';
		if (prediction === 'LOCATION_ON_WATER') return 'mdi:water';
		
		switch(riskLevel) {
			case 'High': return 'mdi:alert-circle';
			case 'Medium': return 'mdi:alert';
			case 'Low': return 'mdi:information';
			case 'Very Low': return 'mdi:check-circle';
			default: return 'mdi:check-circle';
		}
	}

	// Format probability relative to threshold
	function formatRelativeProbability(probability, threshold) {
		if (!probability || !threshold) return '';
		
		const ratio = probability / threshold;
		if (ratio >= 1) return 'exceeds threshold';
		return `${Math.round(ratio * 100)}% of threshold`;
	}

	// Get color based on flood probability
	function getFloodProbabilityColor(probability, prediction) {
		if (prediction === 'FLOODED') return 'text-red-600 font-bold';
		if (probability > 0.15) return 'text-orange-500 font-medium';
		return 'text-green-600';
	}

	// Format property value for display (convert fire_station -> Fire Station)
	function formatPropertyValue(value) {
		if (!value || typeof value !== 'string') return value;
		
		return value
			.split('_')
			.map(word => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}

	// Get progress bar color based on progress percentage
	function getProgressBarColor(progress) {
		if (progress < 30) return 'bg-blue-400';
		if (progress < 60) return 'bg-blue-500';
		if (progress < 90) return 'bg-blue-600';
		return 'bg-green-500';
	}

	// Format progress percentage for display
	function formatProgress(progress) {
		return Math.round(progress) + '%';
	}

	// Format elapsed time for display
	function formatElapsedTime() {
		if (!predictingStartTime) return '';
		
		const elapsedSeconds = Math.floor((Date.now() - predictingStartTime) / 1000);
		return `${elapsedSeconds}s`;
	}

	// Extract readable property info from facility properties
	function getFormattedAddress(properties) {
		if (!properties) return null;
		
		// Collect address components
		const addressParts = [];
		
		// Street and house number
		if (properties['addr:housenumber'] && properties['addr:street']) {
			addressParts.push(`${properties['addr:housenumber']} ${properties['addr:street']}`);
		} else if (properties['addr:street']) {
			addressParts.push(properties['addr:street']);
		}
		
		// City/municipality
		if (properties['addr:city']) {
			addressParts.push(properties['addr:city']);
		}
		
		// Province
		if (properties['addr:province']) {
			addressParts.push(properties['addr:province']);
		}
		
		// Postcode
		if (properties['addr:postcode']) {
			addressParts.push(properties['addr:postcode']);
		}
		
		return addressParts.length > 0 ? addressParts.join(', ') : null;
	}

	// Extract building info from properties with better formatting
	function getBuildingInfo(properties) {
		if (!properties) return [];
		
		const buildingInfo = [];
		const skipKeys = ['building:part', 'building:type']; // Skip these building keys
		
		// Extract building keys like building:levels, building:material, etc.
		Object.keys(properties).forEach(key => {
			if (key.startsWith('building:') && !skipKeys.includes(key)) {
				// Extract the part after building:
				const label = key.replace('building:', '');
				// Capitalize first letter and replace underscores
				const formattedLabel = label
					.split('_')
					.map(word => word.charAt(0).toUpperCase() + word.slice(1))
					.join(' ');
				
				// Format the value if it's a string
				const value = typeof properties[key] === 'string' 
					? formatPropertyValue(properties[key]) 
					: properties[key];
				
				buildingInfo.push({
					label: formattedLabel,
					value: value
				});
			}
		});
				
		return buildingInfo;
	}

	// Get additional properties worth displaying with better formatting
	function getAdditionalProperties(properties) {
		if (!properties) return [];
		
		const additionalProps = [];
		const interestingProps = [
			'amenity', 'emergency', 'evacuation_center', 'leisure', 'operator', 'capacity'
		];
		
		interestingProps.forEach(prop => {
			if (properties[prop] && properties[prop] !== 'yes') {
				// Format the label
				let label = prop;
				if (prop.includes(':')) {
					label = prop.split(':')[1];
					}
				
				// Properly format the label with spaces and capitalization
				label = label
					.split('_')
					.map(word => word.charAt(0).toUpperCase() + word.slice(1))
					.join(' ');
				
				// Format the value if it's a string
				const value = typeof properties[prop] === 'string' 
					? formatPropertyValue(properties[prop]) 
					: properties[prop];
				
				additionalProps.push({
					label,
					value
				});
			}
		});
		
		return additionalProps;
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

	// Format probability with 4 decimal places
	function formatRawProbability(probability) {
		if (!probability && probability !== 0) return 'N/A';
		return probability.toFixed(4);
	}

	// Format threshold ratio as percentage with 2 decimal places
	function formatThresholdRatio(probability, threshold) {
		if (!probability || !threshold) return '';
		const ratio = (probability / threshold) * 100;
		return ratio.toFixed(2) + '%';
	}
	
	// Format depth value to show only if it has a value
	function formatDepth(depthCm) {
		if (!depthCm && depthCm !== 0) return null;
		
		// Convert cm to inches
		const inches = depthCm / 2.54;
		
		return {
			cm: Math.round(depthCm * 10) / 10,
			inches: Math.round(inches * 10) / 10
		};
	}
</script>

<div class="info-tab">
	<h2 class="mb-2 flex items-center text-lg font-semibold text-[#0c3143]">
		<Icon icon="mdi:weather-flood" class="mr-2" width="22" />
		Flood Prediction Tool
	</h2>

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

		<div class="flex items-center justify-between">
			<p class="text-sm text-gray-600">
				<Icon icon="mdi:information-outline" class="mr-1 inline-block" width="14" />
				Uses combined RF & LSTM models
			</p>
			
			<button
				on:click={predictFlood}
				disabled={isPredicting || !$selectedLocation.lat || locationLoadingState}
				class="flex items-center justify-center rounded-md bg-[#0c3143] px-4 py-1.5 text-sm text-white shadow-sm transition duration-150 hover:bg-[#1a4a5a] focus:ring-2 focus:ring-[#0c3143] focus:ring-offset-2 focus:outline-none disabled:opacity-50"
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

		{#if predictionError}
			<p class="mt-1.5 flex items-center text-sm text-red-600">
				<Icon icon="mdi:alert-circle" class="mr-1" width="14" />
				{predictionError}
			</p>
		{/if}
	</div>

	<!-- Prediction Results: Redesigned cards -->
	{#if isPredicting}
		<!-- Loading indicator with progress bar for prediction -->
		<div class="mb-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
			<div class="mb-2 flex items-center justify-between">
				<div class="flex items-center">
					<Icon icon="eos-icons:loading" class="mr-2 animate-spin text-blue-500" width="20" />
					<p class="text-sm text-blue-700">Processing prediction data...</p>
				</div>
				<span class="text-xs text-blue-600">{formatElapsedTime()}</span>
			</div>
			
			<!-- Progress bar -->
			<div class="relative h-4 w-full overflow-hidden rounded-full bg-gray-200">
				<div 
					class={`absolute left-0 top-0 h-full transition-all duration-300 ease-out ${getProgressBarColor(fakeProgress)}`}
					style={`width: ${fakeProgress}%;`}
				></div>
			</div>
			
			<!-- Progress percentage -->
			<div class="mt-1 flex justify-between text-xs text-gray-600">
				<span>Analyzing terrain, weather, and hydrological data...</span>
				<span class="font-medium">{formatProgress(fakeProgress)}</span>
			</div>
			
			<!-- Prediction stages based on progress -->
			<div class="mt-2 text-xs text-gray-600">
				{#if fakeProgress < 30}
					<p>• Gathering location, elevation and water proximity data</p>
				{:else if fakeProgress < 60}
					<p>• Processing terrain and weather variables</p>
					<p>• Analyzing historical precipitation patterns</p>
				{:else if fakeProgress < 90}
					<p>• Running Random Forest and LSTM prediction models</p>
					<p>• Calculating flood probability and risk level</p>
				{:else}
					<p>• Finalizing results and generating forecast</p>
				{/if}
			</div>
		</div>
	{:else if floodPrediction && floodPrediction.daily_predictions && floodPrediction.daily_predictions.length > 0}
		<!-- Results display with improved card layout -->
		<div class="mb-2">
			<div class="mb-2 flex items-center justify-between">
				<h3 class="flex items-center text-sm font-medium text-[#0c3143]">
					<Icon icon="mdi:calendar-clock" class="mr-1.5" width="16" />
					Flood Prediction Results
				</h3>
				<span class="rounded-full bg-blue-100 px-1.5 py-0.5 text-xs text-blue-800">
					{floodPrediction.request_details?.request_timestamp ? 
						formatHeaderDate(floodPrediction.request_details.request_timestamp.split(' ')[0]) : 
						'Next 5 Days'}
				</span>
			</div>

			<div class="mb-2 flex flex-wrap justify-between rounded border border-gray-200 bg-gray-50 p-2 text-xs text-gray-500">
				<div>
					<span class="font-medium text-gray-600">Model:</span>
					<span class="ml-1">{floodPrediction.request_details?.model_configuration || 'RF & LSTM Combined'}</span>
				</div>
				<div>
					<span class="font-medium text-gray-600">Processing Time:</span>
					<span class="ml-1">{floodPrediction.request_details?.processing_duration_seconds || 'N/A'} sec</span>
				</div>
			</div>
			
				<!-- Check if location is on water - if so, display only a single message -->
			{#if floodPrediction.request_details?.input_point_context_type || floodPrediction.daily_predictions[0]?.is_flooded_prediction_rf === "LOCATION_ON_WATER"}
				<div class="rounded-md border border-blue-200 bg-blue-50 p-4 text-blue-800 shadow-sm">
					<div class="flex items-start">
						<Icon icon="mdi:water" class="mr-3 mt-0.5 flex-shrink-0 text-blue-600" width="22" />
						<div>
							<h4 class="mb-1 text-base font-medium">
								Location on {floodPrediction.request_details?.input_point_context_type || "water"}
							</h4>
							<p class="text-sm">
								{floodPrediction.request_details?.input_point_context_message || 
								floodPrediction.daily_predictions[0]?.context_message || 
								"This location appears to be on water. Flood predictions for land areas are not applicable here."}
							</p>
						</div>
					</div>
				</div>
			{:else}
				<!-- Prediction cards in a grid - only for land-based predictions -->
				<div class="grid grid-cols-1 gap-2">
					{#each floodPrediction.daily_predictions as day, index}
						<!-- Regular prediction card -->
						<div class={`rounded-md border p-3 shadow-sm ${getPredictionCardStyle(day.is_flooded_prediction_rf, day.flood_risk_level)}`}>
							<!-- Header with date and prediction -->
							<div class="mb-2 flex items-start justify-between">
								<div>
									<h4 class="flex items-center text-base font-medium">
										<Icon icon="mdi:calendar" class="mr-1.5" width="16" />
										{formatDate(day.date)}
									</h4>
									
									<!-- Prediction with risk level -->
									<div class="mt-1 flex flex-wrap items-center gap-2">
										<p class={`${getPredictionColor(day.is_flooded_prediction_rf)} flex items-center text-sm`}>
											<Icon
												icon={getPredictionIcon(day.is_flooded_prediction_rf, day.flood_risk_level)}
												class="mr-1.5"
												width="16"
											/>
											{day.is_flooded_prediction_rf === "NOT FLOODED" ? "NOT FLOODED" : "FLOODED"}
										</p>
										
										<!-- Risk level badge -->
										<span class={`flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getRiskLevelBadgeStyle(day.flood_risk_level)}`}>
											<Icon icon="mdi:trending-up" class="mr-0.5" width="12" />
											{day.flood_risk_level} Risk
										</span>
									</div>
									
									<!-- Depth information if available -->
									{#if day.average_predicted_depth_cm}
										{@const depth = formatDepth(day.average_predicted_depth_cm)}
										{#if depth}
											<div class="mt-1 flex items-center text-sm font-medium text-red-700">
												<Icon icon="mdi:water" class="mr-1" width="16" />
												Predicted depth: {depth.cm} cm ({depth.inches} in)
											</div>
										{/if}
									{/if}
									
									<!-- Model probability info -->
									<p class="mt-1 text-xs text-gray-600">
										<span class="font-medium">Probability:</span> 
										<span class={getFloodProbabilityColor(day.is_flooded_probability_rf, day.is_flooded_prediction_rf)}>
											{formatRawProbability(day.is_flooded_probability_rf)}
										</span>
										
										{#if day.rf_threshold_applied}
											<span class="ml-2">
												<span class="font-medium">Threshold:</span> {formatRawProbability(day.rf_threshold_applied)}
											</span>
											<span class="ml-2">
												({formatRelativeProbability(day.is_flooded_probability_rf, day.rf_threshold_applied)})
											</span>
										{/if}
									</p>
								</div>
							</div>

							<!-- Key Weather Indicators for today -->
							{#if day.features_assembled_for_this_day}
								<div class="mb-2 grid grid-cols-2 gap-2">
									{#if hasValidValue(day.features_assembled_for_this_day.Precip_mm_Today)}
										<div class="flex items-center rounded bg-white p-2 text-sm shadow-sm">
											<Icon icon="mdi:weather-pouring" class="mr-1.5 text-blue-500" width="16" />
											<div class="flex-1">
												<div class="flex justify-between">
													<span class="text-gray-700">Rainfall:</span>
													<span class="font-medium">
														{formatValue('Precip_mm_Today', day.features_assembled_for_this_day.Precip_mm_Today)} mm
													</span>
												</div>
											</div>
										</div>
									{/if}
									
									{#if hasValidValue(day.features_assembled_for_this_day.Precipitation_Hours_Today)}
										<div class="flex items-center rounded bg-white p-2 text-sm shadow-sm">
											<Icon icon="mdi:clock-outline" class="mr-1.5 text-blue-500" width="16" />
											<div class="flex-1">
												<div class="flex justify-between">
													<span class="text-gray-700">Rain Hours:</span>
													<span class="font-medium">
														{formatValue('Precipitation_Hours_Today', 
														day.features_assembled_for_this_day.Precipitation_Hours_Today)} hrs
													</span>
												</div>
											</div>
										</div>
									{/if}
									
									{#if hasValidValue(day.features_assembled_for_this_day.Total_Precip_Last_3Days_mm)}
										<div class="flex items-center rounded bg-white p-2 text-sm shadow-sm">
											<Icon icon="mdi:history" class="mr-1.5 text-blue-500" width="16" />
											<div class="flex-1">
												<div class="flex justify-between">
													<span class="text-gray-700">3-Day Rain:</span>
													<span class="font-medium">
														{formatValue('Total_Precip_Last_3Days_mm', 
														day.features_assembled_for_this_day.Total_Precip_Last_3Days_mm)} mm
													</span>
												</div>
											</div>
										</div>
									{/if}
									
									{#if hasValidValue(day.features_assembled_for_this_day.Soil_Moisture_0_to_7cm_m3m3_Today)}
										<div class="flex items-center rounded bg-white p-2 text-sm shadow-sm">
											<Icon icon="mdi:terrain" class="mr-1.5 text-blue-500" width="16" />
											<div class="flex-1">
												<div class="flex justify-between">
													<span class="text-gray-700">Soil Moisture:</span>
													<span class="font-medium">
														{formatValue('Soil_Moisture_0_to_7cm_m3m3_Today', 
														day.features_assembled_for_this_day.Soil_Moisture_0_to_7cm_m3m3_Today)} m³/m³
													</span>
												</div>
											</div>
										</div>
									{/if}
								</div>
							{/if}

							<!-- Expand/Collapse Button for details -->
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

							<!-- Expanded Details: Feature data breakdown -->
							{#if expandedPredictions[day.date] && day.features_assembled_for_this_day}
								<div class="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
									{#if day.features_assembled_for_this_day}
										<!-- Depth predictions from different models -->
										{#if day.rf_predicted_depth_cm || day.lstm_predicted_depth_cm}
											<div class="col-span-full rounded border border-blue-200 bg-blue-50 p-2">
												<h5 class="mb-1 flex items-center text-xs font-medium text-blue-700">
													<Icon icon="mdi:water" class="mr-1" width="14" />
													Model Depth Predictions
												</h5>
												<div class="grid grid-cols-3 gap-2 text-xs">
													{#if day.rf_predicted_depth_cm !== null}
														<div class="rounded bg-white p-2 text-center">
															<div class="font-medium text-gray-600">RF Model</div>
															<div class="text-blue-700">{formatValue('depth', day.rf_predicted_depth_cm)} cm</div>
														</div>
													{/if}
													{#if day.lstm_predicted_depth_cm !== null}
														<div class="rounded bg-white p-2 text-center">
															<div class="font-medium text-gray-600">LSTM Model</div>
															<div class="text-blue-700">{formatValue('depth', day.lstm_predicted_depth_cm)} cm</div>
														</div>
													{/if}
													{#if day.average_predicted_depth_cm !== null}
														<div class="rounded bg-white p-2 text-center">
															<div class="font-medium text-gray-600">Average</div>
															<div class="text-blue-700">{formatValue('depth', day.average_predicted_depth_cm)} cm</div>
														</div>
													{/if}
												</div>
											</div>
										{/if}
										
										<!-- Water stations information -->
										{#if day.features_assembled_for_this_day.S1_WL_Today_m || 
											day.features_assembled_for_this_day.S2_WL_Today_m || 
											day.features_assembled_for_this_day.S3_WL_Today_m}
											<div class="col-span-full rounded border border-blue-200 bg-blue-50 p-2">
												<h5 class="mb-1 flex items-center text-xs font-medium text-blue-700">
													<Icon icon="mdi:water-percent" class="mr-1" width="14" />
													Nearby Water Station Levels
												</h5>
												<div class="grid grid-cols-3 gap-2 text-xs">
													{#if day.features_assembled_for_this_day.S1_WL_Today_m !== null}
														<div class="rounded bg-white p-2">
															<div class="font-medium text-gray-600">Station 1 ({day.features_assembled_for_this_day.S1_ID})</div>
															<div class="flex justify-between">
																<span>Current:</span>
																<span class="text-blue-700">{formatValue('level', day.features_assembled_for_this_day.S1_WL_Today_m)} m</span>
															</div>
															<div class="flex justify-between">
																<span>Change:</span>
																<span class={day.features_assembled_for_this_day.S1_WL_Change_Last_24h_m > 0 ? 'text-red-600' : 'text-green-600'}>
																	{formatValue('change', day.features_assembled_for_this_day.S1_WL_Change_Last_24h_m)} m
																</span>
															</div>
															<div class="flex justify-between">
																<span>Distance:</span>
																<span>{formatValue('distance', day.features_assembled_for_this_day.S1_Distance_m)} m</span>
															</div>
														</div>
													{/if}
													{#if day.features_assembled_for_this_day.S2_WL_Today_m !== null}
														<div class="rounded bg-white p-2">
															<div class="font-medium text-gray-600">Station 2 ({day.features_assembled_for_this_day.S2_ID})</div>
															<div class="flex justify-between">
																<span>Current:</span>
																<span class="text-blue-700">{formatValue('level', day.features_assembled_for_this_day.S2_WL_Today_m)} m</span>
															</div>
															<div class="flex justify-between">
																<span>Change:</span>
																<span class={day.features_assembled_for_this_day.S2_WL_Change_Last_24h_m > 0 ? 'text-red-600' : 'text-green-600'}>
																	{formatValue('change', day.features_assembled_for_this_day.S2_WL_Change_Last_24h_m)} m
																</span>
															</div>
															<div class="flex justify-between">
																<span>Distance:</span>
																<span>{formatValue('distance', day.features_assembled_for_this_day.S2_Distance_m)} m</span>
															</div>
														</div>
													{/if}
													{#if day.features_assembled_for_this_day.S3_WL_Today_m !== null}
														<div class="rounded bg-white p-2">
															<div class="font-medium text-gray-600">Station 3 ({day.features_assembled_for_this_day.S3_ID})</div>
															<div class="flex justify-between">
																<span>Current:</span>
																<span class="text-blue-700">{formatValue('level', day.features_assembled_for_this_day.S3_WL_Today_m)} m</span>
															</div>
															<div class="flex justify-between">
																<span>Change:</span>
																<span class={day.features_assembled_for_this_day.S3_WL_Change_Last_24h_m > 0 ? 'text-red-600' : 'text-green-600'}>
																	{formatValue('change', day.features_assembled_for_this_day.S3_WL_Change_Last_24h_m)} m
																</span>
															</div>
															<div class="flex justify-between">
																<span>Distance:</span>
																<span>{formatValue('distance', day.features_assembled_for_this_day.S3_Distance_m)} m</span>
															</div>
														</div>
													{/if}
												</div>
											</div>
										{/if}
										
										<!-- Location Features -->
										
										<div class="rounded border border-gray-200 bg-gray-50 p-2">
											<h5 class="mb-1 flex items-center text-xs font-medium text-gray-700">
												<Icon icon="mdi:map-marker" class="mr-1 text-gray-600" width="14" />
												Location Features
											</h5>
											<div class="space-y-0.5 text-2xs">
												{#each ['Latitude', 'Longitude', 'Elevation_m', 'Distance_to_Nearest_Waterway_m', 'Distance_to_Nearest_River_m', 'Distance_to_Nearest_Stream_m', 'Distance_to_Drain_Canal_m'] as key}
													{#if hasValidValue(day.features_assembled_for_this_day[key])}
														<div class="flex items-baseline justify-between overflow-hidden">
															<span class="truncate pr-2 text-gray-500" title={getFeatureDisplayName(key)}>
																{getFeatureDisplayName(key).replace(/ \([^)]+\)/, '')}: 
															</span>
															<div class="flex-shrink-0 text-right font-medium">
																{formatValue(key, day.features_assembled_for_this_day[key])}
																<span class="ml-0.5 text-gray-400">
																	{key.includes('m') && !key.includes('Latitude') && !key.includes('Longitude') ? 'm' : ''}
																</span>
															</div>
														</div>
													{/if}
												{/each}
											</div>
										</div>
										
										<!-- Weather Today -->
										<div class="rounded border border-gray-200 bg-gray-50 p-2">
											<h5 class="mb-1 flex items-center text-xs font-medium text-gray-700">
												<Icon icon="mdi:weather-partly-cloudy" class="mr-1 text-gray-600" width="14" />
												Today's Weather
											</h5>
											<div class="space-y-0.5 text-2xs">
												{#each Object.keys(day.features_assembled_for_this_day).filter(k => k.includes('_Today')) as key}
													{#if hasValidValue(day.features_assembled_for_this_day[key])}
														<div class="flex items-baseline justify-between overflow-hidden">
															<span class="truncate pr-2 text-gray-500" title={getFeatureDisplayName(key)}>
																{getFeatureDisplayName(key).replace(/ \([^)]+\)/, '')}: 
															</span>
															<div class="flex-shrink-0 text-right font-medium">
																{formatValue(key, day.features_assembled_for_this_day[key])}
																<span class="ml-0.5 text-gray-400">
																	{key.includes('C_') ? '°C' : 
																	key.includes('mm') ? 'mm' : 
																	key.includes('kmh') ? 'km/h' : 
																	key.includes('m3m3') ? 'm³/m³' : 
																	key.includes('Hours') ? 'hrs' : 
																	key.includes('%') ? '%' : ''}
																</span>
															</div>
														</div>
													{/if}
												{/each}
											</div>
										</div>
										
										<!-- Previous Days Weather -->
										<div class="rounded border border-gray-200 bg-gray-50 p-2">
											<h5 class="mb-1 flex items-center text-xs font-medium text-gray-700">
												<Icon icon="mdi:history" class="mr-1 text-gray-600" width="14" />
												Previous Days
											</h5>
											<div class="space-y-0.5 text-2xs">
												{#each Object.keys(day.features_assembled_for_this_day).filter(k => k.includes('_Lag')) as key}
													{#if hasValidValue(day.features_assembled_for_this_day[key])}
														<div class="flex items-baseline justify-between overflow-hidden">
															<span class="truncate pr-2 text-gray-500" title={getFeatureDisplayName(key)}>
																{getFeatureDisplayName(key).replace(/ \([^)]+\)/, '')}: 
															</span>
															<div class="flex-shrink-0 text-right font-medium">
																{formatValue(key, day.features_assembled_for_this_day[key])}
																<span class="ml-0.5 text-gray-400">
																	{key.includes('C_') ? '°C' : 
																	key.includes('mm') ? 'mm' : 
																	key.includes('kmh') ? 'km/h' : 
																	key.includes('m3m3') ? 'm³/m³' : 
																	key.includes('Hours') ? 'hrs' : 
																	key.includes('%') ? '%' : ''}
																</span>
															</div>
														</div>
													{/if}
												{/each}
											</div>
										</div>
										
										<!-- Accumulated Precipitation -->
										<div class="rounded border border-gray-200 bg-gray-50 p-2">
											<h5 class="mb-1 flex items-center text-xs font-medium text-gray-700">
												<Icon icon="mdi:water-percent" class="mr-1 text-gray-600" width="14" />
												Accumulated Precipitation
											</h5>
											<div class="space-y-0.5 text-2xs">
												{#each Object.keys(day.features_assembled_for_this_day).filter(k => k.includes('Total_Precip_Last') || k.includes('API_k')) as key}
													{#if hasValidValue(day.features_assembled_for_this_day[key])}
														<div class="flex items-baseline justify-between overflow-hidden">
															<span class="truncate pr-2 text-gray-500" title={getFeatureDisplayName(key)}>
																{getFeatureDisplayName(key).replace(/ \([^)]+\)/, '')}: 
															</span>
															<div class="flex-shrink-0 text-right font-medium">
																{formatValue(key, day.features_assembled_for_this_day[key])}
																<span class="ml-0.5 text-gray-400">mm</span>
															</div>
														</div>
													{/if}
												{/each}
												
												{#if hasValidValue(day.features_assembled_for_this_day['Consecutive_Dry_Days_Before_Today'])}
													<div class="flex items-baseline justify-between overflow-hidden">
														<span class="truncate pr-2 text-gray-500">Consecutive Dry Days:</span>
														<div class="flex-shrink-0 text-right font-medium">
															{day.features_assembled_for_this_day['Consecutive_Dry_Days_Before_Today']}
														</div>
													</div>
												{/if}
												
												{#if hasValidValue(day.features_assembled_for_this_day['Consecutive_Wet_Days_Before_Today'])}
													<div class="flex items-baseline justify-between overflow-hidden">
														<span class="truncate pr-2 text-gray-500">Consecutive Wet Days:</span>
														<div class="flex-shrink-0 text-right font-medium">
															{day.features_assembled_for_this_day['Consecutive_Wet_Days_Before_Today']}
														</div>
													</div>
												{/if}
											</div>
										</div>
									{/if}
								</div>
							{/if}
						</div>
						{/each}
				</div>
			{/if}
		</div>
	{/if}

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
					Nearest Facilities
				</h3>
				{#if !$facilitiesLayerActive}
					<!-- Show message when facilities layer is off -->
					<div class="rounded-md border border-yellow-200 bg-yellow-50 p-2">
						<div class="flex items-center text-sm text-gray-700">
							<Icon icon="mdi:layers-off" class="mr-2 flex-shrink-0 text-yellow-600" width="16" />
							<p>Enable the "Nearby Facilities" layer in the map controls to see facilities in this area.</p>
						</div>
					</div>
				{:else if $nearestFacilities.length > 0}
					<ul class="list-none space-y-2.5 pl-0">
						{#each $nearestFacilities as facility}
							<li class="rounded-md border border-gray-400 bg-white">
								<button on:click={() => toggleFacilityDetails(facility.id)} class="flex items-center p-2 w-full cursor-pointer">
									<Icon
										icon={facility.icon || 'mdi:map-marker'}
										style="color: {facility.color || '#777'};"
										class="mr-2 flex-shrink-0"
										width="18"
									/>
									<div class="flex-1 text-left">
										<p class="font-medium">{facility.name}</p>
										<p class="text-xs text-gray-600"> ({facility.type})</p>
									</div>
									<span class="ml-2 rounded-full bg-gray-200 px-1.5 py-0.5 text-xs text-gray-700">
										{formatDistance(facility.distance)}
									</span>
									<div									
										class="ml-1 px-1 text-blue-500 hover:text-blue-700 focus:outline-none"
									>
										<Icon 
											icon={expandedFacilities[facility.id] ? 'mdi:chevron-up' : 'mdi:chevron-down'} 
											width="16" 
										/>
								</div>
								</button>
								
								{#if expandedFacilities[facility.id] && facility.properties}
									<div class="border-t border-gray-100 bg-gray-50 p-2 text-sm">
										<!-- Address -->
										{#if getFormattedAddress(facility.properties)}
											<div class="mb-1 flex items-start">
												<Icon icon="mdi:map-marker" class="mr-1.5 mt-0.5 flex-shrink-0 text-gray-500" width="14" />
												<div>
													<span class="font-medium text-gray-600">Address:</span>
													<span class="ml-1">{getFormattedAddress(facility.properties)}</span>
												</div>
											</div>
										{/if}
										
										<!-- Building Info -->
										{#if getBuildingInfo(facility.properties).length > 0}
											<div class="mb-1 flex items-start">
												<Icon icon="mdi:office-building" class="mr-1.5 mt-0.5 flex-shrink-0 text-gray-500" width="14" />
												<div>
													<span class="font-medium text-gray-600">Building:</span>
													<div class="ml-1">
														{#each getBuildingInfo(facility.properties) as info}
															<div class="flex items-center">
																<span class="text-gray-500">{info.label}:</span>
																<span class="ml-1">{info.value}</span>
															</div>
														{/each}
													</div>
												</div>
											</div>
										{/if}
										
										<!-- Additional Properties -->
										{#if getAdditionalProperties(facility.properties).length > 0}
											<div class="flex items-start">
												<Icon icon="mdi:information-outline" class="mr-1.5 mt-0.5 flex-shrink-0 text-gray-500" width="14" />
												<div>
													<span class="font-medium text-gray-600">Details:</span>
													<div class="ml-1">
														{#each getAdditionalProperties(facility.properties) as prop}
															<div class="flex items-start flex-wrap">
																<span class="text-gray-500">{prop.label}:</span>
																{#if prop.label === 'Website'}
																	<a 
																		href={prop.value.startsWith('http') ? prop.value : `https://${prop.value}`} 
																		target="_blank" 
																		rel="noopener noreferrer"
																		class="ml-1 text-blue-600 underline break-all"
																	>
																		{prop.value}
																	</a>
																{:else}
																	<span class="ml-1 break-words">{prop.value}</span>
																{/if}
															</div>
														{/each}
													</div>
												</div>
											</div>
										{/if}
										
										<!-- If no additional info was found -->
										{#if !getFormattedAddress(facility.properties) && 
											getBuildingInfo(facility.properties).length === 0 &&
											getAdditionalProperties(facility.properties).length === 0}
											<div class="text-center text-gray-500">
												No additional information available
											</div>
										{/if}
									</div>
								{/if}
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

	<!-- Instructions Card: More compact design -->
	<div class="mb-2 rounded-lg border border-gray-200 bg-white p-2.5">
		<h3 class="mb-1.5 flex items-center text-sm font-medium text-[#0c3143]">
			<Icon icon="mdi:help-circle-outline" class="mr-1.5" width="16" />
			How to Use This Tool
		</h3>

		<div class="flex flex-wrap flex-col gap-2">
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
				<span>Click "Predict Flooding" button</span>
			</div>
			<div class="flex flex-1 items-center rounded-md bg-gray-50 p-1.5 text-sm">
				<span
					class="mr-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-800"
					>3</span
				>
				<span>View 5-day flood risk prediction results</span>
			</div>
			<div class="flex flex-1 items-center rounded-md bg-gray-50 p-1.5 text-sm">
				<span
					class="mr-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-800"
					>4</span
				>
				<span>Use "Show detailed data" to see all factors</span>
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
