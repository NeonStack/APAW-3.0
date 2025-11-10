import { toast } from 'svelte-sonner';
import { get } from 'svelte/store';
import {
	selectedLocation,
	calculateDistance // Import the centralized function
} from '$lib/stores/locationStore.js';
import { loadAndProcessGeoJson } from './GeoJsonUtils.js';
import {
	NEARBY_RADIUS_METERS,
	getFacilityIconAndColor,
	getFacilityFriendlyName,
	getFacilityType,
	createFacilityIcon,
	createFacilityPopup
} from './MapConfig.js';
import { addLayerToMap, removeLayerFromMap, clearLayerGroup } from '$lib/services/MapService.js';

// --- Marker and Location Functions (from MarkerHandlers.js) ---

// REMOVED: calculateDistance, fetchElevation, and setSelectedLocation. Their logic has been moved to locationStore.js and Map.svelte.

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
			const markerIcon = createFacilityIcon(L, feature.properties);
			const marker = L.marker([featureLat, featureLng], {
				icon: markerIcon
			});

			// Use the new, centralized popup function
			const popupContent = createFacilityPopup(feature.properties);
			marker.bindPopup(popupContent, {
				maxWidth: 300,
				className: 'facility-popup-container'
			});
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

function getFeatureCoordinates(feature) {
	if (!feature.geometry) return null;
	const type = feature.geometry.type;
	const coords = feature.geometry.coordinates;
	if (type === 'Point') return { lat: coords[1], lng: coords[0] };
	if (type === 'Polygon') return { lat: coords[0][0][1], lng: coords[0][0][0] };
	if (type === 'MultiPolygon') return { lat: coords[0][0][0][1], lng: coords[0][0][0][0] };
	return null;
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
