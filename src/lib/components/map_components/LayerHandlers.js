import { toast } from 'svelte-sonner';
import { get } from 'svelte/store';
import { selectedLocation } from '$lib/stores/locationStore.js';
import { loadAndProcessGeoJson } from './GeoJsonUtils.js';
import { displayNearbyFacilities } from './MarkerHandlers.js';
import { NEARBY_RADIUS_METERS, facilitiesConfig } from './MapConfig.js';

export function setupLayerControl(L, map, baseLayers, facilityLayers, floodHazardLayers) {
  // Create separate layer groups
  facilityLayers[facilitiesConfig.id] = L.layerGroup();
  floodHazardLayers.forEach(hazardLayer => {
    facilityLayers[hazardLayer.id] = L.layerGroup();
  });
  
  // Create a combined overlays object for the control
  const overlays = {};
  
  // Add the facilities layer with icon
  overlays[`<i class="iconify" data-icon="mdi:map-marker-multiple" style="color: #3498db;"></i> ${facilitiesConfig.name}`] = 
    facilityLayers[facilitiesConfig.id];
  
  // Add hazard layers with icons
  floodHazardLayers.forEach(hazardLayer => {
    overlays[`<i class="iconify" data-icon="mdi:waves" style="color: #3498db;"></i> ${hazardLayer.name}`] = 
      facilityLayers[hazardLayer.id];
  });

  // Create and add the layer control to the map
  const layerControl = L.control.layers(baseLayers, overlays, { collapsed: true });
  layerControl.addTo(map);
  
  // Manually insert section titles using DOM manipulation
  setTimeout(() => {
    try {
      const container = layerControl.getContainer();
      if (!container) return;
      
      // Find the overlay section
      const overlaysDiv = container.querySelector('.leaflet-control-layers-overlays');
      if (!overlaysDiv) return;
      
      // Remove any existing titles (to avoid duplicates if this runs multiple times)
      const existingTitles = overlaysDiv.querySelectorAll('.leaflet-control-layers-title');
      existingTitles.forEach(title => title.remove());
      
      // Get all the labels in the overlay section
      const labels = overlaysDiv.querySelectorAll('label');
      if (!labels.length) return;
      
      // Find where to insert the Facilities title (before the first label)
      const facilitiesTitle = document.createElement('div');
      facilitiesTitle.className = 'leaflet-control-layers-title';
      facilitiesTitle.innerHTML = 'Facilities';
      overlaysDiv.insertBefore(facilitiesTitle, labels[0]);
      
      // Find the first flood hazard label
      let floodHazardLabel = null;
      for (let i = 0; i < labels.length; i++) {
        const text = labels[i].textContent || '';
        // Check if this label is for a flood hazard
        if (floodHazardLayers.some(h => text.includes(h.name))) {
          floodHazardLabel = labels[i];
          break;
        }
      }
      
      // Insert the Flood Hazards title if we found a flood hazard label
      if (floodHazardLabel) {
        const floodHazardsTitle = document.createElement('div');
        floodHazardsTitle.className = 'leaflet-control-layers-title';
        floodHazardsTitle.innerHTML = 'Flood Hazards';
        overlaysDiv.insertBefore(floodHazardsTitle, floodHazardLabel);
      }
    } catch (error) {
      console.error('Error adding layer control titles:', error);
    }
  }, 100); // Small delay to ensure DOM is ready
  
  return layerControl;
}

export async function handleLayerToggle(layerConfig, isAdding, showToast, map, L, facilityLayers, loadedGeojsonData, activeLeafletLayers, layerControl) {
  if (!layerConfig || !facilityLayers[layerConfig.id]) {
    console.warn('Layer config or group missing for toggle:', layerConfig?.id);
    return;
  }

  const layerGroup = facilityLayers[layerConfig.id];

  if (isAdding) {
    // Make sure the layer group is added to the map when activated
    if (!map.hasLayer(layerGroup)) {
      map.addLayer(layerGroup);
    }
    
    const loadPromise = loadAndProcessGeoJson(layerConfig, loadedGeojsonData, !showToast)
      .then((geoJsonData) => {
        if (!geoJsonData) throw new Error('No data loaded.');

        layerGroup.clearLayers();

        if (layerConfig.type === 'facility') {
          // For facility layers, immediately trigger the update for currently selected location
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
            console.log(`Displaying nearby ${layerConfig.name} for current location.`);
          } else {
            console.log(`${layerConfig.name} layer is active, waiting for location selection.`);
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
    
    // Ensure the layer is removed from the map
    if (map.hasLayer(layerGroup)) {
      map.removeLayer(layerGroup);
    }
    
    if (activeLeafletLayers[layerConfig.id]) {
      delete activeLeafletLayers[layerConfig.id];
    }
  }
}
