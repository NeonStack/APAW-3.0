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

	const phases = [
			{ endTime: 2000, endProgress: 40 },  // Phase 1: 0-10s, 0-40%
			{ endTime: 5000, endProgress: 70 },  // Phase 2: 10-25s, 40-80%
			{ endTime: 9000, endProgress: 95 },  // Phase 3: 25-40s, 80-90%
			{ endTime: 11000, endProgress: 99 } // Final phase: stays at 99%
		];
	
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
			
			// Find the current phase based on elapsed time
			let currentPhase = 0;
			let prevTime = 0;
			let prevProgress = 0;
			
			// Check if we've exceeded the final phase
			if (elapsedTime >= phases[phases.length - 1].endTime) {
				// Stay at the final phase progress
				fakeProgress = phases[phases.length - 1].endProgress;
				return;
			}
			
			for (let i = 0; i < phases.length; i++) {
				if (elapsedTime < phases[i].endTime) {
					currentPhase = i;
					break;
				}
				prevTime = phases[i].endTime;
				prevProgress = phases[i].endProgress;
			}
			
			const phase = phases[currentPhase];
			const phaseDuration = phase.endTime - prevTime;
			const phaseProgress = phase.endProgress - prevProgress;
			const timeInPhase = elapsedTime - prevTime;
			
			// Calculate current progress based on time within the current phase
			if (phaseDuration > 0) {
				fakeProgress = prevProgress + Math.min(phaseProgress, (timeInPhase / phaseDuration) * phaseProgress);
			} else {
				fakeProgress = phase.endProgress;
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
			
			// Delay setting isPredicting to false to ensure progress bar reaches 100%
			setTimeout(() => {
				isPredicting = false;
			}, 500); // Adjust the delay (in milliseconds) as needed
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
			case 'Very High': return 'text-red-800 font-bold';
			case 'High': return 'text-red-600 font-bold';
			case 'Medium': 
			case 'Moderate': return 'text-orange-500 font-medium';
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
			case 'Very High': return 'bg-red-100 border-red-300';
			case 'High': return 'bg-red-50 border-red-200';
			case 'Medium': 
			case 'Moderate': return 'bg-orange-50 border-orange-200';
			case 'Low': return 'bg-yellow-50 border-yellow-200';
			case 'Very Low': return 'bg-green-50 border-green-200';
			default: return 'bg-gray-50 border-gray-200';
		}
	}

	// Get risk level badge style
	function getRiskLevelBadgeStyle(riskLevel) {
		switch(riskLevel) {
			case 'Very High': return 'bg-red-200 text-red-900';
			case 'High': return 'bg-red-100 text-red-800';
			case 'Medium': 
			case 'Moderate': return 'bg-orange-100 text-orange-800';
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
			case 'Very High': return 'mdi:alert-octagon';
			case 'High': return 'mdi:alert-circle';
			case 'Medium': 
			case 'Moderate': return 'mdi:alert';
			case 'Low': return 'mdi:information';
			case 'Very Low': return 'mdi:check-circle';
			default: return 'mdi:check-circle';
		}
	}

	// Format probability relative to threshold
	function formatRelativeProbability(probability, threshold) {
		if (probability === null || probability === undefined || threshold === null || threshold === undefined) return '';
		
		const ratio = probability / threshold;
		if (ratio >= 1) return 'exceeds threshold';
		return `${Math.round(ratio * 100)}% of threshold`;
	}

	// Get color based on flood probability
	function getFloodProbabilityColor(probability, prediction) {
		if (prediction === 'FLOODED') return 'text-red-600 font-bold';
		if (probability >= 0.80) return 'text-red-800 font-bold';
		if (probability >= 0.60) return 'text-red-600 font-bold';
		if (probability >= 0.40) return 'text-orange-500 font-medium';
		if (probability >= 0.20) return 'text-yellow-600 font-medium';
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

<div class="info-tab space-y-3">
	<!-- Compact Header -->
	<div class="flex items-center space-x-2">
		<div class="rounded-md bg-gradient-to-br from-[#0c3143] to-[#1a4a5a] p-1.5">
			<Icon icon="mdi:weather-flood" class="text-white" width="18" />
		</div>
		<h2 class="text-lg font-bold text-[#0c3143]">Flood Prediction Tool</h2>
	</div>

	<!-- Compact Prediction Controls -->
	<div class="rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 p-3 shadow-sm">
		<div class="mb-2 flex items-center space-x-2">
			<div class="rounded bg-[#0c3143] p-1">
				<Icon icon="mdi:chart-box" class="text-white" width="12" />
			</div>
			<h3 class="text-sm font-semibold text-[#0c3143]">Get Prediction</h3>
		</div>

		<div class="space-y-2">
			<p class="flex items-center text-xs text-gray-600">
				<Icon icon="mdi:information-outline" class="mr-1 text-blue-500" width="14" />
				Advanced ML models (RF & LSTM)
			</p>
			
			<button
				on:click={predictFlood}
				disabled={isPredicting || !$selectedLocation.lat || locationLoadingState}
				class={`w-full flex items-center justify-center rounded-md bg-[#0c3143] px-3 py-2 text-sm font-medium text-white shadow transition-all duration-200 hover:bg-[#1a4a5a] focus:ring-2 focus:ring-[#0c3143]/20 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed`}
			>
				{#if isPredicting}
					<Icon icon="eos-icons:loading" class="mr-1.5 animate-spin" width="14" />
					Predicting...
				{:else}
					<Icon icon="mdi:weather-flood" class="mr-1.5" width="14" />
					Predict Flooding
				{/if}
			</button>

			{#if predictionError}
				<div class="flex items-start rounded-md bg-red-50 border border-red-200 p-2">
					<Icon icon="mdi:alert-circle" class="mr-1.5 mt-0.5 flex-shrink-0 text-red-500" width="14" />
					<p class="text-xs text-red-700">{predictionError}</p>
				</div>
			{/if}
		</div>
	</div>

	<!-- Compact Loading Indicator -->
	{#if isPredicting}
		<div class="rounded-lg border border-blue-200 bg-blue-50 p-3">
			<div class="mb-2 flex items-center justify-between">
				<div class="flex items-center">
					<Icon icon="eos-icons:loading" class="mr-2 animate-spin text-blue-600" width="16" />
					<div>
						<p class="text-sm font-semibold text-blue-800">Processing</p>
						<p class="text-xs text-blue-600">Analyzing data...</p>
					</div>
				</div>
				<div class="text-right">
					<div class="text-lg font-bold text-blue-700">{formatProgress(fakeProgress)}</div>
				</div>
			</div>
			
			<!-- Compact Progress Bar -->
			<div class="relative mb-2 h-2 w-full overflow-hidden rounded-full bg-blue-200">
				<div 
					class={`absolute left-0 top-0 h-full transition-all duration-500 ease-out ${getProgressBarColor(fakeProgress)}`}
					style={`width: ${fakeProgress}%;`}
				>
					<div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
				</div>
			</div>
			
			<!-- Compact Status Messages -->
			<div class="rounded bg-white/70 p-2">
				<p class="text-xs text-gray-700">
					<Icon icon="mdi:clock-outline" class="mr-1 inline text-blue-500" width="12" />
					{#if fakeProgress < phases[0].endProgress}
						Gathering environmental data
					{:else if fakeProgress < phases[1].endProgress}
						Processing terrain analysis
					{:else if fakeProgress < phases[2].endProgress}
						Running ML models
					{:else}
						Finalizing predictions
					{/if}
				</p>
			</div>
		</div>
	{/if}

	<!-- Compact Prediction Results -->
	{#if !isPredicting && floodPrediction && floodPrediction.daily_predictions && floodPrediction.daily_predictions.length > 0}
		<div class="space-y-3">
			<!-- Compact Results Header -->
			<div class="rounded-lg bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 p-3">
				<div class="flex items-center justify-between">
					<div class="flex items-center">
						<Icon icon="mdi:calendar-clock" class="mr-2 text-green-600" width="18" />
						<div>
							<h3 class="text-sm font-bold text-[#0c3143]">Prediction Results</h3>
							<p class="text-xs text-gray-600">5-day forecast complete</p>
						</div>
					</div>
					<span class="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
						{floodPrediction.request_details?.request_timestamp ? 
							formatHeaderDate(floodPrediction.request_details.request_timestamp.split(' ')[0]) : 
							'Next 5 Days'}
					</span>
				</div>
			</div>

			<!-- Compact Model Info -->
			<div class="rounded border border-gray-200 bg-gray-50 p-2">
				<div class="flex flex-wrap items-center justify-between gap-2 text-xs">
					<div class="flex items-center">
						<Icon icon="mdi:brain" class="mr-1 text-gray-600" width="12" />
						<span class="font-medium">Model:</span>
						<span class="ml-1 font-mono">{floodPrediction.request_details?.model_configuration || 'RF & LSTM'}</span>
					</div>
					<div class="flex items-center">
						<Icon icon="mdi:timer" class="mr-1 text-gray-600" width="12" />
						<span class="font-medium">Time:</span>
						<span class="ml-1 font-mono">{floodPrediction.request_details?.processing_duration_seconds || 'N/A'}s</span>
					</div>
				</div>
			</div>
			
			<!-- Location on Water Alert (Compact) -->
			{#if floodPrediction.request_details?.input_point_context_type || floodPrediction.daily_predictions[0]?.is_flooded_prediction_rf === "LOCATION_ON_WATER"}
				<div class="rounded-lg border border-blue-300 bg-blue-50 p-3">
					<div class="flex items-start">
						<Icon icon="mdi:water" class="mr-2 mt-0.5 flex-shrink-0 text-blue-600" width="18" />
						<div>
							<h4 class="text-sm font-bold text-blue-900">
								Location on {floodPrediction.request_details?.input_point_context_type || "water"}
							</h4>
							<p class="text-xs text-blue-700 mt-1">
								{floodPrediction.request_details?.input_point_context_message || 
								floodPrediction.daily_predictions[0]?.context_message || 
								"This location appears to be on water. Flood predictions for land areas are not applicable here."}
							</p>
						</div>
					</div>
				</div>
			{:else}
				<!-- Ultra-Compact Prediction Cards -->
				<div class="space-y-2">
					{#each floodPrediction.daily_predictions as day, index}
						<div class={`rounded-lg border shadow-sm ${getPredictionCardStyle(day.is_flooded_prediction_rf, day.flood_risk_level)}`}>
							<!-- Ultra-Compact Card Header -->
							<div class="p-3">
								<!-- Date and Main Status Row -->
								<div class="mb-2">
									<h4 class="flex items-center text-sm font-bold text-gray-800 mb-1">
										<Icon icon="mdi:calendar" class="mr-1.5" width="14" />
										{formatDate(day.date)}
									</h4>
									
									<!-- Status and Risk Level Row -->
									<div class="flex items-center justify-between">
										<div class={`flex items-center text-sm font-bold ${getPredictionColor(day.is_flooded_prediction_rf)}`}>
											<Icon
												icon={getPredictionIcon(day.is_flooded_prediction_rf, day.flood_risk_level)}
												class="mr-1"
												width="14"
											/>
											{day.is_flooded_prediction_rf === "NOT FLOODED" ? "NOT FLOODED" : "FLOODED"}
										</div>
										
										<span class={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${getRiskLevelBadgeStyle(day.flood_risk_level)}`}>
											{day.flood_risk_level} Risk
										</span>
									</div>
								</div>
								
								<!-- Probability Info Row -->
								<div class="rounded bg-white/70 p-2 text-xs space-y-1">
									<div class="flex items-center justify-between">
										<span class="font-medium text-gray-600">Probability:</span>
										<span class={`font-mono font-bold ${getFloodProbabilityColor(day.is_flooded_probability_rf, day.is_flooded_prediction_rf)}`}>
											{formatRawProbability(day.is_flooded_probability_rf)}
										</span>
									</div>
									{#if day.rf_threshold_applied}
										<div class="flex items-center justify-between">
											<span class="text-gray-500">vs Threshold ({formatRawProbability(day.rf_threshold_applied)}):</span>
											<span class="font-mono text-xs">{formatRelativeProbability(day.is_flooded_probability_rf, day.rf_threshold_applied)}</span>
										</div>
									{/if}
								</div>
								
								<!-- Compact Depth Information (if significant) -->
								{#if day.average_predicted_depth_cm}
									{@const depth = formatDepth(day.average_predicted_depth_cm)}
									{#if depth}
										<div class="mt-2 flex items-center rounded bg-red-50 border border-red-200 p-2">
											<Icon icon="mdi:water" class="mr-1.5 text-red-600" width="14" />
											<div class="text-xs">
												<span class="font-semibold text-red-800">Predicted Depth:</span>
												<span class="ml-1 text-red-700 font-mono">{depth.cm}cm ({depth.inches}in)</span>
											</div>
										</div>
									{/if}
								{/if}
							</div>

							<!-- Ultra-Compact Expand/Collapse Section -->
							<div class="border-t border-gray-200/50 bg-white/50 p-2">
								<button
									on:click={() => toggleExpand(day.date)}
									class="flex w-full items-center justify-center rounded border border-dashed border-blue-300 bg-blue-50/50 px-2 py-1.5 text-xs font-medium text-blue-700 transition-all duration-200 hover:bg-blue-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
								>
									<Icon
										icon={expandedPredictions[day.date] ? 'mdi:chevron-up' : 'mdi:chevron-down'}
										width="14"
										class="mr-1"
									/>
									{expandedPredictions[day.date] ? 'Hide Details' : 'Show Details'}
								</button>
							</div>

							<!-- Compact Expanded Details -->
							{#if expandedPredictions[day.date] && day.features_assembled_for_this_day}
								<div class="border-t border-gray-200 bg-gray-50 p-3 space-y-3">
									<!-- Key Weather Indicators (Moved Here) -->
									<div class="rounded border border-blue-200 bg-blue-50 p-2">
										<h6 class="mb-2 flex items-center text-xs font-bold text-blue-800">
											<Icon icon="mdi:weather-partly-cloudy" class="mr-1" width="12" />
											Key Weather Indicators
										</h6>
										<div class="space-y-1">
											{#if hasValidValue(day.features_assembled_for_this_day.Precip_mm_Today)}
												<div class="flex items-center justify-between rounded bg-white border border-gray-200 px-2 py-1">
													<div class="flex items-center">
														<Icon icon="mdi:weather-pouring" class="mr-1.5 text-blue-500" width="12" />
														<span class="text-xs text-gray-600">Rainfall:</span>
													</div>
													<span class="text-xs font-bold text-gray-800">
														{formatValue('Precip_mm_Today', day.features_assembled_for_this_day.Precip_mm_Today)} mm
													</span>
												</div>
											{/if}
											
											{#if hasValidValue(day.features_assembled_for_this_day.Precipitation_Hours_Today)}
												<div class="flex items-center justify-between rounded bg-white border border-gray-200 px-2 py-1">
													<div class="flex items-center">
														<Icon icon="mdi:clock-outline" class="mr-1.5 text-blue-500" width="12" />
														<span class="text-xs text-gray-600">Duration:</span>
													</div>
													<span class="text-xs font-bold text-gray-800">
														{formatValue('Precipitation_Hours_Today', day.features_assembled_for_this_day.Precipitation_Hours_Today)} hrs
													</span>
												</div>
											{/if}
											
											{#if hasValidValue(day.features_assembled_for_this_day.Total_Precip_Last_3Days_mm)}
												<div class="flex items-center justify-between rounded bg-white border border-gray-200 px-2 py-1">
													<div class="flex items-center">
														<Icon icon="mdi:history" class="mr-1.5 text-blue-500" width="12" />
														<span class="text-xs text-gray-600">3-Day Total:</span>
													</div>
													<span class="text-xs font-bold text-gray-800">
														{formatValue('Total_Precip_Last_3Days_mm', day.features_assembled_for_this_day.Total_Precip_Last_3Days_mm)} mm
													</span>
												</div>
											{/if}
											
											{#if hasValidValue(day.features_assembled_for_this_day.Soil_Moisture_0_to_7cm_m3m3_Today)}
												<div class="flex items-center justify-between rounded bg-white border border-gray-200 px-2 py-1">
													<div class="flex items-center">
														<Icon icon="mdi:terrain" class="mr-1.5 text-blue-500" width="12" />
														<span class="text-xs text-gray-600">Soil Moisture:</span>
													</div>
													<span class="text-xs font-bold text-gray-800">
														{formatValue('Soil_Moisture_0_to_7cm_m3m3_Today', day.features_assembled_for_this_day.Soil_Moisture_0_to_7cm_m3m3_Today)}
													</span>
												</div>
											{/if}
										</div>
									</div>

									<!-- Compact Model Depths -->
									{#if day.rf_predicted_depth_cm || day.lstm_predicted_depth_cm}
										<div class="rounded border border-blue-200 bg-blue-50 p-2">
											<h6 class="mb-1 flex items-center text-xs font-bold text-blue-800">
												<Icon icon="mdi:water" class="mr-1" width="12" />
												Model Depth Predictions
											</h6>
											<div class="space-y-1">
												{#if day.rf_predicted_depth_cm !== null}
													<div class="flex justify-between text-xs">
														<span class="text-gray-600">Random Forest:</span>
														<span class="font-bold text-blue-700">{formatValue('depth', day.rf_predicted_depth_cm)} cm</span>
													</div>
												{/if}
												{#if day.lstm_predicted_depth_cm !== null}
													<div class="flex justify-between text-xs">
														<span class="text-gray-600">LSTM Neural Net:</span>
														<span class="font-bold text-blue-700">{formatValue('depth', day.lstm_predicted_depth_cm)} cm</span>
													</div>
												{/if}
												{#if day.average_predicted_depth_cm !== null}
													<div class="flex justify-between text-xs border-t border-blue-200 pt-1">
														<span class="text-gray-600 font-semibold">Combined Average:</span>
														<span class="font-bold text-blue-700">{formatValue('depth', day.average_predicted_depth_cm)} cm</span>
													</div>
												{/if}
											</div>
										</div>
									{/if}
									
									<!-- Compact Water Stations -->
									{#if day.features_assembled_for_this_day.S1_WL_Today_m || day.features_assembled_for_this_day.S2_WL_Today_m || day.features_assembled_for_this_day.S3_WL_Today_m}
										<div class="rounded border border-blue-200 bg-blue-50 p-2">
											<h6 class="mb-1 flex items-center text-xs font-bold text-blue-800">
												<Icon icon="mdi:water-percent" class="mr-1" width="12" />
												Nearby Water Station Data
											</h6>
											<div class="space-y-2">
												{#if day.features_assembled_for_this_day.S1_WL_Today_m !== null}
													<div class="rounded bg-white border border-gray-200 p-1.5">
														<div class="text-xs font-semibold text-gray-600 mb-1">
															Station 1 ({day.features_assembled_for_this_day.S1_ID})
														</div>
														<div class="space-y-0.5 text-xs">
															<div class="flex justify-between">
																<span class="text-gray-500">Current Level:</span>
																<span class="font-bold text-blue-700">{formatValue('level', day.features_assembled_for_this_day.S1_WL_Today_m)} m</span>
															</div>
															<div class="flex justify-between">
																<span class="text-gray-500">24h Change:</span>
																<span class={`font-bold ${day.features_assembled_for_this_day.S1_WL_Change_Last_24h_m > 0 ? 'text-red-600' : 'text-green-600'}`}>
																	{formatValue('change', day.features_assembled_for_this_day.S1_WL_Change_Last_24h_m)} m
																</span>
															</div>
															<div class="flex justify-between">
																<span class="text-gray-500">Distance:</span>
																<span class="font-medium">{formatValue('distance', day.features_assembled_for_this_day.S1_Distance_m)} m</span>
															</div>
														</div>
													</div>
												{/if}
												{#if day.features_assembled_for_this_day.S2_WL_Today_m !== null}
													<div class="rounded bg-white border border-gray-200 p-1.5">
														<div class="text-xs font-semibold text-gray-600 mb-1">
															Station 2 ({day.features_assembled_for_this_day.S2_ID})
														</div>
														<div class="space-y-0.5 text-xs">
															<div class="flex justify-between">
																<span class="text-gray-500">Current Level:</span>
																<span class="font-bold text-blue-700">{formatValue('level', day.features_assembled_for_this_day.S2_WL_Today_m)} m</span>
															</div>
															<div class="flex justify-between">
																<span class="text-gray-500">24h Change:</span>
																<span class={`font-bold ${day.features_assembled_for_this_day.S2_WL_Change_Last_24h_m > 0 ? 'text-red-600' : 'text-green-600'}`}>
																	{formatValue('change', day.features_assembled_for_this_day.S2_WL_Change_Last_24h_m)} m
																</span>
															</div>
															<div class="flex justify-between">
																<span class="text-gray-500">Distance:</span>
																<span class="font-medium">{formatValue('distance', day.features_assembled_for_this_day.S2_Distance_m)} m</span>
															</div>
														</div>
													</div>
												{/if}
												{#if day.features_assembled_for_this_day.S3_WL_Today_m !== null}
													<div class="rounded bg-white border border-gray-200 p-1.5">
														<div class="text-xs font-semibold text-gray-600 mb-1">
															Station 3 ({day.features_assembled_for_this_day.S3_ID})
														</div>
														<div class="space-y-0.5 text-xs">
															<div class="flex justify-between">
																<span class="text-gray-500">Current Level:</span>
																<span class="font-bold text-blue-700">{formatValue('level', day.features_assembled_for_this_day.S3_WL_Today_m)} m</span>
															</div>
															<div class="flex justify-between">
																<span class="text-gray-500">24h Change:</span>
																<span class={`font-bold ${day.features_assembled_for_this_day.S3_WL_Change_Last_24h_m > 0 ? 'text-red-600' : 'text-green-600'}`}>
																	{formatValue('change', day.features_assembled_for_this_day.S3_WL_Change_Last_24h_m)} m
																</span>
															</div>
															<div class="flex justify-between">
																<span class="text-gray-500">Distance:</span>
																<span class="font-medium">{formatValue('distance', day.features_assembled_for_this_day.S3_Distance_m)} m</span>
															</div>
														</div>
													</div>
												{/if}
											</div>
										</div>
									{/if}
									
									<!-- Compact Data Sections - Single Column -->
									<div class="space-y-2">
										<!-- Location Features -->
										<div class="rounded border border-gray-300 bg-white p-2">
											<h6 class="mb-1 flex items-center text-xs font-bold text-gray-800">
												<Icon icon="mdi:map-marker" class="mr-1 text-gray-600" width="12" />
												Location Features
											</h6>
											<div class="space-y-0.5">
												{#each ['Latitude', 'Longitude', 'Elevation_m', 'Distance_to_Nearest_Waterway_m', 'Distance_to_Nearest_River_m', 'Distance_to_Nearest_Stream_m', 'Distance_to_Drain_Canal_m'] as key}
													{#if hasValidValue(day.features_assembled_for_this_day[key])}
														<div class="flex items-center justify-between text-xs">
															<span class="text-gray-600 truncate" title={getFeatureDisplayName(key)}>
																{getFeatureDisplayName(key).replace(/ \([^)]+\)/, '').substring(0, 15)}...
															</span>
															<span class="font-bold text-gray-800 ml-2">
																{formatValue(key, day.features_assembled_for_this_day[key])}
																{key.includes('m') && !key.includes('Latitude') && !key.includes('Longitude') ? 'm' : ''}
															</span>
														</div>
													{/if}
												{/each}
											</div>
										</div>
										
										<!-- Today's Weather -->
										<div class="rounded border border-gray-300 bg-white p-2">
											<h6 class="mb-1 flex items-center text-xs font-bold text-gray-800">
												<Icon icon="mdi:weather-partly-cloudy" class="mr-1 text-gray-600" width="12" />
												Complete Weather Data
											</h6>
											<div class="space-y-0.5">
												{#each Object.keys(day.features_assembled_for_this_day).filter(k => k.includes('_Today')) as key}
													{#if hasValidValue(day.features_assembled_for_this_day[key])}
														<div class="flex items-center justify-between text-xs">
															<span class="text-gray-600 truncate" title={getFeatureDisplayName(key)}>
																{getFeatureDisplayName(key).replace(/ \([^)]+\)/, '').substring(0, 15)}...
															</span>
															<span class="font-bold text-gray-800 ml-2">
																{formatValue(key, day.features_assembled_for_this_day[key])}
																{key.includes('C_') ? '°C' : 
																key.includes('mm') ? 'mm' : 
																key.includes('kmh') ? 'km/h' : 
																key.includes('m3m3') ? 'm³/m³' : 
																key.includes('Hours') ? 'hrs' : 
																key.includes('%') ? '%' : ''}
															</span>
														</div>
													{/if}
												{/each}
											</div>
										</div>
										
										<!-- Previous Days -->
										<div class="rounded border border-gray-300 bg-white p-2">
											<h6 class="mb-1 flex items-center text-xs font-bold text-gray-800">
												<Icon icon="mdi:history" class="mr-1 text-gray-600" width="12" />
												Historical Weather Data
											</h6>
											<div class="space-y-0.5">
												{#each Object.keys(day.features_assembled_for_this_day).filter(k => k.includes('_Lag')) as key}
													{#if hasValidValue(day.features_assembled_for_this_day[key])}
														<div class="flex items-center justify-between text-xs">
															<span class="text-gray-600 truncate" title={getFeatureDisplayName(key)}>
																{getFeatureDisplayName(key).replace(/ \([^)]+\)/, '').substring(0, 15)}...
															</span>
															<span class="font-bold text-gray-800 ml-2">
																{formatValue(key, day.features_assembled_for_this_day[key])}
																{key.includes('C_') ? '°C' : 
																key.includes('mm') ? 'mm' : 
																key.includes('kmh') ? 'km/h' : 
																key.includes('m3m3') ? 'm³/m³' : 
																key.includes('Hours') ? 'hrs' : 
																key.includes('%') ? '%' : ''}
															</span>
														</div>
													{/if}
												{/each}
											</div>
										</div>
										
										<!-- Accumulated Precipitation -->
										<div class="rounded border border-gray-300 bg-white p-2">
											<h6 class="mb-1 flex items-center text-xs font-bold text-gray-800">
												<Icon icon="mdi:water-percent" class="mr-1 text-gray-600" width="12" />
												Accumulated Precipitation
											</h6>
											<div class="space-y-0.5">
												{#each Object.keys(day.features_assembled_for_this_day).filter(k => k.includes('Total_Precip_Last') || k.includes('API_k')) as key}
													{#if hasValidValue(day.features_assembled_for_this_day[key])}
														<div class="flex items-center justify-between text-xs">
															<span class="text-gray-600 truncate" title={getFeatureDisplayName(key)}>
																{getFeatureDisplayName(key).replace(/ \([^)]+\)/, '').substring(0, 15)}...
															</span>
															<span class="font-bold text-gray-800 ml-2">
																{formatValue(key, day.features_assembled_for_this_day[key])} mm
															</span>
														</div>
													{/if}
												{/each}
												
												{#if hasValidValue(day.features_assembled_for_this_day['Consecutive_Dry_Days_Before_Today'])}
													<div class="flex items-center justify-between text-xs">
														<span class="text-gray-600">Consecutive Dry Days</span>
														<span class="font-bold text-gray-800">
															{day.features_assembled_for_this_day['Consecutive_Dry_Days_Before_Today']}
														</span>
													</div>
												{/if}
												
												{#if hasValidValue(day.features_assembled_for_this_day['Consecutive_Wet_Days_Before_Today'])}
													<div class="flex items-center justify-between text-xs">
														<span class="text-gray-600">Consecutive Wet Days</span>
														<span class="font-bold text-gray-800">
															{day.features_assembled_for_this_day['Consecutive_Wet_Days_Before_Today']}
														</span>
													</div>
												{/if}
											</div>
										</div>
									</div>
								</div>
							{/if}
						</div>
						{/each}
				</div>
			{/if}
		</div>
	{/if}

	<!-- Compact Location Information Card -->
	<div class="rounded-lg border border-gray-200 bg-white shadow-sm">
		<div class="border-b border-gray-200 bg-gray-50 p-3">
			<h3 class="flex items-center text-sm font-bold text-[#0c3143]">
				<Icon icon="mdi:map-marker" class="mr-2" width="16" />
				Location Information
			</h3>
		</div>

		<div class="p-3">
			{#if locationLoadingState}
				<!-- Compact loading state -->
				<div class="flex items-center py-3">
					<Icon icon="eos-icons:loading" class="mr-2 animate-spin text-blue-500" width="16" />
					<div>
						<p class="text-sm font-semibold text-blue-700">Loading...</p>
						<p class="text-xs text-blue-600">{locationLoadingMessage || 'Fetching data...'}</p>
					</div>
				</div>
			{:else if !$selectedLocation.lat}
				<!-- Compact no location state -->
				<div class="flex items-center rounded border-2 border-dashed border-yellow-300 bg-yellow-50 p-3">
					<Icon icon="mdi:gesture-tap" class="mr-2 flex-shrink-0 text-yellow-600" width="20" />
					<div>
						<p class="text-sm font-semibold text-gray-800">No Location Selected</p>
						<p class="text-xs text-gray-600">Click on map or use search</p>
					</div>
				</div>
			{:else}
				<!-- Compact location details -->
				<div class="space-y-3">
					<!-- Location name -->
					{#if $selectedLocation.locationName}
						<div class="rounded bg-gray-50 p-2">
							<p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Selected Location</p>
							<p class="text-sm font-bold text-gray-800">{$selectedLocation.locationName}</p>
						</div>
					{/if}

					<!-- Compact coordinates -->
					<div class="space-y-1">
						<div class="flex justify-between text-xs">
							<span class="font-medium text-gray-600">Latitude:</span>
							<span class="font-mono text-gray-800">{$selectedLocation.lat}</span>
						</div>
						<div class="flex justify-between text-xs">
							<span class="font-medium text-gray-600">Longitude:</span>
							<span class="font-mono text-gray-800">{$selectedLocation.lng}</span>
						</div>
						<div class="flex justify-between text-xs">
							<span class="font-medium text-gray-600">Elevation:</span>
							{#if $selectedLocation.error}
								<span class="font-mono text-red-600">Error</span>
							{:else}
								<span class="font-mono text-gray-800">{$selectedLocation.elevation} m</span>
							{/if}
						</div>
					</div>

					<!-- Compact reference data -->
					<div class="space-y-2">
						{#if $nearestWeatherCity}
							<div class="rounded border border-blue-200 bg-blue-50 p-2">
								<div class="flex items-center justify-between">
									<div class="flex items-center">
										<Icon icon="mdi:weather-partly-cloudy" class="mr-2 text-blue-600" width="14" />
										<div>
											<p class="text-xs font-semibold text-blue-500">Weather Source</p>
											<p class="text-sm font-bold text-blue-800">{$nearestWeatherCity.name}</p>
										</div>
									</div>
									<span class="rounded-full bg-blue-200 px-2 py-0.5 text-xs font-bold text-blue-800">
										{formatDistance($nearestWeatherCity.distance)}
									</span>
								</div>
							</div>
						{/if}

						{#if $nearestWaterStation}
							<div class="rounded border border-blue-200 bg-blue-50 p-2">
								<div class="flex items-center justify-between">
									<div class="flex items-center">
										<Icon icon="mdi:water" class="mr-2 text-blue-600" width="14" />
										<div>
											<p class="text-xs font-semibold text-blue-500">Water Station</p>
											<p class="text-sm font-bold text-blue-800">{$nearestWaterStation.obsnm}</p>
											{#if $nearestWaterStation.wl}
												<p class="text-xs text-blue-700">Level: {$nearestWaterStation.wl} m</p>
											{/if}
										</div>
									</div>
									<span class="rounded-full bg-blue-200 px-2 py-0.5 text-xs font-bold text-blue-800">
										{formatDistance($nearestWaterStation.distance)}
									</span>
								</div>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>

		<!-- Compact Facilities Section -->
		<div class="border-t border-gray-200 bg-gray-50 p-3">
			<h4 class="mb-2 flex items-center text-sm font-bold text-[#0c3143]">
				<Icon icon="mdi:near-me" class="mr-2" width="14" />
				Nearby Facilities
			</h4>
			{#if !$facilitiesLayerActive}
				<div class="rounded border-2 border-dashed border-yellow-300 bg-yellow-50 p-2">
					<div class="flex items-center text-xs">
						<Icon icon="mdi:layers-off" class="mr-2 flex-shrink-0 text-yellow-600" width="16" />
						<div>
							<p class="font-semibold text-gray-800">Layer Disabled</p>
							<p class="text-gray-600">Enable "Nearby Facilities" layer</p>
						</div>
					</div>
				</div>
			{:else if $nearestFacilities.length > 0}
				<div class="space-y-1">
					{#each $nearestFacilities as facility}
						<div class="rounded border border-gray-300 bg-white">
							<button on:click={() => toggleFacilityDetails(facility.id)} class="flex items-center w-full p-2 hover:bg-gray-50 transition-colors duration-150">
								<Icon
									icon={facility.icon || 'mdi:map-marker'}
									style="color: {facility.color || '#777'};"
									class="mr-2 flex-shrink-0"
									width="14"
								/>
								<div class="flex-1 text-left min-w-0">
									<p class="text-sm font-bold text-gray-800 truncate">{facility.name}</p>
									<p class="text-xs text-gray-600 truncate">{facility.type}</p>
								</div>
								<span class="mr-1 rounded-full bg-gray-200 px-1.5 py-0.5 text-xs font-semibold text-gray-700 flex-shrink-0">
									{formatDistance(facility.distance)}
								</span>
								<Icon icon={expandedFacilities[facility.id] ? 'mdi:chevron-up' : 'mdi:chevron-down'} width="14" class="text-blue-600 flex-shrink-0" />
							</button>
							
							{#if expandedFacilities[facility.id] && facility.properties}
								<div class="border-t border-gray-100 bg-gray-50 p-2 text-xs">
									{#if getFormattedAddress(facility.properties)}
										<div class="mb-1">
											<span class="font-semibold text-gray-600">Address:</span>
											<p class="text-gray-800 break-words">{getFormattedAddress(facility.properties)}</p>
										</div>
									{/if}
									
									{#if getBuildingInfo(facility.properties).length > 0}
										<div class="mb-1">
											<span class="font-semibold text-gray-600">Building:</span>
											{#each getBuildingInfo(facility.properties) as info}
												<div class="flex justify-between">
													<span class="text-gray-500">{info.label}:</span>
													<span class="text-gray-800">{info.value}</span>
												</div>
											{/each}
										</div>
									{/if}
									
									{#if getAdditionalProperties(facility.properties).length > 0}
										<div>
											<span class="font-semibold text-gray-600">Details:</span>
											{#each getAdditionalProperties(facility.properties) as prop}
												<div class="flex justify-between">
													<span class="text-gray-500">{prop.label}:</span>
													{#if prop.label === 'Website'}
														<a 
															href={prop.value.startsWith('http') ? prop.value : `https://${prop.value}`} 
															target="_blank" 
															rel="noopener noreferrer"
															class="text-blue-600 underline truncate hover:text-blue-800"
														>
															{prop.value.substring(0, 20)}...
														</a>
													{:else}
														<span class="text-gray-800 truncate">{prop.value}</span>
													{/if}
												</div>
											{/each}
										</div>
									{/if}
									
									{#if !getFormattedAddress(facility.properties) && getBuildingInfo(facility.properties).length === 0 && getAdditionalProperties(facility.properties).length === 0}
										<p class="text-center text-gray-500">No additional info available</p>
									{/if}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{:else}
				<div class="rounded bg-gray-100 border border-gray-200 p-2 text-center">
					<Icon icon="mdi:map-search" class="mx-auto mb-1 text-gray-400" width="16" />
					<p class="text-xs text-gray-600">No facilities found</p>
				</div>
			{/if}
		</div>
	</div>

	<!-- Compact Instructions Card -->
	<div class="rounded-lg border border-gray-200 bg-white shadow-sm">
		<div class="bg-gradient-to-r from-[#0c3143] to-[#1a4a5a] p-3">
			<h3 class="flex items-center text-sm font-bold text-white">
				<Icon icon="mdi:help-circle-outline" class="mr-2" width="16" />
				How to Use
			</h3>
		</div>

		<div class="p-3">
			<div class="space-y-2">
				<div class="flex items-start rounded bg-blue-50 border border-blue-200 p-2">
					<div class="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#0c3143] text-xs font-bold text-white flex-shrink-0">1</div>
					<div>
						<p class="text-xs font-bold text-gray-800">Select Location</p>
						<p class="text-xs text-gray-600">Click map or search</p>
					</div>
				</div>
				<div class="flex items-start rounded bg-blue-50 border border-blue-200 p-2">
					<div class="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#0c3143] text-xs font-bold text-white flex-shrink-0">2</div>
					<div>
						<p class="text-xs font-bold text-gray-800">Get Prediction</p>
						<p class="text-xs text-gray-600">Click "Predict Flooding"</p>
					</div>
				</div>
				<div class="flex items-start rounded bg-blue-50 border border-blue-200 p-2">
					<div class="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#0c3143] text-xs font-bold text-white flex-shrink-0">3</div>
					<div>
						<p class="text-xs font-bold text-gray-800">Review Results</p>
						<p class="text-xs text-gray-600">See 5-day predictions</p>
					</div>
				</div>
				<div class="flex items-start rounded bg-blue-50 border border-blue-200 p-2">
					<div class="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#0c3143] text-xs font-bold text-white flex-shrink-0">4</div>
					<div>
						<p class="text-xs font-bold text-gray-800">Explore Data</p>
						<p class="text-xs text-gray-600">Show detailed analysis</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	/* Enhanced styles for narrow containers */
	.text-2xs {
		font-size: 0.625rem;
		line-height: 0.875rem;
	}
	
	/* Smooth transitions */
	.info-tab button {
		transition: all 0.2s ease-in-out;
	}
	
	/* Compact hover effects */
	.info-tab button:hover:not(:disabled) {
		transform: translateY(-0.5px);
	}
	
	/* Better focus states */
	.info-tab button:focus-visible {
		outline: 2px solid #0c3143;
		outline-offset: 1px;
	}
	
	/* Ensure text doesn't overflow in narrow containers */
	.truncate {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
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
