import { toast } from 'svelte-sonner';
import { get } from 'svelte/store';
import { selectedLocation } from '$lib/stores/locationStore.js';
import { loadAndProcessGeoJson } from './GeoJsonUtils.js';
import { displayNearbyFacilities } from './MarkerHandlers.js';
import { NEARBY_RADIUS_METERS, facilitiesConfig } from './MapConfig.js';
import { addLayerToMap, removeLayerFromMap, clearLayerGroup } from '$lib/services/MapService.js';

/**
 * Sets up the layer control for the map.
 * This creates buttons to show/hide different layers like facilities and flood hazards.
 */
export function setupLayerControl(L, map, baseLayers, facilityLayers, floodHazardLayers) {
  // Create groups for each layer type
  facilityLayers[facilitiesConfig.id] = L.layerGroup();
  floodHazardLayers.forEach(hazardLayer => {
    facilityLayers[hazardLayer.id] = L.layerGroup();
  });

  // Prepare the layer options for the control
  const overlays = {};

  // Add facilities layer with an icon
  overlays[`<i class="iconify" data-icon="mdi:map-marker-multiple" style="color: #3498db;"></i> ${facilitiesConfig.name}`] =
    facilityLayers[facilitiesConfig.id];

  // Add flood hazard layers with icons
  floodHazardLayers.forEach(hazardLayer => {
    overlays[`<i class="iconify" data-icon="mdi:waves" style="color: #3498db;"></i> ${hazardLayer.name}`] =
      facilityLayers[hazardLayer.id];
  });

  // Create the control and add it to the map
  const layerControl = L.control.layers(baseLayers, overlays, { collapsed: true });
  layerControl.addTo(map);

  // Add titles to organize the layers
  addTitlesToLayerControl(layerControl, floodHazardLayers);

  return layerControl;
}

/**
 * Adds section titles to the layer control for better organization.
 */
function addTitlesToLayerControl(layerControl, floodHazardLayers) {
  // Wait a bit for the control to be ready
  setTimeout(() => {
    try {
      const container = layerControl.getContainer();
      if (!container) return;

      const overlaysDiv = container.querySelector('.leaflet-control-layers-overlays');
      if (!overlaysDiv) return;

      // Remove old titles if any
      const oldTitles = overlaysDiv.querySelectorAll('.leaflet-control-layers-title');
      oldTitles.forEach(title => title.remove());

      const labels = overlaysDiv.querySelectorAll('label');
      if (!labels.length) return;

      // Add "Facilities" title
      const facilitiesTitle = document.createElement('div');
      facilitiesTitle.className = 'leaflet-control-layers-title';
      facilitiesTitle.innerHTML = 'Facilities';
      overlaysDiv.insertBefore(facilitiesTitle, labels[0]);

      // Find first flood hazard label
      let firstHazardLabel = null;
      for (let label of labels) {
        const text = label.textContent || '';
        if (floodHazardLayers.some(h => text.includes(h.name))) {
          firstHazardLabel = label;
          break;
        }
      }

      // Add "Flood Hazards" title
      if (firstHazardLabel) {
        const hazardsTitle = document.createElement('div');
        hazardsTitle.className = 'leaflet-control-layers-title';
        hazardsTitle.innerHTML = 'Flood Hazards';
        overlaysDiv.insertBefore(hazardsTitle, firstHazardLabel);
      }
    } catch (error) {
      console.error('Error adding titles:', error);
    }
  }, 100);
}

/**
 * Handles turning a layer on or off.
 * This is called when the user clicks the checkbox in the layer control.
 */
export async function handleLayerToggle(layerConfig, isAdding, showToast, map, L, facilityLayers, loadedGeojsonData, activeLeafletLayers, layerControl) {
  if (!layerConfig || !facilityLayers[layerConfig.id]) {
    console.warn('Layer config or group missing:', layerConfig?.id);
    return;
  }

  const layerGroup = facilityLayers[layerConfig.id];

  if (isAdding) {
    // Turn layer on
    addLayerToMap(layerGroup);
    await loadLayerData(layerConfig, layerGroup, map, L, facilityLayers, loadedGeojsonData, activeLeafletLayers, showToast, layerControl);
  } else {
    // Turn layer off
    console.log(`Removing ${layerConfig.name} layer.`);
    clearLayerGroup(layerGroup);
    removeLayerFromMap(layerGroup);
    if (activeLeafletLayers[layerConfig.id]) {
      delete activeLeafletLayers[layerConfig.id];
    }
  }
}

/**
 * Loads data for a layer and adds it to the map.
 */
async function loadLayerData(layerConfig, layerGroup, map, L, facilityLayers, loadedGeojsonData, activeLeafletLayers, showToast, layerControl) {
  try {
    const geoJsonData = await loadAndProcessGeoJson(layerConfig, loadedGeojsonData, !showToast);
    if (!geoJsonData) throw new Error('No data loaded.');

    clearLayerGroup(layerGroup);

    if (layerConfig.type === 'facility') {
      showFacilities(layerConfig, map, L, facilityLayers, loadedGeojsonData);
    } else if (layerConfig.type === 'hazard' && layerConfig.style) {
      activeLeafletLayers[layerConfig.id] = L.geoJSON(geoJsonData, {
        style: layerConfig.style,
        interactive: false
      }).addTo(layerGroup);
      console.log(`${layerConfig.name} added to map.`);
    }

    if (showToast) {
      toast.success(`${layerConfig.name} loaded!`);
    }
  } catch (error) {
    console.error(`Error loading ${layerConfig.name}:`, error);
    if (error.message.includes('User cancelled')) {
      uncheckInControl(layerControl, layerConfig);
    }
    if (showToast) {
      toast.error(`Failed to load ${layerConfig.name}`);
    }
  }
}

/**
 * Shows facilities near the selected location.
 */
function showFacilities(layerConfig, map, L, facilityLayers, loadedGeojsonData) {
  const selectedLoc = get(selectedLocation);
  if (selectedLoc && selectedLoc.lat !== null && selectedLoc.lng !== null) {
    displayNearbyFacilities(
      selectedLoc.lat,
      selectedLoc.lng,
      NEARBY_RADIUS_METERS,
      map,
      L,
      facilityLayers,
      loadedGeojsonData
    );
    console.log(`Showing nearby ${layerConfig.name}.`);
  } else {
    console.log(`${layerConfig.name} active, waiting for location.`);
  }
}

/**
 * Unchecks a layer in the control if loading failed.
 */
function uncheckInControl(layerControl, layerConfig) {
  if (!layerControl) return;

  const container = layerControl.getContainer();
  const inputs = container.querySelectorAll('input.leaflet-control-layers-selector');
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
