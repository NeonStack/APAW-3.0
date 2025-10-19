import { toast } from 'svelte-sonner';
import { get } from 'svelte/store';
import {
	selectedLocation,
	getLocationName,
	setLocationLoading
} from '$lib/stores/locationStore.js';
import { loadAndProcessGeoJson } from './GeoJsonUtils.js';
import {
	NEARBY_RADIUS_METERS,
	facilitiesConfig,
	getFacilityIconAndColor,
	getFacilityFriendlyName,
	getFacilityType
} from './MapConfig.js';
import { addLayerToMap, removeLayerFromMap, clearLayerGroup } from '$lib/services/MapService.js';

// --- Marker and Location Functions (from MarkerHandlers.js) ---

export function calculateDistance(lat1, lon1, lat2, lon2) {
	const R = 6371e3; // Earth radius in meters
	const φ1 = (lat1 * Math.PI) / 180;
	const φ2 = (lat2 * Math.PI) / 180;
	const Δφ = ((lat2 - lat1) * Math.PI) / 180;
	const Δλ = ((lon2 - lon1) * Math.PI) / 180;

	const a =
		Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
		Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c; // Distance in meters
}

export async function fetchElevation(lat, lng) {
	try {
		const response = await fetch(`/api/elevation?lat=${lat}&lng=${lng}`);
		const data = await response.json();
		if (!response.ok) {
			throw new Error(data.error || `HTTP error! status: ${response.status}`);
		}
		if (data.elevation !== undefined) {
			return data.elevation;
		} else {
			throw new Error('Elevation data missing in server response.');
		}
	} catch (error) {
		console.error('Error fetching elevation via local API:', error);
		return { error: error.message || 'Failed to fetch elevation' };
	}
}

export async function setSelectedLocation(
	lat,
	lng,
	locationName = null,
	map,
	L,
	marker,
	dispatch,
	tempMarker = null
) {
	setLocationLoading(true, 'Fetching location data...');
	dispatch('locationSelectionStart', { lat, lng });

	const currentLat = parseFloat(lat).toFixed(6);
	const currentLng = parseFloat(lng).toFixed(6);

	if (!tempMarker && marker && map) {
		try {
			map.removeLayer(marker);
			marker = null;
		} catch (e) {
			console.error('Error removing existing marker:', e);
		}
	}

	const elevationResult = await fetchElevation(currentLat, currentLng);

	if (elevationResult && typeof elevationResult === 'object' && elevationResult.error) {
		const errorMessage = elevationResult.error;
		toast.error(`${errorMessage}`);
		setLocationLoading(false);
		dispatch('locationSelectionComplete', { error: errorMessage });
		if (tempMarker && map) map.removeLayer(tempMarker);
		selectedLocation.set({
			lat: null,
			lng: null,
			elevation: null,
			error: null,
			locationName: null,
			loading: false
		});
		return null;
	}

	if (tempMarker && map) map.removeLayer(tempMarker);

	if (map && L) {
		marker = L.marker([currentLat, currentLng]).addTo(map);
		map.panTo([currentLat, currentLng]);
	}

	if (!locationName) {
		locationName = await getLocationName(currentLat, currentLng);
	}

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
		toast.error(`Elevation Error: ${errorMessage}`);
	}

	setLocationLoading(false);
	dispatch('locationSelectionComplete', {
		lat: currentLat,
		lng: currentLng,
		elevation: typeof elevationResult === 'number' ? elevationResult.toFixed(2) : 'N/A',
		locationName
	});
	return marker;
}

export function displayNearbyFacilities(
	centerLat,
	centerLng,
	radius,
	map,
	L,
	facilityLayers,
	loadedGeojsonData
) {
	const facilitiesId = 'facilities';
	const fullGeojsonData = loadedGeojsonData[facilitiesId];

	if (!map || !facilityLayers[facilitiesId] || !fullGeojsonData || !fullGeojsonData.features) {
		console.warn(`Cannot display nearby facilities: Map, layer group, or data missing.`);
		return;
	}

	facilityLayers[facilitiesId].clearLayers();

	let count = 0;
	fullGeojsonData.features.forEach((feature) => {
		const coords = getFeatureCoordinates(feature);
		if (!coords) return;

		const { lat: featureLat, lng: featureLng } = coords;
		const distance = calculateDistance(
			parseFloat(centerLat),
			parseFloat(centerLng),
			featureLat,
			featureLng
		);

		if (distance <= radius) {
			count++;
			const { icon, color } = getFacilityIconAndColor(feature.properties);
			const marker = L.marker([featureLat, featureLng], {
				icon: createFacilityIcon(L, { icon, color })
			});

			const friendlyName = getFacilityFriendlyName(feature.properties);
			const popupContent = createFacilityPopup(feature.properties, friendlyName);
			marker.bindPopup(popupContent, { maxWidth: 300, className: 'facility-popup-container' });
			facilityLayers[facilitiesId].addLayer(marker);
		}
	});
	console.log(`Displayed ${count} nearby facilities within ${radius}m.`);
}

export function updateNearestFacilitiesList(map, nearestFacilities, loadedGeojsonData) {
	const location = get(selectedLocation);
	const allNearbyFacilitiesList = [];

	if (!map || !location || location.lat === null || location.lng === null) {
		nearestFacilities.set([]);
		return;
	}

	const centerLat = parseFloat(location.lat);
	const centerLng = parseFloat(location.lng);
	const facilitiesId = 'facilities';

	if (loadedGeojsonData[facilitiesId]) {
		const fullGeojsonData = loadedGeojsonData[facilitiesId];
		if (!fullGeojsonData || !fullGeojsonData.features) return;

		fullGeojsonData.features.forEach((feature, index) => {
			const coords = getFeatureCoordinates(feature);
			if (!coords) return;

			const { lat: featureLat, lng: featureLng } = coords;
			const distance = calculateDistance(centerLat, centerLng, featureLat, featureLng);

			if (distance <= NEARBY_RADIUS_METERS) {
				const { icon, color } = getFacilityIconAndColor(feature.properties);
				allNearbyFacilitiesList.push({
					id: feature.properties['@id'] || `facility-${index}`,
					name: feature.properties.name || getFacilityFriendlyName(feature.properties),
					type: getFacilityType(feature.properties),
					distance: distance,
					lat: featureLat,
					lng: featureLng,
					icon: icon,
					color: color,
					properties: feature.properties
				});
			}
		});
	}

	allNearbyFacilitiesList.sort((a, b) => a.distance - b.distance);
	nearestFacilities.set(allNearbyFacilitiesList.slice(0, 5));
}

// --- Layer Toggling Functions (from LayerHandlers.js) ---

export async function handleLayerToggle(
	layerConfig,
	isAdding,
	showToast,
	map,
	L,
	facilityLayers,
	loadedGeojsonData,
	activeLeafletLayers,
	layerControl
) {
	if (!layerConfig || !facilityLayers[layerConfig.id]) {
		console.warn('Layer config or group missing:', layerConfig?.id);
		return;
	}

	const layerGroup = facilityLayers[layerConfig.id];

	if (isAdding) {
		addLayerToMap(layerGroup);
		const loadPromise = loadLayerData(
			layerConfig,
			layerGroup,
			map,
			L,
			facilityLayers,
			loadedGeojsonData,
			activeLeafletLayers,
			showToast,
			layerControl
		);
		if (showToast) {
			toast.promise(loadPromise, {
				loading: `Loading ${layerConfig.name}...`,
				success: `${layerConfig.name} loaded successfully!`,
				error: (err) =>
					err.message.includes('User cancelled')
						? `${layerConfig.name} download cancelled`
						: `Failed to load ${layerConfig.name}`
			});
		}
		try {
			await loadPromise;
		} catch (error) {
			console.error(`Error loading ${layerConfig.name}:`, error);
		}
	} else {
		console.log(`Removing ${layerConfig.name} layer.`);
		clearLayerGroup(layerGroup);
		removeLayerFromMap(layerGroup);
		if (activeLeafletLayers[layerConfig.id]) {
			delete activeLeafletLayers[layerConfig.id];
		}
	}
}

// --- Internal Helper Functions ---

function createFacilityIcon(L, options) {
	const iconHtml = `<div class="facility-marker-wrapper"><i class="iconify" data-icon="${options.icon}" style="color: ${options.color}; font-size: 18px;"></i></div>`;
	return L.divIcon({
		html: iconHtml,
		className: 'facility-marker-icon',
		iconSize: [24, 24],
		iconAnchor: [12, 12]
	});
}

function getFeatureCoordinates(feature) {
	if (!feature.geometry) return null;
	const type = feature.geometry.type;
	const coords = feature.geometry.coordinates;
	if (type === 'Point') return { lat: coords[1], lng: coords[0] };
	if (type === 'Polygon') return { lat: coords[0][0][1], lng: coords[0][0][0] };
	if (type === 'MultiPolygon') return { lat: coords[0][0][0][1], lng: coords[0][0][0][0] };
	return null;
}

function createFacilityPopup(properties, friendlyName) {
	const facilityType = getFacilityType(properties);
	let content = `<div class="facility-popup">
        <h4 style="margin:0 0 5px 0;font-size:14px;color:#0c3143;">${friendlyName}</h4>`;
	if (facilityType && friendlyName !== facilityType) {
		content += `<div style="font-size:12px;color:#555;margin-bottom:5px;"><b>${facilityType}</b></div>`;
	}
	// In a real scenario, you would add more details here like address, etc.
	content += `</div>`;
	return content;
}

async function loadLayerData(
	layerConfig,
	layerGroup,
	map,
	L,
	facilityLayers,
	loadedGeojsonData,
	activeLeafletLayers,
	showToast,
	layerControl
) {
	try {
		const geoJsonData = await loadAndProcessGeoJson(layerConfig, loadedGeojsonData, !showToast);
		if (!geoJsonData) throw new Error('No data loaded.');

		clearLayerGroup(layerGroup);

		if (layerConfig.type === 'facility') {
			const selectedLoc = get(selectedLocation);
			if (selectedLoc && selectedLoc.lat !== null) {
				displayNearbyFacilities(
					selectedLoc.lat,
					selectedLoc.lng,
					NEARBY_RADIUS_METERS,
					map,
					L,
					facilityLayers,
					loadedGeojsonData
				);
			}
		} else if (layerConfig.type === 'hazard' && layerConfig.style) {
			activeLeafletLayers[layerConfig.id] = L.geoJSON(geoJsonData, {
				style: layerConfig.style,
				interactive: false
			}).addTo(layerGroup);
		}
		return { success: true, name: layerConfig.name };
	} catch (error) {
		if (error.message.includes('User cancelled')) {
			const container = layerControl.getContainer();
			const inputs = container.querySelectorAll('input.leaflet-control-layers-selector');
			for (let input of inputs) {
				const label = input.nextElementSibling;
				if (
					label &&
					label.textContent &&
					label.textContent.includes(layerConfig.name) &&
					input.checked
				) {
					input.click();
					break;
				}
			}
		}
		throw error;
	}
}
