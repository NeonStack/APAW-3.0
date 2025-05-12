import { toast } from 'svelte-sonner';
import { selectedLocation, getLocationName, setLocationLoading } from '$lib/stores/locationStore.js';
import { 
  NEARBY_RADIUS_METERS, 
  getFacilityIconAndColor, 
  getFacilityFriendlyName, 
  getFacilityType,
  formatFacilityType 
} from './MapConfig.js';
import { get } from 'svelte/store';

export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180; // Fix: Changed lon1-lon1 to lon2-lon1
  
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

export function createFacilityIcon(L, options) {
  const iconHtml = `<div class="facility-marker-wrapper">
                    <i class="iconify" data-icon="${options.icon}" style="color: ${options.color}; font-size: 18px;"></i>
                  </div>`;
  return L.divIcon({
    html: iconHtml,
    className: 'facility-marker-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
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

export async function setSelectedLocation(lat, lng, locationName = null, map, L, marker, dispatch, tempMarker = null) {
  setLocationLoading(true, 'Fetching location data...');
  dispatch('locationSelectionStart', { lat, lng });

  const currentLat = parseFloat(lat).toFixed(6);
  const currentLng = parseFloat(lng).toFixed(6);

  // If there's no temporary marker, remove the existing marker
  // If there is a temporary marker, we'll keep it until we're ready to replace it
  if (!tempMarker && marker && map) {
    try {
      map.removeLayer(marker);
      marker = null;
    } catch (e) {
      console.error('Error removing existing marker:', e);
    }
  }

  const elevationResult = await fetchElevation(currentLat, currentLng);

  // Handle error cases
  if (
    elevationResult &&
    typeof elevationResult === 'object' &&
    elevationResult.error
  ) {
    const errorMessage = elevationResult.error;
    toast.error(`${errorMessage}`);
    setLocationLoading(false);
    dispatch('locationSelectionComplete', { error: errorMessage });
    
    // If there was a temp marker, remove it
    if (tempMarker && map) {
      try {
        map.removeLayer(tempMarker);
      } catch (e) {
        console.error('Error removing temporary marker:', e);
      }
    }
    
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

  // Remove the temporary marker if it exists
  if (tempMarker && map) {
    try {
      map.removeLayer(tempMarker);
    } catch (e) {
      console.error('Error removing temporary marker:', e);
    }
  }

  // Create the final marker
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

// Handles both points and polygons/multipolygons
function getFeatureCoordinates(feature) {
  if (!feature.geometry) return null;
  
  if (feature.geometry.type === 'Point') {
    return {
      lat: feature.geometry.coordinates[1],
      lng: feature.geometry.coordinates[0]
    };
  } 
  else if (feature.geometry.type === 'Polygon') {
    const firstCoord = feature.geometry.coordinates[0][0];
    return {
      lat: firstCoord[1],
      lng: firstCoord[0]
    };
  }
  else if (feature.geometry.type === 'MultiPolygon') {
    const firstCoord = feature.geometry.coordinates[0][0][0];
    return {
      lat: firstCoord[1],
      lng: firstCoord[0]
    };
  }
  return null;
}

// Format property value for display (convert fire_station -> Fire Station)
function formatPropertyValue(value) {
  if (!value || typeof value !== 'string') return value;
  
  return value
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Extract readable property info from facility properties
function getFormattedAddress(properties) {
  if (!properties) return null;
  
  // Collect address components
  const addressParts = [];
  
  // Street and house number
  if (properties['addr:housenumber'] && properties['addr:street']) {
    addressParts.push(`${properties['addr:housenumber']} ${properties['addr:street']}`);
  } else if (properties['addr:street']) {
    addressParts.push(properties['addr:street']);
  }
  
  // City/municipality
  if (properties['addr:city']) {
    addressParts.push(properties['addr:city']);
  } else if (properties['addr:district']) {
    addressParts.push(properties['addr:district']);
  }
  
  // Province
  if (properties['addr:province']) {
    addressParts.push(properties['addr:province']);
  }
  
  // Postcode
  if (properties['addr:postcode']) {
    addressParts.push(properties['addr:postcode']);
  }
  
  return addressParts.length > 0 ? addressParts.join(', ') : null;
}

// Extract building info from properties with better formatting
function getBuildingInfo(properties) {
  if (!properties) return [];
  
  const buildingInfo = [];
  const skipKeys = ['building:part', 'building:type']; // Skip these building keys
  
  // Extract building keys like building:levels, building:material, etc.
  Object.keys(properties).forEach(key => {
    if (key.startsWith('building:') && !skipKeys.includes(key)) {
      // Extract the part after building:
      const label = key.replace('building:', '');
      // Capitalize first letter and replace underscores
      const formattedLabel = label
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      // Format the value if it's a string
      const value = typeof properties[key] === 'string' 
        ? formatPropertyValue(properties[key]) 
        : properties[key];
      
      buildingInfo.push({
        label: formattedLabel,
        value: value
      });
    }
  });
      
  return buildingInfo;
}

// Get additional properties worth displaying with better formatting
function getAdditionalProperties(properties) {
  if (!properties) return [];
  
  const additionalProps = [];
  // IMPORTANT: Using EXACTLY the same properties as in InfoTab.svelte
  const interestingProps = [
    'amenity', 'emergency', 'evacuation_center', 'leisure', 'operator', 'capacity'
  ];
  
  interestingProps.forEach(prop => {
    if (properties[prop] && properties[prop] !== 'yes') {
      // Format the label
      let label = prop;
      if (prop.includes(':')) {
        label = prop.split(':')[1];
      }
      
      // Properly format the label with spaces and capitalization
      label = label
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      // Format the value if it's a string
      const value = typeof properties[prop] === 'string' 
        ? formatPropertyValue(properties[prop]) 
        : properties[prop];
      
      additionalProps.push({
        label,
        value
      });
    }
  });
  
  return additionalProps;
}

// Modified to handle consolidated facilities with improved popup content
export function displayNearbyFacilities(centerLat, centerLng, radius, map, L, facilityLayers, loadedGeojsonData) {
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
    const distance = calculateDistance(parseFloat(centerLat), parseFloat(centerLng), featureLat, featureLng);

    if (distance <= radius) {
      count++;
      const { icon, color } = getFacilityIconAndColor(feature.properties);
      const marker = L.marker([featureLat, featureLng], {
        icon: createFacilityIcon(L, { icon, color })
      });

      const friendlyName = getFacilityFriendlyName(feature.properties);
      const facilityType = getFacilityType(feature.properties);
      
      // New enhanced popup content that matches InfoTab display
      let popupContent = `<div class="facility-popup">`;
      
      // Facility Name and Type Header
      popupContent += `<h4 style="margin:0 0 5px 0;font-size:14px;color:#0c3143;">${friendlyName}</h4>`;
      
      if (facilityType && friendlyName !== facilityType) {
        popupContent += `<div style="font-size:12px;color:#555;margin-bottom:5px;"><b>${facilityType}</b></div>`;
      }
      
      // Address Section
      const formattedAddress = getFormattedAddress(feature.properties);
      if (formattedAddress) {
        popupContent += `<div style="margin-top:8px;margin-bottom:8px;">`;
        popupContent += `<div style="font-size:12px;color:#666;"><b>Address:</b> ${formattedAddress}</div>`;
        popupContent += `</div>`;
      }
      
      // Building Info Section
      const buildingInfo = getBuildingInfo(feature.properties);
      if (buildingInfo.length > 0) {
        popupContent += `<div style="margin-top:8px;margin-bottom:8px;">`;
        popupContent += `<div style="font-size:12px;color:#666;"><b>Building:</b></div>`;
        
        buildingInfo.forEach(info => {
          popupContent += `<div style="font-size:11px;color:#666;margin-left:8px;">
            <span style="color:#555;">${info.label}:</span> ${info.value}
          </div>`;
        });
        
        popupContent += `</div>`;
      }
      
      // Additional Properties Section
      const additionalProps = getAdditionalProperties(feature.properties);
      if (additionalProps.length > 0) {
        popupContent += `<div style="margin-top:8px;">`;
        popupContent += `<div style="font-size:12px;color:#666;"><b>Details:</b></div>`;
        
        additionalProps.forEach(prop => {
          // Removed the special handling for website links
          popupContent += `<div style="font-size:11px;color:#666;margin-left:8px;">
            <span style="color:#555;">${prop.label}:</span> ${prop.value}
          </div>`;
        });
        
        popupContent += `</div>`;
      }
      
      // Show message if no additional info was found
      if (!formattedAddress && buildingInfo.length === 0 && additionalProps.length === 0) {
        popupContent += `<div style="font-size:11px;color:#666;text-align:center;margin-top:5px;">
          No additional information available
        </div>`;
      }
      
      popupContent += `</div>`;
      
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
        const friendlyName = getFacilityFriendlyName(feature.properties);
        const facilityType = getFacilityType(feature.properties);
        
        allNearbyFacilitiesList.push({
          id: feature.properties['@id'] || `facility-${index}`,
          name: feature.properties.name || friendlyName,
          type: facilityType,
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
  const top5Facilities = allNearbyFacilitiesList.slice(0, 5);
  nearestFacilities.set(top5Facilities);
}
