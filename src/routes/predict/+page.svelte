<script>
	import { browser } from '$app/environment';
	import { invalidateAll } from '$app/navigation';
	import Map from '$lib/components/Map.svelte';
	import {
		automatedFloodAlerts,
		fetchAutomatedFloodAlerts
	} from '$lib/stores/automatedFloodAlertStore.js';
	import {
		fetchGeneralFloodAdvisory,
		generalFloodAdvisoryStore
	} from '$lib/stores/generalFloodAdvisoryStore.js';
	import {
		fetchTropicalCycloneTracker,
		tropicalCycloneTrackerStore
	} from '$lib/stores/tropicalCycloneTrackerStore.js';
	import { fetchWaterStations, waterStations } from '$lib/stores/waterStationStore.js';
	import { fetchWeatherData, weatherData } from '$lib/stores/weatherStore.js';
	import PredictSidebar from '$lib/components/PredictSidebar.svelte';
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';

	const LIVE_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

	let { data } = $props();

	let navbarHeight = $state(0);
	let isSidebarOpen = $state(true);
	let lastBootstrapAt = $state(null);

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
			data: Array.isArray(initialData?.tropicalCyclone?.data) ? initialData.tropicalCyclone.data : [],
			error: initialData?.tropicalCyclone?.error || null
		});

		generalFloodAdvisoryStore.set({
			loading: false,
			data: initialData?.generalFloodAdvisory?.data ?? null,
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
				)
			}
		}));

		lastBootstrapAt = bootstrapAt || new Date().toISOString();
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

	onMount(async () => {
		const navbar = document.querySelector('header');

		if (navbar) {
			navbarHeight = navbar.offsetHeight;
			document.documentElement.style.setProperty('--header-height', `${navbarHeight}px`);
		}

		// Close sidebar by default on mobile
		if (window.innerWidth < 768) {
			isSidebarOpen = false;
		}

		const hydratedFromServer = data?.bootstrapOk
			? applyServerBootstrap(data?.initialData, data?.bootstrapAt)
			: false;

		if (!hydratedFromServer) {
			await Promise.all([
				fetchWeatherData(),
				fetchWaterStations(),
				fetchTropicalCycloneTracker(),
				fetchGeneralFloodAdvisory(),
				fetchAutomatedFloodAlerts({ forecastIndices: [0, 1, 2, 3, 4], minProbability: 0.5 })
			]);
		}

		const liveRefreshInterval = setInterval(() => {
			invalidateAll().catch((error) => {
				console.warn('Predict live refresh failed:', error?.message || 'unknown_error');
			});
		}, LIVE_REFRESH_INTERVAL_MS);

		window.addEventListener('resize', handleResize);
		return () => {
			window.removeEventListener('resize', handleResize);
			clearInterval(liveRefreshInterval);
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
