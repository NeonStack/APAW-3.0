import { writable } from 'svelte/store';

export const selectedLocation = writable({
  lat: null,
  lng: null,
  elevation: null,
  error: null,
  locationName: null,
  loading: false // Add loading state to track when location data is being fetched
});

// Create a location loading store for dispatching loading events
export const locationLoadingStatus = writable({
  isLoading: false,
  message: ''
});

export const nearestFacilities = writable([]);

// Add new store for facilities layer status
export const facilitiesLayerActive = writable(false);

// Function to set loading state with a message
export function setLocationLoading(isLoading, message = '') {
  locationLoadingStatus.set({ isLoading, message });
}

// Add distance calculation functions
export function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1); 
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = (R * c * 1000); // Distance in meters (km * 1000)
  return distance;
}

// Function to get location name from coordinates using Nominatim
export async function getLocationName(lat, lng) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en-US,en;q=0.9',
          'User-Agent': 'APAW-FloodMonitoringApp'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch location name');
    }
    
    const data = await response.json();
    
    // Format the address
    let locationName = data.display_name || '';
    
    // Create a more concise name if possible
    if (data.address) {
      const parts = [];
      if (data.address.road) parts.push(data.address.road);
      if (data.address.suburb) parts.push(data.address.suburb);
      if (data.address.city || data.address.town || data.address.village) {
        parts.push(data.address.city || data.address.town || data.address.village);
      }
      if (data.address.state) parts.push(data.address.state);
      
      if (parts.length > 0) {
        locationName = parts.join(', ');
      }
    }
    
    return locationName;
  } catch (error) {
    console.error('Error fetching location name:', error);
    return null;
  }
}

// Function to search for locations based on query
export async function searchLocations(query) {
  try {
    // Check if the query looks like coordinates
    const coordsRegex = /^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/;
    
    if (coordsRegex.test(query)) {
      // If it's coordinates handling - unchanged
      // ...existing coordinate handling code...
      const [lat, lng] = query.split(',').map(coord => coord.trim());
      
      // Check if coordinates are within Metro Manila bounds
      const mmnBounds = {
        north: 14.8, // Northern boundary
        south: 14.4, // Southern boundary 
        east: 121.1, // Eastern boundary
        west: 120.9  // Western boundary
      };
      
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      
      if (latNum < mmnBounds.south || latNum > mmnBounds.north || 
          lngNum < mmnBounds.west || lngNum > mmnBounds.east) {
        // Return empty if coordinates are outside Metro Manila
        return [{
          lat,
          lng,
          display_name: "Note: These coordinates are outside Metro Manila",
          type: 'coordinates'
        }];
      }
      
      const locationName = await getLocationName(lat, lng);
      
      return [{
        lat,
        lng,
        display_name: locationName || `Coordinates: ${lat}, ${lng}`,
        type: 'coordinates'
      }];
    }
    
    // Enhanced location search approach
    const trimmedQuery = query.trim();
    
    // Define Metro Manila bounding box
    const viewbox = '120.9,14.4,121.1,14.8';
    
    // Try different search strategies
    let searchResults = [];
    
    // Try Photon API first (better search algorithm)
    try {
      const photonUrl = new URL('https://photon.komoot.io/api/');
      photonUrl.searchParams.append('q', trimmedQuery);
      photonUrl.searchParams.append('limit', '10');
      photonUrl.searchParams.append('lang', 'en');
      // Add bounding box for Metro Manila
      photonUrl.searchParams.append('bbox', '120.9,14.4,121.1,14.8');
      
      console.log('Photon search URL:', photonUrl.toString());
      
      const photonResponse = await fetch(photonUrl.toString(), {
        headers: {
          'User-Agent': 'APAW-FloodMonitoringApp'
        }
      });
      
      if (photonResponse.ok) {
        const photonData = await photonResponse.json();
        console.log('Photon search results:', photonData);
        
        if (photonData.features && photonData.features.length > 0) {
          // Convert Photon format to our app format
          const photonResults = photonData.features.map(feature => {
            const properties = feature.properties;
            const coordinates = feature.geometry.coordinates;
            
            // Create a formatted display name from properties
            let nameParts = [];
            if (properties.name) nameParts.push(properties.name);
            if (properties.street) nameParts.push(properties.street);
            if (properties.district) nameParts.push(properties.district);
            if (properties.city) nameParts.push(properties.city);
            if (properties.state) nameParts.push(properties.state);
            
            const display_name = nameParts.join(', ') || 'Unknown location';
            
            return {
              lat: coordinates[1].toFixed(6),
              lng: coordinates[0].toFixed(6),
              display_name: display_name,
              type: 'place'
            };
          });
          
          searchResults = photonResults;
        }
      }
    } catch (error) {
      console.error('Error with Photon search:', error);
      // Continue to fallback to Nominatim if Photon fails
    }
    
    // If Photon didn't return results, fall back to Nominatim
    if (searchResults.length === 0) {
      // First attempt: standard search with q parameter
      const searchUrl1 = new URL('https://nominatim.openstreetmap.org/search');
      searchUrl1.searchParams.append('format', 'json');
      searchUrl1.searchParams.append('q', trimmedQuery);
      searchUrl1.searchParams.append('limit', '10'); // Increased limit
      searchUrl1.searchParams.append('countrycodes', 'ph');
      searchUrl1.searchParams.append('viewbox', viewbox);
      searchUrl1.searchParams.append('bounded', '1');
      searchUrl1.searchParams.append('addressdetails', '1');
      searchUrl1.searchParams.append('dedupe', '1'); // Remove duplicates
      
      console.log('Search URL 1:', searchUrl1.toString());
      
      const response1 = await fetch(searchUrl1.toString(), {
        headers: {
          'Accept-Language': 'en-US,en;q=0.9',
          'User-Agent': 'APAW-FloodMonitoringApp'
        }
      });
      
      if (response1.ok) {
        const data1 = await response1.json();
        console.log('Search results 1:', data1);
        searchResults = data1;
      }
      
      // If no results from first attempt or query has spaces, try second approach
      // Use structured search with street parameter for multi-word searches
      if ((searchResults.length === 0 || trimmedQuery.includes(' ')) && !trimmedQuery.startsWith('bagong ')) {
        const searchUrl2 = new URL('https://nominatim.openstreetmap.org/search');
        searchUrl2.searchParams.append('format', 'json');
        searchUrl2.searchParams.append('street', trimmedQuery); // Use street parameter
        searchUrl2.searchParams.append('city', 'Manila'); // Add city context
        searchUrl2.searchParams.append('limit', '10');
        searchUrl2.searchParams.append('countrycodes', 'ph');
        searchUrl2.searchParams.append('viewbox', viewbox);
        searchUrl2.searchParams.append('bounded', '1');
        searchUrl2.searchParams.append('addressdetails', '1');
        
        console.log('Search URL 2:', searchUrl2.toString());
        
        const response2 = await fetch(searchUrl2.toString(), {
          headers: {
            'Accept-Language': 'en-US,en;q=0.9',
            'User-Agent': 'APAW-FloodMonitoringApp'
          }
        });
        
        if (response2.ok) {
          const data2 = await response2.json();
          console.log('Search results 2:', data2);
          // Append or replace results
          if (data2.length > 0) {
            if (searchResults.length === 0) {
              searchResults = data2;
            } else {
              // Combine results, avoiding duplicates by comparing display_name
              const existingNames = searchResults.map(r => r.display_name);
              data2.forEach(item => {
                if (!existingNames.includes(item.display_name)) {
                  searchResults.push(item);
                }
              });
            }
          }
        }
      }
      
      // Special handling for "bagong" followed by text (common location prefix in Metro Manila)
      if (trimmedQuery.toLowerCase().startsWith('bagong ') && searchResults.length === 0) {
        // Try search specifically for Bagong locations
        const bagongSearchUrl = new URL('https://nominatim.openstreetmap.org/search');
        // Search for just "Bagong" and then filter results client-side
        bagongSearchUrl.searchParams.append('format', 'json');
        bagongSearchUrl.searchParams.append('q', 'Bagong');
        bagongSearchUrl.searchParams.append('limit', '20'); // Get more results for filtering
        bagongSearchUrl.searchParams.append('countrycodes', 'ph');
        bagongSearchUrl.searchParams.append('viewbox', viewbox);
        bagongSearchUrl.searchParams.append('bounded', '1');
        
        console.log('Bagong search URL:', bagongSearchUrl.toString());
        
        const bagongResponse = await fetch(bagongSearchUrl.toString(), {
          headers: {
            'Accept-Language': 'en-US,en;q=0.9',
            'User-Agent': 'APAW-FloodMonitoringApp'
          }
        });
        
        if (bagongResponse.ok) {
          const bagongData = await bagongResponse.json();
          console.log('Bagong search results:', bagongData);
          
          // Filter results client-side based on the full query
          const secondWord = trimmedQuery.substring(7).toLowerCase();
          const filteredResults = bagongData.filter(item => 
            item.display_name.toLowerCase().includes(secondWord));
          
          if (filteredResults.length > 0) {
            searchResults = filteredResults;
          }
        }
      }
      
      // Format the results
      searchResults = searchResults.map(item => ({
        lat: item.lat,
        lng: item.lon,
        display_name: item.display_name,
        type: 'place'
      }));
    }
    
    return searchResults;
  } catch (error) {
    console.error('Error searching locations:', error);
    return [];
  }
}

// Function to find the nearest point from a list of points
export function findNearestPoint(lat, lng, points) {
  if (!points || points.length === 0) return null;
  
  let nearestPoint = null;
  let shortestDistance = Infinity;
  
  points.forEach(point => {
    const pointLat = point.lat || point.latitude;
    const pointLng = point.lon || point.lng || point.longitude;
    
    if (pointLat && pointLng) {
      const distance = calculateDistance(lat, lng, pointLat, pointLng);
      if (distance < shortestDistance) {
        shortestDistance = distance;
        nearestPoint = { ...point, distance };
      }
    }
  });
  
  return nearestPoint;
}

// Function to get current position using the Geolocation API
export function getCurrentPosition() {
  setLocationLoading(true, 'Getting your current location...');
  
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      setLocationLoading(false);
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      position => {
        setLocationLoading(false);
        resolve({
          lat: position.coords.latitude.toFixed(6),
          lng: position.coords.longitude.toFixed(6),
          accuracy: position.coords.accuracy // in meters
        });
      },
      error => {
        setLocationLoading(false);
        let errorMessage;
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
          default:
            errorMessage = 'Unknown location error';
        }
        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
}