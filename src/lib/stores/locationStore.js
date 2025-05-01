import { writable } from 'svelte/store';

export const selectedLocation = writable({
  lat: null,
  lng: null,
  elevation: null,
  error: null
});

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
  const distance = R * c; // Distance in km
  return distance;
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