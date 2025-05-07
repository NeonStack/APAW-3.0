import { toast } from 'svelte-sonner';
import { get } from 'svelte/store';
import { selectedLocation } from '$lib/stores/locationStore.js';
import { loadAndProcessGeoJson } from './GeoJsonUtils.js';
import { displayNearbyFacilities } from './MarkerHandlers.js';
import { NEARBY_RADIUS_METERS } from './MapConfig.js';

export function setupLayerControl(L, map, baseLayers, facilityLayers, facilityTypes, floodHazardLayers) {
  const overlayGroups = {
    facilities: {},
    hazards: {}
  };

  facilityTypes.forEach((type) => {
    facilityLayers[type.id] = L.layerGroup();
    overlayGroups.facilities[
      `<i class="iconify" data-icon="${type.icon}" style="color: ${type.color};"></i> ${type.name}`
    ] = facilityLayers[type.id];
  });

  floodHazardLayers.forEach((hazardLayer) => {
    facilityLayers[hazardLayer.id] = L.layerGroup();
    overlayGroups.hazards[
      `<i class="iconify" data-icon="mdi:waves" style="color: #3498db;"></i> ${hazardLayer.name}`
    ] = facilityLayers[hazardLayer.id];
  });

  const allOverlayControls = { ...overlayGroups.facilities, ...overlayGroups.hazards };

  const layerControl = L.control.layers(baseLayers, allOverlayControls, { collapsed: true });
  layerControl.addTo(map);

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
        const firstHazardLabel = overlaysDiv
          .querySelector(
            `label input[name='leaflet-base-layers'] + span i[data-icon='mdi:waves']`
          )
          ?.closest('label');
        if (firstHazardLabel) {
          overlaysDiv.insertBefore(hazardTitle, firstHazardLabel);
        } else {
          overlaysDiv.appendChild(hazardTitle);
        }
      }
    }
  } catch (error) {
    console.error('Error adding titles to layer control:', error);
  }

  return layerControl;
}

export async function handleLayerToggle(layerConfig, isAdding, showToast, map, L, facilityLayers, loadedGeojsonData, activeLeafletLayers, layerControl) {
  if (!layerConfig || !facilityLayers[layerConfig.id]) {
    console.warn('Layer config or group missing for toggle:', layerConfig?.id);
    return;
  }

  const layerGroup = facilityLayers[layerConfig.id];

  if (isAdding) {
    const loadPromise = loadAndProcessGeoJson(layerConfig, loadedGeojsonData, !showToast)
      .then((geoJsonData) => {
        if (!geoJsonData) throw new Error('No data loaded.');

        layerGroup.clearLayers();

        if (layerConfig.type === 'facility') {
          const location = get(selectedLocation);
          if (location && location.lat !== null && location.lng !== null) {
            displayNearbyFacilities(
              layerConfig,
              location.lat,
              location.lng,
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
          console.log(`${layerConfig.name} GeoJSON added to map.`);
        }
        return `${layerConfig.name} data loaded and displayed.`;
      })
      .catch((err) => {
        console.error(`Error in loadPromise for ${layerConfig.name}:`, err);
        if (err.message.includes('User cancelled')) {
          if (layerControl && map) {
            const controlContainer = layerControl.getContainer();
            const inputs = controlContainer.querySelectorAll(
              'input.leaflet-control-layers-selector'
            );
            for (let input of inputs) {
              const label = input.nextElementSibling;
              if (label && label.textContent && label.textContent.includes(layerConfig.name)) {
                if (input.checked) {
                  input.click();
                }
                break;
              }
            }
          }
        }
        throw err;
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
      loadPromise.catch((err) => {
        if (!err.message.includes('User cancelled')) {
          console.error(`Silent error loading ${layerConfig.name}:`, err);
        }
      });
    }
  } else {
    console.log(`Clearing ${layerConfig.name} layer.`);
    layerGroup.clearLayers();
    if (activeLeafletLayers[layerConfig.id]) {
      delete activeLeafletLayers[layerConfig.id];
    }
  }
}
