<script>
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { browser } from '$app/environment';
	import {
		selectedLocation,
		getLocationName,
		getCurrentPosition,
		setLocationLoading
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

	// Handle a location selection from search
	function handleSearchLocation(event) {
		const { lat, lng, name } = event.detail;
		setSelectedLocation(lat, lng, name);
	}

	onMount(async () => {
		if (!browser) return;

		L = await import('leaflet');

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

		L.control.layers(baseLayers).addTo(map);
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
			if (map) {
				map.remove();
				map = null;
			}
		};
	});

	// Ensure onDestroy runs even if onMount fails or browser is false
	onDestroy(() => {
		if (waterStationSubscription) {
			waterStationSubscription();
		}
		if (map) {
			try {
				map.off('zoomend');
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
</style>
