<script>
  import { selectedLocation } from '$lib/stores/locationStore.js';
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
