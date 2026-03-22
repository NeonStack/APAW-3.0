<script>
	import { onMount, onDestroy, createEventDispatcher, tick } from 'svelte';
	import { browser } from '$app/environment';
	import {
		selectedLocation,
		getCurrentPosition,
		setLocationLoading,
		nearestFacilities,
		facilitiesLayerActive,
		updateSelectedLocation // NEW: Import the store action
	} from '$lib/stores/locationStore.js';
	import {
		waterStations,
		focusedWaterStation,
		fetchWaterStations
	} from '$lib/stores/waterStationStore.js';
	import { tropicalCycloneTrackerStore } from '$lib/stores/tropicalCycloneTrackerStore.js';
	import {
		automatedFloodAlerts,
		focusedAutomatedAlert
	} from '$lib/stores/automatedFloodAlertStore.js';
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
	import {
		createWaterIcon,
		getStationAlertInfo,
		createWaterStationPopup
	} from './map_components/WaterStationLayer.js';
	import {
		updateNearestFacilitiesList,
		displayNearbyFacilities,
		handleLayerToggle
	} from './map_components/LayerManager.js';
	import { NEARBY_RADIUS_METERS } from './map_components/MapConfig.js';
	import { setupGroupedLayerControl } from './map_components/GroupedLayerControl.js';
	import { loadAndProcessGeoJson } from './map_components/GeoJsonUtils.js';
	import {
		drawCycloneTrack,
		updateCyclonePosition
	} from './map_components/TropicalCycloneLayer.js';

	// --- MODIFIED IMPORTS ---
	// Centralized layer definitions from the new registry
	import {
		baseLayers,
		overlayLayers,
		weatherLayers,
		allOverlayLayers
	} from './map_components/LayerRegistry.js';

	const dispatch = createEventDispatcher();
	const OPENWEATHER_MAP_API_KEY = import.meta.env.VITE_OPENWEATHER_MAP_API_KEY || '';

	export let height = '100%';

	let mapContainer;
	let searchOverlay;
	let map;
	let marker = null;
	let waterStationMarkers = [];
	let automatedAlertMarkers = [];
	let L;
	let waterStationSubscription;
	let focusedWaterStationSubscription;
	let layerControl;
	let isSelectingLocation = false;
	let strictNcrBounds = null;
	let paddedNcrBounds = null;

	let tropicalCycloneLayerGroup;
	let automatedAlertLayerGroup = null;
	let cycloneUpdateInterval = null;
	let tropicalCycloneData = null;

	let facilityLayers = {};
	let loadedGeojsonData = {};
	let activeLeafletLayers = {};
	let instantiatedLayers = {};
	let layerUpdateIntervals = {};
	let isLayerPanelExpanded = false;
	let layerControlContainer = null;
	let layerControlObserver = null;
	let layoutObserver = null;
	let resizeHandler = null;

	function updateLayerControlOffset() {
		if (!browser || !mapContainer || !layerControlContainer) return;

		const mapRect = mapContainer.getBoundingClientRect();
		const searchRect = searchOverlay?.getBoundingClientRect();
		const controlRect = layerControlContainer.getBoundingClientRect();
		const defaultTop = 0;
		let topOffset = defaultTop;

		if (searchRect && controlRect) {
			const isNarrowViewport = window.innerWidth <= 400;
			const hasHorizontalOverlap = searchRect.right + 8 > controlRect.left;

			if (isNarrowViewport || hasHorizontalOverlap) {
				topOffset = Math.max(defaultTop, Math.round(searchRect.bottom - mapRect.top + 8));
			}
		}

		mapContainer.style.setProperty('--leaflet-right-top', `${topOffset}px`);
	}

	function syncLayerPanelState() {
		if (!layerControlContainer) {
			isLayerPanelExpanded = false;
			return;
		}
		isLayerPanelExpanded = layerControlContainer.classList.contains(
			'leaflet-control-layers-expanded'
		);
		updateLayerControlOffset();
	}

	function handleInteractionBlockerClick(event) {
		event.preventDefault();
		event.stopPropagation();

		if (layerControlContainer) {
			layerControlContainer.classList.remove('leaflet-control-layers-expanded');
			syncLayerPanelState();
		}
	}

	// --- NEW: Centralized function for handling location selection and marker updates ---
	async function handleLocationSelection(lat, lng, name = null) {
		if (isSelectingLocation) {
			console.log('Location selection already in progress, ignoring request');
			return;
		}
		isSelectingLocation = true;
		dispatch('locationSelectionStart', { lat, lng });

		// Clear previous marker
		if (marker) {
			removeMarker(marker);
			marker = null;
			map._selectedMarker = null;
		}

		// Show temporary loading marker
		const loadingIcon = L.divIcon({
			html: `<div class="loading-marker-wrapper"><div class="loading-marker-inner"></div></div>`,
			className: 'loading-marker-icon',
			iconSize: [40, 40],
			iconAnchor: [20, 20]
		});
		const tempMarker = createMarker(lat, lng, { icon: loadingIcon });
		panTo(lat, lng);

		// Update store and get final location data
		const result = await updateSelectedLocation({ lat, lng, name });

		// Remove temporary marker
		if (tempMarker) {
			removeMarker(tempMarker);
		}

		// Handle result
		if (result.error) {
			toast.error(result.error);
			dispatch('locationSelectionComplete', { error: result.error });
		} else {
			// Create final marker
			marker = createMarker(result.lat, result.lng);
			map._selectedMarker = marker;
			panTo(result.lat, result.lng);
			dispatch('locationSelectionComplete', result);
		}

		isSelectingLocation = false;
	}

	async function handleLocateUser() {
		try {
			const position = await getCurrentPosition();
			// Use the new centralized function
			await handleLocationSelection(position.lat, position.lng);
		} catch (error) {
			console.error('Error getting current position:', error);
			toast.error(`Could not get your location: ${error.message}`);
			setLocationLoading(false);
			dispatch('locationSelectionComplete', { error: error.message });
		}
	}

	function updateDisplayedFacilities() {
		const location = get(selectedLocation);
		const isFacilitiesLayerActive = get(facilitiesLayerActive);
		const facilitiesConfig = overlayLayers.find((l) => l.id === 'facilities');

		if (!facilitiesConfig || !map || !location || location.lat === null || location.lng === null) {
			if (facilitiesConfig && facilityLayers[facilitiesConfig.id]) {
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
		const { lat, lng, name } = event.detail;
		// Use the new centralized function
		handleLocationSelection(lat, lng, name);
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

	function formatForecastDateLabel(dateText) {
		if (!dateText) return 'Unknown date';
		const parsed = new Date(String(dateText) + 'T00:00:00');
		if (Number.isNaN(parsed.getTime())) return String(dateText);
		return new Intl.DateTimeFormat('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}).format(parsed);
	}

	function parseForecastPayload(rawPayload) {
		if (!rawPayload) return {};
		if (typeof rawPayload === 'string') {
			try {
				return JSON.parse(rawPayload);
			} catch {
				return {};
			}
		}
		if (typeof rawPayload === 'object') return rawPayload;
		return {};
	}

	function formatFloodAroundTimes(hourList) {
		if (!Array.isArray(hourList) || hourList.length === 0) return 'No flooded-hour timing data';

		const normalized = [...new Set(hourList.map((h) => Number(h)).filter((h) => Number.isFinite(h)))].sort(
			(a, b) => a - b
		);

		if (normalized.length === 0) return 'No flooded-hour timing data';

		const labels = normalized.map((h) => {
			const hour = ((Math.floor(h) % 24) + 24) % 24;
			const period = hour >= 12 ? 'pm' : 'am';
			const display = hour % 12 === 0 ? 12 : hour % 12;
			return `${display}${period}`;
		});

		return labels.join(', ');
	}

	function getAutomatedAlertSeverity(riskLevel, probability) {
		const normalized = String(riskLevel || '').toLowerCase();
		if (normalized.includes('very high')) return 'Very High';
		if (normalized.includes('high')) return 'High';
		if (normalized.includes('moderate')) return 'Moderate';
		if (normalized.includes('low')) return 'Low';

		const p = Number(probability);
		if (p >= 0.8) return 'Very High';
		if (p >= 0.65) return 'High';
		if (p >= 0.5) return 'Moderate';
		return 'Low';
	}

	function getAutomatedPopupRiskLabel(riskLevel, probability) {
		const raw = String(riskLevel || '').trim();
		if (raw) return raw;

		const severity = getAutomatedAlertSeverity(riskLevel, probability);
		return `${severity} Flood Risk`;
	}

	function getAutomatedAlertColor(riskLevel, probability) {
		const normalized = String(riskLevel || '').toLowerCase();
		if (normalized.includes('very high')) return '#dc2626';
		if (normalized.includes('high')) return '#ea580c';
		if (normalized.includes('moderate')) return '#ca8a04';
		if (normalized.includes('low')) return '#16a34a';

		const p = Number(probability);
		if (p >= 0.8) return '#dc2626';
		if (p >= 0.65) return '#ea580c';
		if (p >= 0.5) return '#ca8a04';
		return '#16a34a';
	}

	function refreshAutomatedAlertMarkers() {
		const layerGroup = automatedAlertLayerGroup;
		if (!map || !L || !layerGroup) return;
		layerGroup.clearLayers();
		automatedAlertMarkers = [];

		const alertState = $automatedFloodAlerts;
		if (!alertState || alertState.loading || !Array.isArray(alertState.data)) return;

		if (!alertState.showOnMap) return;

		const activeForecastIndex = Number(alertState.selectedForecastIndex ?? 0);
		const minProbability = Number(alertState?.meta?.min_probability ?? 0.5);

		alertState.data
			.filter((row) => Number(row.forecast_index) === activeForecastIndex)
			.filter((row) => Number(row.flood_probability) >= minProbability)
			.forEach((row) => {
				const lat = Number(row.latitude);
				const lon = Number(row.longitude);
				if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

				const payload = parseForecastPayload(row.forecast_payload);
				const color = getAutomatedAlertColor(row.risk_level, row.flood_probability);
				const severity = getAutomatedAlertSeverity(row.risk_level, row.flood_probability);
				const popupRiskLabel = getAutomatedPopupRiskLabel(row.risk_level, row.flood_probability);
				const shortSeverity = severity === 'Very High' ? 'V.High' : severity;
				const probabilityPct = (Number(row.flood_probability) * 100).toFixed(0);
				const floodHourIndices =
					Array.isArray(payload?.flood_hour_indices)
						? payload.flood_hour_indices
						: Array.isArray(payload?.flooded_hours_list)
							? payload.flooded_hours_list
							: [];
				const maxHeight =
					payload?.max_predicted_height_cm !== undefined &&
					payload?.max_predicted_height_cm !== null
						? Number(payload.max_predicted_height_cm)
						: null;
				const floodAroundLabel = formatFloodAroundTimes(floodHourIndices);
				const maxHeightLabel =
					maxHeight !== null && Number.isFinite(maxHeight)
						? `${maxHeight.toFixed(1)} cm`
						: 'No depth data';
				const icon = L.divIcon({
					html:
						'<div class="automated-alert-chip" style="border-color:' +
						color +
						';">' +
						'<span class="automated-alert-mini" style="background:' +
						color +
						';">' +
						probabilityPct +
						'%</span>' +
						'<span class="automated-alert-expanded">' +
						'<span class="automated-alert-severity">' +
						shortSeverity +
						'</span>' +
						'<span class="automated-alert-prob">' +
						probabilityPct +
						'%</span>' +
						'</span>' +
						'</div>',
					className: 'automated-alert-icon',
					iconSize: [120, 30],
					iconAnchor: [20, 15]
				});

				const marker = L.marker([lat, lon], {
					icon,
					alertCoordinateId: row.coordinate_id,
					forecastIndex: row.forecast_index
				});

				marker.bindPopup(
					'<div class="automated-alert-popup-card">' +
					'<div class="automated-alert-popup-head">' +
					'<p class="automated-alert-popup-title">' +
					row.location_name +
					'</p>' +
					'<span class="automated-alert-popup-badge" style="border-color:' +
					color +
					';color:' +
					color +
					';">' +
					popupRiskLabel +
					'</span>' +
					'</div>' +
					'<p class="automated-alert-popup-date"><span>Forecast</span><strong>' +
					formatForecastDateLabel(row.forecast_date) +
					'</strong></p>' +
					'<div class="automated-alert-popup-grid">' +
					'<div><span class="k">Flood chance</span><span class="v">' +
					probabilityPct +
					'%</span></div>' +
					'<div><span class="k">Peak depth</span><span class="v">' +
					maxHeightLabel +
					'</span></div>' +
					'</div>' +
					'<div class="automated-alert-popup-times">' +
					'<span class="k">Flood around</span><span class="v">' +
					floodAroundLabel +
					'</span>' +
					'</div>' +
					'</div>',
					{ className: 'automated-alert-popup' }
				);
				layerGroup.addLayer(marker);
				automatedAlertMarkers.push(marker);
			});
	}
	onMount(async () => {
		if (!browser) return;

		// Import Leaflet
		L = await import('leaflet');

		console.log('Cyclone Data on Mount:', get(tropicalCycloneTrackerStore).data);

		// Initialize map service with Leaflet
		initMapService(L);

		// Dynamically load leaflet-groupedlayercontrol CSS & JS
		const groupedLayerControlCSS = document.createElement('link');
		groupedLayerControlCSS.rel = 'stylesheet';
		groupedLayerControlCSS.href =
			'https://unpkg.com/leaflet-groupedlayercontrol/dist/leaflet.groupedlayercontrol.min.css';
		document.head.appendChild(groupedLayerControlCSS);

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
		tropicalCycloneLayerGroup = L.layerGroup();
		automatedAlertLayerGroup = L.layerGroup().addTo(map);

		// --- Layer Initialization from Registry ---
		const baseLayerPromises = baseLayers.map(async (layer) => {
			instantiatedLayers[layer.id] = await layer.createLayer(L);
		});

		overlayLayers.forEach((layer) => {
			if (layer.id === 'tropical_cyclone') {
				instantiatedLayers[layer.id] = tropicalCycloneLayerGroup;
			} else {
				const layerGroup = L.layerGroup();
				instantiatedLayers[layer.id] = layerGroup;
				facilityLayers[layer.id] = layerGroup; // For compatibility with LayerManager
			}
		});

		const weatherLayerPromises = weatherLayers.map(async (layer) => {
			instantiatedLayers[layer.id] = await layer.createLayer(L, OPENWEATHER_MAP_API_KEY);
		});

		await Promise.all([...baseLayerPromises, ...weatherLayerPromises]);

		// Add default base layer
		instantiatedLayers['standard'].addTo(map);

		// Add default "None" weather layer
		if (instantiatedLayers['none']) {
			instantiatedLayers['none'].addTo(map);
		}

		// Setup grouped layer control
		layerControl = setupGroupedLayerControl(L, map, instantiatedLayers);
		layerControlContainer =
			layerControl?.getContainer?.() ||
			document.querySelector('.leaflet-control-layers.leaflet-control');

		if (layerControlContainer) {
			syncLayerPanelState();
			layerControlObserver = new MutationObserver(() => {
				syncLayerPanelState();
			});
			layerControlObserver.observe(layerControlContainer, {
				attributes: true,
				attributeFilter: ['class']
			});
		}

		resizeHandler = () => updateLayerControlOffset();
		window.addEventListener('resize', resizeHandler);

		if (typeof ResizeObserver !== 'undefined') {
			layoutObserver = new ResizeObserver(() => {
				updateLayerControlOffset();
			});

			if (searchOverlay) layoutObserver.observe(searchOverlay);
			if (mapContainer) layoutObserver.observe(mapContainer);
			if (layerControlContainer) layoutObserver.observe(layerControlContainer);
		}

		await tick();
		updateLayerControlOffset();

		// Add zoom control
		L.control.zoom({ position: 'bottomleft' }).addTo(map);

		// Add recenter control
		createRecenterControl().addTo(map);

		// Handle map click for location selection
		map.on('click', async (e) => {
			const { lat, lng } = e.latlng;

			if (strictNcrBounds && strictNcrBounds.contains(e.latlng)) {
				// Use the new centralized function
				await handleLocationSelection(lat, lng);
			} else {
				toast.error('Please select a location near the National Capital Region (NCR).');
			}
		});

		// --- Refactored Event Handlers ---
		map.on('overlayadd', function (e) {
			const addedLayerName = e.name;
			const layerConfig = allOverlayLayers.find(
				(lc) => addedLayerName && addedLayerName.includes(lc.name)
			);

			if (!layerConfig) return;

			// Handle auto-updating layers
			if (layerConfig.updateInterval && typeof layerConfig.updateLayer === 'function') {
				// Clear any existing interval for this layer to prevent duplicates
				if (layerUpdateIntervals[layerConfig.id]) {
					clearInterval(layerUpdateIntervals[layerConfig.id]);
				}

				const intervalId = setInterval(() => {
					const layerInstance = instantiatedLayers[layerConfig.id];
					if (layerInstance && map.hasLayer(layerInstance)) {
						console.log(`Auto-updating ${layerConfig.name} layer...`);
						layerConfig.updateLayer(layerInstance);
						toast.info(`${layerConfig.name} layer has been updated.`);
					}
				}, layerConfig.updateInterval);
				layerUpdateIntervals[layerConfig.id] = intervalId;
			}

			/// Handle Tropical Cyclone layer
			if (layerConfig.id === 'tropical_cyclone') {
				const cycloneArray = get(tropicalCycloneTrackerStore).data;
				console.log('Activating Tropical Cyclone Tracker. Data available:', cycloneArray);

				// Data is already in the correct format - just check if it exists and has forecast_track
				const activeStorms =
					cycloneArray?.filter(
						(storm) => storm?.forecast_track && storm.forecast_track.length > 0
					) || [];

				if (activeStorms.length > 0) {
					// Draw all active storms
					activeStorms.forEach((stormData) => {
						drawCycloneTrack(L, tropicalCycloneLayerGroup, stormData);
					});

					if (cycloneUpdateInterval) clearInterval(cycloneUpdateInterval);
					cycloneUpdateInterval = setInterval(() => {
						const latestCycloneArray = get(tropicalCycloneTrackerStore).data;
						const latestActiveStorms =
							latestCycloneArray?.filter(
								(storm) => storm?.forecast_track && storm.forecast_track.length > 0
							) || [];

						if (latestActiveStorms.length > 0) {
							latestActiveStorms.forEach((stormData) => {
								updateCyclonePosition(L, tropicalCycloneLayerGroup, stormData);
							});
						}
					}, 300000);

					toast.success(`${activeStorms.length} active tropical cyclone(s) tracked`);
				} else {
					toast.info('No active tropical cyclone data available.');
				}
			}

			// Handle weather layer toast
			if (layerConfig.group === 'Weather' && layerConfig.id !== 'none') {
				const cleanName = addedLayerName.replace(/<[^>]*>/g, '').trim();
				toast.success(`${cleanName} layer activated`);
			}

			// Handle facility layer state
			const facilitiesConfig = overlayLayers.find((l) => l.id === 'facilities');
			if (facilitiesConfig && layerConfig.id === facilitiesConfig.id) {
				facilitiesLayerActive.set(true);
				if ($selectedLocation && $selectedLocation.lat !== null) {
					setTimeout(() => updateDisplayedFacilities(), 100);
				}
			}

			// Handle data loading for facility/hazard layers
			if (layerConfig.type === 'facility' || layerConfig.type === 'hazard') {
				handleLayerToggle(
					layerConfig,
					true,
					true, // Show toast
					map,
					L,
					facilityLayers,
					loadedGeojsonData,
					activeLeafletLayers,
					layerControl
				);
			}
		});

		map.on('overlayremove', function (e) {
			const removedLayerName = e.name;
			const layerConfig = allOverlayLayers.find(
				(lc) => removedLayerName && removedLayerName.includes(lc.name)
			);

			if (!layerConfig) return;

			// Clear auto-update interval
			if (layerUpdateIntervals[layerConfig.id]) {
				clearInterval(layerUpdateIntervals[layerConfig.id]);
				delete layerUpdateIntervals[layerConfig.id];
				console.log(`Stopped auto-updating for ${layerConfig.name} layer.`);
			}

			// Handle Tropical Cyclone layer
			if (layerConfig.id === 'tropical_cyclone') {
				if (cycloneUpdateInterval) {
					clearInterval(cycloneUpdateInterval);
					cycloneUpdateInterval = null;
				}
				tropicalCycloneLayerGroup.clearLayers();
			}

			const facilitiesConfig = overlayLayers.find((l) => l.id === 'facilities');
			if (facilitiesConfig && layerConfig.id === facilitiesConfig.id) {
				facilitiesLayerActive.set(false);
				nearestFacilities.set([]);
			}

			// Handle layer removal logic
			if (layerConfig.type === 'facility' || layerConfig.type === 'hazard') {
				handleLayerToggle(
					layerConfig,
					false,
					false, // No toast when removing
					map,
					L,
					facilityLayers,
					loadedGeojsonData,
					activeLeafletLayers,
					layerControl
				);
			}
		});

		// Preload facility data
		const facilitiesConfig = overlayLayers.find((l) => l.id === 'facilities');
		if (facilitiesConfig) {
			loadAndProcessGeoJson(facilitiesConfig, loadedGeojsonData, true).catch((err) =>
				console.warn(`Failed to pre-load ${facilitiesConfig.name}:`, err)
			);
		}

		// Subscribe to tropical cyclone data
		tropicalCycloneTrackerStore.subscribe((store) => {
			const activeStorms =
				store.data?.filter((storm) => storm?.forecast_track && storm.forecast_track.length > 0) ||
				[];

			if (activeStorms.length > 0) {
				tropicalCycloneData = activeStorms; // Store array of active storms

				if (map && map.hasLayer(tropicalCycloneLayerGroup)) {
					tropicalCycloneLayerGroup.clearLayers();
					activeStorms.forEach((stormData) => {
						drawCycloneTrack(L, tropicalCycloneLayerGroup, stormData);
					});
				}
			} else {
				tropicalCycloneData = null;
			}
		});

		// Subscribe to water stations data
		waterStationSubscription = waterStations.subscribe((value) => {
			if (!map || !L) return;

			// Clear existing markers
			waterStationMarkers.forEach((m) => map.removeLayer(m));
			waterStationMarkers = [];

			if (!value.loading && value.data && value.data.length > 0) {
				value.data.forEach((station) => {
					if (station.lat && station.lon) {
						try {
							const lat = parseFloat(station.lat);
							const lon = parseFloat(station.lon);

							if (!isNaN(lat) && !isNaN(lon)) {
								const status = getStationAlertInfo(station);
								const icon = createWaterIcon(L, status);
								const popupContent = createWaterStationPopup(station);

								const stationMarker = L.marker([lat, lon], { icon: icon })
									.addTo(map)
									.bindPopup(popupContent);
								waterStationMarkers.push(stationMarker);
							}
						} catch (err) {
							console.error('Error processing station:', station.obscd, err);
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

	$: if (browser && map && L && $automatedFloodAlerts) {
		refreshAutomatedAlertMarkers();
	}

	$: if (browser && map && L && $focusedAutomatedAlert) {
		const target = $focusedAutomatedAlert;
		const marker = automatedAlertMarkers.find(
			(item) =>
				item?.options?.alertCoordinateId === target.coordinate_id &&
				Number(item?.options?.forecastIndex) === Number(target.forecast_index)
		);
		if (marker) {
			const markerLatLng = marker.getLatLng();
			panTo(markerLatLng.lat, markerLatLng.lng);
			marker.openPopup();
		}
		focusedAutomatedAlert.set(null);
	}

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
		if (cycloneUpdateInterval) {
			clearInterval(cycloneUpdateInterval);
		}
		// Clear all layer update intervals
		Object.values(layerUpdateIntervals).forEach(clearInterval);
		layerUpdateIntervals = {};
		if (automatedAlertLayerGroup) {
			automatedAlertLayerGroup.clearLayers();
			automatedAlertLayerGroup.remove();
			automatedAlertLayerGroup = null;
		}
		if (layerControlObserver) {
			layerControlObserver.disconnect();
			layerControlObserver = null;
		}
		if (layoutObserver) {
			layoutObserver.disconnect();
			layoutObserver = null;
		}
		if (resizeHandler) {
			window.removeEventListener('resize', resizeHandler);
			resizeHandler = null;
		}
		layerControlContainer = null;
		isLayerPanelExpanded = false;
		if (map) {
			try {
				map.off();
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
	<div bind:this={searchOverlay} class="search-overlay pointer-events-none">
		<div class="pointer-events-auto">
			<MapSearchBar on:selectLocation={handleSearchLocation} disabled={isSelectingLocation} />
		</div>
	</div>
	<div
		class="map-interaction-blocker"
		class:active={isLayerPanelExpanded}
		on:click={handleInteractionBlockerClick}
		on:touchstart={handleInteractionBlockerClick}
		on:pointerdown={handleInteractionBlockerClick}
		aria-hidden="true"
	></div>
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
		z-index: 1001;
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
		z-index: 1000 !important;
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

	:global(.automated-alert-icon) {
		background: transparent;
		border: none;
	}

	:global(.automated-alert-chip) {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 2px;
		border-radius: 999px;
		border: 2px solid #f59e0b;
		background: rgba(255, 255, 255, 0.92);
		box-shadow: 0 2px 7px rgba(0, 0, 0, 0.24);
		font-size: 10px;
		font-weight: 700;
		line-height: 1;
		color: #1f2937;
		width: 36px;
		overflow: hidden;
		transition: width 0.2s ease, box-shadow 0.2s ease;
	}

	:global(.automated-alert-icon:hover .automated-alert-chip) {
		width: 118px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.28);
	}

	:global(.automated-alert-mini) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 28px;
		height: 28px;
		border-radius: 999px;
		color: #fff;
		font-weight: 800;
		font-size: 10px;
		flex-shrink: 0;
	}

	:global(.automated-alert-expanded) {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		opacity: 0;
		transform: translateX(4px);
		transition: opacity 0.2s ease, transform 0.2s ease;
		padding-right: 8px;
		white-space: nowrap;
	}

	:global(.automated-alert-icon:hover .automated-alert-expanded) {
		opacity: 1;
		transform: translateX(0);
	}

	:global(.automated-alert-severity) {
		font-weight: 700;
		letter-spacing: 0.01em;
	}

	:global(.automated-alert-prob) {
		font-weight: 800;
	}

	:global(.automated-alert-popup .leaflet-popup-content-wrapper) {
		border-radius: 14px;
		padding: 0;
		overflow: hidden;
		box-shadow: 0 10px 28px rgba(15, 23, 42, 0.16);
	}

	:global(.automated-alert-popup .leaflet-popup-content) {
		margin: 0;
		min-width: 250px;
	}

	:global(.automated-alert-popup-card) {
		padding: 12px;
		background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
	}

	:global(.automated-alert-popup-head) {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 10px;
	}

	:global(.automated-alert-popup-title) {
		margin: 0;
		font-size: 13px;
		font-weight: 700;
		color: #0f172a;
		line-height: 1.25;
	}

	:global(.automated-alert-popup-badge) {
		border: 1px solid;
		border-radius: 999px;
		padding: 2px 8px;
		font-size: 10px;
		font-weight: 700;
		background: rgba(255, 255, 255, 0.94);
		white-space: nowrap;
	}

	:global(.automated-alert-popup-date) {
		margin: 8px 0 10px;
		font-size: 11px;
		color: #475569;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
		padding: 7px 8px;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		background: #ffffff;
	}

	:global(.automated-alert-popup-date span) {
		color: #64748b;
	}

	:global(.automated-alert-popup-date strong) {
		font-weight: 700;
		color: #0f172a;
	}

	:global(.automated-alert-popup-grid) {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}

	:global(.automated-alert-popup-grid > div) {
		display: flex;
		flex-direction: column;
		gap: 3px;
		padding: 8px;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		background: #fff;
	}

	:global(.automated-alert-popup-grid .k) {
		font-size: 10px;
		color: #64748b;
	}

	:global(.automated-alert-popup-grid .v) {
		font-size: 12px;
		font-weight: 700;
		color: #0f172a;
	}

	:global(.automated-alert-popup-times) {
		margin-top: 8px;
		padding: 9px;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		background: #fff;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	:global(.automated-alert-popup-times .k) {
		font-size: 10px;
		color: #64748b;
	}

	:global(.automated-alert-popup-times .v) {
		font-size: 11px;
		font-weight: 700;
		color: #0f172a;
		line-height: 1.35;
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

	:global(.cyclone-icon-inner) {
		animation: spin 2s linear infinite;
		display: inline-block;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(-360deg);
		}
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

	:global(.leaflet-popup-content .status) {
		margin-top: 5px;
		display: inline-block;
		padding: 2px 5px;
		border-radius: 3px;
		font-weight: 600;
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

	:global(.leaflet-top.leaflet-right) {
		top: var(--leaflet-right-top, 0px) !important;
		right: 10px !important;
	}

	:global(.leaflet-control-layers) {
		margin-right: 0 !important;
	}

	.map-interaction-blocker {
		position: absolute;
		inset: 0;
		z-index: 999;
		display: none;
		background: rgba(0, 0, 0, 0);
		pointer-events: none;
	}

	@media (max-width: 1024px) {
		.map-interaction-blocker.active {
			display: block;
			background: rgba(0, 0, 0, 0.4);
			pointer-events: auto;
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

	:global(.leaflet-control-layers-selector) {
		margin-right: 2px;
	}
</style>
