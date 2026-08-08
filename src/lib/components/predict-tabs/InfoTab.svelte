<script>
	import { invalidateAll } from '$app/navigation';
	import {
		selectedLocation,
		findNearestPoint,
		locationLoadingStatus,
		nearestFacilities,
		facilitiesLayerActive
	} from '$lib/stores/locationStore.js';
	import { waterStations, nearestWaterStation } from '$lib/stores/waterStationStore.js';
	import { weatherData } from '$lib/stores/weatherStore.js';
	import { tropicalCycloneTrackerStore } from '$lib/stores/tropicalCycloneTrackerStore.js';
	import { generalFloodAdvisoryStore } from '$lib/stores/generalFloodAdvisoryStore.js';
	import {
		automatedFloodAlerts,
		focusedAutomatedAlert,
		setAutomatedAlertsForecastIndex,
		setAutomatedAlertsMapVisibility
	} from '$lib/stores/automatedFloodAlertStore.js';
	import { onMount, createEventDispatcher } from 'svelte';
	import { callPredictPageAction } from '$lib/utils/predictPageActionClient.js';
	import Icon from '@iconify/svelte';
	import moment from 'moment';
	import PawiSummarySection from './InfoTab_components/PawiSummarySection.svelte';
	import PredictionControlsSection from './InfoTab_components/PredictionControlsSection.svelte';
	import PredictionLoadingSection from './InfoTab_components/PredictionLoadingSection.svelte';
	import LocationInfoSection from './InfoTab_components/LocationInfoSection.svelte';
	import HowToUseSection from './InfoTab_components/HowToUseSection.svelte';

	const dispatch = createEventDispatcher();

	// Data source status
	let sources = [
		{
			name: 'PAGASA - Water Level Stations',
			logo: 'logo/pagasa.png',
			type: 'img',
			status: 'pending',
			url: 'https://www.pagasa.dost.gov.ph/flood#koica'
		},
		{
			name: 'PAGASA - Tropical Cyclone Tracker',
			logo: 'logo/pagasa.png',
			type: 'img',
			status: 'pending',
			url: 'https://www.pagasa.dost.gov.ph/tropical-cyclone/severe-weather-bulletin'
		},
		{
			name: 'PAGASA - General Flood Advisory',
			logo: 'logo/pagasa.png',
			type: 'img',
			status: 'pending',
			url: 'https://bagong.pagasa.dost.gov.ph/'
		},
		{
			name: 'Visual Crossing - Weather Forecast',
			logo: 'logo/visual-crossing-short.png',
			type: 'img',
			status: 'pending',
			url: 'https://www.visualcrossing.com/'
		},
		{
			name: 'APAW AI Watch - Automated Prediction',
			logo: 'APAW_SHORT_TRANSPARENT.webp',
			type: 'img',
			status: 'pending',
			url: '/predict'
		},
		{
			name: 'OpenStreetMap - Location Name',
			logo: 'openmoji:openstreetmap',
			type: 'icon',
			status: 'pending',
			url: 'https://www.openstreetmap.org/'
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

		// PAGASA (TropicalCyclone Tracker)
		if ($tropicalCycloneTrackerStore.loading) {
			sources[1].status = 'pending';
		} else if ($tropicalCycloneTrackerStore.error) {
			sources[1].status = 'error';
		} else {
			sources[1].status = 'success';
		}

		// PAGASA (General Flood Advisory)
		if ($generalFloodAdvisoryStore.loading) {
			sources[2].status = 'pending';
		} else if ($generalFloodAdvisoryStore.error) {
			sources[2].status = 'error';
		} else {
			sources[2].status = 'success';
		}

		// Visual Crossing (Weather Data)
		if ($weatherData.loading) {
			sources[3].status = 'pending';
		} else if ($weatherData.error) {
			sources[3].status = 'error';
		} else if ($weatherData.data && $weatherData.data.length > 0) {
			sources[3].status = 'success';
		}

		// APAW Automated Alerts (local API + AI output from model service)
		if ($automatedFloodAlerts.loading) {
			sources[4].status = 'pending';
		} else if ($automatedFloodAlerts.error) {
			sources[4].status = 'error';
		} else if (Array.isArray($automatedFloodAlerts.data)) {
			sources[4].status = 'success';
		}

		// OpenStreetMap (Location Name)
		if (!$selectedLocation.lat || !$selectedLocation.lng) {
			sources[5].status = 'idle';
		} else if (locationLoadingState || $selectedLocation.loading) {
			sources[5].status = 'pending';
		} else if ($selectedLocation.error) {
			sources[5].status = 'error';
		} else if ($selectedLocation.locationName) {
			sources[5].status = 'success';
		} else {
			sources[5].status = 'pending';
		}

		sourceErrorCount = sources.filter((source) => source.status === 'error').length;
	}

	let dataSourcesExpanded = false;
	let tropicalCycloneTrackerExpanded = false;
	let generalFloodAdvisoryExpanded = false;
	let sourceErrorCount = 0;
	let hasStatusIssues = false;

	// Add new state for combined alerts section
	let alertsExpanded = false;
	let activeAlertsTab = 'sources'; // 'sources', 'cyclone', 'advisory', 'automated'

	// Flood prediction state
	let floodPrediction = null;
	let isPredicting = false;
	let predictionError = null;
	let predictionErrorDetails = null; // New: store error details
	let pawiSummary = null;
	let pawiSummaryError = null;
	let pawiSummaryLoading = false;
	let pawiLastGeneratedAt = null;
	let pawiSummaryRequested = false;
	let locationLoadingState = false;
	let locationLoadingMessage = '';
	let expandedFacilities = {}; // Track expanded state of facilities

	// Fake progress bar state
	let fakeProgress = 0;
	let progressInterval = null;
	let predictingStartTime = null;
	let awaitingProgressCompletion = false;
	let completionFallbackTimer = null;

	const phases = [
		{ endTime: 1000, endProgress: 30 },
		{ endTime: 2000, endProgress: 70 },
		{ endTime: 3000, endProgress: 91 },
		{ endTime: 12000, endProgress: 99 }
	];

	// Start the fake progress animation
	function startFakeProgress() {
		// Reset progress
		fakeProgress = 0;
		predictingStartTime = Date.now();
		awaitingProgressCompletion = false;
		if (completionFallbackTimer) {
			clearTimeout(completionFallbackTimer);
			completionFallbackTimer = null;
		}

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
		}, 55); // Update for smooth animation of loading bar
	}

	// Stop progress and set to 100%
	function completeProgress() {
		// Clear the interval
		if (progressInterval) {
			clearInterval(progressInterval);
			progressInterval = null;
		}

		// Set to 100% and wait for the bar transition event before hiding loading state.
		fakeProgress = 100;
		awaitingProgressCompletion = true;

		if (completionFallbackTimer) {
			clearTimeout(completionFallbackTimer);
		}
		completionFallbackTimer = setTimeout(() => {
			handleProgressCompletionVisible();
		}, 700);
	}

	function handleProgressCompletionVisible() {
		if (!awaitingProgressCompletion) return;
		awaitingProgressCompletion = false;

		if (completionFallbackTimer) {
			clearTimeout(completionFallbackTimer);
			completionFallbackTimer = null;
		}

		isPredicting = false;

		// Reset progress after the section unmounts.
		setTimeout(() => {
			fakeProgress = 0;
		}, 120);
	}

	// Add this helper function to get the nearest forecast track hour
	function getNearestForecastHour(forecastTracks) {
		const now = new Date();
		let nearestIndex = 0;
		let nearestDiff = Infinity;

		forecastTracks.forEach((track, index) => {
			const trackDate = new Date(track.date_time);

			// Calculate difference in milliseconds
			const diff = Math.abs(trackDate.getTime() - now.getTime());

			if (diff < nearestDiff) {
				nearestDiff = diff;
				nearestIndex = index;
			}
		});

		return nearestIndex;
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
		pawiSummary = null;
		pawiSummaryError = null;
		pawiSummaryLoading = false;
		pawiLastGeneratedAt = null;
		pawiSummaryRequested = false;
	}

	async function fetchPawiSummary(predictionData) {
		if (pawiSummaryRequested || pawiSummaryLoading) {
			return;
		}

		if (!predictionData?.forecast_by_day?.length) {
			pawiSummaryError = 'No prediction data available for Pawi summary';
			return;
		}

		const uiRiskLabels = buildPawiUiRiskLabels(predictionData);

		pawiSummaryRequested = true;
		pawiSummaryLoading = true;
		pawiSummaryError = null;

		try {
			const actionResult = await callPredictPageAction('pawiSummary', {
				prediction: predictionData,
				locationName: $selectedLocation.locationName || null,
				uiRiskLabels
			});

			const data = actionResult?.payload;
			if (!data || data.status === 'error' || data.status === 'invalid') {
				throw new Error(data?.message || 'Failed to generate Pawi summary');
			}

			const summaryText = data?.summary || data?.overall_summary;
			if (typeof summaryText !== 'string' || summaryText.trim().length === 0) {
				throw new Error('Pawi summary returned an invalid format');
			}

			pawiSummary = data;
			pawiLastGeneratedAt = data.generated_at || new Date().toISOString();
		} catch (error) {
			console.error('Pawi summary error:', error);
			pawiSummary = null;
			pawiSummaryError = error.message || 'Pawi summary is unavailable right now';
		} finally {
			pawiSummaryLoading = false;
		}
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
		pawiSummary = null;
		pawiSummaryError = null;
		pawiSummaryLoading = false;
		pawiLastGeneratedAt = null;
		pawiSummaryRequested = false;

		startFakeProgress();

		try {
			const userToday = new Date();
			const userLocalDate = new Date(userToday.getTime() - userToday.getTimezoneOffset() * 60000)
				.toISOString()
				.split('T')[0];

			// NEW: Prepare the data payload from stores
			const payload = {
				lat: $selectedLocation.lat,
				lng: $selectedLocation.lng,
				date: userLocalDate,
				water_station_data: $waterStations.data
			};

			const actionResult = await callPredictPageAction('predictFlood', payload);
			const data = actionResult?.payload;
			console.log('Flood prediction received:', data);

			// Check if response is an error
			if (!data || data.status === 'error' || data.status === 'invalid') {
				predictionErrorDetails = data;
				throw new Error(data?.message || 'Failed to fetch prediction');
			}

			// Handle success response
			let predictionData = data;
			if (Array.isArray(data) && data.length > 0) {
				predictionData = data[0];
			}

			// Validate the structure
			if (
				predictionData &&
				predictionData.forecast_by_day &&
				predictionData.forecast_by_day.length > 0
			) {
				floodPrediction = predictionData;
				console.log('Successfully set flood prediction:', floodPrediction);
			} else {
				throw new Error('Invalid response format: missing forecast_by_day');
			}
		} catch (error) {
			console.error('Error predicting flood:', error);
			const rawErrorDetails = error?.details;
			const normalizedErrorDetails =
				rawErrorDetails?.details && typeof rawErrorDetails.details === 'object'
					? rawErrorDetails.details
					: rawErrorDetails;

			predictionErrorDetails = normalizedErrorDetails || null;
			predictionError =
				normalizedErrorDetails?.message ||
				rawErrorDetails?.message ||
				error.message ||
				'Failed to fetch flood prediction';
		} finally {
			completeProgress();
		}
	}

	// On component unmount, clear any running intervals
	onMount(() => {
		return () => {
			if (progressInterval) clearInterval(progressInterval);
			if (completionFallbackTimer) clearTimeout(completionFallbackTimer);
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

	// Select hour for viewing details
	function selectHour(date, hourIndex) {
		selectedHourByDay[date] = hourIndex;
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

		const floodedHours = hourlyForecasts.filter((h) => h.final_prediction.is_flooded === 1);
		const maxProbability = Math.max(
			...hourlyForecasts.map((h) => h.final_prediction.flood_probability)
		);
		const maxHeight = Math.max(
			...hourlyForecasts.map((h) => h.final_prediction.predicted_height_cm || 0)
		);

		// Get peak flood hours (top 3) - convert to 12-hour format and sort by time
		const peakHours = floodedHours
			.sort((a, b) => b.final_prediction.flood_probability - a.final_prediction.flood_probability)
			.slice(0, 3)
			.sort((a, b) => a.hour - b.hour) // Sort by hour in ascending order
			.map((h) => formatTo12Hour(h.hour))
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
			floodedHoursList: floodedHours.map((h) => h.hour) // Add list of flooded hours
		};
	}

	function buildPawiUiRiskLabels(predictionData) {
		const days = Array.isArray(predictionData?.forecast_by_day)
			? predictionData.forecast_by_day
			: [];

		return days
			.map((day) => {
				const summary = getDailySummary(day?.hourly_forecast);
				if (!summary?.riskInfo?.level) return null;

				return {
					date: day?.date || null,
					risk_label: summary.riskInfo.level,
					peak_chance_pct: Math.round(summary.maxProbability * 100),
					flooded_hours: summary.floodedHours
				};
			})
			.filter(Boolean)
			.slice(0, 5);
	}

	// Helper function to get key weather features from hourly data (rain only)
	function getKeyWeatherFeatures(hourlyForecasts) {
		if (!hourlyForecasts || hourlyForecasts.length === 0) return null;

		const totalPrecip = hourlyForecasts.reduce(
			(sum, h) => sum + (h.key_features.precip_mm || 0),
			0
		);

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

	// Helper to format height display
	function formatHeight(heightCm, isFlooded) {
		if (!isFlooded || heightCm === 0 || heightCm === null) {
			return isFlooded ? 'Unknown' : '—';
		}
		return `${heightCm.toFixed(2)}cm`; // Changed from toFixed(1) to toFixed(2)
	}

	function formatAdvisoryText(text = '') {
		return text
			.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Convert **text** to <strong>text</strong>
			.replace(/^\s*\+\s*/gm, '&bull; ') // Convert + list items to bullets
			.replace(/\n/g, '<br />'); // Convert newlines to <br>
	}

	// Add helper to count active alerts
	$: automatedAlertCount = ($automatedFloodAlerts?.data || []).filter(
		(item) => Number(item.flood_probability) >= 0.5
	).length;

	$: activeAlertsCount =
		($tropicalCycloneTrackerStore.data?.length || 0) +
		($generalFloodAdvisoryStore.data ? 1 : 0) +
		automatedAlertCount;

	$: hasStatusIssues = sourceErrorCount > 0 || activeAlertsCount > 0;

	$: automatedDateChoices = (() => {
		const map = new Map();
		const baseRequestDate = $automatedFloodAlerts?.meta?.request_date;
		const base = moment(baseRequestDate, 'YYYY-MM-DD', true);
		const effectiveBase = base.isValid() ? base.startOf('day') : moment().startOf('day');
		for (const item of $automatedFloodAlerts?.data || []) {
			const idx = Number(item.forecast_index);
			if (!Number.isInteger(idx) || idx < 0 || idx > 4) continue;
			if (map.has(idx)) continue;
			map.set(idx, {
				index: idx,
				label: formatFriendlyForecastDate(item.forecast_date, idx, baseRequestDate)
			});
		}

		// Always expose all forecast day selections, even if only some days have >=50% rows.
		for (let idx = 0; idx <= 4; idx += 1) {
			if (!map.has(idx)) {
				map.set(idx, {
					index: idx,
					label: effectiveBase.clone().add(idx, 'days').format('MMMM D, YYYY')
				});
			}
		}
		return [...map.values()].sort((a, b) => a.index - b.index);
	})();

	$: selectedAutomatedIndex = Number($automatedFloodAlerts?.selectedForecastIndex ?? 0);
	$: automatedCountByIndex = (() => {
		const map = new Map();
		for (const item of $automatedFloodAlerts?.data || []) {
			const idx = Number(item.forecast_index);
			if (!Number.isInteger(idx) || idx < 0 || idx > 4) continue;
			if (Number(item.flood_probability) < 0.5) continue;
			map.set(idx, (map.get(idx) || 0) + 1);
		}
		return map;
	})();

	$: automatedVisibleAlerts = ($automatedFloodAlerts?.data || [])
		.filter((item) => Number(item.forecast_index) === selectedAutomatedIndex)
		.filter((item) => Number(item.flood_probability) >= 0.5)
		.sort((a, b) => Number(b.flood_probability) - Number(a.flood_probability));

	function getAutomatedRiskClass(riskLevel, probability) {
		const level = String(riskLevel || '').toLowerCase();
		if (level.includes('very high')) return 'border-red-200 bg-red-50 text-red-700';
		if (level.includes('high')) return 'border-orange-200 bg-orange-50 text-orange-700';
		if (level.includes('moderate')) return 'border-yellow-200 bg-yellow-50 text-yellow-700';
		if (level.includes('low')) return 'border-green-200 bg-green-50 text-green-700';

		const p = Number(probability);
		if (p >= 0.8) return 'border-red-200 bg-red-50 text-red-700';
		if (p >= 0.65) return 'border-orange-200 bg-orange-50 text-orange-700';
		if (p >= 0.5) return 'border-yellow-200 bg-yellow-50 text-yellow-700';
		return 'border-green-200 bg-green-50 text-green-700';
	}

	function getAutomatedRiskLabel(item) {
		if (item?.risk_level) return item.risk_level;
		const p = Number(item?.flood_probability);
		if (p >= 0.8) return 'Very High Flood Risk';
		if (p >= 0.65) return 'High Flood Risk';
		if (p >= 0.5) return 'Moderate Flood Risk';
		return 'Low Flood Risk';
	}

	function formatFriendlyForecastDate(dateText, index = null, baseDateText = null) {
		const forecast = moment(dateText, 'YYYY-MM-DD', true);
		if (forecast.isValid()) {
			return forecast.format('MMMM D, YYYY');
		}

		if (Number.isInteger(index)) {
			const base = moment(baseDateText, 'YYYY-MM-DD', true);
			const effectiveBase = base.isValid() ? base.startOf('day') : moment().startOf('day');
			return effectiveBase.clone().add(index, 'days').format('MMMM D, YYYY');
		}

		return String(dateText || 'Forecast date');
	}

	function getAutomatedChanceText(probability) {
		const p = Number(probability);
		if (!Number.isFinite(p)) return 'No probability data';
		const pct = Math.max(0, Math.min(100, p * 100));
		return `${pct.toFixed(1)}% chance`;
	}

	function getAutomatedForecastPayload(item) {
		const payload = item?.forecast_payload;
		if (!payload) return {};
		if (typeof payload === 'string') {
			try {
				return JSON.parse(payload);
			} catch {
				return {};
			}
		}
		if (typeof payload === 'object') return payload;
		return {};
	}

	function formatFloodAroundTimes(hourList) {
		if (!Array.isArray(hourList) || hourList.length === 0) return 'No flooded-hour timing data';

		const normalized = [
			...new Set(hourList.map((h) => Number(h)).filter((h) => Number.isFinite(h)))
		].sort((a, b) => a - b);

		if (normalized.length === 0) return 'No flooded-hour timing data';

		const labels = normalized.map((h) => {
			const hour = ((Math.floor(h) % 24) + 24) % 24;
			const period = hour >= 12 ? 'pm' : 'am';
			const display = hour % 12 === 0 ? 12 : hour % 12;
			return `${display}${period}`;
		});

		return labels.join(', ');
	}

	function focusAutomatedAlert(item) {
		setAutomatedAlertsForecastIndex(Number(item.forecast_index));
		focusedAutomatedAlert.set(item);
	}

	async function refreshAutomatedAlerts() {
		automatedFloodAlerts.update((store) => ({
			...store,
			loading: true,
			error: null
		}));

		try {
			await invalidateAll();
		} catch (error) {
			console.error('Failed to refresh automated alerts:', error);
			automatedFloodAlerts.update((store) => ({
				...store,
				loading: false,
				error: error?.message || 'Unable to refresh automated predictions.'
			}));
		}
	}

	// Helper function to format cyclone category badge colors
	function getCycloneCategoryStyle(category) {
		const styles = {
			TD: 'bg-green-100 text-green-800 border-green-200',
			TS: 'bg-yellow-100 text-yellow-800 border-yellow-200',
			STS: 'bg-orange-100 text-orange-800 border-orange-200',
			TY: 'bg-red-100 text-red-800 border-red-200',
			STY: 'bg-purple-100 text-purple-800 border-purple-200'
		};
		return styles[category] || styles.TD;
	}
</script>

<div class="info-tab space-y-3">
	<!-- COMBINED Alerts & Data Status Section -->
	<div class="overflow-hidden rounded-xl border border-gray-200/90 bg-white shadow-sm">
		<button
			onclick={() => (alertsExpanded = !alertsExpanded)}
			class="flex w-full cursor-pointer items-center justify-between p-3.5 py-2 text-left transition-colors hover:bg-slate-50"
		>
			<div class="flex min-w-0 flex-1 items-center gap-4">
				{#if sourceErrorCount > 0}
					<div
						class="flex h-7 w-7 items-center justify-center rounded-xl bg-red-100 ring-1 ring-red-200"
					>
						<Icon icon="mdi:close-circle" class="text-red-600" width="16" />
					</div>
				{:else if activeAlertsCount === 0}
					<div
						class="flex h-7 w-7 items-center justify-center rounded-xl bg-green-100 ring-1 ring-green-200"
					>
						<Icon icon="mdi:check-circle" class="text-green-600" width="16" />
					</div>
				{:else}
					<div
						class="flex h-7 w-7 items-center justify-center rounded-xl bg-orange-100 ring-1 ring-orange-200"
					>
						<Icon icon="mdi:alert-circle" class="text-orange-600" width="16" />
					</div>
				{/if}
				<div class="min-w-0">
					<h3
						class="flex flex-wrap items-center gap-1 text-sm font-bold tracking-tight text-gray-800"
					>
						<span>Alerts & Data Status</span>
						{#if hasStatusIssues}
							<span class="text-gray-400">-</span>
							{#if sourceErrorCount > 0}
								<span class="text-red-600"
									>{sourceErrorCount} {sourceErrorCount === 1 ? 'error' : 'errors'}</span
								>
							{/if}
							{#if sourceErrorCount > 0 && activeAlertsCount > 0}
								<span class="text-gray-400" aria-hidden="true">•</span>
							{/if}
							{#if activeAlertsCount > 0}
								<span class="text-orange-700"
									>{activeAlertsCount} {activeAlertsCount === 1 ? 'alert' : 'alerts'}</span
								>
							{/if}
						{/if}
					</h3>
				</div>
			</div>
			<Icon
				icon={alertsExpanded ? 'mdi:chevron-up' : 'mdi:chevron-down'}
				class="text-gray-400 transition-transform"
				width="20"
			/>
		</button>

		{#if alertsExpanded}
			<div class="border-t border-gray-200">
				<!-- Tab Navigation -->
				<div class="grid grid-cols-2 gap-1.5 border-b border-gray-200 bg-slate-50 p-1.5">
					<button
						onclick={() => (activeAlertsTab = 'sources')}
						class="relative flex min-h-10 cursor-pointer items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold transition-all"
						class:bg-white={activeAlertsTab === 'sources'}
						class:text-primary={activeAlertsTab === 'sources'}
						class:text-gray-600={activeAlertsTab !== 'sources'}
						class:hover:bg-white={activeAlertsTab !== 'sources'}
						class:shadow-sm={activeAlertsTab === 'sources'}
					>
						{#if activeAlertsTab === 'sources'}
							<div class="bg-primary absolute right-0 bottom-0 left-0 h-0.5"></div>
						{/if}
						<span class="flex h-5 w-5 items-center justify-center rounded-md bg-gray-100">
							<Icon icon="mdi:database-check" width="14" />
						</span>
						<span>Sources</span>
					</button>
					<button
						onclick={() => (activeAlertsTab = 'cyclone')}
						class="relative flex min-h-10 cursor-pointer items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold transition-all"
						class:bg-white={activeAlertsTab === 'cyclone'}
						class:text-primary={activeAlertsTab === 'cyclone'}
						class:text-gray-600={activeAlertsTab !== 'cyclone'}
						class:hover:bg-white={activeAlertsTab !== 'cyclone'}
						class:shadow-sm={activeAlertsTab === 'cyclone'}
					>
						{#if activeAlertsTab === 'cyclone'}
							<div class="bg-primary absolute right-0 bottom-0 left-0 h-0.5"></div>
						{/if}
						<span class="flex h-5 w-5 items-center justify-center rounded-md bg-gray-100">
							<Icon icon="mdi:weather-hurricane" width="14" />
						</span>
						<span>Cyclones</span>
						{#if $tropicalCycloneTrackerStore.data?.length > 0}
							<span
								class="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] leading-5 font-bold text-white"
							>
								{$tropicalCycloneTrackerStore.data.length}
							</span>
						{/if}
					</button>
					<button
						onclick={() => (activeAlertsTab = 'advisory')}
						class="relative flex min-h-10 cursor-pointer items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold transition-all"
						class:bg-white={activeAlertsTab === 'advisory'}
						class:text-primary={activeAlertsTab === 'advisory'}
						class:text-gray-600={activeAlertsTab !== 'advisory'}
						class:hover:bg-white={activeAlertsTab !== 'advisory'}
						class:shadow-sm={activeAlertsTab === 'advisory'}
					>
						{#if activeAlertsTab === 'advisory'}
							<div class="bg-primary absolute right-0 bottom-0 left-0 h-0.5"></div>
						{/if}
						<span class="flex h-5 w-5 items-center justify-center rounded-md bg-gray-100">
							<Icon icon="mdi:water-alert" width="14" />
						</span>
						<span>Advisory</span>
						{#if $generalFloodAdvisoryStore.data}
							<span
								class="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] leading-5 font-bold text-white"
							>
								1
							</span>
						{/if}
					</button>

					<button
						onclick={() => (activeAlertsTab = 'automated')}
						class="relative flex min-h-10 cursor-pointer items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold transition-all"
						class:bg-white={activeAlertsTab === 'automated'}
						class:text-primary={activeAlertsTab === 'automated'}
						class:text-gray-600={activeAlertsTab !== 'automated'}
						class:hover:bg-white={activeAlertsTab !== 'automated'}
						class:shadow-sm={activeAlertsTab === 'automated'}
					>
						{#if activeAlertsTab === 'automated'}
							<div class="bg-primary absolute right-0 bottom-0 left-0 h-0.5"></div>
						{/if}
						<span class="flex h-5 w-5 items-center justify-center rounded-md bg-gray-100">
							<Icon icon="mdi:brain" width="14" />
						</span>
						<span>AI Watch</span>
						{#if automatedAlertCount > 0}
							<span
								class="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] leading-5 font-bold text-white"
							>
								{automatedAlertCount}
							</span>
						{/if}
					</button>
				</div>

				<!-- Tab Content -->
				<div class="bg-slate-50 p-2 md:p-4">
					{#if activeAlertsTab === 'sources'}
						<!-- Data Sources Content -->
						<div class="space-y-3">
							<div class="flex items-center justify-between">
								<h4 class="text-sm font-bold text-gray-800">Data Sources</h4>
								<span class="text-xs text-gray-500">{sources.length} sources</span>
							</div>

							<div class="grid gap-2">
								{#each sources as source}
									<a
										href={source.url}
										target="_blank"
										rel="noopener noreferrer"
										class="group relative rounded-xl border bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
										class:border-gray-200={source.status === 'pending' || source.status === 'idle'}
										class:border-green-300={source.status === 'success'}
										class:border-red-300={source.status === 'error'}
									>
										<div class="flex items-center gap-3">
											<div
												class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl p-1.5 ring-1"
												class:bg-gray-50={source.status === 'pending' || source.status === 'idle'}
												class:ring-gray-200={source.status === 'pending' ||
													source.status === 'idle'}
												class:bg-green-50={source.status === 'success'}
												class:ring-green-200={source.status === 'success'}
												class:bg-red-50={source.status === 'error'}
												class:ring-red-200={source.status === 'error'}
											>
												{#if source.type === 'img'}
													<img
														src={source.logo}
														alt={source.name}
														class="h-full w-full object-contain"
													/>
												{:else}
													<Icon icon={source.logo} class="h-6 w-6 text-gray-600" />
												{/if}
											</div>

											<div class="min-w-0 flex-1">
												<p
													class="group-hover:text-primary text-sm font-semibold text-gray-800 transition-colors"
												>
													{source.name}
												</p>
												<div class="mt-0.5 flex items-center gap-1.5">
													{#if source.status === 'pending'}
														<div class="flex h-2 w-2 animate-pulse rounded-full bg-blue-500"></div>
														<p class="text-xs font-medium text-blue-600">Connecting...</p>
													{:else if source.status === 'idle'}
														<div class="flex h-2 w-2 rounded-full bg-gray-400"></div>
														<p class="text-xs font-medium text-gray-500">Ready on map click</p>
													{:else if source.status === 'success'}
														<div class="flex h-2 w-2 rounded-full bg-green-500"></div>
														<p class="text-xs font-medium text-green-600">Connected</p>
													{:else if source.status === 'error'}
														<div class="flex h-2 w-2 rounded-full bg-red-500"></div>
														<p class="text-xs font-medium text-red-600">Connection Error</p>
													{/if}
												</div>
											</div>

											<Icon
												icon="mdi:open-in-new"
												class="flex-shrink-0 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100"
												width="18"
											/>
										</div>

										{#if source.status === 'pending'}
											<div
												class="absolute bottom-0 left-0 h-1 w-full overflow-hidden rounded-b-lg bg-gray-100"
											>
												<div
													class="animate-loading-bar h-full w-1/3 bg-gradient-to-r from-transparent via-blue-500 to-transparent"
												></div>
											</div>
										{/if}
									</a>
								{/each}
							</div>
						</div>
					{:else if activeAlertsTab === 'automated'}
						<div class="space-y-3">
							<div
								class="rounded-xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-blue-50 p-4 shadow-sm"
							>
								<div class="mb-2 flex items-center gap-2">
									<span
										class="flex h-7 w-7 items-center justify-center rounded-lg bg-white/80 text-sky-700 ring-1 ring-sky-200"
									>
										<Icon icon="mdi:brain" width="16" />
									</span>
									<p class="text-base font-bold tracking-tight text-[#0c3143]">
										APAW AI Watch - Automated Prediction
									</p>
								</div>
								<p class="mt-1 text-xs leading-relaxed text-gray-600">
									APAW automatically predicts flood risk in predefined flood-prone areas using
									real-time data.
								</p>
							</div>

							<div class="grid grid-cols-2 gap-2">
								<button
									type="button"
									onclick={refreshAutomatedAlerts}
									class="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
								>
									<span class="rounded-md bg-slate-100 p-1 text-slate-600">
										<Icon icon="mdi:refresh" width="12" />
									</span>
									Update
								</button>
								<button
									type="button"
									onclick={() => setAutomatedAlertsMapVisibility(!$automatedFloodAlerts.showOnMap)}
									class="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
								>
									<span class="rounded-md bg-slate-100 p-1 text-slate-600">
										<Icon
											icon={$automatedFloodAlerts.showOnMap ? 'mdi:eye' : 'mdi:eye-off'}
											width="12"
										/>
									</span>
									{$automatedFloodAlerts.showOnMap ? 'Show on map: On' : 'Show on map: Off'}
								</button>
							</div>

							<div class="rounded-lg border border-gray-200 bg-white p-2.5">
								<label
									for="automated-forecast-date"
									class="mb-1 block text-[11px] font-semibold text-gray-600">Prediction date</label
								>
								<select
									id="automated-forecast-date"
									class="w-full cursor-pointer rounded-md border border-gray-300 bg-white px-2 py-2 text-xs text-gray-700"
									value={selectedAutomatedIndex}
									onchange={(event) =>
										setAutomatedAlertsForecastIndex(Number(event.currentTarget.value))}
								>
									{#each automatedDateChoices as chip}
										<option value={chip.index}
											>{chip.label} ({automatedCountByIndex.get(chip.index) || 0})</option
										>
									{/each}
								</select>
							</div>

							{#if $automatedFloodAlerts.loading}
								<div class="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
									Loading automated predictions...
								</div>
							{:else if $automatedFloodAlerts.error}
								<div class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
									{$automatedFloodAlerts.error}
								</div>
							{:else if automatedVisibleAlerts.length === 0}
								<div class="rounded-lg border border-gray-200 bg-white p-5 text-center">
									<p class="text-sm font-semibold text-gray-800">
										No flood-prone areas were predicted to be flooded by the automated prediction
										for this day.
									</p>
									<p class="mt-1 text-xs text-gray-500">
										Try another forecast date or click on the map to explore flood probabilities for
										specific locations.
									</p>
								</div>
							{:else}
								<div class="space-y-2">
									{#each automatedVisibleAlerts as item (item.id)}
										{@const payload = getAutomatedForecastPayload(item)}
										{@const floodHourIndices = Array.isArray(payload?.flood_hour_indices)
											? payload.flood_hour_indices
											: Array.isArray(payload?.flooded_hours_list)
												? payload.flooded_hours_list
												: []}
										{@const maxHeight =
											payload?.max_predicted_height_cm !== undefined &&
											payload?.max_predicted_height_cm !== null
												? Number(payload.max_predicted_height_cm)
												: null}
										<div
											class="rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
										>
											<div class="mb-2 flex items-center justify-between gap-2">
												<p class="text-sm font-bold text-gray-800">{item.location_name}</p>
												<span
													class="rounded-full border px-2 py-0.5 text-xs font-bold {getAutomatedRiskClass(
														item.risk_level,
														item.flood_probability
													)}"
												>
													{getAutomatedRiskLabel(item)}
												</span>
											</div>
											<div
												class="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5"
											>
												<div>
													<p class="text-[11px] text-gray-500">Flood chance</p>
													<p class="text-sm font-bold text-gray-900">
														{getAutomatedChanceText(item.flood_probability)}
													</p>
												</div>
												<div>
													<p class="text-[11px] text-gray-500">Day</p>
													<p class="text-sm font-semibold text-gray-800">
														{formatFriendlyForecastDate(item.forecast_date)}
													</p>
												</div>
												<div>
													<p class="text-[11px] text-gray-500">Peak depth</p>
													<p class="text-sm font-semibold text-gray-800">
														{#if maxHeight !== null && Number.isFinite(maxHeight)}
															{maxHeight.toFixed(1)} cm
														{:else}
															No data
														{/if}
													</p>
												</div>
											</div>
											<div class="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
												<p class="flex items-center gap-1 text-[11px] text-gray-500">
													<Icon icon="mdi:clock-alert-outline" width="13" class="text-slate-500" />
													Flood around
												</p>
												<p class="mt-0.5 text-sm font-semibold text-gray-800">
													{formatFloodAroundTimes(floodHourIndices)}
												</p>
											</div>
											<p class="mt-2 text-xs text-gray-600">
												Use this as an early heads-up and follow official advisories for final
												safety decisions.
											</p>
											<div class="mt-2 flex justify-end">
												<button
													type="button"
													onclick={() => focusAutomatedAlert(item)}
													class="flex cursor-pointer items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
												>
													<Icon icon="mdi:crosshairs-gps" width="12" /> Go to location on map
												</button>
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{:else if activeAlertsTab === 'cyclone'}
						<!-- Tropical Cyclone Content -->
						<div class="space-y-3">
							<div class="flex items-center justify-between">
								<h4 class="text-sm font-bold text-gray-800">Tropical Cyclone Tracker</h4>
							</div>

							{#if $tropicalCycloneTrackerStore.data.length > 0 && !$tropicalCycloneTrackerStore.loading}
								<div class="space-y-2">
									{#each $tropicalCycloneTrackerStore.data as tropicalCyclone, tropicalCycloneIdx}
										{@const tropicalCycloneExpanded =
											expandedFacilities[`tropicalCyclone_${tropicalCycloneIdx}`]}
										<div
											class="overflow-hidden rounded-lg border border-orange-300 bg-white shadow-sm"
										>
											<!-- Cyclone Header -->
											<button
												onclick={() =>
													toggleFacilityDetails(`tropicalCyclone_${tropicalCycloneIdx}`)}
												class="flex w-full cursor-pointer items-center justify-between p-3 text-left transition-colors hover:bg-orange-50/50"
											>
												<div class="min-w-0 flex-1">
													<div class="mb-1 flex items-center gap-2">
														<h5 class="text-sm font-bold text-gray-900">
															{tropicalCyclone.storm_name}
														</h5>
														<span
															class="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-800"
														>
															<Icon icon="mdi:wind" width="12" />
															Active
														</span>
													</div>
													<p class="text-xs text-gray-500">
														{moment(tropicalCyclone.issued_at).format('MMM DD, YYYY - h:mm A')}
													</p>
												</div>
												<Icon
													icon={tropicalCycloneExpanded ? 'mdi:chevron-up' : 'mdi:chevron-down'}
													class="ml-2 flex-shrink-0 text-gray-400 transition-transform"
													width="20"
												/>
											</button>

											<!-- Cyclone Details -->
											{#if tropicalCycloneExpanded}
												{@const nearestTrackIndex = getNearestForecastHour(
													tropicalCyclone.forecast_track
												)}
												<div class="border-t border-orange-100">
													<!-- Headline -->
													<div class="bg-orange-50 p-3">
														<p class="text-xs leading-relaxed font-semibold text-orange-900">
															{tropicalCyclone.headline}
														</p>
														{#if tropicalCyclone.valid_until}
															<div class="mt-2 rounded-lg border border-orange-200 bg-white p-2">
																<p class="text-xs text-gray-600">Valid Until</p>
																<p class="text-xs font-bold text-gray-900">
																	{moment(tropicalCyclone.valid_until).format(
																		'MMM DD, YYYY - h:mm A'
																	)}
																</p>
															</div>
														{/if}
													</div>

													<!-- Forecast Tracks -->

													<div class="space-y-2 bg-gray-50 p-3">
														<p class="text-xs font-semibold text-gray-700">Forecast Track</p>
														{#each tropicalCyclone.forecast_track as track, trackIndex}
															<div
																class="rounded-lg border bg-white p-3 transition-all"
																class:border-gray-200={trackIndex !== nearestTrackIndex}
																class:border-blue-400={trackIndex === nearestTrackIndex}
																class:border-2={trackIndex === nearestTrackIndex}
																class:shadow-md={trackIndex === nearestTrackIndex}
															>
																<!-- Header Row -->
																<div class="mb-2 flex items-center justify-between">
																	<p class="text-xs font-bold text-gray-900">
																		{moment(track.date_time).format('MMM DD, h:mm A')}
																	</p>
																	<span
																		class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold {getCycloneCategoryStyle(
																			track.category
																		)}"
																	>
																		{track.category}
																	</span>
																</div>

																<!-- Location -->
																<p class="mb-2 line-clamp-2 text-xs text-gray-700">
																	{track.location}
																</p>

																<!-- Stats Grid -->
																<div class="grid grid-cols-1 gap-2 md:grid-cols-3">
																	<div class="rounded-lg bg-gray-50 p-2">
																		<p class="mb-0.5 text-xs text-gray-500">Position</p>
																		<p class="font-mono text-xs font-bold text-gray-900">
																			{track.lat.toFixed(1)}° {Math.abs(track.lon).toFixed(1)}°
																		</p>
																	</div>
																	<div class="rounded-lg bg-gray-50 p-2">
																		<p class="mb-0.5 text-xs text-gray-500">Wind Speed</p>
																		<p class="text-xs font-bold text-orange-700">
																			{track.msw_kmh} km/h
																		</p>
																	</div>
																	<div class="rounded-lg bg-gray-50 p-2">
																		<p class="mb-0.5 text-xs text-gray-500">Movement</p>
																		<p class="text-xs font-semibold text-gray-900">
																			{track.movement}
																		</p>
																	</div>
																</div>
															</div>
														{/each}
													</div>
												</div>
											{/if}
										</div>
									{/each}
								</div>
							{:else}
								<div class="rounded-lg border border-gray-200 bg-white p-8 text-center">
									<div
										class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100"
									>
										<Icon icon="mdi:check-circle" class="text-green-600" width="24" />
									</div>
									<p class="text-sm font-semibold text-gray-800">No Active Tropical Cyclones</p>
									<p class="mt-1 text-xs text-gray-500">All clear in the area</p>
								</div>
							{/if}
							<div class="flex justify-center">
								<a
									href={sources[1].url}
									target="_blank"
									rel="noopener noreferrer"
									class="group mt-2 flex items-center justify-center gap-1.5 px-2.5 py-1.5"
								>
									<div class="flex h-5 w-5 items-center justify-center rounded bg-gray-50 p-0.5">
										<img src="logo/pagasa.png" alt="PAGASA" class="h-full w-full object-contain" />
									</div>
									<span
										class="group-hover:text-primary-light text-xs font-medium text-gray-700 transition-colors"
										>Data from PAGASA</span
									>
									<Icon
										icon="mdi:open-in-new"
										class="group-hover:text-primary-light text-gray-400"
										width="14"
									/>
								</a>
							</div>
						</div>
					{:else if activeAlertsTab === 'advisory'}
						<!-- General Flood Advisory Content -->
						<div class="space-y-3">
							<div class="flex items-center justify-between">
								<h4 class="text-sm font-bold text-gray-800">General Flood Advisory (NCR)</h4>
							</div>

							{#if $generalFloodAdvisoryStore.data && !$generalFloodAdvisoryStore.loading}
								<div
									class="overflow-hidden rounded-lg border-2 border-orange-200 bg-white shadow-md"
								>
									<!-- Advisory Header -->
									<div class="border-b border-orange-200 bg-orange-50 p-3">
										<h5 class="text-sm leading-tight font-bold text-orange-900">
											{$generalFloodAdvisoryStore.data.areaDesc}
										</h5>
									</div>

									<!-- Advisory Content -->
									<div class="space-y-3 p-3">
										<!-- Time Info Grid -->
										<div class="grid grid-cols-2 gap-2">
											<div class="rounded-lg border border-orange-200 bg-orange-50 p-2.5">
												<div class="mb-1 flex items-center gap-1.5">
													<Icon icon="mdi:calendar-clock" class="text-orange-600" width="14" />
													<span class="text-xs font-medium text-orange-700">Issued</span>
												</div>
												<p class="text-xs font-bold text-orange-900">
													{moment($generalFloodAdvisoryStore.data.sent).format(
														'MMM D, Y [at] h:mm A'
													)}
												</p>
											</div>
											<div class="rounded-lg border border-orange-200 bg-orange-50 p-2.5">
												<div class="mb-1 flex items-center gap-1.5">
													<Icon icon="mdi:clock-alert-outline" class="text-orange-600" width="14" />
													<span class="text-xs font-medium text-orange-700">Expires</span>
												</div>
												<p class="text-xs font-bold text-orange-900">
													{moment($generalFloodAdvisoryStore.data.expires).format(
														'MMM D, Y [at] h:mm A'
													)}
												</p>
											</div>
										</div>

										<!-- Severity -->
										<div class="rounded-lg border border-orange-200 bg-orange-50 p-2.5">
											<div class="mb-1 flex items-center gap-1.5">
												<Icon
													icon="iconoir:priority-high-solid"
													class="text-orange-600"
													width="14"
												/>
												<span class="text-xs font-medium text-orange-700">Severity</span>
											</div>
											<p class="text-xs font-bold text-orange-900">
												{$generalFloodAdvisoryStore.data.severity}
											</p>
										</div>

										<!-- Description -->
										<div class="rounded-lg border border-gray-200 bg-gray-50 p-2.5">
											<div class="mb-1.5 flex items-center gap-1.5">
												<Icon icon="mdi:information" class="text-gray-600" width="14" />
												<span class="text-xs font-semibold text-gray-700">Description</span>
											</div>
											<p class="text-xs leading-relaxed text-gray-700">
												{@html formatAdvisoryText($generalFloodAdvisoryStore.data.description)}
											</p>
										</div>

										<!-- Instructions -->
										<div class="rounded-lg border border-gray-200 bg-gray-50 p-2.5">
											<div class="mb-1.5 flex items-center gap-1.5">
												<Icon icon="mdi:shield-alert" class="text-gray-600" width="14" />
												<span class="text-xs font-semibold text-gray-700">Instructions</span>
											</div>
											<p class="text-xs leading-relaxed text-gray-700">
												{@html formatAdvisoryText($generalFloodAdvisoryStore.data.instruction)}
											</p>
										</div>
									</div>
								</div>
							{:else}
								<div class="rounded-lg border border-gray-200 bg-white p-8 text-center">
									<div
										class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100"
									>
										<Icon icon="mdi:check-circle" class="text-green-600" width="24" />
									</div>
									<p class="text-sm font-semibold text-gray-800">No Active PAGASA Flood Advisory</p>
									<p class="mt-1 text-xs text-gray-500">No official advisory right now.</p>
								</div>
							{/if}
							<div class="flex justify-center">
								<a
									href={sources[1].url}
									target="_blank"
									rel="noopener noreferrer"
									class="group mt-2 flex items-center justify-center gap-1.5 px-2.5 py-1.5"
								>
									<div class="flex h-5 w-5 items-center justify-center rounded bg-gray-50 p-0.5">
										<img src="logo/pagasa.png" alt="PAGASA" class="h-full w-full object-contain" />
									</div>
									<span
										class="group-hover:text-primary-light text-xs font-medium text-gray-700 transition-colors"
										>Data from PAGASA</span
									>
									<Icon
										icon="mdi:open-in-new"
										class="group-hover:text-primary-light text-gray-400"
										width="14"
									/>
								</a>
							</div>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>

	<PredictionControlsSection
		onPredict={predictFlood}
		{isPredicting}
		hasLocation={!!$selectedLocation.lat}
		{locationLoadingState}
		{predictionError}
		{predictionErrorDetails}
	/>

	<PredictionLoadingSection
		{isPredicting}
		{locationLoadingMessage}
		{fakeProgress}
		on:completionVisible={handleProgressCompletionVisible}
	/>

	<!-- Enhanced Prediction Results -->
	{#if !isPredicting && floodPrediction && floodPrediction.forecast_by_day && floodPrediction.forecast_by_day.length > 0}
		<div class="space-y-3">
			<!-- Sleek Results Header -->
			<div
				class="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm"
			>
				<div class="flex items-center gap-3">
					<div
						class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600"
					>
						<Icon icon="mdi:check-decagram" width="18" />
					</div>
					<div>
						<h3 class="text-sm font-bold text-slate-800">Prediction Complete</h3>
						<p class="text-[10px] font-medium tracking-widest text-slate-500 uppercase">
							5-Day Hourly Forecast
						</p>
					</div>
				</div>
				<span class="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
					{floodPrediction.location?.start_date
						? formatHeaderDate(floodPrediction.location.start_date)
						: 'Detailed View'}
				</span>
			</div>

			<!-- Warnings if any -->
			{#if floodPrediction.warnings && floodPrediction.warnings.length > 0}
				<div class="rounded-lg border border-amber-300 bg-amber-50 p-3 shadow-sm">
					<p class="mb-1 flex items-center text-xs font-bold text-amber-800">
						<Icon icon="mdi:alert-circle" class="mr-1.5" width="16" />
						Prediction Advisories
					</p>
					<ul class="ml-5 list-disc space-y-1 text-xs font-medium text-amber-700">
						{#each floodPrediction.warnings as warning}
							<li>{warning}</li>
						{/each}
					</ul>
				</div>
			{/if}

			<PawiSummarySection
				hasPrediction={!!floodPrediction}
				loading={pawiSummaryLoading}
				error={pawiSummaryError}
				summary={pawiSummary?.summary || pawiSummary?.overall_summary || null}
				source={pawiSummary?.source || null}
				updatedAt={pawiLastGeneratedAt}
				hasRequested={pawiSummaryRequested}
				canSummarize={!pawiSummaryRequested && !pawiSummaryLoading}
				onSummarize={() => fetchPawiSummary(floodPrediction)}
			/>

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
										<p
											class="flex items-center gap-2 rounded-full px-2 py-0.5 text-xs font-semibold {summary
												.riskInfo.badgeStyle}"
										>
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
									<div
										class="mt-2 flex items-center rounded border p-2 {summary.riskInfo.borderStyle}"
									>
										<Icon
											icon="mdi:clock-alert-outline"
											class="mr-1.5 {summary.riskInfo.textColor}"
											width="16"
										/>
										<div class="flex-1">
											<span class="text-xs font-medium {summary.riskInfo.textColor}">
												Time of Peak Flood Risks:
											</span>
											<span class="ml-1 text-xs font-bold {summary.riskInfo.boldTextColor}">
												{summary.peakHours}
											</span>
										</div>
									</div>
								{/if}

								<!-- Height Information (updated to handle 0cm) -->
								{#if summary.maxHeight > 0}
									<div
										class="mt-2 flex items-center rounded border p-2 {summary.riskInfo.borderStyle}"
									>
										<Icon icon="mdi:water" class="mr-1.5 {summary.riskInfo.textColor}" width="14" />
										<div class="text-xs">
											<span class="font-semibold {summary.riskInfo.textColor}"> Max Height: </span>
											<span class="ml-1 font-mono {summary.riskInfo.textColor}">
												{summary.maxHeight.toFixed(2)}cm
											</span>
										</div>
									</div>
								{:else if summary.floodedHours > 0}
									<div
										class="mt-2 flex items-center rounded border p-2 {summary.riskInfo.borderStyle}"
									>
										<Icon
											icon="mdi:water-alert"
											class="mr-1.5 {summary.riskInfo.textColor}"
											width="14"
										/>
										<div class="text-xs">
											<span class="font-semibold {summary.riskInfo.textColor}">
												Flood Height:
											</span>
											<span class="ml-1 italic {summary.riskInfo.textColor}"> Not measured </span>
										</div>
									</div>
								{/if}

								<!-- Weather Summary (Rain only) -->
								{#if weather}
									<div class="mt-2 rounded border border-blue-200 bg-blue-50 p-2">
										<div class="flex justify-between text-xs">
											<span class="text-gray-600">Total Rain:</span>
											<span class="font-bold text-blue-700">{weather.totalPrecip.toFixed(1)}mm</span
											>
										</div>
									</div>
								{/if}
							</div>

							<!-- Expand/Collapse Section -->
							<div class="border-t border-gray-100 bg-slate-50/50 p-2">
								<button
									onclick={() => toggleExpand(day.date)}
									class="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md bg-white px-2 py-2 text-[11px] font-bold text-slate-600 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:text-slate-800"
								>
									<Icon
										icon={expandedPredictions[day.date]
											? 'mdi:chevron-up'
											: 'mdi:chart-timeline-variant-shimmer'}
										width="14"
									/>
									{expandedPredictions[day.date] ? 'Close Analytics' : 'View 24-Hour Analytics'}
								</button>
							</div>

							<!-- Expanded Details - Hourly Breakdown -->
							{#if expandedPredictions[day.date]}
								{@const selectedHourIndex = selectedHourByDay[day.date] ?? 0}
								{@const selectedHourData = day.hourly_forecast[selectedHourIndex]}

								<div class="space-y-3 border-t border-gray-200 bg-gray-50 p-3">
									<!-- Hourly Forecast Interactive Bar Chart -->
									<div class="rounded-lg border border-blue-200 bg-white p-3 shadow-sm">
										<h6
											class="mb-1 flex items-center justify-between text-xs font-bold text-blue-800"
										>
											<span class="flex items-center">
												<Icon icon="mdi:chart-bar" class="mr-1" width="14" />
												24-Hour Probability Trend
											</span>
											{#if summary.floodedHours > 0}
												<span
													class="flex items-center gap-1 text-[11px] font-semibold {summary.riskInfo
														.textColor}"
												>
													<Icon icon="mdi:water-alert" width="12" />
													{summary.floodedHours} hr{summary.floodedHours === 1 ? '' : 's'} flood risk
												</span>
											{/if}
										</h6>
										<p class="mb-4 text-[11px] text-gray-500">
											Click any bar to view detailed data for that hour
										</p>

										<!-- Interactive Bar Chart (Split into 4 periods for better mobile visibility) -->
										<div class="mt-3 flex flex-col gap-5 pb-2">
											{#each [{ label: '12am to 5am', start: 0, end: 6 }, { label: '6am to 11am', start: 6, end: 12 }, { label: '12pm to 5pm', start: 12, end: 18 }, { label: '6pm to 11pm', start: 18, end: 24 }] as period}
												<div>
													<p
														class="mb-1 border-b border-slate-100 pb-1 text-[10px] font-bold text-slate-500"
													>
														{period.label}
													</p>
													<div class="relative flex h-24 items-end gap-[3px]">
														{#each day.hourly_forecast.slice(period.start, period.end) as hour, i}
															{@const hourIndex = i + period.start}
															{@const isSelected = selectedHourIndex === hourIndex}
															{@const isFlooded = hour.final_prediction.is_flooded === 1}
															{@const prob = hour.final_prediction.flood_probability * 100}
															{@const barColor = isSelected
																? prob <= 50
																	? 'bg-emerald-500 shadow-sm'
																	: prob <= 60
																		? 'bg-yellow-500 shadow-sm'
																		: prob <= 80
																			? 'bg-orange-500 shadow-sm'
																			: 'bg-red-600 shadow-sm'
																: prob <= 50
																	? 'bg-emerald-300 hover:bg-emerald-400'
																	: prob <= 60
																		? 'bg-yellow-400 hover:bg-yellow-500'
																		: prob <= 80
																			? 'bg-orange-400 hover:bg-orange-500'
																			: 'bg-red-400 hover:bg-red-500'}

															<button
																type="button"
																onclick={() => selectHour(day.date, hourIndex)}
																class="group relative flex h-full flex-1 cursor-pointer flex-col justify-end transition-all focus:outline-none"
															>
																<!-- Bar Fill -->
																<div
																	class="w-full rounded-t-sm transition-all duration-200 {barColor}"
																	style="height: {Math.max(prob, 6)}%;"
																></div>

																<!-- Flooded Warning Indicator Dot -->
																{#if isFlooded}
																	<div
																		class="absolute -top-3 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-red-600"
																	></div>
																{/if}

																<!-- Time Label -->
																<span
																	class="mt-1 text-center text-[9px] font-semibold transition-colors {isSelected
																		? 'font-bold text-slate-800'
																		: 'text-slate-400 group-hover:text-slate-600'}"
																>
																	{#if hour.hour === 0}
																		12am
																	{:else if hour.hour < 12}
																		{hour.hour}am
																	{:else if hour.hour === 12}
																		12pm
																	{:else}
																		{hour.hour - 12}pm
																	{/if}
																</span>

																<!-- Active Indicator Overlay -->
																{#if isSelected}
																	<div
																		class="absolute right-0 -bottom-1 left-0 h-0.5 rounded-full bg-slate-800"
																	></div>
																{/if}

																<!-- Tooltip Dropdown (Hover) -->
																<div
																	class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 flex-col items-center group-hover:flex"
																>
																	<div
																		class="rounded bg-slate-800 px-2 py-1 text-center whitespace-nowrap shadow-lg"
																	>
																		<p class="mb-0.5 text-[10px] font-bold text-white">
																			{formatTo12Hour(hour.hour)}
																		</p>
																		<p
																			class="text-[10px] font-medium {prob <= 50
																				? 'text-emerald-300'
																				: prob <= 60
																					? 'text-yellow-300'
																					: prob <= 80
																						? 'text-orange-300'
																						: 'text-red-300'}"
																		>
																			{Math.round(prob)}% risk
																		</p>
																	</div>
																	<div
																		class="h-1 w-1 -translate-y-1/2 rotate-45 bg-slate-800"
																	></div>
																</div>
															</button>
														{/each}
													</div>
												</div>
											{/each}
										</div>
									</div>

									<!-- Complete Key Features from Selected Hour -->
									{#if selectedHourData?.key_features}
										{@const selectedHourRisk = getRiskLevel(
											selectedHourData.final_prediction.flood_probability
										)}
										<div class="mt-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
											<div
												class="mb-3 flex items-center justify-between border-b border-gray-100 pb-2"
											>
												<h6 class="flex items-center text-xs font-bold text-gray-800">
													<Icon
														icon="mdi:clock-check-outline"
														class="mr-1 text-blue-600"
														width="16"
													/>
													Detailed Metrics
												</h6>
												<span
													class="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700"
												>
													{#if selectedHourData.final_prediction.is_flooded === 1}
														<div class="h-2 w-2 animate-pulse rounded-full bg-orange-500"></div>
													{/if}
													{formatTo12Hour(selectedHourData.hour)}
												</span>
											</div>

											<!-- Core Prediction Status -->
											<div class="mb-3 grid grid-cols-2 gap-2 text-center text-xs">
												<div class="rounded-lg border border-gray-100 bg-gray-50 p-2">
													<span
														class="mb-0.5 block text-[10px] font-semibold tracking-widest text-gray-500 uppercase"
														>Probability</span
													>
													<span class="text-sm font-bold text-gray-900"
														>{Math.round(
															selectedHourData.final_prediction.flood_probability * 100
														)}%</span
													>
												</div>
												<div class="rounded-lg border border-gray-100 bg-gray-50 p-2">
													<span
														class="mb-0.5 block text-[10px] font-semibold tracking-widest text-gray-500 uppercase"
														>Est. Level</span
													>
													<span class="text-sm font-bold text-gray-900">
														{formatHeight(
															selectedHourData.final_prediction.predicted_height_cm,
															selectedHourData.final_prediction.is_flooded === 1
														)}
													</span>
												</div>
											</div>

											<!-- Detailed Features Grid -->
											<div class="grid grid-cols-2 gap-2 text-xs">
												{#each Object.entries(selectedHourData.key_features) as [key, value]}
													<div
														class="flex flex-col justify-center rounded border border-slate-100 bg-slate-50 p-2"
													>
														<span
															class="mb-0.5 truncate text-[10px] font-semibold tracking-wide text-slate-500 uppercase"
															title={key}
														>
															{key.replace(/_/g, ' ').replace('precip', 'rain')}
														</span>
														<span class="font-mono text-sm font-semibold text-slate-800">
															{typeof value === 'number' ? value.toFixed(1) : value}
															<span class="ml-0.5 font-sans text-[10px] text-slate-500">
																{key.includes('temp')
																	? '°C'
																	: key.includes('precip')
																		? 'mm'
																		: key.includes('waterlevel')
																			? 'm'
																			: ''}
															</span>
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

	<LocationInfoSection
		{locationLoadingState}
		{locationLoadingMessage}
		selectedLocation={$selectedLocation}
		nearestWaterStation={$nearestWaterStation}
		facilitiesLayerActive={$facilitiesLayerActive}
		nearestFacilities={$nearestFacilities}
		{expandedFacilities}
		onToggleFacility={toggleFacilityDetails}
	/>

	<HowToUseSection />
</div>

<style>
	/* Enhanced styles for narrow containers */
	.text-2xs {
		font-size: 0.625rem;
		line-height: 0.875rem;
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

	/* Smooth tab indicator animation */
	button[class*='activeAlertsTab'] {
		position: relative;
	}

	/* Enhanced loading bar animation */
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

	/* Pulse animation for active alerts */
	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.animate-pulse {
		animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}
</style>
