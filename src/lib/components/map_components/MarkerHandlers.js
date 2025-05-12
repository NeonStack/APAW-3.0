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
      
      let popupContent = `<div class="facility-popup">`;
      popupContent += `<h4 style="margin:0 0 5px 0;font-size:14px;color:#0c3143;">${friendlyName}</h4>`;
      
      if (facilityType && friendlyName !== facilityType) {
        popupContent += `<div style="font-size:12px;color:#555;margin-bottom:5px;"><b>${facilityType}</b></div>`;
      }
      
      let hasAddress = false;
      let addressParts = [];
      
      if (feature.properties['addr:housenumber'] && feature.properties['addr:street']) {
        addressParts.push(`${feature.properties['addr:housenumber']} ${feature.properties['addr:street']}`);
        hasAddress = true;
      } else if (feature.properties['addr:street']) {
        addressParts.push(feature.properties['addr:street']);
        hasAddress = true;
      }
      
      if (feature.properties['addr:city']) {
        addressParts.push(feature.properties['addr:city']);
      } else if (feature.properties['addr:district']) {
        addressParts.push(feature.properties['addr:district']);
      }
      
      if (feature.properties['addr:province']) {
        addressParts.push(feature.properties['addr:province']);
      }
      
      if (addressParts.length > 0) {
        popupContent += `<div style="font-size:12px;color:#666;margin-bottom:5px;">${addressParts.join(', ')}</div>`;
      }
      
      let detailsAdded = false;
      
      if (feature.properties.phone) {
        popupContent += `<div style="font-size:11px;color:#666;"><b>Phone:</b> ${feature.properties.phone}</div>`;
        detailsAdded = true;
      }
      
      if (feature.properties.website) {
        popupContent += `<div style="font-size:11px;color:#666;"><b>Website:</b> <a href="${feature.properties.website}" target="_blank">${feature.properties.website.replace(/^https?:\/\//, '')}</a></div>`;
        detailsAdded = true;
      }
      
      if (feature.properties.opening_hours) {
        popupContent += `<div style="font-size:11px;color:#666;"><b>Hours:</b> ${feature.properties.opening_hours}</div>`;
        detailsAdded = true;
      }
      
      if (feature.properties.emergency && feature.properties.emergency !== 'yes') {
        popupContent += `<div style="font-size:11px;color:#666;"><b>Emergency Type:</b> ${formatFacilityType(feature.properties.emergency)}</div>`;
        detailsAdded = true;
      }
      
      if (feature.properties.capacity) {
        popupContent += `<div style="font-size:11px;color:#666;"><b>Capacity:</b> ${feature.properties.capacity}</div>`;
        detailsAdded = true;
      }
      
      if (feature.properties.religion) {
        popupContent += `<div style="font-size:11px;color:#666;"><b>Religion:</b> ${formatFacilityType(feature.properties.religion)}</div>`;
        detailsAdded = true;
      }
      
      if (feature.properties.operator) {
        popupContent += `<div style="font-size:11px;color:#666;"><b>Operator:</b> ${feature.properties.operator}</div>`;
        detailsAdded = true;
      }
      
      popupContent += `</div>`;
      
      marker.bindPopup(popupContent);
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
