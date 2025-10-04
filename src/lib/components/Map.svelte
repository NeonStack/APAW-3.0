<script>
	import { onMount, onDestroy, createEventDispatcher, tick } from 'svelte';
	import { browser } from '$app/environment';
	import {
		selectedLocation,
		getLocationName,
		getCurrentPosition,
		setLocationLoading,
		nearestFacilities,
		facilitiesLayerActive
	} from '$lib/stores/locationStore.js';
	import { waterStations, focusedWaterStation } from '$lib/stores/waterStationStore.js';
	import { get } from 'svelte/store';
	import Icon from '@iconify/svelte';
	import MapSearchBar from './MapSearchBar.svelte';
	import { toast } from 'svelte-sonner';

	// Import map services
	import {
		initMapService,
		createMarker,
		removeMarker,
		panTo,
		createRecenterControl
	} from '$lib/services/MapService.js';

	// Import modular map components
	import { initializeMap } from './map_components/MapInitializer.js';
	import { setupBaseLayers } from './map_components/BaseLayers.js';
	import { setupWeatherLayers, addWeatherLayersToControl } from './map_components/WeatherLayers.js';
	import {
		createWaterIcon,
		getStationAlertInfo,
		createWaterStationPopup
	} from './map_components/WaterStationLayer.js';
	import {
		setSelectedLocation,
		updateNearestFacilitiesList,
		displayNearbyFacilities
	} from './map_components/MarkerHandlers.js';
	import { setupLayerControl, handleLayerToggle } from './map_components/LayerHandlers.js';
	import {
		facilitiesConfig,
		floodHazardLayers,
		allLayerConfigs,
		NEARBY_RADIUS_METERS
	} from './map_components/MapConfig.js';
	import {
		setupGroupedLayerControl,
		addWeatherLayersToGroupedControl
	} from './map_components/GroupedLayerControl.js';

	const dispatch = createEventDispatcher();
	const OPENWEATHER_MAP_API_KEY = import.meta.env.VITE_OPENWEATHER_MAP_API_KEY || '';

	export let height = '100%';

	let mapContainer;
	let map;
	let marker = null;
	let waterStationMarkers = [];
	let L;
	let waterStationSubscription;
	let focusedWaterStationSubscription;
	let layerControl;
	let isSelectingLocation = false;
	let strictNcrBounds = null;
	let paddedNcrBounds = null;

	let facilityLayers = {};
	let loadedGeojsonData = {};
	let activeLeafletLayers = {};

	async function handleLocateUser() {
		if (isSelectingLocation) {
			console.log('Location selection already in progress, ignoring locate request');
			return;
		}

		try {
			isSelectingLocation = true;
			dispatch('locationSelectionStart', { message: 'Getting your location...' });
			const position = await getCurrentPosition();
			const locationName = await getLocationName(position.lat, position.lng);
			marker = await setSelectedLocation(
				position.lat,
				position.lng,
				locationName || 'Current Location',
				map,
				L,
				marker,
				dispatch
			);
		} catch (error) {
			console.error('Error getting current position:', error);
			alert(`Could not get your location: ${error.message}`);
			setLocationLoading(false);
			dispatch('locationSelectionComplete', { error: error.message });
		} finally {
			isSelectingLocation = false;
		}
	}

	function updateDisplayedFacilities() {
		const location = get(selectedLocation);
		const isFacilitiesLayerActive = get(facilitiesLayerActive);

		if (!map || !location || location.lat === null || location.lng === null) {
			if (facilityLayers[facilitiesConfig.id]) {
				facilityLayers[facilitiesConfig.id].clearLayers();
			}
			nearestFacilities.set([]);
			return;
		}

		const centerLat = parseFloat(location.lat);
		const centerLng = parseFloat(location.lng);

		if (isFacilitiesLayerActive) {
			const layerGroup = facilityLayers[facilitiesConfig.id];

			if (layerGroup && !map.hasLayer(layerGroup)) {
				map.addLayer(layerGroup);
			}

			if (layerGroup && loadedGeojsonData[facilitiesConfig.id]) {
				displayNearbyFacilities(
					centerLat,
					centerLng,
					NEARBY_RADIUS_METERS,
					map,
					L,
					facilityLayers,
					loadedGeojsonData
				);

				updateNearestFacilitiesList(map, nearestFacilities, loadedGeojsonData);
			} else if (layerGroup) {
				handleLayerToggle(
					facilitiesConfig,
					true,
					false,
					map,
					L,
					facilityLayers,
					loadedGeojsonData,
					activeLeafletLayers,
					layerControl
				);
			}
		} else {
			if (facilityLayers[facilitiesConfig.id]) {
				facilityLayers[facilitiesConfig.id].clearLayers();
			}
			nearestFacilities.set([]);
		}
	}

	function handleSearchLocation(event) {
		if (isSelectingLocation) {
			console.log('Location selection already in progress, ignoring search');
			return;
		}

		const { lat, lng, name } = event.detail;
		isSelectingLocation = true;

		if (marker && map) {
			removeMarker(marker);
			marker = null;
		}

		const loadingIcon = L.divIcon({
			html: `<div class="loading-marker-wrapper">
				<div class="loading-marker-inner"></div>
			</div>`,
			className: 'loading-marker-icon',
			iconSize: [40, 40],
			iconAnchor: [20, 20]
		});

		const tempMarker = L.marker([lat, lng], { icon: loadingIcon }).addTo(map);
		panTo(lat, lng);

		setSelectedLocation(lat, lng, name, map, L, marker, dispatch, tempMarker)
			.then((newMarker) => {
				if (newMarker) marker = newMarker;
			})
			.finally(() => {
				isSelectingLocation = false;

				if (tempMarker && map.hasLayer(tempMarker)) {
					map.removeLayer(tempMarker);
				}
			});
	}

	function focusOnWaterStation(station) {
		if (!map || !waterStationMarkers.length || !station || !station.lat || !station.lon) return;

		const stationMarker = waterStationMarkers.find((marker) => {
			const markerLatLng = marker.getLatLng();
			const stationLat = parseFloat(station.lat);
			const stationLon = parseFloat(station.lon);

			return (
				Math.abs(markerLatLng.lat - stationLat) < 0.0001 &&
				Math.abs(markerLatLng.lng - stationLon) < 0.0001
			);
		});

		if (stationMarker) {
			panTo(stationMarker.getLatLng().lat, stationMarker.getLatLng().lng);
			stationMarker.openPopup();

			const icon = stationMarker.getElement();
			if (icon) {
				icon.classList.add('highlight-station');
				setTimeout(() => {
					icon.classList.remove('highlight-station');
				}, 2000);
			}
		}
	}

	onMount(async () => {
		if (!browser) return;

		// Import Leaflet
		L = await import('leaflet');

		// Initialize map service with Leaflet
		initMapService(L);

		// Dynamically load leaflet-groupedlayercontrol CSS
		const groupedLayerControlCSS = document.createElement('link');
		groupedLayerControlCSS.rel = 'stylesheet';
		groupedLayerControlCSS.href =
			'https://unpkg.com/leaflet-groupedlayercontrol/dist/leaflet.groupedlayercontrol.min.css';
		document.head.appendChild(groupedLayerControlCSS);

		// Dynamically load leaflet-groupedlayercontrol JS
		await new Promise((resolve) => {
			const groupedLayerControlScript = document.createElement('script');
			groupedLayerControlScript.src =
				'https://unpkg.com/leaflet-groupedlayercontrol/dist/leaflet.groupedlayercontrol.min.js';
			groupedLayerControlScript.onload = resolve;
			document.head.appendChild(groupedLayerControlScript);
		});

		// Initialize the map
		const mapConfig = await initializeMap(L, mapContainer);
		map = mapConfig.map;
		strictNcrBounds = mapConfig.strictNcrBounds;
		paddedNcrBounds = mapConfig.paddedNcrBounds;

		// Setup base layers
		const baseLayers = setupBaseLayers(L);
		baseLayers['Standard'].addTo(map);

		// Setup weather layers
		const weatherLayers = setupWeatherLayers(map, L, OPENWEATHER_MAP_API_KEY);

		// Setup grouped layer control instead of the regular control
		layerControl = setupGroupedLayerControl(L, map, baseLayers, facilityLayers, floodHazardLayers);

		// Add weather layers to the grouped control
		addWeatherLayersToGroupedControl(layerControl, weatherLayers);

		// Add zoom control
		L.control.zoom({ position: 'bottomleft' }).addTo(map);

		// Add recenter control
		createRecenterControl().addTo(map);

		// Handle map click for location selection
		map.on('click', async (e) => {
			if (isSelectingLocation) {
				console.log('Location selection already in progress, ignoring click');
				return;
			}

			const { lat, lng } = e.latlng;

			if (strictNcrBounds && strictNcrBounds.contains(e.latlng)) {
				isSelectingLocation = true;

				if (marker) {
					removeMarker(marker);
					marker = null;
				}

				const loadingIcon = L.divIcon({
					html: `<div class="loading-marker-wrapper">
						<div class="loading-marker-inner"></div>
					</div>`,
					className: 'loading-marker-icon',
					iconSize: [40, 40],
					iconAnchor: [20, 20]
				});

				const tempMarker = createMarker(lat, lng, { icon: loadingIcon });
				panTo(lat, lng);

				try {
					marker = await setSelectedLocation(lat, lng, null, map, L, marker, dispatch, tempMarker);
				} finally {
					isSelectingLocation = false;

					if (tempMarker && map.hasLayer(tempMarker)) {
						map.removeLayer(tempMarker);
					}
				}
			} else {
				toast.error('Please select a location near the National Capital Region (NCR).');
			}
		});

		// Handle layer toggle events
		map.on('overlayadd', function (e) {
			const addedLayerName = e.name;
			const layerConfig = allLayerConfigs.find(
				(lc) => addedLayerName && addedLayerName.includes(lc.name)
			);

			if (layerConfig && layerConfig.id === facilitiesConfig.id) {
				console.log('Facilities layer activated');
				facilitiesLayerActive.set(true);

				if ($selectedLocation && $selectedLocation.lat !== null) {
					setTimeout(() => updateDisplayedFacilities(), 100);
				}
			}

			handleLayerToggle(
				layerConfig,
				true,
				true,
				map,
				L,
				facilityLayers,
				loadedGeojsonData,
				activeLeafletLayers,
				layerControl
			);
		});

		map.on('overlayremove', function (e) {
			const removedLayerName = e.name;
			const layerConfig = allLayerConfigs.find(
				(lc) => removedLayerName && removedLayerName.includes(lc.name)
			);

			if (layerConfig && layerConfig.id === facilitiesConfig.id) {
				facilitiesLayerActive.set(false);
				nearestFacilities.set([]);
			}

			if (layerConfig) {
				handleLayerToggle(
					layerConfig,
					false,
					false,
					map,
					L,
					facilityLayers,
					loadedGeojsonData,
					activeLeafletLayers,
					layerControl
				);
			}
		});

		// Initialize facility layers
		facilityLayers[facilitiesConfig.id] = L.layerGroup();

		// Preload facility data
		loadAndProcessGeoJson(facilitiesConfig, loadedGeojsonData, true).catch((err) =>
			console.warn(`Failed to pre-load ${facilitiesConfig.name}:`, err)
		);

		// Subscribe to water stations data
		waterStationSubscription = waterStations.subscribe((value) => {
			if (!map || !L) return;

			waterStationMarkers.forEach((m) => map.removeLayer(m));
			waterStationMarkers = [];

			if (!value.loading && value.data && value.data.length > 0) {
				value.data.forEach((station) => {
					if (station.lat && station.lon) {
						try {
							const lat = typeof station.lat === 'string' ? parseFloat(station.lat) : station.lat;
							const lon = typeof station.lon === 'string' ? parseFloat(station.lon) : station.lon;

							if (!isNaN(lat) && !isNaN(lon)) {
								const { status } = getStationAlertInfo(station);
								const icon = createWaterIcon(L, status);
								const popupContent = createWaterStationPopup(station);

								const stationMarker = L.marker([lat, lon], { icon: icon })
									.addTo(map)
									.bindPopup(popupContent);
								waterStationMarkers.push(stationMarker);
							}
						} catch (err) {
							console.error('Error processing station:', err);
						}
					}
				});
			}
		});

		// Subscribe to focused water station
		focusedWaterStationSubscription = focusedWaterStation.subscribe((station) => {
			if (station) {
				focusOnWaterStation(station);
				setTimeout(() => focusedWaterStation.set(null), 100);
			}
		});
	});

	$: if (
		browser &&
		map &&
		L &&
		$selectedLocation &&
		$selectedLocation.lat !== null &&
		$selectedLocation.lng !== null
	) {
		tick().then(() => {
			updateDisplayedFacilities();
		});
	}

	onDestroy(() => {
		if (waterStationSubscription) {
			waterStationSubscription();
		}
		if (focusedWaterStationSubscription) {
			focusedWaterStationSubscription();
		}
		if (map) {
			try {
				map.off();
				waterStationMarkers.forEach((m) => {
					try {
						map.removeLayer(m);
					} catch (e) {}
				});
				if (marker) {
					try {
						map.removeLayer(marker);
					} catch (e) {}
				}
				Object.values(facilityLayers).forEach((layer) => {
					try {
						map.removeLayer(layer);
					} catch (e) {}
				});
				map.remove();
			} catch (e) {
				console.warn('Error during map cleanup:', e);
			}
			map = null;
		}
	});
</script>

<svelte:head>
	<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.3/dist/leaflet.css" />
	<script src="https://code.iconify.design/2/2.2.1/iconify.min.js"></script>
	<!-- We'll load the groupedlayercontrol dynamically in the onMount function -->
</svelte:head>

<div bind:this={mapContainer} style="height: {height}; width: 100%;" class="map-container z-10">
	<div class="search-overlay pointer-events-none">
		<div class="pointer-events-auto">
			<MapSearchBar on:selectLocation={handleSearchLocation} disabled={isSelectingLocation} />
		</div>
	</div>
</div>

<style>
	.map-container {
		min-height: 300px;
		position: relative;
	}

	.search-overlay {
		position: absolute;
		top: 10px;
		left: 10px;
		right: 10px;
		z-index: 1000;
		max-width: 420px;
	}

	@media (max-width: 640px) {
		.search-overlay {
			max-width: 100%;
			top: 10px;
			left: 8px;
			right: 70px;
			width: calc(100% - 80px);
		}
	}

	:global(.leaflet-control-container) {
		z-index: 40 !important;
	}

	:global(.leaflet-popup-content) {
		font-size: 0.8rem;
	}
	:global(.leaflet-popup-content b) {
		color: #0c3143;
	}

	:global(.water-station-marker) {
		background: transparent;
		border: none;
	}

	:global(.water-station-icon) {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		height: 100%;
		transform-origin: center bottom;
		animation: pulse 2s infinite;
	}

	@keyframes pulse {
		0% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.1);
		}
		100% {
			transform: scale(1);
		}
	}

	@keyframes fastPulse {
		0% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.15);
		}
		100% {
			transform: scale(1);
		}
	}

	:global(.water-station-icon[data-status='alert']) {
		animation: pulse 1.5s infinite;
	}

	:global(.water-station-icon[data-status='alarm']) {
		animation: fastPulse 1.2s infinite;
	}

	:global(.water-station-icon[data-status='critical']) {
		animation: fastPulse 0.8s infinite;
	}

	:global(.leaflet-popup-content .alert-threshold) {
		color: #ffcc00;
		font-weight: 500;
	}

	:global(.leaflet-popup-content .alarm-threshold) {
		color: #ff8800;
		font-weight: 500;
	}

	:global(.leaflet-popup-content .critical-threshold) {
		color: #ff0000;
		font-weight: 500;
	}

	:global(.leaflet-popup-content .status) {
		margin-top: 5px;
		display: inline-block;
		padding: 2px 5px;
		border-radius: 3px;
		font-weight: 600;
	}

	:global(.leaflet-popup-content .status-normal) {
		background-color: rgba(255, 255, 255, 0.3);
		color: #0c3143;
	}

	:global(.leaflet-popup-content .status-alert) {
		background-color: rgba(255, 204, 0, 0.2);
		color: #9b7d00;
	}

	:global(.leaflet-popup-content .status-alarm) {
		background-color: rgba(255, 136, 0, 0.2);
		color: #964f00;
	}

	:global(.leaflet-popup-content .status-critical) {
		background-color: rgba(255, 0, 0, 0.2);
		color: #a30000;
	}

	:global(.leaflet-search-control) {
		background: transparent !important;
		box-shadow: none !important;
		box-shadow: none !important;
		margin: 10px 10px 0 10px !important;
		padding: 0 !important;
		border: none !important;
	}

	@media (max-width: 640px) {
		:global(.leaflet-search-control) {
			width: calc(100% - 80px) !important;
			margin: 10px 10px 0 10px !important;
		}
	}

	:global(.leaflet-control-layers-title) {
		font-weight: bold;
		margin-top: 10px;
		color: #333;
	}

	:global(.leaflet-control-layers-list label span) {
		display: inline-flex !important;
		align-items: center !important;
		gap: 5px !important;
	}

	:global(.leaflet-control-layers-list > .leaflet-control-layers-title:first-child) {
		margin-top: 0;
	}

	:global(.facility-marker-icon) {
		background: rgba(255, 255, 255, 0.7);
		border-radius: 50%;
		border: 1px solid rgba(0, 0, 0, 0.3);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
		display: flex;
		justify-content: center;
		align-items: center;
	}

	:global(.facility-marker-wrapper) {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		height: 100%;
	}

	:global(.facility-marker-icon .iconify) {
		display: block;
	}

	:global(.leaflet-control-recenter a) {
		background-color: white;
		width: 30px !important;
		height: 30px !important;
		display: flex !important;
		align-items: center !important;
		justify-content: center !important;
		color: #333;
		font-size: 16px;
		cursor: pointer;
		position: relative;
		padding: 0;
		text-align: center;
		text-decoration: none;
	}

	:global(.leaflet-control-recenter a:hover) {
		background-color: #f4f4f4;
	}

	:global(.leaflet-control-recenter .icon-container) {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
	}

	:global(.leaflet-control-recenter .iconify) {
		margin: 0;
		padding: 0;
		display: inline-block;
		vertical-align: middle;
		width: 20px !important;
		height: 20px !important;
	}

	:global(.leaflet-control-recenter) {
		margin-left: 10px !important;
	}

	:global(.recenter-button) {
		background-color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}

	/* Add new styles for loading marker */
	:global(.loading-marker-icon) {
		background: transparent;
		border: none;
	}

	:global(.loading-marker-wrapper) {
		position: relative;
		width: 40px;
		height: 40px;
	}

	:global(.loading-marker-inner) {
		position: absolute;
		top: 50%;
		left: 50%;
		width: 12px;
		height: 12px;
		margin: -6px 0 0 -6px;
		background-color: #3ba6d0;
		border-radius: 50%;
		box-shadow: 0 0 0 rgba(12, 49, 67, 0.4);
		animation: loading-pulse ease 1s infinite;
	}

	@keyframes loading-pulse {
		0% {
			box-shadow: 0 0 0 0 hsla(197, 61%, 52%, 0.8);
		}
		70% {
			box-shadow: 0 0 0 20px hsla(197, 61%, 52%, 0);
		}
		100% {
			box-shadow: 0 0 0 0 hsla(197, 61%, 52%, 0);
		}
	}

	/* Style the attribution control to be smaller with hover expansion */
	:global(.leaflet-control-attribution) {
		line-height: 1.2 !important;
		padding: 2px 4px !important;
		max-width: 300px !important;
		white-space: nowrap !important;
		overflow: hidden !important;
		text-overflow: ellipsis !important;
		background-color: rgba(255, 255, 255, 0.7) !important;
		transition: all 0.3s ease !important;
	}

	:global(.leaflet-control-attribution:hover) {
		max-width: none !important;
		white-space: normal !important;
		background-color: rgba(255, 255, 255, 0.9) !important;
		z-index: 1000 !important;
	}

	/* Ensure attribution doesn't overlap with controls */
	:global(.leaflet-bottom.leaflet-right) {
		right: 0 !important;
		bottom: 0 !important;
	}

	:global(.leaflet-bottom.leaflet-left) {
		left: 0 !important;
		bottom: 0 !important;
		margin-bottom: 5px !important;
	}

	/* Adjust layer control position on mobile */
	@media (max-width: 640px) {
		:global(.leaflet-top.leaflet-right) {
			top: 10px !important;
			right: 10px !important;
		}

		:global(.leaflet-control-layers) {
			margin-right: 0 !important;
		}
	}

	/* Add animation for the highlighted water station */
	@keyframes highlight-pulse {
		0% {
			transform: scale(1);
			opacity: 1;
		}
		50% {
			transform: scale(1.3);
			opacity: 0.8;
		}
		100% {
			transform: scale(1);
			opacity: 1;
		}
	}

	:global(.highlight-station) {
		animation: highlight-pulse 0.8s ease-in-out 2;
		z-index: 1000 !important;
	}

	/* Grouped Layer Control Styles */
	:global(.leaflet-control-layers-group-label) {
		border-bottom: solid 1px black;
		margin-bottom: 2px;
	}
	
	:global(.leaflet-control-layers-group-name) {
		font-weight: bold;
		margin-top: 5px;
	}

	:global(.leaflet-control-layers-group) {
	}

	:global(.leaflet-control-layers-selector) {
		margin-right: 2px;
	}
</style>