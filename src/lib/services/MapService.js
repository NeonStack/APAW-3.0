/**
 * Central service for map operations and management
 */
let mapInstance = null;
let L = null;

export function initMapService(leafletInstance) {
	L = leafletInstance;
}

export function setMap(map) {
	mapInstance = map;
	return mapInstance;
}

export function getMap() {
	return mapInstance;
}

// Marker management
export function createMarker(lat, lng, options = {}) {
	if (!mapInstance || !L) return null;
	return L.marker([lat, lng], options).addTo(mapInstance);
}

export function removeMarker(marker) {
	if (!mapInstance || !marker) return;
	try {
		mapInstance.removeLayer(marker);
	} catch (e) {
		console.error('Error removing marker:', e);
	}
}

// Layer management
export function addLayerToMap(layer) {
	if (!mapInstance || !layer) return;
	if (!mapInstance.hasLayer(layer)) {
		mapInstance.addLayer(layer);
	}
}

export function removeLayerFromMap(layer) {
	if (!mapInstance || !layer) return;
	if (mapInstance.hasLayer(layer)) {
		mapInstance.removeLayer(layer);
	}
}

export function clearLayerGroup(layerGroup) {
	if (!layerGroup) return;
	layerGroup.clearLayers();
}

// Map control functions
export function panTo(lat, lng) {
	if (!mapInstance) return;
	mapInstance.panTo([lat, lng]);
}

export function fitBounds(bounds, options = {}) {
	if (!mapInstance || !bounds) return;
	mapInstance.fitBounds(bounds, options);
}

// Custom controls
export function createRecenterControl() {
	if (!L) return null;

	const RecenterControl = L.Control.extend({
		options: {
			position: 'bottomleft'
		},

		onAdd: function () {
			const container = L.DomUtil.create(
				'div',
				'leaflet-bar leaflet-control leaflet-control-recenter'
			);

			container.innerHTML = `
        <a title="Re-center map on selected location" class="recenter-button">
          <div class="icon-container">
            <i class="iconify" data-icon="mdi:map-marker-radius-outline" data-width="20" data-height="20"></i>
          </div>
        </a>
      `;

			L.DomEvent.disableClickPropagation(container);
			L.DomEvent.disableScrollPropagation(container);

			L.DomEvent.on(container, 'click', function (e) {
				L.DomEvent.preventDefault(e);
				L.DomEvent.stopPropagation(e);

				// Get the current selected marker from the map's properties
				const selectedMarker = mapInstance._selectedMarker;
				if (selectedMarker) {
					mapInstance.panTo(selectedMarker.getLatLng());
				}
			});

			return container;
		}
	});

	return new RecenterControl();
}
