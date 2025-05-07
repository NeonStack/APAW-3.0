import { toast } from 'svelte-sonner';
import { selectedLocation, getLocationName, setLocationLoading } from '$lib/stores/locationStore.js';
import { NEARBY_RADIUS_METERS, facilityTypes } from './MapConfig.js';
import { get } from 'svelte/store';

export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

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

export async function setSelectedLocation(lat, lng, locationName = null, map, L, marker, dispatch) {
  let isSelectingLocation = true;
  setLocationLoading(true, 'Fetching location data...');
  dispatch('locationSelectionStart', { lat, lng });

  const currentLat = parseFloat(lat).toFixed(6);
  const currentLng = parseFloat(lng).toFixed(6);

  const elevationResult = await fetchElevation(currentLat, currentLng);

  if (
    elevationResult &&
    typeof elevationResult === 'object' &&
    elevationResult.error
  ) {
    const errorMessage = elevationResult.error;
    toast.error(`${errorMessage}`);
    setLocationLoading(false);
    isSelectingLocation = false;
    dispatch('locationSelectionComplete', { error: errorMessage });

    if (marker && map) {
      map.removeLayer(marker);
      marker = null;
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

  if (marker && map) {
    map.removeLayer(marker);
    marker = null;
  }

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

  isSelectingLocation = false;
  setLocationLoading(false);

  dispatch('locationSelectionComplete', {
    lat: currentLat,
    lng: currentLng,
    elevation: typeof elevationResult === 'number' ? elevationResult.toFixed(2) : 'N/A',
    locationName
  });
  
  return marker;
}

export function displayNearbyFacilities(typeInfo, centerLat, centerLng, radius, map, L, facilityLayers, loadedGeojsonData) {
  const { id, name, icon, color } = typeInfo;
  const fullGeojsonData = loadedGeojsonData[id];

  if (!map || !facilityLayers[id] || !fullGeojsonData || !fullGeojsonData.features) {
    console.warn(`Cannot display nearby ${name}: Map, layer group, or data missing.`);
    return;
  }

  facilityLayers[id].clearLayers();

  let count = 0;
  fullGeojsonData.features.forEach((feature) => {
    if (feature.geometry && feature.geometry.type === 'Point') {
      const coords = feature.geometry.coordinates;
      const featureLng = coords[0];
      const featureLat = coords[1];

      const distance = calculateDistance(parseFloat(centerLat), parseFloat(centerLng), featureLat, featureLng);

      if (distance <= radius) {
        count++;
        const marker = L.marker([featureLat, featureLng], {
          icon: createFacilityIcon(L, { icon, color })
        });

        let popupContent = `<b>${name}</b><br>`;
        const props = feature.properties;
        const nameProp =
          props.NAME || props.Name || props.name || props.facility_n || props.school_nam;
        const addressProp = props.ADDRESS || props.Address || props.address || props.location;
        if (nameProp) popupContent += `${nameProp}<br>`;
        else popupContent += `Unnamed ${name}<br>`;
        if (addressProp) popupContent += `${addressProp}<br>`;
        marker.bindPopup(popupContent);

        facilityLayers[id].addLayer(marker);
      }
    }
  });
  console.log(`Displayed ${count} nearby ${name}(s) within ${radius}m.`);
}

export function updateNearestFacilitiesList(map, nearestFacilities, loadedGeojsonData, facilityTypes) {
  const location = get(selectedLocation);
  const allNearbyFacilitiesList = [];

  if (!map || !location || location.lat === null || location.lng === null) {
    nearestFacilities.set([]);
    return;
  }
  
  const centerLat = parseFloat(location.lat);
  const centerLng = parseFloat(location.lng);

  facilityTypes.forEach((typeInfo) => {
    if (loadedGeojsonData[typeInfo.id]) {
      const fullGeojsonData = loadedGeojsonData[typeInfo.id];
      if (!fullGeojsonData || !fullGeojsonData.features) return;

      fullGeojsonData.features.forEach((feature, index) => {
        if (feature.geometry && feature.geometry.type === 'Point') {
          const coords = feature.geometry.coordinates;
          const featureLng = coords[0];
          const featureLat = coords[1];
          const distance = calculateDistance(centerLat, centerLng, featureLat, featureLng);

          if (distance <= NEARBY_RADIUS_METERS) {
            const props = feature.properties;
            const nameProp =
              props.NAME || props.Name || props.name || props.facility_n || props.school_nam;
            allNearbyFacilitiesList.push({
              id: feature.id || `${typeInfo.id}-${index}`,
              name: nameProp || `Unnamed ${typeInfo.name}`,
              type: typeInfo.name,
              distance: distance,
              lat: featureLat,
              lng: featureLng,
              icon: typeInfo.icon,
              color: typeInfo.color
            });
          }
        }
      });
    }
  });
  
  allNearbyFacilitiesList.sort((a, b) => a.distance - b.distance);
  const top5Facilities = allNearbyFacilitiesList.slice(0, 5);
  nearestFacilities.set(top5Facilities);
}
