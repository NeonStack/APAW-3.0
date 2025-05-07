<script>
	import { onMount, onDestroy, createEventDispatcher, tick } from 'svelte';
	import { browser } from '$app/environment';
	import {
		selectedLocation,
		getLocationName,
		getCurrentPosition,
		setLocationLoading,
		nearestFacilities,
		facilitiesLayerActive // Import the new store
	} from '$lib/stores/locationStore.js';
	import { waterStations } from '$lib/stores/waterStationStore.js';
	import { get } from 'svelte/store';
	import Icon from '@iconify/svelte';
	import MapSearchBar from './MapSearchBar.svelte';
	import { toast } from 'svelte-sonner';
	
	// Import extracted components
	import { loadGeoJSON, loadAndProcessGeoJson } from './map_components/GeoJsonUtils.js';
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
	import {
		setupLayerControl,
		handleLayerToggle
	} from './map_components/LayerHandlers.js';
	import {
		facilitiesConfig,
		floodHazardLayers,
		allLayerConfigs,
		baseMaps,
		NEARBY_RADIUS_METERS
	} from './map_components/MapConfig.js';

	const dispatch = createEventDispatcher();

	export let height = '100%';

	let mapContainer;
	let map;
	let geojsonLayer;
	let marker = null;
	let waterStationMarkers = [];
	let L;
	let waterStationSubscription;
	let layerControl;
	let isSelectingLocation = false;
	let strictNcrBounds = null;
	let paddedNcrBounds = null;

	let facilityLayers = {};
	let loadedGeojsonData = {};
	let activeLeafletLayers = {};

	// Remove local state variable and use the store instead
	// let isFacilitiesLayerActive = false;

	async function handleLocateUser() {
		try {
			dispatch('locationSelectionStart', { message: 'Getting your location...' });
			const position = await getCurrentPosition();
			const locationName = await getLocationName(position.lat, position.lng);
			marker = await setSelectedLocation(position.lat, position.lng, locationName || 'Current Location', map, L, marker, dispatch);
		} catch (error) {
			console.error('Error getting current position:', error);
			alert(`Could not get your location: ${error.message}`);
			setLocationLoading(false);
			dispatch('locationSelectionComplete', { error: error.message });
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

		console.log('Updating nearby facilities with center:', centerLat, centerLng);

		// Check if facilities layer is active
		if (isFacilitiesLayerActive) {
			const layerGroup = facilityLayers[facilitiesConfig.id];
			
			// Make sure layer is on the map if active
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
					
					// Update the nearest facilities list as well
					updateNearestFacilitiesList(map, nearestFacilities, loadedGeojsonData);
				} else if (layerGroup) {
					// Try to load the data if not available
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
				// Clear facilities if layer is not active
				if (facilityLayers[facilitiesConfig.id]) {
					facilityLayers[facilitiesConfig.id].clearLayers();
				}
				nearestFacilities.set([]);
			}
		}

	function handleSearchLocation(event) {
		const { lat, lng, name } = event.detail;
		setSelectedLocation(lat, lng, name, map, L, marker, dispatch)
			.then(newMarker => {
				if (newMarker) marker = newMarker;
			});
	}

	function createRecenterControl() {
		// Create a custom control for re-centering on marker
		const RecenterControl = L.Control.extend({
			options: {
				position: 'bottomleft'
			},
			
			onAdd: function() {
				const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-recenter');
				container.innerHTML = `
					<a href="#" title="Re-center map on selected location" class="recenter-button">
						<i class="iconify" data-icon="carbon:map-center"></i>
					</a>
				`;
				
				L.DomEvent.on(container, 'click', function(e) {
					L.DomEvent.preventDefault(e);
					if (marker && map) {
						map.panTo(marker.getLatLng());
					}
				});
				
				return container;
			}
		});
		
		return new RecenterControl();
	}

	onMount(async () => {
		if (!browser) return;

		L = await import('leaflet');
		let isInitialLayerSetup = true;

		const geojsonData = await loadGeoJSON();
		if (geojsonData) {
			const tempLayer = L.geoJSON(geojsonData);
			strictNcrBounds = tempLayer.getBounds();
			paddedNcrBounds = strictNcrBounds.pad(0.2);
		} else {
			strictNcrBounds = L.latLngBounds(
				L.latLng(14.35, 120.9),
				L.latLng(14.75, 121.15)
			);
			paddedNcrBounds = strictNcrBounds.pad(0.2);
			console.warn('Failed to load GeoJSON, using fallback bounds for NCR.');
		}

		map = L.map(mapContainer, {
			zoomControl: false,
			center: paddedNcrBounds.getCenter(),
			maxBounds: paddedNcrBounds,
			zoom: 11,
			minZoom: 10,
			maxBoundsViscosity: 0.9
		});

		// Set up base layers
		const standard = L.tileLayer(baseMaps.standard, {
			attribution: '© OpenStreetMap contributors',
			maxZoom: 19
		});
		const topographic = L.tileLayer(baseMaps.topographic, {
			attribution: 'Map data © OpenTopoMap contributors',
			maxZoom: 19
		});
		const satellite = L.tileLayer(baseMaps.satellite, {
			attribution: 'Imagery © Esri',
			maxZoom: 19
		});
		const osmHot = L.tileLayer(baseMaps.osmHot, {
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">Humanitarian OpenStreetMap Team</a> hosted by <a href="https://openstreetmap.fr/" target="_blank">OpenStreetMap France</a>',
			maxZoom: 19
		});
		const positron = L.tileLayer(baseMaps.positron, {
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO',
			subdomains: 'abcd',
			maxZoom: 20
		});
		const darkMatter = L.tileLayer(baseMaps.darkMatter, {
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO',
			subdomains: 'abcd',
			maxZoom: 20
		});
		const esriStreet = L.tileLayer(baseMaps.esriStreet, {
			attribution: 'Tiles &copy; Esri',
			maxZoom: 19
		});

		standard.addTo(map);

		const baseLayers = {
			Standard: standard,
			Topographic: topographic,
			Satellite: satellite,
			Humanitarian: osmHot,
			'Positron (Light)': positron,
			'Dark Matter': darkMatter,
			'Esri Street': esriStreet
		};

		layerControl = setupLayerControl(L, map, baseLayers, facilityLayers, floodHazardLayers);

		L.control.zoom({ position: 'bottomleft' }).addTo(map);
		
		// Add the custom re-center control after the zoom control
		if (L) {
			createRecenterControl().addTo(map);
		}

		if (geojsonData) {
			geojsonLayer = L.geoJSON(geojsonData, {
				style: {
					color: 'blue',
					weight: 2,
					opacity: 0.6,
					fillOpacity: 0,
					interactive: false
				}
			}).addTo(map);
		} else {
			map.fitBounds(paddedNcrBounds);
		}

		map.on('click', async (e) => {
			const { lat, lng } = e.latlng;

			if (strictNcrBounds && strictNcrBounds.contains(e.latlng)) {
				marker = await setSelectedLocation(lat, lng, null, map, L, marker, dispatch);
			} else {
				toast.error('Please select a location near the National Capital Region (NCR).');
			}
		});

		map.on('overlayadd', function (e) {
			const addedLayerName = e.name;
			const layerConfig = allLayerConfigs.find(
				(lc) => addedLayerName && addedLayerName.includes(lc.name)
				);
				
				// Track when facilities layer is checked
				if (layerConfig && layerConfig.id === facilitiesConfig.id) {
					console.log('Facilities layer activated');
					facilitiesLayerActive.set(true); // Update the store instead of local variable
					
					// Force update the display immediately if a location is selected
					if ($selectedLocation && $selectedLocation.lat !== null) {
						setTimeout(() => updateDisplayedFacilities(), 100);
					}
				}
				
				handleLayerToggle(
					layerConfig, 
					true, 
					!isInitialLayerSetup, 
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
					
					// Track when facilities layer is unchecked
					if (layerConfig && layerConfig.id === facilitiesConfig.id) {
						facilitiesLayerActive.set(false); // Update the store instead of local variable
						// Clear facilities in sidebar when layer is turned off
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
				
				// Add and initialize facilities layer but don't check it by default
				facilityLayers[facilitiesConfig.id] = L.layerGroup();
				
				// Only pre-load the data but don't add the layer to the map by default
				loadAndProcessGeoJson(facilitiesConfig, loadedGeojsonData, true)
				.catch(err => console.warn(`Failed to pre-load ${facilitiesConfig.name}:`, err));
				
				// Don't automatically add the facilities layer to the map
				// map.addLayer(facilityLayers[facilitiesConfig.id]);  <- Remove this line
				
				isInitialLayerSetup = false;

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

				if (waterStationMarkers.length > 0) {
					const group = L.featureGroup(waterStationMarkers);
				} else if (map && !marker) {
					map.fitBounds(paddedNcrBounds);
				}
			}
		});

		const currentStations = get(waterStations);
		if (!currentStations.loading && currentStations.data && currentStations.data.length > 0) {
			waterStations.set(currentStations);
		}

		return () => {
			if (map) {
				map.off('click');
				map.off('overlayadd');
				map.off('overlayremove');
			}
			if (waterStationSubscription) {
				waterStationSubscription();
			}
			waterStationMarkers.forEach((m) => {
				try {
					if (map) map.removeLayer(m);
				} catch (e) {}
			});
			if (marker) {
				try {
					if (map) map.removeLayer(marker);
				} catch (e) {}
			}
			Object.values(facilityLayers).forEach((layer) => {
				try {
					if (map) map.removeLayer(layer);
				} catch (e) {}
			});
			if (map) {
				map.remove();
				map = null;
			}
		};
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
		width: 30px;
		height: 30px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #333;
		font-size: 16px;
		cursor: pointer;
	}

	:global(.leaflet-control-recenter a:hover) {
		background-color: #f4f4f4;
	}

	:global(.leaflet-control-recenter) {
		margin-left: 10px !important;
	}
</style>
