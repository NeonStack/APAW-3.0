/**
 * Implementation of grouped layer control for better layer organization
 */

import { facilitiesConfig, floodHazardLayers } from './MapConfig.js';

export function setupGroupedLayerControl(L, map, baseLayers, facilityLayers, floodHazardLayers) {
  if (!L || !map) {
    console.error('Cannot setup grouped layer control: missing required parameters');
    return null;
  }
  
  // Check if L.control.groupedLayers exists (plugin is loaded)
  if (!L.control.groupedLayers) {
    console.error('Leaflet.groupedlayercontrol plugin is not loaded. Falling back to standard layer control.');
    // Fallback to standard layer control
    const fallbackControl = L.control.layers(baseLayers, {}, { collapsed: true });
    fallbackControl.addTo(map);
    return fallbackControl;
  }
  
  // Make sure all needed layer groups exist
  ensureLayerGroupsExist(L, facilityLayers, floodHazardLayers);
  
  // Structure the overlays in groups
  const groupedOverlays = {
    "Facilities": {
      [facilitiesConfig.name]: facilityLayers[facilitiesConfig.id]
    },
    "Flood Hazards": {},
    "Weather": {}
  };
  
  // Add flood hazard layers to their group
  floodHazardLayers.forEach(hazardLayer => {
    groupedOverlays["Flood Hazards"][hazardLayer.name] = facilityLayers[hazardLayer.id];
  });
  
  // Configure options for the grouped layer control
  const options = {
    // Make the "Weather" group exclusive (use radio inputs)
    exclusiveGroups: ["Weather"],
    // Show a checkbox next to non-exclusive group labels for toggling all
    groupCheckboxes: true
  };
  
  // Create and add the grouped layer control
  const layerControl = L.control.groupedLayers(baseLayers, groupedOverlays, options);
  layerControl.addTo(map);
  
  return layerControl;
}

function ensureLayerGroupsExist(L, facilityLayers, floodHazardLayers) {
  // Create the facilities layer group if it doesn't exist
  if (!facilityLayers[facilitiesConfig.id]) {
    facilityLayers[facilitiesConfig.id] = L.layerGroup();
  }
  
  // Create flood hazard layer groups if they don't exist
  floodHazardLayers.forEach(hazardLayer => {
    if (!facilityLayers[hazardLayer.id]) {
      facilityLayers[hazardLayer.id] = L.layerGroup();
    }
  });
}

export function addWeatherLayersToGroupedControl(layerControl, weatherLayers) {
  if (!layerControl || !weatherLayers) return;
  
  // Add each weather layer to the "Weather" group
  layerControl.addOverlay(weatherLayers.precipitation, "Precipitation", "Weather");
  layerControl.addOverlay(weatherLayers.temperature, "Temperature", "Weather");
  layerControl.addOverlay(weatherLayers.windGroup, "Wind", "Weather");
  layerControl.addOverlay(weatherLayers.clouds, "Clouds", "Weather");
  layerControl.addOverlay(weatherLayers.pressure, "Pressure", "Weather");
  layerControl.addOverlay(weatherLayers.humidity, "Humidity", "Weather");
}
