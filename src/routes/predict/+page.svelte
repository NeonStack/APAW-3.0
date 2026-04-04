<script>
	import { browser } from '$app/environment';
	import Map from '$lib/components/Map.svelte';
	import { automatedFloodAlerts } from '$lib/stores/automatedFloodAlertStore.js';
	import { generalFloodAdvisoryStore } from '$lib/stores/generalFloodAdvisoryStore.js';
	import { tropicalCycloneTrackerStore } from '$lib/stores/tropicalCycloneTrackerStore.js';
	import { waterStations } from '$lib/stores/waterStationStore.js';
	import { weatherData } from '$lib/stores/weatherStore.js';
	import PredictSidebar from '$lib/components/PredictSidebar.svelte';
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';

	const DEFAULT_FORECAST_INDICES = [0, 1, 2, 3, 4];
	const DEFAULT_MIN_PROBABILITY = 0.5;

	const WEATHER_REFRESH_INTERVAL_MS = 2 * 60 * 60 * 1000;
	const WATER_STATIONS_REFRESH_INTERVAL_MS = 10 * 60 * 1000;
	const TROPICAL_CYCLONE_REFRESH_INTERVAL_MS = 90 * 60 * 1000;
	const GENERAL_FLOOD_ADVISORY_REFRESH_INTERVAL_MS = 2 * 60 * 60 * 1000;
	const AUTOMATED_ALERTS_REFRESH_INTERVAL_MS = 3 * 60 * 60 * 1000;
	const DYNAMIC_REFRESH_CHECK_INTERVAL_MS = 60 * 1000;
	const DYNAMIC_REFRESH_BUFFER_MS = 60 * 1000;
	const DYNAMIC_REFRESH_JITTER_MAX_MS = 20 * 1000;
	const DYNAMIC_REFRESH_ERROR_RETRY_MS = 10 * 60 * 1000;

	const PREDICT_SOURCE_KEYS = {
		WEATHER: 'weather',
		WATER_STATIONS: 'waterStations',
		TROPICAL_CYCLONE: 'tropicalCyclone',
		GENERAL_FLOOD_ADVISORY: 'generalFloodAdvisory',
		AUTOMATED_FLOOD_ALERTS: 'automatedFloodAlerts'
	};

	const sourceRefreshInFlight = {
		[PREDICT_SOURCE_KEYS.WEATHER]: false,
		[PREDICT_SOURCE_KEYS.WATER_STATIONS]: false,
		[PREDICT_SOURCE_KEYS.TROPICAL_CYCLONE]: false,
		[PREDICT_SOURCE_KEYS.GENERAL_FLOOD_ADVISORY]: false,
		[PREDICT_SOURCE_KEYS.AUTOMATED_FLOOD_ALERTS]: false
	};

	let { data } = $props();

	let navbarHeight = $state(0);
	let isSidebarOpen = $state(true);
	let lastBootstrapAt = $state(null);
	let lastRefreshAtBySource = $state({
		[PREDICT_SOURCE_KEYS.WEATHER]: 0,
		[PREDICT_SOURCE_KEYS.WATER_STATIONS]: 0,
		[PREDICT_SOURCE_KEYS.TROPICAL_CYCLONE]: 0,
		[PREDICT_SOURCE_KEYS.GENERAL_FLOOD_ADVISORY]: 0,
		[PREDICT_SOURCE_KEYS.AUTOMATED_FLOOD_ALERTS]: 0
	});
	let nextRefreshAtBySource = $state({
		[PREDICT_SOURCE_KEYS.WEATHER]: 0,
		[PREDICT_SOURCE_KEYS.WATER_STATIONS]: 0,
		[PREDICT_SOURCE_KEYS.TROPICAL_CYCLONE]: 0,
		[PREDICT_SOURCE_KEYS.GENERAL_FLOOD_ADVISORY]: 0,
		[PREDICT_SOURCE_KEYS.AUTOMATED_FLOOD_ALERTS]: 0
	});

	function markSourceRefreshed(sourceKey) {
		lastRefreshAtBySource = {
			...lastRefreshAtBySource,
			[sourceKey]: Date.now()
		};
	}

	function markAllSourcesRefreshed() {
		const now = Date.now();
		lastRefreshAtBySource = {
			[PREDICT_SOURCE_KEYS.WEATHER]: now,
			[PREDICT_SOURCE_KEYS.WATER_STATIONS]: now,
			[PREDICT_SOURCE_KEYS.TROPICAL_CYCLONE]: now,
			[PREDICT_SOURCE_KEYS.GENERAL_FLOOD_ADVISORY]: now,
			[PREDICT_SOURCE_KEYS.AUTOMATED_FLOOD_ALERTS]: now
		};
	}

	function setSourceNextRefreshAt(sourceKey, timestampMs) {
		nextRefreshAtBySource = {
			...nextRefreshAtBySource,
			[sourceKey]: Number.isFinite(timestampMs) ? Math.max(0, Math.floor(timestampMs)) : 0
		};
	}

	function clearSourceNextRefreshAt(sourceKey) {
		setSourceNextRefreshAt(sourceKey, 0);
	}

	function setSourceNextRefreshFromIso(sourceKey, isoTimestamp) {
		const parsedMs = Date.parse(String(isoTimestamp || ''));
		if (!Number.isFinite(parsedMs)) {
			clearSourceNextRefreshAt(sourceKey);
			return;
		}

		const jitterMs = Math.floor(Math.random() * DYNAMIC_REFRESH_JITTER_MAX_MS);
		setSourceNextRefreshAt(sourceKey, parsedMs + DYNAMIC_REFRESH_BUFFER_MS + jitterMs);
	}

	function setDynamicSourceRetry(sourceKey, retryDelayMs = DYNAMIC_REFRESH_ERROR_RETRY_MS) {
		setSourceNextRefreshAt(sourceKey, Date.now() + Math.max(1000, Number(retryDelayMs) || 1000));
	}

	function isDynamicSource(sourceKey) {
		return (
			sourceKey === PREDICT_SOURCE_KEYS.GENERAL_FLOOD_ADVISORY ||
			sourceKey === PREDICT_SOURCE_KEYS.AUTOMATED_FLOOD_ALERTS
		);
	}

	function isSourceRefreshDue(sourceKey, fallbackIntervalMs, now = Date.now()) {
		if (isDynamicSource(sourceKey)) {
			const nextRefreshAt = Number(nextRefreshAtBySource[sourceKey] || 0);
			if (nextRefreshAt > 0) {
				return now >= nextRefreshAt;
			}
		}

		const lastRefreshAt = Number(lastRefreshAtBySource[sourceKey] || 0);
		return now - lastRefreshAt >= Number(fallbackIntervalMs || 0);
	}

	async function fetchPredictJson(endpoint) {
		const response = await fetch(endpoint, {
			cache: 'no-store',
			headers: {
				'cache-control': 'no-cache',
				pragma: 'no-cache'
			}
		});

		let payload = null;
		try {
			payload = await response.json();
		} catch {
			payload = null;
		}

		if (!response.ok) {
			throw new Error(
				payload?.error || payload?.message || `Request failed with status ${response.status}`
			);
		}

		return payload;
	}

	async function runSourceRefresh(sourceKey, runner) {
		if (sourceRefreshInFlight[sourceKey]) {
			return;
		}

		sourceRefreshInFlight[sourceKey] = true;
		try {
			await runner();
		} finally {
			sourceRefreshInFlight[sourceKey] = false;
		}
	}

	async function refreshWeatherSource(reason = 'interval') {
		await runSourceRefresh(PREDICT_SOURCE_KEYS.WEATHER, async () => {
			try {
				const payload = await fetchPredictJson('/api/get-weather');
				weatherData.set({
					loading: false,
					data: Array.isArray(payload) ? payload : [],
					error: null
				});
				markSourceRefreshed(PREDICT_SOURCE_KEYS.WEATHER);
			} catch (error) {
				console.warn(
					`Predict weather ${reason} refresh failed: ${error?.message || 'unknown_error'}`
				);
				weatherData.update((store) => ({
					...store,
					loading: false,
					error: error?.message || 'Unable to load weather data'
				}));
			}
		});
	}

	async function refreshWaterStationsSource(reason = 'interval') {
		await runSourceRefresh(PREDICT_SOURCE_KEYS.WATER_STATIONS, async () => {
			try {
				const payload = await fetchPredictJson('/api/water-stations');
				waterStations.set({
					loading: false,
					data: Array.isArray(payload) ? payload : [],
					error: null
				});
				markSourceRefreshed(PREDICT_SOURCE_KEYS.WATER_STATIONS);
			} catch (error) {
				console.warn(
					`Predict water stations ${reason} refresh failed: ${error?.message || 'unknown_error'}`
				);
				waterStations.update((store) => ({
					...store,
					loading: false,
					error: error?.message || 'Unable to load water station data'
				}));
			}
		});
	}

	async function refreshTropicalCycloneSource(reason = 'interval') {
		await runSourceRefresh(PREDICT_SOURCE_KEYS.TROPICAL_CYCLONE, async () => {
			try {
				const payload = await fetchPredictJson('/api/tropicalCyclone-tracker');
				tropicalCycloneTrackerStore.set({
					loading: false,
					data: Array.isArray(payload) ? payload : [],
					error: null
				});
				markSourceRefreshed(PREDICT_SOURCE_KEYS.TROPICAL_CYCLONE);
			} catch (error) {
				console.warn(
					`Predict tropical cyclone ${reason} refresh failed: ${error?.message || 'unknown_error'}`
				);
				tropicalCycloneTrackerStore.update((store) => ({
					...store,
					loading: false,
					error: error?.message || 'Unable to load tropical cyclone tracker data'
				}));
			}
		});
	}

	async function refreshGeneralFloodAdvisorySource(reason = 'interval') {
		await runSourceRefresh(PREDICT_SOURCE_KEYS.GENERAL_FLOOD_ADVISORY, async () => {
			try {
				const payload = await fetchPredictJson('/api/general-flood-advisory');
				const advisoryEnvelope =
					payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : null;
				const advisoryData =
					advisoryEnvelope && 'data' in advisoryEnvelope
						? (advisoryEnvelope.data ?? null)
						: (payload ?? null);
				const advisoryMeta =
					advisoryEnvelope?.meta && typeof advisoryEnvelope.meta === 'object'
						? advisoryEnvelope.meta
						: null;

				generalFloodAdvisoryStore.set({
					loading: false,
					data: advisoryData,
					meta: advisoryMeta,
					error: null
				});

				if (advisoryMeta?.next_refresh_at) {
					setSourceNextRefreshFromIso(
						PREDICT_SOURCE_KEYS.GENERAL_FLOOD_ADVISORY,
						advisoryMeta.next_refresh_at
					);
				} else {
					clearSourceNextRefreshAt(PREDICT_SOURCE_KEYS.GENERAL_FLOOD_ADVISORY);
				}

				markSourceRefreshed(PREDICT_SOURCE_KEYS.GENERAL_FLOOD_ADVISORY);
			} catch (error) {
				console.warn(
					`Predict flood advisory ${reason} refresh failed: ${error?.message || 'unknown_error'}`
				);
				setDynamicSourceRetry(PREDICT_SOURCE_KEYS.GENERAL_FLOOD_ADVISORY);
				generalFloodAdvisoryStore.update((store) => ({
					...store,
					loading: false,
					error: error?.message || 'Unable to load general flood advisory data'
				}));
			}
		});
	}

	async function refreshAutomatedFloodAlertsSource(reason = 'interval') {
		await runSourceRefresh(PREDICT_SOURCE_KEYS.AUTOMATED_FLOOD_ALERTS, async () => {
			try {
				const endpoint =
					`/api/automated-flood-detection?forecast_index=${DEFAULT_FORECAST_INDICES.join(',')}` +
					`&min_probability=${DEFAULT_MIN_PROBABILITY}`;
				const payload = await fetchPredictJson(endpoint);
				const alertData = Array.isArray(payload?.data) ? payload.data : [];

				automatedFloodAlerts.update((store) => ({
					...store,
					loading: false,
					data: alertData,
					error: null,
					meta: {
						request_date: payload?.meta?.request_date || store.meta.request_date,
						forecast_indices:
							Array.isArray(payload?.meta?.forecast_indices) &&
							payload.meta.forecast_indices.length > 0
								? payload.meta.forecast_indices
								: store.meta.forecast_indices,
						min_probability:
							typeof payload?.meta?.min_probability === 'number'
								? payload.meta.min_probability
								: store.meta.min_probability,
						count: Number(payload?.meta?.count ?? alertData.length),
						next_refresh_at: payload?.meta?.next_refresh_at || null
					}
				}));

				if (payload?.meta?.next_refresh_at) {
					setSourceNextRefreshFromIso(
						PREDICT_SOURCE_KEYS.AUTOMATED_FLOOD_ALERTS,
						payload.meta.next_refresh_at
					);
				} else {
					clearSourceNextRefreshAt(PREDICT_SOURCE_KEYS.AUTOMATED_FLOOD_ALERTS);
				}

				markSourceRefreshed(PREDICT_SOURCE_KEYS.AUTOMATED_FLOOD_ALERTS);
			} catch (error) {
				console.warn(
					`Predict automated alerts ${reason} refresh failed: ${error?.message || 'unknown_error'}`
				);
				setDynamicSourceRetry(PREDICT_SOURCE_KEYS.AUTOMATED_FLOOD_ALERTS);
				automatedFloodAlerts.update((store) => ({
					...store,
					loading: false,
					error: error?.message || 'Unable to load automated flood alerts'
				}));
			}
		});
	}

	function getRefreshSchedules() {
		return [
			{
				key: PREDICT_SOURCE_KEYS.WATER_STATIONS,
				intervalMs: WATER_STATIONS_REFRESH_INTERVAL_MS,
				refresh: refreshWaterStationsSource
			},
			{
				key: PREDICT_SOURCE_KEYS.WEATHER,
				intervalMs: WEATHER_REFRESH_INTERVAL_MS,
				refresh: refreshWeatherSource
			},
			{
				key: PREDICT_SOURCE_KEYS.TROPICAL_CYCLONE,
				intervalMs: TROPICAL_CYCLONE_REFRESH_INTERVAL_MS,
				refresh: refreshTropicalCycloneSource
			},
			{
				key: PREDICT_SOURCE_KEYS.GENERAL_FLOOD_ADVISORY,
				intervalMs: GENERAL_FLOOD_ADVISORY_REFRESH_INTERVAL_MS,
				checkIntervalMs: DYNAMIC_REFRESH_CHECK_INTERVAL_MS,
				usesDynamicScheduling: true,
				refresh: refreshGeneralFloodAdvisorySource
			},
			{
				key: PREDICT_SOURCE_KEYS.AUTOMATED_FLOOD_ALERTS,
				intervalMs: AUTOMATED_ALERTS_REFRESH_INTERVAL_MS,
				checkIntervalMs: DYNAMIC_REFRESH_CHECK_INTERVAL_MS,
				usesDynamicScheduling: true,
				refresh: refreshAutomatedFloodAlertsSource
			}
		];
	}

	function refreshDueSources(schedules, reason) {
		const now = Date.now();
		schedules.forEach((schedule) => {
			if (isSourceRefreshDue(schedule.key, schedule.intervalMs, now)) {
				schedule.refresh(reason);
			}
		});
	}

	function applyServerBootstrap(initialData, bootstrapAt) {
		if (!browser || !initialData) return false;

		if (bootstrapAt && lastBootstrapAt === bootstrapAt) {
			return true;
		}

		weatherData.set({
			loading: false,
			data: Array.isArray(initialData?.weather?.data) ? initialData.weather.data : [],
			error: initialData?.weather?.error || null
		});

		waterStations.set({
			loading: false,
			data: Array.isArray(initialData?.waterStations?.data) ? initialData.waterStations.data : [],
			error: initialData?.waterStations?.error || null
		});

		tropicalCycloneTrackerStore.set({
			loading: false,
			data: Array.isArray(initialData?.tropicalCyclone?.data)
				? initialData.tropicalCyclone.data
				: [],
			error: initialData?.tropicalCyclone?.error || null
		});

		generalFloodAdvisoryStore.set({
			loading: false,
			data: initialData?.generalFloodAdvisory?.data ?? null,
			meta:
				initialData?.generalFloodAdvisory?.meta &&
				typeof initialData.generalFloodAdvisory.meta === 'object'
					? initialData.generalFloodAdvisory.meta
					: null,
			error: initialData?.generalFloodAdvisory?.error || null
		});

		automatedFloodAlerts.update((store) => ({
			...store,
			loading: false,
			data: Array.isArray(initialData?.automatedFloodAlerts?.data)
				? initialData.automatedFloodAlerts.data
				: [],
			error: initialData?.automatedFloodAlerts?.error || null,
			meta: {
				request_date:
					initialData?.automatedFloodAlerts?.meta?.request_date || store.meta.request_date,
				forecast_indices: Array.isArray(initialData?.automatedFloodAlerts?.meta?.forecast_indices)
					? initialData.automatedFloodAlerts.meta.forecast_indices
					: store.meta.forecast_indices,
				min_probability:
					typeof initialData?.automatedFloodAlerts?.meta?.min_probability === 'number'
						? initialData.automatedFloodAlerts.meta.min_probability
						: store.meta.min_probability,
				count: Number(
					initialData?.automatedFloodAlerts?.meta?.count ??
						(Array.isArray(initialData?.automatedFloodAlerts?.data)
							? initialData.automatedFloodAlerts.data.length
							: 0)
				),
				next_refresh_at:
					initialData?.automatedFloodAlerts?.meta?.next_refresh_at ||
					store.meta.next_refresh_at ||
					null
			}
		}));

		if (initialData?.generalFloodAdvisory?.meta?.next_refresh_at) {
			setSourceNextRefreshFromIso(
				PREDICT_SOURCE_KEYS.GENERAL_FLOOD_ADVISORY,
				initialData.generalFloodAdvisory.meta.next_refresh_at
			);
		} else {
			clearSourceNextRefreshAt(PREDICT_SOURCE_KEYS.GENERAL_FLOOD_ADVISORY);
		}

		if (initialData?.automatedFloodAlerts?.meta?.next_refresh_at) {
			setSourceNextRefreshFromIso(
				PREDICT_SOURCE_KEYS.AUTOMATED_FLOOD_ALERTS,
				initialData.automatedFloodAlerts.meta.next_refresh_at
			);
		} else {
			clearSourceNextRefreshAt(PREDICT_SOURCE_KEYS.AUTOMATED_FLOOD_ALERTS);
		}

		lastBootstrapAt = bootstrapAt || new Date().toISOString();
		markAllSourcesRefreshed();
		return true;
	}

	$effect(() => {
		if (data?.bootstrapOk) {
			applyServerBootstrap(data?.initialData, data?.bootstrapAt);
		}
	});

	function handleResize() {
		const windowWidth = window.innerWidth;

		// Always show sidebar on desktop
		if (windowWidth >= 768) {
			isSidebarOpen = true;
		}
	}

	onMount(() => {
		const navbar = document.querySelector('header');

		if (navbar) {
			navbarHeight = navbar.offsetHeight;
			document.documentElement.style.setProperty('--header-height', `${navbarHeight}px`);
		}

		// Close sidebar by default on mobile
		if (window.innerWidth < 768) {
			isSidebarOpen = false;
		}

		const hydratedFromServer =
			data?.bootstrapOk && applyServerBootstrap(data?.initialData, data?.bootstrapAt);

		const refreshSchedules = getRefreshSchedules();

		if (!hydratedFromServer) {
			refreshSchedules.forEach((schedule) => {
				schedule.refresh('bootstrap');
			});
		}

		const sourceIntervals = refreshSchedules.map((schedule) =>
			setInterval(() => {
				if (!document.hidden && isSourceRefreshDue(schedule.key, schedule.intervalMs)) {
					schedule.refresh('interval');
				}
			}, schedule.checkIntervalMs || schedule.intervalMs)
		);

		const refreshDueOnFocus = () => {
			refreshDueSources(refreshSchedules, 'focus');
		};

		const handleVisibilityChange = () => {
			if (!document.hidden) {
				refreshDueSources(refreshSchedules, 'visibility');
			}
		};

		window.addEventListener('focus', refreshDueOnFocus);
		document.addEventListener('visibilitychange', handleVisibilityChange);
		window.addEventListener('resize', handleResize);
		return () => {
			window.removeEventListener('focus', refreshDueOnFocus);
			document.removeEventListener('visibilitychange', handleVisibilityChange);
			window.removeEventListener('resize', handleResize);
			sourceIntervals.forEach((intervalId) => clearInterval(intervalId));
		};
	});

	function toggleSidebar() {
		isSidebarOpen = !isSidebarOpen;
	}

	function handleCloseSidebar() {
		isSidebarOpen = false;
	}
</script>

<svelte:head>
	<title>APAW | Flood Risk Predictions</title>
	<meta
		name="description"
		content="View interactive 5-day flood risk predictions for locations across Metro Manila using APAW's machine learning model."
	/>
</svelte:head>

<div class="predict-page">
	<h1 class="sr-only">Metro Manila Flood Risk Predictions</h1>

	<div class="m-0 flex h-full w-full p-0">
		<!-- Map Container -->
		<div class="m-0 h-full flex-1 p-0 md:w-2/3">
			<Map height="100%" />
		</div>

		<!-- Mobile Toggle Button -->
		<button
			class="bg-primary fixed right-4 bottom-4 z-40 flex items-center justify-center rounded-full p-3 text-white shadow-lg md:hidden"
			onclick={toggleSidebar}
			aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
		>
			<Icon icon={isSidebarOpen ? 'mdi:chevron-right' : 'mdi:chevron-left'} width="24" />
		</button>

		<!-- Sidebar Container -->
		<div
			class="sidebar-container {isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'} 
                {isSidebarOpen ? '' : 'pointer-events-none'}
                fixed right-0 z-30 overflow-y-auto bg-white
                transition-transform duration-300 md:static md:w-1/3 md:transform-none md:shadow-none"
		>
			<PredictSidebar on:closeSidebar={handleCloseSidebar} />
		</div>
	</div>
</div>

<style>
	/* Only keep styles that can't be done with Tailwind */
	.predict-page {
		height: calc(100dvh - var(--header-height, 64px));
	}

	.sidebar-container {
		height: calc(100dvh - var(--header-height, 64px));
	}

	.sidebar-open {
		transform: translateX(0);
		width: 85vw;
		max-width: 450px;
	}

	.sidebar-closed {
		transform: translateX(100%);
		width: 85vw;
		max-width: 450px;
	}

	/* Desktop overrides that Tailwind md: handles */
	@media (min-width: 768px) {
		.sidebar-container {
			position: static;
			height: 100%;
		}
	}
</style>
