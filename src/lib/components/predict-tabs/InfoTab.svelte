<script>
  import { selectedLocation, findNearestPoint } from '$lib/stores/locationStore.js';
  import { waterStations, nearestWaterStation } from '$lib/stores/waterStationStore.js';
  import { metroManilaCities, nearestWeatherCity } from '$lib/stores/weatherStore.js';
  import { onMount, afterUpdate } from 'svelte';
  
  // Update nearest points whenever selectedLocation changes
  $: if ($selectedLocation.lat !== null && $selectedLocation.lng !== null) {
    // Find nearest water station
    if ($waterStations.data && $waterStations.data.length > 0) {
      const nearest = findNearestPoint(
        $selectedLocation.lat, 
        $selectedLocation.lng, 
        $waterStations.data
      );
      nearestWaterStation.set(nearest);
    }
    
    // Find nearest weather city
    const nearestCity = findNearestPoint(
      $selectedLocation.lat,
      $selectedLocation.lng,
      metroManilaCities
    );
    nearestWeatherCity.set(nearestCity);
  }
  
  // Format distance for display
  function formatDistance(distance) {
    if (distance === null || distance === undefined) return 'Unknown';
    
    if (distance < 1) {
      // Convert to meters if less than 1km
      return `${Math.round(distance * 1000)}m`;
    } else {
      // Keep in km with 1 decimal place
      return `${distance.toFixed(1)}km`;
    }
  }
</script>

<div class="info-tab">
  <h2 class="text-xl font-semibold text-[#0c3143] mb-3">Flood Prediction Information</h2>
  <p class="text-gray-700 mb-2">
    This tool provides predictions for potential flooding in Metro Manila based on current and forecasted weather conditions. Click on the map to get location-specific elevation data.
  </p>
  <p class="text-gray-700 mb-2">
    Areas highlighted on the map indicate different levels of flood risk.
  </p>
  
  <!-- Selected Location Info -->
  {#if $selectedLocation.lat !== null}
    <div class="mt-4 bg-green-50 p-3 rounded-md border border-green-200">
      <h3 class="text-lg text-[#0c3143] font-medium mb-2">Selected Location:</h3>
      <ul class="text-gray-700 text-sm space-y-1">
        <li><strong>Latitude:</strong> {$selectedLocation.lat}</li>
        <li><strong>Longitude:</strong> {$selectedLocation.lng}</li>
        <li>
          <strong>Elevation:</strong>
          {#if $selectedLocation.error}
            {$selectedLocation.elevation} <span class="text-red-600 text-xs">({$selectedLocation.error})</span>
          {:else}
            {$selectedLocation.elevation} meters
          {/if}
        </li>
      </ul>
      
      <!-- Nearest Weather City -->
      {#if $nearestWeatherCity}
        <div class="mt-3 pt-2 border-t border-green-200">
          <h4 class="font-medium text-[#0c3143] mb-1">Nearest Weather Station:</h4>
          <p class="text-sm text-gray-700">
            {$nearestWeatherCity.name} ({formatDistance($nearestWeatherCity.distance)})
          </p>
        </div>
      {/if}
      
      <!-- Nearest Water Station -->
      {#if $nearestWaterStation}
        <div class="mt-3 pt-2 border-t border-green-200">
          <h4 class="font-medium text-[#0c3143] mb-1">Nearest Water Level Station:</h4>
          <p class="text-sm text-gray-700">
            {$nearestWaterStation.obsnm} ({formatDistance($nearestWaterStation.distance)})
          </p>
          {#if $nearestWaterStation.wl}
            <p class="text-xs text-gray-600 mt-1">Current water level: {$nearestWaterStation.wl}</p>
          {/if}
        </div>
      {/if}
    </div>
  {:else}
     <p class="text-gray-500 text-sm mt-4 italic">Click on the map to select a location and view its elevation.</p>
  {/if}

  <div class="mt-4 bg-blue-50 p-3 rounded-md border border-blue-200">
    <h3 class="text-lg text-[#0c3143] font-medium mb-2">How to use:</h3>
    <ul class="list-disc pl-5 text-gray-700 text-sm">
      <li class="mb-1">Use the map controls to zoom and pan</li>
      <li class="mb-1">Switch between topographic and satellite views</li>
      <li class="mb-1">Check the Weather tab for current conditions</li>
      <li class="mb-1">View Settings to customize your experience</li>
    </ul>
  </div>
</div>
