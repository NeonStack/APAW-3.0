<script>
	import { onMount, onDestroy, createEventDispatcher, tick } from 'svelte';
	import { browser } from '$app/environment';
	import {
		selectedLocation,
		getLocationName,
		getCurrentPosition,
		setLocationLoading,
		calculateDistance,
		nearestFacilities
	} from '$lib/stores/locationStore.js';
	import { waterStations } from '$lib/stores/waterStationStore.js';
	import { get } from 'svelte/store';
	import Icon from '@iconify/svelte';
	import MapSearchBar from './MapSearchBar.svelte';
	import { toast } from 'svelte-sonner';

	const dispatch = createEventDispatcher();

	export let height = '100%';

	let mapContainer;
	let map;
	let geojsonLayer;
	let marker = null; // For clicked location
	let waterStationMarkers = []; // Array for water station markers
	let L;
	let waterStationSubscription; // To hold the store subscription
	let searchControl;
	let isSelectingLocation = false;
	let strictNcrBounds = null; // For click checking (no padding)
	let paddedNcrBounds = null;
	const NEARBY_RADIUS_METERS = 1500;

	let facilityLayers = {}; // Holds the L.layerGroup for each facility type
	let loadedGeojsonData = {}; // In-memory cache (fallback if localStorage fails/not used)
	const GEOJSON_CACHE_NAME = 'apaw-geojson-cache-v1';
	let layerControl;

	async function getFromCache(requestUrl) {
		if (!browser || !window.caches) return null;
		try {
			const cache = await caches.open(GEOJSON_CACHE_NAME);
			const response = await cache.match(requestUrl);
			if (response) {
				console.log(`Found ${requestUrl} in Cache API`);
				return response.json();
			}
		} catch (error) {
			console.warn(`Error accessing Cache API for ${requestUrl}:`, error);
		}
		return null;
	}

	async function addToCache(requestUrl, responseToCache) {
		if (!browser || !window.caches) return;
		try {
			const cache = await caches.open(GEOJSON_CACHE_NAME);
			await cache.put(requestUrl, responseToCache.clone()); // Clone response before caching
			console.log(`Successfully cached ${requestUrl} in Cache API.`);
		} catch (error) {
			console.warn(`Failed to cache ${requestUrl} in Cache API:`, error);
			if (error.name === 'QuotaExceededError') {
				toast.info('Browser cache storage is full. Older items might be removed.');
			}
		}
	}

	const facilityTypes = [
		{
			id: 'fire_station',
			name: 'Fire Station',
			icon: 'mdi:fire-station',
			color: '#FF6347',
			filePath: '/geojson/fire_station.geojson',
			type: 'facility'
		}, // Tomato Red
		{
			id: 'police_station',
			name: 'Police Station',
			icon: 'mdi:police-station',
			color: '#1E90FF',
			filePath: '/geojson/police_station.geojson',
			type: 'facility'
		}, // Dodger Blue
		{
			id: 'hospitals',
			name: 'Hospitals',
			icon: 'mdi:hospital-building',
			color: '#32CD32',
			filePath: '/geojson/hospitals.geojson',
			type: 'facility'
		}, // Lime Green
		{
			id: 'schools',
			name: 'Schools',
			icon: 'mdi:school',
			color: '#FFCC00',
			filePath: '/geojson/schools.geojson',
			type: 'facility'
		} // Gold
	];

	const floodHazardLayers = [
		{
			id: 'flood_hazard_5yr',
			name: '5-year Flood Hazard',
			filePath: '/geojson/MetroManila_Flood_5year_lite.json',
			type: 'hazard',
			estimatedSizeMB: 15, // Approximate size for the warning prompt
			style: function (feature) {
				const varValue = feature.properties.Var;
				let fillColor = 'rgba(128,128,128,0.5)';

				if (varValue === 1.0) {
					fillColor = 'rgba(255, 255, 0, 0.6)'; // Yellow, semi-transparent
				} else if (varValue === 2.0) {
					fillColor = 'rgba(255, 165, 0, 0.6)'; // Orange, semi-transparent
				} else if (varValue === 3.0) {
					fillColor = 'rgba(255, 0, 0, 0.6)'; // Red, semi-transparent
				}
				return {
					fillColor: fillColor,
					weight: 0, // Set weight to 0 to disable stroke
					fillOpacity: 0.6 // Keep fill opacity
				};
			}
		}
		// Add other hazard layers here if needed
	];

	const allLayerConfigs = [...facilityTypes, ...floodHazardLayers];
	let activeLeafletLayers = {};

	async function loadGeoJSON() {
		try {
			const response = await fetch('/provdists-region-1300000000.0.1.json');
			const data = await response.json();
			return data;
		} catch (error) {
			console.error('Error loading GeoJSON:', error);
			return null;
		}
	}

	// Function to fetch elevation data via local API endpoint
	async function fetchElevation(lat, lng) {
		try {
			const response = await fetch(`/api/elevation?lat=${lat}&lng=${lng}`); // Call local endpoint
			const data = await response.json(); // Always parse JSON first

			if (!response.ok) {
				// Use error message from server if available, otherwise provide a default
				throw new Error(data.error || `HTTP error! status: ${response.status}`);
			}

			if (data.elevation !== undefined) {
				return data.elevation;
			} else {
				// This case might occur if the server sends a 200 OK but no elevation (shouldn't happen with current server logic)
				throw new Error('Elevation data missing in server response.');
			}
		} catch (error) {
			console.error('Error fetching elevation via local API:', error);
			// Pass the error message along to be displayed
			return { error: error.message || 'Failed to fetch elevation' };
		}
	}

	// Function to set a location with all needed details
	async function setSelectedLocation(lat, lng, locationName = null) {
		isSelectingLocation = true;
		setLocationLoading(true, 'Fetching location data...');
		dispatch('locationSelectionStart', { lat, lng });

		// Format coordinates early
		const currentLat = parseFloat(lat).toFixed(6);
		const currentLng = parseFloat(lng).toFixed(6);

		// Fetch elevation first to validate coordinates against API bounds
		const elevationResult = await fetchElevation(currentLat, currentLng);

		// --- START: ADD EARLY EXIT FOR OUT-OF-BOUNDS ---
		if (
			elevationResult &&
			typeof elevationResult === 'object' &&
			elevationResult.error // Check if an error property exists
		) {
			// This block now executes for ANY error from fetchElevation
			const errorMessage = elevationResult.error;
			toast.error(`${errorMessage}`); // Show the specific error
			setLocationLoading(false);
			isSelectingLocation = false;
			dispatch('locationSelectionComplete', { error: errorMessage });

			// Remove marker if it was somehow placed before error (less likely now)
			if (marker && map) {
				map.removeLayer(marker);
				marker = null;
			}
			// Reset the store completely on any elevation error
			selectedLocation.set({
				lat: null,
				lng: null,
				elevation: null,
				error: null,
				locationName: null,
				loading: false
			});
			return; // Stop processing
		}

		// Remove previous marker if it exists
		if (marker && map) {
			map.removeLayer(marker);
			marker = null; // Ensure marker is nullified before potentially adding a new one
		}

		// Add new marker only if coordinates were deemed valid by the check above
		if (map && L) {
			marker = L.marker([currentLat, currentLng]).addTo(map);
			map.panTo([currentLat, currentLng]);
		}

		// Get location name if not provided
		if (!locationName) {
			locationName = await getLocationName(currentLat, currentLng);
		}

		// Update the store based on the elevation result (which we already have)
		if (typeof elevationResult === 'number') {
			selectedLocation.set({
				lat: currentLat,
				lng: currentLng,
				elevation: elevationResult.toFixed(2),
				error: null,
				locationName,
				loading: false
			});
		} else {
			// Handle other potential errors from fetchElevation (e.g., API down, different 4xx/5xx)
			const errorMessage =
				(elevationResult && elevationResult.error) || 'Failed to get elevation data.';
			selectedLocation.set({
				lat: currentLat,
				lng: currentLng,
				elevation: 'N/A',
				error: errorMessage,
				locationName,
				loading: false
			});
			toast.error(`Elevation Error: ${errorMessage}`); // Show toast for other errors too
		}

		// Reset loading flag
		isSelectingLocation = false;
		setLocationLoading(false);

		// Dispatch event that location selection is complete
		dispatch('locationSelectionComplete', {
			lat: currentLat,
			lng: currentLng,
			elevation: typeof elevationResult === 'number' ? elevationResult.toFixed(2) : 'N/A',
			locationName
		});
	}

	async function handleLocateUser() {
		try {
			dispatch('locationSelectionStart', { message: 'Getting your location...' });
			const position = await getCurrentPosition();
			const locationName = await getLocationName(position.lat, position.lng);
			setSelectedLocation(position.lat, position.lng, locationName || 'Current Location');
		} catch (error) {
			console.error('Error getting current position:', error);
			alert(`Could not get your location: ${error.message}`);
			setLocationLoading(false);
			dispatch('locationSelectionComplete', { error: error.message });
		}
	}

	function createFacilityIcon(options) {
		// Use Iconify HTML within the divIcon
		const iconHtml = `<div class="facility-marker-wrapper">
                        <i class="iconify" data-icon="${options.icon}" style="color: ${options.color}; font-size: 18px;"></i>
                      </div>`;
		return L.divIcon({
			html: iconHtml,
			className: 'facility-marker-icon', // Keep this class for potential global styling
			iconSize: [24, 24], // Adjust size as needed
			iconAnchor: [12, 12] // Center anchor
		});
	}

	async function loadAndProcessGeoJson(layerConfig, isInitialLoad = false) {
		const { id, name, filePath, type, estimatedSizeMB = 0 } = layerConfig;

		// 1. Check in-memory cache
		if (loadedGeojsonData[id]) {
			console.log(`Using in-memory cache for ${name}`);
			return loadedGeojsonData[id];
		}

		// 2. Check Cache API
		if (browser && window.caches) {
			const cachedData = await getFromCache(filePath);
			if (cachedData) {
				loadedGeojsonData[id] = cachedData;
				return cachedData;
			}
		}

		// 3. Confirmation for large hazard layers on user-triggered fetch
		if (type === 'hazard' && estimatedSizeMB > 0 && !isInitialLoad) {
			const userConfirmed = confirm(
				`The "${name}" layer is approximately ${estimatedSizeMB}MB. ` +
					`It will be downloaded and cached in your browser for faster access next time. ` +
					`Do you want to proceed?`
			);
			if (!userConfirmed) {
				throw new Error(`User cancelled download for ${name}.`);
			}
		}

		// 4. Fetch from network
		console.log(`Fetching ${name} data from network: ${filePath}`);
		const response = await fetch(filePath);
		if (!response.ok) {
			throw new Error(`HTTP error fetching ${name}! Status: ${response.status}`);
		}

		const responseForCache = response.clone(); // Clone for caching before body is consumed
		const geoJsonData = await response.json();

		// 5. Cache in Cache API (and then in memory)
		if (browser && window.caches) {
			await addToCache(filePath, responseForCache);
		}
		loadedGeojsonData[id] = geoJsonData;
		return geoJsonData;
	}

	function displayNearbyFacilities(typeInfo, centerLat, centerLng, radius) {
		const { id, name, icon, color } = typeInfo;
		const fullGeojsonData = loadedGeojsonData[id]; // Get full data from memory

		if (!map || !facilityLayers[id] || !fullGeojsonData || !fullGeojsonData.features) {
			console.warn(`Cannot display nearby ${name}: Map, layer group, or data missing.`);
			return;
		}

		// Ensure the layer group is on the map (it should be if triggered correctly)
		if (!map.hasLayer(facilityLayers[id])) {
			// This might happen in race conditions, add the layer group if needed
			// map.addLayer(facilityLayers[id]); // Or decide if this indicates an error
			console.warn(`Layer group for ${name} not on map during displayNearbyFacilities call.`);
			// return; // Optionally return if layer isn't supposed to be active
		}

		facilityLayers[id].clearLayers(); // Clear previous markers for this type

		let count = 0;
		fullGeojsonData.features.forEach((feature) => {
			if (feature.geometry && feature.geometry.type === 'Point') {
				const coords = feature.geometry.coordinates;
				const featureLng = coords[0];
				const featureLat = coords[1];

				const distance = calculateDistance(centerLat, centerLng, featureLat, featureLng);

				if (distance <= radius) {
					count++;
					const marker = L.marker([featureLat, featureLng], {
						icon: createFacilityIcon({ icon, color })
					});

					// --- Popup Logic (copied from previous addGeoJsonToMap) ---
					let popupContent = `<b>${name}</b><br>`;
					const props = feature.properties;
					const nameProp =
						props.NAME || props.Name || props.name || props.facility_n || props.school_nam;
					const addressProp = props.ADDRESS || props.Address || props.address || props.location;
					if (nameProp) popupContent += `${nameProp}<br>`;
					else popupContent += `Unnamed ${name}<br>`;
					if (addressProp) popupContent += `${addressProp}<br>`;
					marker.bindPopup(popupContent);
					// --- End Popup Logic ---

					facilityLayers[id].addLayer(marker);
				}
			}
		});
		console.log(`Displayed ${count} nearby ${name}(s) within ${radius}m.`);
	}

	function updateDisplayedFacilities() {
		const location = get(selectedLocation);
		const allNearbyFacilitiesList = [];

		if (!map || !location || location.lat === null || location.lng === null) {
			// If no valid location, clear all facility layers
			facilityTypes.forEach((type) => {
				if (facilityLayers[type.id]) {
					facilityLayers[type.id].clearLayers();
				}
			});
			nearestFacilities.set([]);
			return;
		}

		const centerLat = location.lat;
		const centerLng = location.lng;

		console.log(`Updating nearby facilities around ${centerLat}, ${centerLng}`);

		facilityTypes.forEach((typeInfo) => {
			const layerGroup = facilityLayers[typeInfo.id];
			if (layerGroup && map.hasLayer(layerGroup)) {
				// Check if layer is active on map
				if (loadedGeojsonData[typeInfo.id]) {
					// Check if data is loaded
					displayNearbyFacilities(typeInfo, centerLat, centerLng, NEARBY_RADIUS_METERS);

					const fullGeojsonData = loadedGeojsonData[typeInfo.id];
					if (!fullGeojsonData || !fullGeojsonData.features) return;

					layerGroup.clearLayers(); // Clear previous markers for display
					let count = 0;
					let checkedCount = 0;

					fullGeojsonData.features.forEach((feature) => {
						if (feature.geometry && feature.geometry.type === 'Point') {
							checkedCount++;
							const coords = feature.geometry.coordinates;
							const featureLng = coords[0];
							const featureLat = coords[1];
							const distance = calculateDistance(centerLat, centerLng, featureLat, featureLng);

							if (distance <= NEARBY_RADIUS_METERS) {
								count++;
								// Add marker for display on map
								const marker = L.marker([featureLat, featureLng], {
									icon: createFacilityIcon({ icon: typeInfo.icon, color: typeInfo.color })
								});
								let popupContent = `<b>${typeInfo.name}</b><br>`;
								const props = feature.properties;
								const nameProp =
									props.NAME || props.Name || props.name || props.facility_n || props.school_nam;
								const addressProp =
									props.ADDRESS || props.Address || props.address || props.location;
								if (nameProp) popupContent += `${nameProp}<br>`;
								else popupContent += `Unnamed ${typeInfo.name}<br>`;
								if (addressProp) popupContent += `${addressProp}<br>`;
								marker.bindPopup(popupContent);
								layerGroup.addLayer(marker);

								// Add to the list for the InfoTab store
								allNearbyFacilitiesList.push({
									id: feature.id || `${typeInfo.id}-${checkedCount}`, // Create a unique enough ID
									name: nameProp || `Unnamed ${typeInfo.name}`,
									type: typeInfo.name,
									distance: distance,
									lat: featureLat,
									lng: featureLng,
									icon: typeInfo.icon, // Include icon and color for potential use in InfoTab
									color: typeInfo.color
								});
							}
						}
					});
					console.log(
						`Displayed ${count} nearby ${typeInfo.name}(s) out of ${checkedCount} checked within ${NEARBY_RADIUS_METERS}m.`
					);
				} else {
					// Data not loaded yet, maybe trigger load? Or just wait for user to toggle again.
					// For now, we just clear it to be safe, user needs to toggle layer if they want data.
					layerGroup.clearLayers();
					console.warn(`Data for ${typeInfo.name} not loaded, cannot display nearby.`);
					// Optionally trigger load here if desired:
					// handleLayerAdd(typeInfo); // Be careful of infinite loops
				}
			} else if (layerGroup) {
				// Layer is not active, ensure it's clear
				layerGroup.clearLayers();
			}
		});
		allNearbyFacilitiesList.sort((a, b) => a.distance - b.distance); // Sort by distance
		const top5Facilities = allNearbyFacilitiesList.slice(0, 5); // Get the top 5
		nearestFacilities.set(top5Facilities); // Update the store
		console.log('Updated nearestFacilities store:', top5Facilities);
	}

	async function handleLayerToggle(layerConfig, isAdding, showToast = true) {
		if (!layerConfig || !facilityLayers[layerConfig.id]) {
			console.warn('Layer config or group missing for toggle:', layerConfig?.id);
			return;
		}

		const layerGroup = facilityLayers[layerConfig.id]; // This is the L.layerGroup on the map

		if (isAdding) {
			const loadPromise = loadAndProcessGeoJson(layerConfig, !showToast) // !showToast implies initialLoad
				.then((geoJsonData) => {
					if (!geoJsonData) throw new Error('No data loaded.');

					layerGroup.clearLayers(); // Clear previous features specific to this group

					if (layerConfig.type === 'facility') {
						const location = get(selectedLocation);
						if (location && location.lat !== null && location.lng !== null) {
							displayNearbyFacilities(
								layerConfig,
								location.lat,
								location.lng,
								NEARBY_RADIUS_METERS
							);
						}
					} else if (layerConfig.type === 'hazard' && layerConfig.style) {
						activeLeafletLayers[layerConfig.id] = L.geoJSON(geoJsonData, {
							style: layerConfig.style,
							interactive: false
							// renderer: L.canvas() // REVERTED: Remove this line
						}).addTo(layerGroup);
						console.log(`${layerConfig.name} GeoJSON added to map.`);
					}
					return `${layerConfig.name} data loaded and displayed.`;
				})
				.catch((err) => {
					// This catch is for the loadPromise itself, toast.promise will also handle it
					console.error(`Error in loadPromise for ${layerConfig.name}:`, err);
					if (err.message.includes('User cancelled')) {
						// Attempt to uncheck the box in layer control
						if (layerControl && map) {
							const controlContainer = layerControl.getContainer();
							const inputs = controlContainer.querySelectorAll(
								'input.leaflet-control-layers-selector'
							);
							for (let input of inputs) {
								const label = input.nextElementSibling;
								if (label && label.textContent && label.textContent.includes(layerConfig.name)) {
									if (input.checked) {
										input.click(); // Simulate a click to uncheck and trigger 'overlayremove'
									}
									break;
								}
							}
						}
					}
					throw err; // Re-throw for toast.promise to catch
				});

			if (showToast) {
				toast.promise(loadPromise, {
					loading: `Loading ${layerConfig.name} data...`,
					success: (message) => message,
					error: (err) => {
						if (err.message.includes('User cancelled')) {
							return `${layerConfig.name} download cancelled.`;
						}
						return `Failed to load ${layerConfig.name}: ${err.message}`;
					}
				});
			} else {
				// Silent load (e.g., on initial map load)
				loadPromise.catch((err) => {
					if (!err.message.includes('User cancelled')) {
						console.error(`Silent error loading ${layerConfig.name}:`, err);
					}
				});
			}
		} else {
			// Layer is being removed/unchecked
			console.log(`Clearing ${layerConfig.name} layer.`);
			layerGroup.clearLayers(); // Clears markers or GeoJSON features from the group
			if (activeLeafletLayers[layerConfig.id]) {
				delete activeLeafletLayers[layerConfig.id];
			}
			// Leaflet's control handles removing the layerGroup from the map
		}
	}

	function updateNearestFacilitiesList() {
		const location = get(selectedLocation);
		const allNearbyFacilitiesList = [];

		if (!map || !location || location.lat === null || location.lng === null) {
			nearestFacilities.set([]);
			return;
		}
		const centerLat = parseFloat(location.lat);
		const centerLng = parseFloat(location.lng);

		facilityTypes.forEach((typeInfo) => {
			// Use loadedGeojsonData to calculate distances, not what's currently on map layers
			if (loadedGeojsonData[typeInfo.id]) {
				const fullGeojsonData = loadedGeojsonData[typeInfo.id];
				if (!fullGeojsonData || !fullGeojsonData.features) return;

				fullGeojsonData.features.forEach((feature, index) => {
					if (feature.geometry && feature.geometry.type === 'Point') {
						const coords = feature.geometry.coordinates;
						const featureLng = coords[0];
						const featureLat = coords[1];
						const distance = calculateDistance(centerLat, centerLng, featureLat, featureLng);

						if (distance <= NEARBY_RADIUS_METERS) {
							const props = feature.properties;
							const nameProp =
								props.NAME || props.Name || props.name || props.facility_n || props.school_nam;
							allNearbyFacilitiesList.push({
								id: feature.id || `${typeInfo.id}-${index}`, // Create a unique enough ID
								name: nameProp || `Unnamed ${typeInfo.name}`,
								type: typeInfo.name, // Facility type name
								distance: distance,
								lat: featureLat,
								lng: featureLng,
								icon: typeInfo.icon,
								color: typeInfo.color
							});
						}
					}
				});
			}
		});
		allNearbyFacilitiesList.sort((a, b) => a.distance - b.distance);
		const top5Facilities = allNearbyFacilitiesList.slice(0, 5);
		nearestFacilities.set(top5Facilities);
		// console.log('Updated nearestFacilities store for InfoTab:', top5Facilities);
	}

	// Handle a location selection from search
	function handleSearchLocation(event) {
		const { lat, lng, name } = event.detail;
		setSelectedLocation(lat, lng, name);
	}

	onMount(async () => {
		if (!browser) return;

		L = await import('leaflet');
		let isInitialLayerSetup = true; // Flag to track initial layer setup phase

		const getStationAlertInfo = (station) => {
			let status = 'normal';
			let color = '#ffffff';
			const currentWL = parseFloat(station.wl);
			const alertWL = parseFloat(station.alertwl);
			const alarmWL = parseFloat(station.alarmwl);
			const criticalWL = parseFloat(station.criticalwl);
			if (!isNaN(currentWL)) {
				if (!isNaN(criticalWL) && currentWL >= criticalWL) {
					status = 'critical';
					color = '#ff0000';
				} else if (!isNaN(alarmWL) && currentWL >= alarmWL) {
					status = 'alarm';
					color = '#ff8800';
				} else if (!isNaN(alertWL) && currentWL >= alertWL) {
					status = 'alert';
					color = '#ffcc00';
				}
			}
			return { status, color };
		};

		const createWaterIcon = (alertStatus = 'normal') => {
			let color;
			switch (alertStatus) {
				case 'critical':
					color = '#ff0000';
					break;
				case 'alarm':
					color = '#ff8800';
					break;
				case 'alert':
					color = '#ffcc00';
					break;
				default:
					color = '#ffffff';
			}
			const iconContainer = document.createElement('div');
			iconContainer.className = 'water-station-icon';
			iconContainer.dataset.status = alertStatus;
			const svgIcon = `<svg width="30" height="30" viewBox="0 0 24 24"><defs><filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2" result="blur" /><feFlood flood-color="${color}" result="glow" /><feComposite in="glow" in2="blur" operator="in" result="glowBlur" /><feComposite in="SourceGraphic" in2="glowBlur" operator="over" /></filter></defs><circle cx="12" cy="14" r="9" fill="#0055aa" opacity="0.3" /><path d="M12 20a6 6 0 0 1-6-6c0-4 6-10.75 6-10.75S18 10 18 14a6 6 0 0 1-6 6Z" fill="#00b3ff" stroke="${color}" stroke-width="1.5" filter="url(#glow)" /></svg>`;
			iconContainer.innerHTML = svgIcon;
			return L.divIcon({
				html: iconContainer,
				className: `water-station-marker status-${alertStatus}`,
				iconSize: [30, 30],
				iconAnchor: [15, 30],
				popupAnchor: [0, -30]
			});
		};

		const geojsonData = await loadGeoJSON();
		if (geojsonData) {
			const tempLayer = L.geoJSON(geojsonData);
			strictNcrBounds = tempLayer.getBounds();
			paddedNcrBounds = strictNcrBounds.pad(0.2);
		} else {
			strictNcrBounds = L.latLngBounds(
				L.latLng(14.35, 120.9), // Slightly tighter fallback
				L.latLng(14.75, 121.15)
			);
			paddedNcrBounds = strictNcrBounds.pad(0.2); // Add padding to the fallback
			// --- END: MODIFY THIS BLOCK ---
			console.warn('Failed to load GeoJSON, using fallback bounds for NCR.');
		}

		const handleZoomEnd = () => {
			// If a marker exists and the map is available
			if (marker && map) {
				// Pan the map to the marker's location after zoom finishes
				map.panTo(marker.getLatLng());
			}
		};

		map = L.map(mapContainer, {
			zoomControl: false,
			center: paddedNcrBounds.getCenter(),
			maxBounds: paddedNcrBounds,
			zoom: 11,
			minZoom: 10,
			maxBoundsViscosity: 0.9
		});

		map.on('zoomend', handleZoomEnd);

		const standard = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '© OpenStreetMap contributors',
			maxZoom: 19
		});
		const topographic = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
			attribution: 'Map data © OpenTopoMap contributors',
			maxZoom: 19
		});
		const satellite = L.tileLayer(
			'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
			{
				attribution: 'Imagery © Esri',
				maxZoom: 19
			}
		);
		const osmHot = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
			attribution:
				'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">Humanitarian OpenStreetMap Team</a> hosted by <a href="https://openstreetmap.fr/" target="_blank">OpenStreetMap France</a>',
			maxZoom: 19
		});
		const positron = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
			attribution:
				'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO',
			subdomains: 'abcd', // Recommended by CartoDB
			maxZoom: 20
		});
		const darkMatter = L.tileLayer(
			'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
			{
				attribution:
					'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO',
				subdomains: 'abcd', // Recommended by CartoDB
				maxZoom: 20
			}
		);
		const esriStreet = L.tileLayer(
			'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
			{
				attribution: 'Tiles &copy; Esri',
				maxZoom: 19
			}
		);

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

		const overlayGroups = {
			facilities: {},
			hazards: {}
		};

		facilityTypes.forEach((type) => {
			facilityLayers[type.id] = L.layerGroup(); // This is the group that will be added to the map
			overlayGroups.facilities[
				`<i class="iconify" data-icon="${type.icon}" style="color: ${type.color};"></i> ${type.name}`
			] = facilityLayers[type.id];
		});

		floodHazardLayers.forEach((hazardLayer) => {
			facilityLayers[hazardLayer.id] = L.layerGroup();
			overlayGroups.hazards[
				// Example: using a generic icon for flood hazard
				`<i class="iconify" data-icon="mdi:waves" style="color: #3498db;"></i> ${hazardLayer.name}`
			] = facilityLayers[hazardLayer.id];
		});

		const allOverlayControls = { ...overlayGroups.facilities, ...overlayGroups.hazards };

		// 1. Create the control and store it in a variable
		const layerControl = L.control.layers(baseLayers, allOverlayControls, { collapsed: true });

		// 2. Add the control to the map
		layerControl.addTo(map);

		// 3. Manipulate the DOM to add titles (after adding to map)
		try {
			const controlContainer = layerControl.getContainer();
			if (controlContainer) {
				const baseLayersDiv = controlContainer.querySelector('.leaflet-control-layers-base');
				const overlaysDiv = controlContainer.querySelector('.leaflet-control-layers-overlays');

				if (baseLayersDiv) {
					const baseTitle = L.DomUtil.create('div', 'leaflet-control-layers-title');
					baseTitle.innerHTML = 'Base Maps';
					baseLayersDiv.parentNode.insertBefore(baseTitle, baseLayersDiv);
				}

				if (overlaysDiv && Object.keys(overlayGroups.facilities).length > 0) {
					const facilityTitle = L.DomUtil.create('div', 'leaflet-control-layers-title');
					facilityTitle.innerHTML = 'Facilities';
					// Insert before the first facility layer, or at the start of overlays
					const firstFacilityLabel = overlaysDiv
						.querySelector(
							`label input[name='leaflet-base-layers'] + span i[data-icon='${facilityTypes[0].icon}']`
						)
						?.closest('label');
					overlaysDiv.insertBefore(facilityTitle, firstFacilityLabel || overlaysDiv.firstChild);
				}
				if (overlaysDiv && Object.keys(overlayGroups.hazards).length > 0) {
					const hazardTitle = L.DomUtil.create('div', 'leaflet-control-layers-title');
					hazardTitle.innerHTML = 'Flood Hazards';
					// Insert before the first hazard layer, or after facilities
					const firstHazardLabel = overlaysDiv
						.querySelector(
							`label input[name='leaflet-base-layers'] + span i[data-icon='mdi:waves']`
						)
						?.closest('label');
					if (firstHazardLabel) {
						overlaysDiv.insertBefore(hazardTitle, firstHazardLabel);
					} else {
						overlaysDiv.appendChild(hazardTitle); // Append if no specific element found
					}
				}
			}
		} catch (error) {
			console.error('Error adding titles to layer control:', error);
		}

		L.control.zoom({ position: 'bottomleft' }).addTo(map);

		if (geojsonData) {
			geojsonLayer = L.geoJSON(geojsonData, {
				style: {
					color: 'blue',
					weight: 2,
					opacity: 0.6,
					fillOpacity: 0,
					interactive: false // Make outline non-clickable
				}
			}).addTo(map);
			// map.fitBounds(geojsonLayer.getBounds()); // Optional: Already centered/bounded
		} else {
			map.fitBounds(paddedNcrBounds); // Fit to fallback if GeoJSON failed
		}

		map.on('click', async (e) => {
			const { lat, lng } = e.latlng;

			// Log the bounds and the clicked point for debugging
			console.log('NCR Bounds used for check:', strictNcrBounds);
			console.log('Clicked coordinates:', e.latlng);

			if (strictNcrBounds && strictNcrBounds.contains(e.latlng)) {
				// If click is inside bounds, proceed as normal
				console.log('Click is near NCR bounds.');
				setSelectedLocation(lat, lng);
			} else {
				// If click is outside bounds, show an alert and log it
				console.log('Click is not near NCR bounds.');
				toast.error('Please select a location near the National Capital Region (NCR).');
			}
		});

		map.on('overlayadd', function (e) {
			const addedLayerName = e.name;
			const layerConfig = allLayerConfigs.find(
				(lc) => addedLayerName && addedLayerName.includes(lc.name)
			);
			handleLayerToggle(layerConfig, true, !isInitialLayerSetup);
		});

		map.on('overlayremove', function (e) {
			const removedLayerName = e.name;
			const layerConfig = allLayerConfigs.find(
				(lc) => removedLayerName && removedLayerName.includes(lc.name)
			);
			if (layerConfig) {
				handleLayerToggle(layerConfig, false); // isAdding = false
			}
		});

		// Initial silent load for default active layers (if any)
		facilityTypes.forEach((ft) => {
			const layerConfig = allLayerConfigs.find((lc) => lc.id === ft.id);
			if (layerConfig && facilityLayers[ft.id]) {
				map.addLayer(facilityLayers[ft.id]);
			}
		});

		isInitialLayerSetup = false; // Mark initial setup as complete

		waterStationSubscription = waterStations.subscribe((value) => {
			if (!map || !L) return;

			waterStationMarkers.forEach((m) => map.removeLayer(m));
			waterStationMarkers = [];

			if (!value.loading && value.data && value.data.length > 0) {
				value.data.forEach((station, index) => {
					if (station.lat && station.lon) {
						try {
							const lat = typeof station.lat === 'string' ? parseFloat(station.lat) : station.lat;
							const lon = typeof station.lon === 'string' ? parseFloat(station.lon) : station.lon;

							if (!isNaN(lat) && !isNaN(lon)) {
								const { status, color } = getStationAlertInfo(station);
								const icon = createWaterIcon(status);

								const popupContent = `
                    <b>${station.name || 'Water Station'}</b><br>
                    Water Level: ${station.wl || 'N/A'} m<br>
                    <hr style="margin: 3px 0;">
                    ${!isNaN(parseFloat(station.alertwl)) ? `Alert: <span class="alert-threshold">${station.alertwl} m</span><br>` : ''}
                    ${!isNaN(parseFloat(station.alarmwl)) ? `Alarm: <span class="alarm-threshold">${station.alarmwl} m</span><br>` : ''}
                    ${!isNaN(parseFloat(station.criticalwl)) ? `Critical: <span class="critical-threshold">${station.criticalwl} m</span><br>` : ''}
                    Status: <span class="status status-${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
                  `;

								const stationMarker = L.marker([lat, lon], { icon: icon })
									.addTo(map)
									.bindPopup(popupContent);
								waterStationMarkers.push(stationMarker);
							}
						} catch (err) {
							console.error('Error processing station:', station, err);
						}
					}
				});

				if (waterStationMarkers.length > 0) {
					const group = L.featureGroup(waterStationMarkers);
					const stationBounds = group.getBounds();
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
				map.off('zoomend', handleZoomEnd);
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
			const location = get(selectedLocation);
			// Update display for active facility layers based on new location
			facilityTypes.forEach((ftConfig) => {
				const layerGroup = facilityLayers[ftConfig.id];
				// Check if data is loaded and layer is currently on the map
				if (loadedGeojsonData[ftConfig.id] && map && map.hasLayer(layerGroup)) {
					// displayNearbyFacilities clears and re-adds markers to the layerGroup
					displayNearbyFacilities(ftConfig, location.lat, location.lng, NEARBY_RADIUS_METERS);
				}
			});
			// Update the nearest facilities list for InfoTab
			updateNearestFacilitiesList();
		});
	}

	// Ensure onDestroy runs even if onMount fails or browser is false
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
	<!-- Map will render here -->

	<!-- Updated search bar container position -->
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

	/* Updated styles for the search overlay */
	.search-overlay {
		position: absolute;
		top: 10px;
		left: 10px;
		right: 10px;
		z-index: 1000;
		max-width: 420px;
	}

	/* For mobile responsiveness */
	@media (max-width: 640px) {
		.search-overlay {
			max-width: 100%;
		}
	}

	/* Ensure map controls stay below navbar */
	:global(.leaflet-control-container) {
		z-index: 40 !important;
	}

	/* Style for water station popups (optional) */
	:global(.leaflet-popup-content) {
		font-size: 0.8rem;
	}
	:global(.leaflet-popup-content b) {
		color: #0c3143; /* primary-dark */
	}

	/* Enhanced style for water station icons */
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

	/* Add pulsing animation to make icons more noticeable */
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

	/* Different pulsing animations based on alert status */
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

	/* Status-specific styles */
	:global(.water-station-icon[data-status='alert']) {
		animation: pulse 1.5s infinite;
	}

	:global(.water-station-icon[data-status='alarm']) {
		animation: fastPulse 1.2s infinite;
	}

	:global(.water-station-icon[data-status='critical']) {
		animation: fastPulse 0.8s infinite;
	}

	/* Popup styles */
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

	/* Custom styles for search control */
	:global(.leaflet-search-control) {
		background: transparent !important;
		box-shadow: none !important;
		margin: 10px 10px 0 10px !important;
		padding: 0 !important;
		border: none !important;
	}

	/* Make search control responsive on small screens */
	@media (max-width: 640px) {
		:global(.leaflet-search-control) {
			width: calc(100% - 80px) !important;
			margin: 10px 10px 0 10px !important;
		}
	}

	:global(.leaflet-control-layers-title) {
		font-weight: bold;
		margin-top: 10px; /* Add some space above the title */
		color: #333; /* Adjust color as needed */
	}

	:global(.leaflet-control-layers-list label span) {
		display: inline-flex !important; /* Use flexbox for alignment */
		align-items: center !important; /* Vertically center icon and text */
		gap: 5px !important; /* Add space between icon and text */
	}

	/* Adjust margin for the first title if needed */
	:global(.leaflet-control-layers-list > .leaflet-control-layers-title:first-child) {
		margin-top: 0;
	}

	:global(.facility-marker-icon) {
		background: rgba(255, 255, 255, 0.7); /* Optional: semi-transparent white background */
		border-radius: 50%;
		border: 1px solid rgba(0, 0, 0, 0.3);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
		display: flex; /* Use flexbox to center content */
		justify-content: center;
		align-items: center;
	}

	/* Inner wrapper for alignment if needed */
	:global(.facility-marker-wrapper) {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		height: 100%;
	}

	/* Ensure iconify icons render correctly inside the marker */
	:global(.facility-marker-icon .iconify) {
		display: block; /* Or inline-block */
	}
</style>
