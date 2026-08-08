/**
 * Map initialization and configuration
 */

import { loadGeoJSON } from './GeoJsonUtils.js';
import { setMap } from '$lib/services/MapService.js';

export async function initializeMap(L, mapContainer) {
	if (!L || !mapContainer) {
		console.error('Cannot initialize map: missing required parameters');
		return null;
	}

	// Get NCR bounds from GeoJSON or use fallback
	const { strictNcrBounds, paddedNcrBounds } = await getBounds(L);

	// Create the map with options
	const map = L.map(mapContainer, {
		zoomControl: false,
		center: paddedNcrBounds.getCenter(),
		maxBounds: paddedNcrBounds,
		zoom: 11,
		minZoom: 5,
		maxBoundsViscosity: 0.9
	});
	// zoom: 11,
	// minZoom: 10,
	// maxBounds: paddedNcrBounds,

	// Add NCR boundary to map if available
	addNcrBoundary(L, map, strictNcrBounds);

	// Store the map in the MapService for global access
	setMap(map);

	return {
		map,
		strictNcrBounds,
		paddedNcrBounds
	};
}

async function getBounds(L) {
	// Load NCR boundary GeoJSON
	const geojsonData = await loadGeoJSON();
	let strictNcrBounds, paddedNcrBounds;

	if (geojsonData) {
		const tempLayer = L.geoJSON(geojsonData);
		strictNcrBounds = tempLayer.getBounds();
		paddedNcrBounds = strictNcrBounds.pad(0.4);
	} else {
		// Fallback bounds if GeoJSON fails to load
		strictNcrBounds = L.latLngBounds(L.latLng(14.35, 120.9), L.latLng(14.75, 121.15));
		paddedNcrBounds = strictNcrBounds.pad(0.2);
		console.warn('Failed to load GeoJSON, using fallback bounds for NCR.');
	}

	return { strictNcrBounds, paddedNcrBounds };
}

function addNcrBoundary(L, map, bounds) {
	// Load NCR boundary GeoJSON
	loadGeoJSON().then((geojsonData) => {
		if (geojsonData) {
			L.geoJSON(geojsonData, {
				style: {
					color: 'blue',
					weight: 2,
					opacity: 0.6,
					fillOpacity: 0,
					interactive: false
				}
			}).addTo(map);
		} else {
			// If GeoJSON failed to load, just fit the map to bounds
			map.fitBounds(bounds);
		}
	});
}
