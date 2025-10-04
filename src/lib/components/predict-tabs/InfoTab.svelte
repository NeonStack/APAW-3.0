<script>
	import {
		selectedLocation,
		findNearestPoint,
		locationLoadingStatus,
		nearestFacilities,
		facilitiesLayerActive
	} from '$lib/stores/locationStore.js';
	import { waterStations, nearestWaterStation } from '$lib/stores/waterStationStore.js';
	import { weatherData } from '$lib/stores/weatherStore.js';
	import { onMount, createEventDispatcher } from 'svelte';
	import Icon from '@iconify/svelte';

	const dispatch = createEventDispatcher();

	// Data source status
	let sources = [
		{
			name: 'PAGASA',
			logo: 'logo/pagasa.png',
			type: 'img',
			status: 'pending' // pending, success, error
		},
		{
			name: 'Visual Crossing',
			logo: 'logo/visual-crossing-short.png',
			type: 'img',
			status: 'pending'
		},
		{
			name: 'OpenStreetMap',
			logo: 'openmoji:openstreetmap',
			type: 'icon',
			status: 'pending'
		},
		{
			name: 'Open Topo Data',
			logo: 'arcticons:opentopomap',
			type: 'icon',
			status: 'pending'
		}
	];

	$: {
		// PAGASA (Water Stations)
		if ($waterStations.loading) {
			sources[0].status = 'pending';
		} else if ($waterStations.error) {
			sources[0].status = 'error';
		} else if ($waterStations.data && $waterStations.data.length > 0) {
			sources[0].status = 'success';
		}

		// Visual Crossing (Weather Data)
		if ($weatherData.loading) {
			sources[1].status = 'pending';
		} else if ($weatherData.error) {
			sources[1].status = 'error';
		} else if ($weatherData.data && $weatherData.data.length > 0) {
			sources[1].status = 'success';
		}

		// OpenStreetMap (Location Name)
		if ($selectedLocation.loading) {
			sources[2].status = 'pending';
		} else if ($selectedLocation.lat && $selectedLocation.locationName) {
			sources[2].status = 'success';
		} else if ($selectedLocation.lat && !$selectedLocation.locationName) {
			// If we have lat but no name, it could be an error or just not fetched yet.
			// Assuming an attempt was made if lat is present.
			sources[2].status = 'pending';
		}

		// Open Topo Data (Elevation)
		if ($selectedLocation.loading) {
			sources[3].status = 'pending';
		} else if ($selectedLocation.error) {
			sources[3].status = 'error';
		} else if ($selectedLocation.elevation !== null) {
			sources[3].status = 'success';
		}
	}

	let dataSourcesExpanded = false;

	// Flood prediction state
	let floodPrediction = null;
	let isPredicting = false;
	let predictionError = null;
	let predictionErrorDetails = null; // New: store error details
	let locationLoadingState = false;
	let locationLoadingMessage = '';
	let expandedFacilities = {}; // Track expanded state of facilities

	// Fake progress bar state
	let fakeProgress = 0;
	let progressInterval = null;
	let predictingStartTime = null;

	const phases = [
		{ endTime: 2000, endProgress: 40 }, // Phase 1: 0-10s, 0-40%
		{ endTime: 5000, endProgress: 70 }, // Phase 2: 10-25s, 40-80%
		{ endTime: 10000, endProgress: 90 }, // Phase 3: 25-40s, 80-90%
		{ endTime: 15000, endProgress: 99 } // Final phase: stays at 99%
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
				fakeProgress =
					prevProgress + Math.min(phaseProgress, (timeInPhase / phaseDuration) * phaseProgress);
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
	}

	// Reset flood prediction when location changes
	$: if ($selectedLocation) {
		floodPrediction = null;
		predictionError = null;
		predictionErrorDetails = null;
	}

	// Request flood prediction from API
	async function predictFlood() {
		if (!$selectedLocation.lat || !$selectedLocation.lng) {
			predictionError = 'Please select a location on the map first';
			predictionErrorDetails = null;
			return;
		}

		isPredicting = true;
		predictionError = null;
		predictionErrorDetails = null;
		floodPrediction = null;

		startFakeProgress();

		try {
			const userToday = new Date();
			const userLocalDate = new Date(userToday.getTime() - (userToday.getTimezoneOffset() * 60000))
				.toISOString()
				.split('T')[0];
			
			const response = await fetch(
				`/api/flood-prediction?lat=${$selectedLocation.lat}&lng=${$selectedLocation.lng}&date=${userLocalDate}`
			);

			const data = await response.json();
			console.log('Flood prediction received:', data);

			// Check if response is an error
			if (data.status === 'error') {
				predictionErrorDetails = data;
				throw new Error(data.message || 'Failed to fetch prediction');
			}

			// Handle success response
			let predictionData = data;
			if (Array.isArray(data) && data.length > 0) {
				predictionData = data[0];
			}

			// Validate the structure
			if (predictionData && predictionData.forecast_by_day && predictionData.forecast_by_day.length > 0) {
				floodPrediction = predictionData;
				console.log('Successfully set flood prediction:', floodPrediction);
			} else {
				throw new Error('Invalid response format: missing forecast_by_day');
			}
		} catch (error) {
			console.error('Error predicting flood:', error);
			predictionError = error.message || 'Failed to fetch flood prediction';
		} finally {
			completeProgress();
			setTimeout(() => {
				isPredicting = false;
			}, 500);
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
	let selectedHourByDay = {}; // Track selected hour for each day

	function toggleExpand(date) {
		expandedPredictions[date] = !expandedPredictions[date];
		// Initialize selected hour to first hour (0) when expanding
		if (expandedPredictions[date] && !selectedHourByDay[date]) {
			selectedHourByDay[date] = 0;
		}
	}

	// Add the missing function to toggle facility details
	function toggleFacilityDetails(facilityId) {
		expandedFacilities[facilityId] = !expandedFacilities[facilityId];
	}

	// Helper function to extract formatted address from facility properties
	function getFormattedAddress(properties) {
		if (!properties) return null;
		
		const addressParts = [];
		
		if (properties['addr:housenumber'] && properties['addr:street']) {
			addressParts.push(`${properties['addr:housenumber']} ${properties['addr:street']}`);
		} else if (properties['addr:street']) {
			addressParts.push(properties['addr:street']);
		}
		
		if (properties['addr:city']) {
			addressParts.push(properties['addr:city']);
		} else if (properties['addr:district']) {
			addressParts.push(properties['addr:district']);
		}
		
		if (properties['addr:province']) {
			addressParts.push(properties['addr:province']);
		}
		
		if (properties['addr:postcode']) {
			addressParts.push(properties['addr:postcode']);
		}
		
		return addressParts.length > 0 ? addressParts.join(', ') : null;
	}

	// Helper function to get additional properties for display
	function getAdditionalProperties(properties) {
		if (!properties) return [];
		
		const additionalProps = [];
		const interestingProps = [
			'amenity', 'emergency', 'evacuation_center', 'leisure', 'operator', 'capacity'
		];
		
		interestingProps.forEach(prop => {
			if (properties[prop] && properties[prop] !== 'yes') {
				let label = prop;
				if (prop.includes(':')) {
					label = prop.split(':')[1];
				}
				
				label = label
					.split('_')
					.map(word => word.charAt(0).toUpperCase() + word.slice(1))
					.join(' ');
				
				const value = typeof properties[prop] === 'string' 
					? properties[prop].split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
					: properties[prop];
				
				additionalProps.push({
					label,
					value
				});
			}
		});
		
		return additionalProps;
	}

	// Select hour for viewing details
	function selectHour(date, hourIndex) {
		selectedHourByDay[date] = hourIndex;
	}

	// Simple helper functions
	function formatDistance(distance) {
		if (distance === null || distance === undefined) return 'Unknown';

		// Always display in meters, round to whole number
		return `${Math.round(distance)}m`;
	}

	function formatDate(dateString) {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric',
			weekday: 'long'
		});
	}

	function formatHeaderDate(dateString) {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function formatProgress(progress) {
		return Math.round(progress) + '%';
	}

	function getProgressBarColor(progress) {
		if (progress < 30) return 'bg-blue-400';
		if (progress < 60) return 'bg-blue-500';
		if (progress < 90) return 'bg-blue-600';
		return 'bg-green-500';
	}

	// Helper function to get risk level and colors based on probability
	function getRiskLevel(probability) {
		const percentage = probability * 100;
		
		if (percentage <= 50) {
			return {
				level: 'Low Flood Risk',
				cardStyle: 'bg-green-50 border-green-200',
				badgeStyle: 'bg-green-100 text-green-800',
				textColor: 'text-green-600',
				boldTextColor: 'text-green-700',
				borderStyle: 'border-green-300 bg-green-100',
				icon: 'mdi:check-circle'
			};
		} else if (percentage <= 60) {
			return {
				level: 'Moderate Flood Risk',
				cardStyle: 'bg-orange-50 border-orange-200',
				badgeStyle: 'bg-orange-100 text-orange-800',
				textColor: 'text-orange-600',
				boldTextColor: 'text-orange-700',
				borderStyle: 'border-orange-300 bg-orange-100',
				icon: 'mdi:alert'
			};
		} else if (percentage <= 80) {
			return {
				level: 'High Flood Risk',
				cardStyle: 'bg-red-50 border-red-200',
				badgeStyle: 'bg-red-100 text-red-800',
				textColor: 'text-red-600',
				boldTextColor: 'text-red-700',
				borderStyle: 'border-red-300 bg-red-100',
				icon: 'mdi:alert-circle'
			};
		} else {
			return {
				level: 'Very High Flood Risk',
				cardStyle: 'bg-purple-50 border-purple-200',
				badgeStyle: 'bg-purple-100 text-purple-800',
				textColor: 'text-purple-600',
				boldTextColor: 'text-purple-700',
				borderStyle: 'border-purple-300 bg-purple-100',
				icon: 'mdi:alert-octagon'
			};
		}
	}

	// Helper function to get daily summary from hourly data
	function getDailySummary(hourlyForecasts) {
		if (!hourlyForecasts || hourlyForecasts.length === 0) return null;

		const floodedHours = hourlyForecasts.filter(h => h.final_prediction.is_flooded === 1);
		const maxProbability = Math.max(...hourlyForecasts.map(h => h.final_prediction.flood_probability));
		const maxHeight = Math.max(...hourlyForecasts.map(h => h.final_prediction.predicted_height_cm || 0));
		
		// Get peak flood hours (top 3) - convert to 12-hour format and sort by time
		const peakHours = floodedHours
			.sort((a, b) => b.final_prediction.flood_probability - a.final_prediction.flood_probability)
			.slice(0, 3)
			.sort((a, b) => a.hour - b.hour) // Sort by hour in ascending order
			.map(h => formatTo12Hour(h.hour))
			.join(', ');

		const riskInfo = getRiskLevel(maxProbability);

		return {
			floodedHours: floodedHours.length,
			totalHours: hourlyForecasts.length,
			maxProbability,
			maxHeight,
			peakHours,
			hasFloodRisk: floodedHours.length > 0,
			riskInfo,
			floodedHoursList: floodedHours.map(h => h.hour) // Add list of flooded hours
		};
	}

	// Helper function to get key weather features from hourly data (rain only)
	function getKeyWeatherFeatures(hourlyForecasts) {
		if (!hourlyForecasts || hourlyForecasts.length === 0) return null;

		const totalPrecip = hourlyForecasts.reduce((sum, h) => sum + (h.key_features.precip_mm || 0), 0);

		return {
			totalPrecip
		};
	}

	// Function to convert 24-hour to 12-hour format
	function formatTo12Hour(hour) {
		if (hour === 0) return '12:00 AM';
		if (hour === 12) return '12:00 PM';
		if (hour < 12) return `${hour}:00 AM`;
		return `${hour - 12}:00 PM`;
	}

	// Helper function to format error type for display
	function getErrorTypeDisplay(errorType) {
		const typeMap = {
			'outside_service_area': { icon: 'mdi:map-marker-off', color: 'orange', label: 'Outside Service Area' },
			'invalid_location': { icon: 'mdi:water-alert', color: 'blue', label: 'Invalid Location' },
			'default': { icon: 'mdi:alert-circle', color: 'red', label: 'Error' }
		};
		return typeMap[errorType] || typeMap['default'];
	}

	// Helper function to format water body name
	function formatWaterBodyName(name) {
		if (!name || name === 'Unnamed Stream' || name === 'Unnamed River') {
			return 'an unnamed water body';
		}
		return name;
	}

	// Helper function to get direction arrow icon
	function getDirectionIcon(direction) {
		const directionMap = {
			'north': 'mdi:arrow-up',
			'south': 'mdi:arrow-down',
			'east': 'mdi:arrow-right',
			'west': 'mdi:arrow-left',
			'north-east': 'mdi:arrow-top-right',
			'north-west': 'mdi:arrow-top-left',
			'south-east': 'mdi:arrow-bottom-right',
			'south-west': 'mdi:arrow-bottom-left'
		};
		return directionMap[direction] || 'mdi:arrow-right';
	}

	// Helper to format height display
	function formatHeight(heightCm, isFlooded) {
		if (!isFlooded || heightCm === 0 || heightCm === null) {
			return isFlooded ? 'Unknown' : '—';
		}
		return `${heightCm.toFixed(2)}cm`; // Changed from toFixed(1) to toFixed(2)
	}

</script>

<div class="info-tab space-y-3">
	<!-- Data Sources Status -->
	<div class="rounded-lg border border-gray-200 bg-white shadow-sm">
		<button
			onclick={() => (dataSourcesExpanded = !dataSourcesExpanded)}
			class="flex w-full items-center justify-between p-3 text-left cursor-pointer hover:bg-gray-50"
		>
			<div class="flex items-center">
				<Icon icon="mdi:database-check-outline" class="mr-2 text-[#0c3143]" width="16" />
				<h3 class="text-sm font-bold text-[#0c3143]">Data Sources Status</h3>
			</div>
			<Icon
				icon={dataSourcesExpanded ? 'mdi:chevron-up' : 'mdi:chevron-down'}
				class="text-gray-500"
				width="20"
			/>
		</button>
		{#if dataSourcesExpanded}
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-gray-200 bg-gray-50 p-3">
				{#each sources as source}
					<div class="relative rounded-md border bg-white p-2.5 shadow-sm"
						class:border-gray-300={source.status === 'pending'}
						class:border-green-300={source.status === 'success'}
						class:border-red-300={source.status === 'error'}
					>
						<div class="flex items-center space-x-2">
							<!-- Logo/Icon -->
							<div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-gray-100 p-1">
								{#if source.type === 'img'}
									<img src={source.logo} alt={source.name} class="h-full w-full object-contain" />
								{:else}
									<Icon icon={source.logo} class="h-5 w-5" />
								{/if}
							</div>

							<!-- Name and Status Text -->
							<div class="flex-grow min-w-0">
								<p class="text-xs font-semibold text-gray-800 truncate">{source.name}</p>
								{#if source.status === 'pending'}
									<p class="text-xs text-blue-600 font-medium">Connecting...</p>
								{:else if source.status === 'success'}
									<p class="text-xs text-green-600 font-medium">Connected</p>
								{:else if source.status === 'error'}
									<p class="text-xs text-red-600 font-medium">Error</p>
								{/if}
							</div>
						</div>

						<!-- Connection Line Effect (only for pending) -->
						{#if source.status === 'pending'}
							<div class="absolute bottom-0 left-0 h-0.5 w-full overflow-hidden rounded-b-md bg-gray-200">
								<div class="h-full w-1/3 animate-loading-bar bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>

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
				onclick={predictFlood}
				disabled={isPredicting || !$selectedLocation.lat || locationLoadingState}
				class="flex w-full cursor-pointer items-center justify-center rounded-md bg-[#0c3143] px-3 py-2 text-sm font-medium text-white shadow transition-all duration-200 hover:bg-[#1a4a5a] focus:ring-2 focus:ring-[#0c3143]/20 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
			>
				{#if isPredicting}
					<Icon icon="eos-icons:loading" class="mr-1.5 animate-spin" width="14" />
					Predicting...
				{:else}
					<Icon icon="mdi:weather-flood" class="mr-1.5" width="14" />
					Predict Flooding
				{/if}
			</button>

			<!-- Enhanced Error Display -->
			{#if predictionError}
				{@const errorDisplay = predictionErrorDetails ? getErrorTypeDisplay(predictionErrorDetails.error_type) : getErrorTypeDisplay('default')}
				<div class="rounded-lg border-2 shadow-sm" 
					class:border-orange-300={errorDisplay.color === 'orange'}
					class:bg-orange-50={errorDisplay.color === 'orange'}
					class:border-blue-300={errorDisplay.color === 'blue'}
					class:bg-blue-50={errorDisplay.color === 'blue'}
					class:border-red-300={errorDisplay.color === 'red'}
					class:bg-red-50={errorDisplay.color === 'red'}
				>
					<div class="p-3">
						<div class="flex items-start">
							<div class="flex-1">
								<p class="text-sm font-bold"
									class:text-orange-800={errorDisplay.color === 'orange'}
									class:text-blue-800={errorDisplay.color === 'blue'}
									class:text-red-800={errorDisplay.color === 'red'}
								>
									{errorDisplay.label}
								</p>
								<p class="mt-1 text-xs"
									class:text-orange-700={errorDisplay.color === 'orange'}
									class:text-blue-700={errorDisplay.color === 'blue'}
									class:text-red-700={errorDisplay.color === 'red'}
								>
									{predictionError}
								</p>

								<!-- Additional error details -->
								{#if predictionErrorDetails?.details}
									<div class="mt-2 space-y-1">
										<!-- Water Body Details -->
										{#if predictionErrorDetails.details.reason === 'water_body'}
											<div class="rounded border border-blue-200 bg-blue-100 p-2">
												<p class="text-xs font-semibold text-blue-800">
													Location Details:
												</p>
												<div class="ml-4 mt-1 space-y-0.5 text-xs text-blue-700">
													<p><span class="font-medium">Type:</span> {predictionErrorDetails.details.water_type?.replace('water_', '').replace('_', ' ') || 'Water body'}</p>
													{#if predictionErrorDetails.details.water_name && predictionErrorDetails.details.water_name !== 'Unnamed Stream' && predictionErrorDetails.details.water_name !== 'Unnamed River'}
														<p><span class="font-medium">Name:</span> {predictionErrorDetails.details.water_name}</p>
													{/if}
												</div>
											</div>
										{/if}

										<!-- Outside NCR Details -->
										{#if predictionErrorDetails.details.reason === 'outside_metro_manila'}
											<div class="rounded border border-orange-200 bg-orange-100 p-2">
												<p class="text-xs font-semibold text-orange-800">
													Distance from Service Area:
												</p>
												<div class="ml-4 mt-1 space-y-0.5 text-xs text-orange-700">
													<p class="flex items-center">
														<Icon icon={getDirectionIcon(predictionErrorDetails.details.direction)} class="mr-1" width="12" />
														<span class="font-bold">{Math.round(predictionErrorDetails.details.distance_to_boundary_m)}m</span>
														<span class="ml-1">{predictionErrorDetails.details.direction}</span>
													</p>
												</div>
											</div>
										{/if}

										<!-- Suggestion -->
										{#if predictionErrorDetails.details.suggestion}
											<div class="rounded border p-2"
												class:border-orange-200={errorDisplay.color === 'orange'}
												class:bg-orange-100={errorDisplay.color === 'orange'}
												class:border-blue-200={errorDisplay.color === 'blue'}
												class:bg-blue-100={errorDisplay.color === 'blue'}
											>
												<p class="flex items-start text-xs"
													class:text-orange-700={errorDisplay.color === 'orange'}
													class:text-blue-700={errorDisplay.color === 'blue'}
												>
													<Icon icon="mdi:lightbulb-on-outline" class="mr-1 mt-0.5 flex-shrink-0" width="12" />
													<span class="font-medium">{predictionErrorDetails.details.suggestion}</span>
												</p>
											</div>
										{/if}
									</div>
								{/if}
							</div>
						</div>
					</div>
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
						<p class="text-sm font-semibold text-blue-700">Processing</p>
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
					class={`absolute top-0 left-0 h-full transition-all duration-500 ease-out ${getProgressBarColor(fakeProgress)}`}
					style={`width: ${fakeProgress}%;`}
				>
					<div
						class="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/20 to-transparent"
					></div>
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

	<!-- Enhanced Prediction Results -->
	{#if !isPredicting && floodPrediction && floodPrediction.forecast_by_day && floodPrediction.forecast_by_day.length > 0}
		<div class="space-y-3">
			<!-- Compact Results Header (removed Location Validation Card) -->
			<div class="rounded-lg border border-green-200 bg-gradient-to-r from-green-50 to-blue-50 p-3">
				<div class="flex items-center justify-between">
					<div class="flex items-center">
						<Icon icon="mdi:calendar-clock" class="mr-2 text-green-600" width="18" />
						<div>
							<h3 class="text-sm font-bold text-[#0c3143]">Hourly Prediction Results</h3>
							<p class="text-xs text-gray-600">5-day hourly forecast complete</p>
						</div>
					</div>
					<span class="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
						{floodPrediction.location?.start_date ? formatHeaderDate(floodPrediction.location.start_date) : 'Next 5 Days'}
					</span>
				</div>

				<!-- Warnings if any -->
				{#if floodPrediction.warnings && floodPrediction.warnings.length > 0}
					<div class="mt-2 rounded border border-yellow-300 bg-yellow-50 p-2">
						<p class="mb-1 flex items-center text-xs font-semibold text-yellow-800">
							<Icon icon="mdi:alert" class="mr-1" width="14" />
							Warnings:
						</p>
						<ul class="ml-4 list-disc space-y-0.5 text-xs text-yellow-700">
							{#each floodPrediction.warnings as warning}
								<li>{warning}</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>

			<!-- Daily Prediction Cards -->
			<div class="space-y-2">
				{#each floodPrediction.forecast_by_day as day, index}
					{@const summary = getDailySummary(day.hourly_forecast)}
					{@const weather = getKeyWeatherFeatures(day.hourly_forecast)}
					
					{#if summary}
						<div class="rounded-lg border shadow-sm {summary.riskInfo.cardStyle}">
							<div class="p-3">
								<!-- Date Header -->
								<div class="mb-2 flex items-center justify-between">
									<h4 class="flex items-center text-sm font-bold text-gray-800">
										<Icon icon="mdi:calendar" class="mr-1.5" width="14" />
										{formatDate(day.date)}
									</h4>
								</div>

								<!-- Flood Status -->
								<div class="mb-2 flex flex-col space-y-2">
									<div class="flex flex-col items-center justify-between gap-1 md:flex-row">
										<p class="flex items-center gap-2 rounded-full px-2 py-0.5 text-xs font-semibold {summary.riskInfo.badgeStyle}">
											<Icon icon={summary.riskInfo.icon} width="16" />
											{summary.riskInfo.level}
										</p>
										<p class="text-sm font-bold {summary.riskInfo.textColor}">
											{Math.round(summary.maxProbability * 100)}% peak chance
										</p>
									</div>
								</div>

								<!-- Peak Hours (removed confusing Flood Risk Hours text) -->
								{#if summary.floodedHours > 0 && summary.peakHours}
									<div class="mt-2 flex items-center rounded border p-2 {summary.riskInfo.borderStyle}">
										<Icon icon="mdi:clock-alert-outline" class="mr-1.5 {summary.riskInfo.textColor}" width="16" />
										<div class="flex-1">
											<span class="text-xs font-medium {summary.riskInfo.textColor}">
												Peak Flood Times:
											</span>
											<span class="ml-1 text-xs font-bold {summary.riskInfo.boldTextColor}">
												{summary.peakHours}
											</span>
										</div>
									</div>
								{/if}

								<!-- Height Information (updated to handle 0cm) -->
								{#if summary.maxHeight > 0}
									<div class="mt-2 flex items-center rounded border p-2 {summary.riskInfo.borderStyle}">
										<Icon icon="mdi:water" class="mr-1.5 {summary.riskInfo.textColor}" width="14" />
										<div class="text-xs">
											<span class="font-semibold {summary.riskInfo.textColor}">
												Max Height:
											</span>
											<span class="ml-1 font-mono {summary.riskInfo.textColor}">
												{summary.maxHeight.toFixed(2)}cm
											</span>
										</div>
									</div>
								{:else if summary.floodedHours > 0}
									<div class="mt-2 flex items-center rounded border p-2 {summary.riskInfo.borderStyle}">
										<Icon icon="mdi:water-alert" class="mr-1.5 {summary.riskInfo.textColor}" width="14" />
										<div class="text-xs">
											<span class="font-semibold {summary.riskInfo.textColor}">
												Flood Height:
											</span>
											<span class="ml-1 italic {summary.riskInfo.textColor}">
												Not measured
											</span>
										</div>
									</div>
								{/if}

								<!-- Weather Summary (Rain only) -->
								{#if weather}
									<div class="mt-2 rounded border border-blue-200 bg-blue-50 p-2">
										<div class="flex justify-between text-xs">
											<span class="text-gray-600">Total Rain:</span>
											<span class="font-bold text-blue-700">{weather.totalPrecip.toFixed(1)}mm</span>
										</div>
									</div>
								{/if}
							</div>

							<!-- Expand/Collapse Section -->
							<div class="border-t border-gray-200/50 bg-white/50 p-2">
								<button
									onclick={() => toggleExpand(day.date)}
									class="flex w-full cursor-pointer items-center justify-center rounded border border-dashed border-blue-300 bg-blue-50/50 px-2 py-1.5 text-xs font-medium text-blue-700 transition-all duration-200 hover:bg-blue-100 focus:ring-1 focus:ring-blue-500 focus:outline-none"
								>
									<Icon icon={expandedPredictions[day.date] ? 'mdi:chevron-up' : 'mdi:chevron-down'} width="14" class="mr-1" />
									{expandedPredictions[day.date] ? 'Hide Hourly Details' : 'Show Hourly Details'}
								</button>
							</div>

							<!-- Expanded Details - Hourly Breakdown -->
							{#if expandedPredictions[day.date]}
								{@const selectedHourIndex = selectedHourByDay[day.date] ?? 0}
								{@const selectedHourData = day.hourly_forecast[selectedHourIndex]}
								
								<div class="space-y-3 border-t border-gray-200 bg-gray-50 p-3">
									<!-- Hourly Forecast Grid (now clickable with flood indicators) -->
									<div class="rounded border border-blue-200 bg-blue-50 p-2">
										<h6 class="mb-2 flex items-center justify-between text-xs font-bold text-blue-800">
											<span class="flex items-center">
												<Icon icon="mdi:clock-outline" class="mr-1" width="12" />
												24-Hour Breakdown
											</span>
											{#if summary.floodedHours > 0}
												<span class="flex items-center gap-1 text-xs font-medium {summary.riskInfo.textColor}">
													<Icon icon="mdi:water-alert" width="12" />
													{summary.floodedHours} flood risk {summary.floodedHours === 1 ? 'hour' : 'hours'}
												</span>
											{/if}
										</h6>
										<p class="mb-2 text-xs text-blue-700">Click any hour to view detailed data</p>
										<div class="grid grid-cols-6 gap-1 text-xs">
											{#each day.hourly_forecast as hour, hourIndex}
												{@const hourRisk = getRiskLevel(hour.final_prediction.flood_probability)}
												{@const isSelected = selectedHourIndex === hourIndex}
												{@const isFlooded = hour.final_prediction.is_flooded === 1}
												<button
													onclick={() => selectHour(day.date, hourIndex)}
													class="rounded border p-1 text-center transition-all cursor-pointer hover:shadow-md relative {hourRisk.borderStyle} {isSelected ? 'ring-2 ring-blue-500 shadow-md' : ''}"
												>
													<!-- Flood indicator badge (changed to warning triangle) -->
													{#if isFlooded}
														<div class="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-orange-500 border-2 border-white flex items-center justify-center">
															<Icon icon="mdi:alert" class="text-white" width="10" />
														</div>
													{/if}
													<div class="font-bold text-gray-800">{formatTo12Hour(hour.hour)}</div>
													<div class="text-xs font-semibold {hourRisk.boldTextColor}">
														{Math.round(hour.final_prediction.flood_probability * 100)}%
													</div>
													<div class="text-xs text-gray-600">
														{formatHeight(hour.final_prediction.predicted_height_cm, isFlooded)}
													</div>
												</button>
											{/each}
										</div>
										
										<!-- Legend removed as requested -->
									</div>

									<!-- Complete Key Features from Selected Hour -->
									{#if selectedHourData?.key_features}
										<div class="rounded border border-gray-300 bg-white p-2">
											<h6 class="mb-1 flex items-center justify-between text-xs font-bold text-gray-800">
												<span class="flex items-center">
													<Icon icon="mdi:weather-partly-cloudy" class="mr-1 text-gray-600" width="12" />
													Complete Environmental Data
												</span>
												<span class="flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-blue-800">
													{#if selectedHourData.final_prediction.is_flooded === 1}
														<Icon icon="mdi:water-alert" class="text-orange-600" width="12" />
													{/if}
													{formatTo12Hour(selectedHourData.hour)}
												</span>
											</h6>
											
											<!-- Prediction info for selected hour -->
											<div class="mb-2 rounded bg-gray-50 p-2 space-y-1">
												<div class="flex items-center justify-between text-xs">
													<span class="text-gray-600">Flood Status:</span>
													<span class="font-bold {selectedHourData.final_prediction.is_flooded === 1 ? 'text-red-700' : 'text-green-700'}">
														{selectedHourData.final_prediction.is_flooded === 1 ? 'Flooded' : 'Safe'}
													</span>
												</div>
												<div class="flex items-center justify-between text-xs">
													<span class="text-gray-600">Flood Probability:</span>
													<span class="font-bold text-gray-800">
														{Math.round(selectedHourData.final_prediction.flood_probability * 100)}%
													</span>
												</div>
												<div class="flex items-center justify-between text-xs">
													<span class="text-gray-600">Predicted Height:</span>
													<span class="font-bold text-gray-800">
														{formatHeight(selectedHourData.final_prediction.predicted_height_cm, selectedHourData.final_prediction.is_flooded === 1)}
													</span>
												</div>
											</div>

											<div class="space-y-0.5">
												{#each Object.entries(selectedHourData.key_features) as [key, value]}
													<div class="flex items-center justify-between text-xs">
														<span class="truncate text-gray-600" title={key}>
															{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
														</span>
														<span class="ml-2 font-bold text-gray-800">
															{typeof value === 'number' ? value.toFixed(2) : value}
															{key.includes('temp') ? '°C' : key.includes('precip') ? 'mm' : key.includes('waterlevel') ? 'm' : ''}
														</span>
													</div>
												{/each}
											</div>
										</div>
									{/if}
								</div>
							{/if}
						</div>
					{/if}
				{/each}
			</div>
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
				<div
					class="flex items-center rounded border-2 border-dashed border-yellow-300 bg-yellow-50 p-3"
				>
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
							<p class="text-xs font-semibold tracking-wide text-gray-500 uppercase">
								Selected Location
							</p>
							<p class="text-sm font-bold text-gray-800">{$selectedLocation.locationName}</p>
						</div>
					{/if}

					<!-- Compact coordinates -->
					<div class="space-y-1">
						<div class="flex justify-between text-xs">
							<span class="font-medium text-gray-600">Coordinates:</span>
							<span class="font-mono text-gray-800">{$selectedLocation.lat}, {$selectedLocation.lng}</span>
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
			{/if}
		</div>

		<!-- Facilities Section -->
		<div class="border-t border-gray-200 bg-gray-50 p-3">
			<h4 class="mb-2 flex items-center text-sm font-bold text-[#0c3143]">
				<Icon icon="mdi:near-me" class="mr-2" width="14" />
				Nearby Facilities
			</h4>
			{#if !$facilitiesLayerActive}
				<div class="flex items-center rounded border-2 border-dashed border-yellow-300 bg-yellow-50 p-3">
					<Icon icon="mdi:layers-off" class="mr-2 flex-shrink-0 text-yellow-600" width="20" />
					<div>
						<p class="text-sm font-semibold text-gray-800">"Nearby Facilities" Is Disabled</p>
						<p class="text-xs text-gray-600">Enable "Nearby Facilities" Layer</p>
					</div>
				</div>
			{:else if $nearestFacilities.length > 0}
				<div class="space-y-1">
					{#each $nearestFacilities as facility}
						<div class="rounded border border-gray-300 bg-white">
							<button
								onclick={() => toggleFacilityDetails(facility.id)}
								class="flex w-full cursor-pointer items-center p-2 transition-colors duration-150 hover:bg-gray-50"
							>
								<Icon
									icon={facility.icon || 'mdi:map-marker'}
									style="color: {facility.color || '#777'};"
									class="mr-2 flex-shrink-0"
									width="14"
								/>
								<div class="min-w-0 flex-1 text-left">
									<p class="truncate text-sm font-bold text-gray-800">{facility.name}</p>
									<p class="truncate text-xs text-gray-600">{facility.type}</p>
									
								</div>
								<span class="mr-1 flex-shrink-0 rounded-full bg-gray-200 px-1.5 py-0.5 text-xs font-semibold text-gray-700">
									{formatDistance(facility.distance)}
								</span>
								<Icon
									icon={expandedFacilities[facility.id] ? 'mdi:chevron-up' : 'mdi:chevron-down'}
									width="14"
									class="flex-shrink-0 text-blue-600"
								/>
							</button>

							{#if expandedFacilities[facility.id] && facility.properties}
								<div class="border-t border-gray-100 bg-gray-50 p-2 text-xs">
									{#if getFormattedAddress(facility.properties)}
										<div class="mb-1">
											<span class="font-semibold text-gray-600">Address:</span>
											<p class="break-words text-gray-800">
												{getFormattedAddress(facility.properties)}
											</p>
										</div>
									{/if}

									{#if getAdditionalProperties(facility.properties).length > 0}
										<div>
											<span class="font-semibold text-gray-600">Details:</span>
											{#each getAdditionalProperties(facility.properties) as prop}
												<div class="flex justify-between">
													<span class="text-gray-500">{prop.label}:</span>
													<span class="truncate text-gray-800">{prop.value}</span>
												</div>
											{/each}
										</div>
									{/if}

									{#if !getFormattedAddress(facility.properties) && getAdditionalProperties(facility.properties).length === 0}
										<p class="text-center text-gray-500">No additional info available</p>
									{/if}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{:else}
				<div class="rounded border border-gray-200 bg-gray-100 p-2 text-center">
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
				<div class="flex items-start rounded border border-blue-200 bg-blue-50 p-2">
					<div
						class="mr-2 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#0c3143] text-xs font-bold text-white"
					>
						1
					</div>
					<div>
						<p class="text-xs font-bold text-gray-800">Select Location</p>
						<p class="text-xs text-gray-600">Click on Map or Search</p>
					</div>
				</div>
				<div class="flex items-start rounded border border-blue-200 bg-blue-50 p-2">
					<div
						class="mr-2 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#0c3143] text-xs font-bold text-white"
					>
						2
					</div>
					<div>
						<p class="text-xs font-bold text-gray-800">Get Prediction</p>
						<p class="text-xs text-gray-600">Click "Predict Flooding"</p>
					</div>
				</div>
				<div class="flex items-start rounded border border-blue-200 bg-blue-50 p-2">
					<div
						class="mr-2 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#0c3143] text-xs font-bold text-white"
					>
						3
					</div>
					<div>
						<p class="text-xs font-bold text-gray-800">Review Results</p>
						<p class="text-xs text-gray-600">See 5-day Predictions</p>
					</div>
				</div>
				<div class="flex items-start rounded border border-blue-200 bg-blue-50 p-2">
					<div
						class="mr-2 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#0c3143] text-xs font-bold text-white"
					>
						4
					</div>
					<div>
						<p class="text-xs font-bold text-gray-800">Explore Data</p>
						<p class="text-xs text-gray-600">Click "Show Details"</p>
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

	/* Loading bar animation */
	@keyframes loading-bar {
		0% {
			transform: translateX(-100%);
		}
		100% {
			transform: translateX(400%);
		}
	}

	.animate-loading-bar {
		animation: loading-bar 1.5s ease-in-out infinite;
	}
</style>