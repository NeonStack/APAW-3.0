export const NEARBY_RADIUS_METERS = 1000;

// Replace multiple facility types with a single consolidated facilities layer
export const facilitiesConfig = {
  id: 'facilities',
  name: 'Nearby Facilities',
  filePath: '/geojson/facilities.geojson',
  type: 'facility'
};

// Helper function to determine facility icon and color
export function getFacilityIconAndColor(properties) {
  // Default values
  let icon = 'mdi:help-circle';
  let color = '#7e7e7e';
  
  // Check for specific facility types and assign appropriate icons
  if (properties.amenity === 'fire_station') {
    icon = 'mdi:fire-station';
    color = '#FF6347'; // Tomato Red
  } 
  else if (properties.amenity === 'police') {
    icon = 'mdi:police-station';
    color = '#1E90FF'; // Dodger Blue
  }
  else if (properties.amenity === 'hospital' || properties.amenity === 'clinic' || properties.amenity === 'doctors') {
    icon = 'mdi:hospital-building';
    color = '#32CD32'; // Lime Green
  }
  else if (properties.amenity === 'school' || properties.amenity === 'university' || properties.amenity === 'college') {
    icon = 'mdi:school';
    color = '#FFCC00'; // Gold
  }
  else if (properties.amenity === 'place_of_worship') {
    icon = 'mdi:church';
    color = '#9370DB'; // Medium Purple
  }
  else if (properties.leisure === 'sports_centre' || properties.leisure === 'sports_hall') {
    icon = 'mdi:basketball';
    color = '#FF8C00'; // Dark Orange
  }
  else if (properties.emergency === 'evacuation_centre') {
    icon = 'mdi:home-group';
    color = '#4CAF50'; // Green
  }
  else if (properties.amenity === 'community_centre') {
    icon = 'mdi:account-group';
    color = '#9C27B0'; // Purple
  }
  
  return { icon, color };
}

// Helper function to format facility type strings (e.g., "fire_station" -> "Fire Station")
export function formatFacilityType(typeString) {
  if (!typeString) return '';
  
  return typeString
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Get a friendly name for display in popups and InfoTab
export function getFacilityFriendlyName(properties) {
  // Use the provided name as primary
  if (properties.name) {
    return properties.name;
  }
  
  // If no name, try to determine a descriptive type
  let facilityType = null;
  
  if (properties.amenity) {
    facilityType = formatFacilityType(properties.amenity);
  } else if (properties.emergency) {
    facilityType = formatFacilityType(properties.emergency);
  } else if (properties.leisure) {
    facilityType = formatFacilityType(properties.leisure);
  } else if (properties.building && properties.building !== 'yes') {
    facilityType = formatFacilityType(properties.building);
  }
  
  return facilityType || 'Facility';
}

// Get a more detailed facility type description for the InfoTab
export function getFacilityType(properties) {
  if (properties.amenity) {
    return formatFacilityType(properties.amenity);
  } else if (properties.emergency) {
    return formatFacilityType(properties.emergency);
  } else if (properties.leisure) {
    return formatFacilityType(properties.leisure);
  } else if (properties.building && properties.building !== 'yes') {
    return formatFacilityType(properties.building);
  }
  
  return 'Other';
}

export const floodHazardLayers = [
  {
    id: 'flood_hazard_5yr',
    name: '5-year Flood Hazard',
    filePath: '/geojson/MetroManila_Flood_5year_lite.json',
    type: 'hazard',
    estimatedSizeMB: 15,
    style: function (feature) {
      const varValue = feature.properties.Var;
      let fillColor = 'rgba(128,128,128,0.5)';

      if (varValue === 1.0) {
        fillColor = 'rgba(255, 255, 0, 0.6)';
      } else if (varValue === 2.0) {
        fillColor = 'rgba(255, 165, 0, 0.6)';
      } else if (varValue === 3.0) {
        fillColor = 'rgba(255, 0, 0, 0.6)';
      }
      return {
        fillColor: fillColor,
        weight: 0,
        fillOpacity: 0.6
      };
    }
  }
];

// Updated to include facilitiesConfig instead of facilityTypes array
export const allLayerConfigs = [facilitiesConfig, ...floodHazardLayers];

export const baseMaps = {
  standard: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  topographic: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  osmHot: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
  positron: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  darkMatter: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  esriStreet: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
  // Only keep Esri Topo which works well
  esriTopo: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
  // Removing stamenTerrain, thunderforestOutdoors, thunderforestLandscape, and esriTerrain
};

// Add attribution info for remaining map providers
export const mapAttributions = {
  // Removing stamenTerrain, thunderforestOutdoors, thunderforestLandscape
  esriTopo: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
  // Removing esriTerrain
};
