<script>
  import { selectedLocation, findNearestPoint } from '$lib/stores/locationStore.js';
  import { waterStations, nearestWaterStation } from '$lib/stores/waterStationStore.js';
  import { metroManilaCities, nearestWeatherCity } from '$lib/stores/weatherStore.js';
  import { onMount, afterUpdate } from 'svelte';
  import Icon from '@iconify/svelte';
  
  // Flood prediction state
  let floodPrediction = null;
  let isPredicting = false;
  let predictionError = null;
  let selectedModel = 'rf'; // Default model (Random Forest)
  
  const modelOptions = [
    { value: 'rf', label: 'Random Forest (Recommended)' },
    { value: 'lgbm', label: 'LightGBM' },
    { value: 'lstm', label: 'LSTM Neural Network' }
  ];
  
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
    
    // Always display in meters, round to whole number
    return `${Math.round(distance)}m`;
  }
  
  // Format date to more readable format
  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric'
    });
  }
  
  // Get color based on flood probability
  function getFloodProbabilityColor(probability, prediction) {
    if (prediction === 'FLOODED') return 'text-red-600 font-bold';
    if (probability > 0.15) return 'text-orange-500 font-medium';
    return 'text-green-600';
  }
  
  // Get background color for prediction card
  function getPredictionCardStyle(prediction) {
    if (prediction === 'FLOODED') return 'bg-red-50 border-red-200';
    return 'bg-green-50 border-green-200';
  }
  
  // Request flood prediction from API
  async function predictFlood() {
    if (!$selectedLocation.lat || !$selectedLocation.lng) {
      predictionError = 'Please select a location on the map first';
      return;
    }
    
    isPredicting = true;
    predictionError = null;
    floodPrediction = null;
    
    try {
      const response = await fetch(`/api/flood-prediction?lat=${$selectedLocation.lat}&lng=${$selectedLocation.lng}&model=${selectedModel}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch prediction');
      }
      
      const data = await response.json();
      console.log('Flood prediction received:', data);
      
      // Handle response that could be an array or direct object
      if (Array.isArray(data) && data.length > 0) {
        floodPrediction = data[0]; // Extract the object from the array
      } else {
        floodPrediction = data; // Direct assignment if it's already an object
      }
      
      // Log what we're actually using
      console.log('Using flood prediction data:', floodPrediction);
      
    } catch (error) {
      console.error('Error predicting flood:', error);
      predictionError = error.message || 'Failed to fetch flood prediction';
      floodPrediction = null; // Ensure we clear any partial data
    } finally {
      isPredicting = false;
    }
  }

  // Manage expanded state for each prediction
  let expandedPredictions = {};
  
  function toggleExpand(date) {
    expandedPredictions[date] = !expandedPredictions[date];
  }
  
  // Get feature display name for better readability
  function getFeatureDisplayName(key) {
    const displayNames = {
      'Latitude': 'Latitude',
      'Longitude': 'Longitude',
      'Elevation_m': 'Elevation (m)',
      'Distance_to_Water_Station_m': 'Distance to Water Station (m)',
      'Water_Station_Rank': 'Water Station Rank',
      'Precip_mm_Today': 'Precipitation (mm)',
      'Precipitation_Hours_Today': 'Precipitation Hours',
      'Temp_Mean_2m_C_Today': 'Mean Temperature (°C)',
      'Temp_Max_2m_C_Today': 'Max Temperature (°C)',
      'Temp_Min_2m_C_Today': 'Min Temperature (°C)',
      'Relative_Humidity_Mean_2m_%_Today': 'Relative Humidity (%)',
      'Wind_Gusts_Max_10m_kmh_Today': 'Max Wind Gusts (km/h)',
      'Cloud_Cover_Mean_%_Today': 'Cloud Cover (%)',
      'Soil_Temp_0_to_7cm_C_Today': 'Soil Temperature (°C)',
      'Soil_Moisture_0_to_7cm_m3m3_Today': 'Soil Moisture (m³/m³)',
      'Total_Precip_Last2Days_mm': 'Total Rain Last 2 Days (mm)',
      'Total_Precip_Last3Days_mm': 'Total Rain Last 3 Days (mm)',
      'Total_Precip_Last4Days_mm': 'Total Rain Last 4 Days (mm)',
      'Total_Precip_Last5Days_mm': 'Total Rain Last 5 Days (mm)',
      'Water_Level_Water_Station_Today_m': 'Water Level (m)'
    };
    
    // Handle lag days
    if (key.includes('Lag')) {
      const baseName = key.replace(/_Lag\d+/, '_Today');
      const lagNumber = key.match(/_Lag(\d+)/)[1];
      const baseDisplay = displayNames[baseName] || key;
      return baseDisplay.replace('(', `Day -${lagNumber} (`);
    }
    
    return displayNames[key] || key;
  }
  
  // Group features by categories for better organization
  function groupFeatures(features) {
    const groups = {
      'Location': ['Latitude', 'Longitude', 'Elevation_m', 'Distance_to_Water_Station_m', 'Water_Station_Rank'],
      'Current Day': Object.keys(features).filter(k => k.includes('_Today')),
      'Previous Days': Object.keys(features).filter(k => k.includes('_Lag')),
      'Accumulated Precipitation': Object.keys(features).filter(k => k.includes('Total_Precip_Last')),
      'Water Levels': Object.keys(features).filter(k => k.includes('Water_Level_Water_Station'))
    };
    
    // Sort keys within groups
    for (const group in groups) {
      groups[group].sort();
    }
    
    return groups;
  }
  
  // Check if a feature has a valid value
  function hasValidValue(value) {
    return value !== null && value !== undefined;
  }
  
  // Format value with appropriate units
  function formatValue(key, value) {
    if (!hasValidValue(value)) return 'N/A';
    
    if (typeof value === 'number') {
      // Round to 2 decimal places
      const roundedValue = Math.round(value * 100) / 100;
      
      if (key.includes('Soil_Moisture')) {
        return roundedValue;
      }
      
      return roundedValue;
    }
    
    return value;
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
      
      <!-- Location name now shows at the top -->
      {#if $selectedLocation.locationName}
        <p class="text-gray-700 font-medium mb-2">{$selectedLocation.locationName}</p>
      {/if}
      
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
      
      <!-- Model Selection and Prediction Button -->
      <div class="mt-3 pt-2 border-t border-green-200">
        <div class="flex flex-col sm:flex-row sm:items-end gap-2 mb-2">
          <div class="flex-1">
            <label for="model-select" class="block text-sm font-medium text-gray-700 mb-1">
              Prediction Model:
            </label>
            <select
              id="model-select"
              bind:value={selectedModel}
              class="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              disabled={isPredicting}
            >
              {#each modelOptions as option}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
          </div>
          
          <button 
            on:click={predictFlood}
            disabled={isPredicting || !$selectedLocation.lat}
            class="px-4 py-2 bg-[#0c3143] text-white rounded-md shadow-sm hover:bg-[#1a4a5a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0c3143] disabled:opacity-50 flex items-center justify-center text-sm"
          >
            {#if isPredicting}
              <span class="inline-block animate-spin mr-2">
                <Icon icon="eos-icons:loading" width="18" />
              </span>
              Predicting...
            {:else}
              <span class="mr-1">
                <Icon icon="mdi:weather-flood" width="18" />
              </span>
              Predict Flooding
            {/if}
          </button>
        </div>
        
        {#if predictionError}
          <p class="text-red-600 text-sm mt-1">{predictionError}</p>
        {/if}
      </div>
    </div>
  {:else}
     <p class="text-gray-500 text-sm mt-4 italic">Click on the map to select a location and view its elevation, or use the search bar to find a specific location.</p>
  {/if}

  <!-- Flood Prediction Results - Debug Information -->
  {#if isPredicting}
    <div class="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
      <p class="text-center">Loading prediction data...</p>
    </div>
  {:else if floodPrediction}
    <pre class="hidden">Debug: {JSON.stringify(floodPrediction, null, 2)}</pre>
  {/if}

  <!-- Flood Prediction Results -->
  {#if floodPrediction && Array.isArray(floodPrediction.predictions) && floodPrediction.predictions.length > 0}
    <div class="mt-5">
      <h3 class="text-lg font-medium text-[#0c3143] mb-3">
        Flood Predictions: {floodPrediction.request_details?.request_time?.split(' ')[0] || 'Next 5 Days'}
      </h3>
      
      <div class="text-xs text-gray-500 mb-3">
        <p>Model Used: <span class="font-medium">{floodPrediction.request_details?.model_used || selectedModel}</span></p>
        <p>Prediction Time: {floodPrediction.request_details?.request_time || 'N/A'}</p>
      </div>

      <div class="grid grid-cols-1 gap-3">
        {#each floodPrediction.predictions as day, index}
          <div class={`p-3 rounded-md border ${getPredictionCardStyle(day.prediction)}`}>
            <div class="flex justify-between items-start">
              <div>
                <h4 class="font-medium">{formatDate(day.date)}</h4>
                <p class={getFloodProbabilityColor(day.probability_flood, day.prediction)}>
                  {day.prediction} 
                  <span class="text-sm">({(day.probability_flood * 100).toFixed(1)}% probability)</span>
                </p>
              </div>
              <div class="text-right">
                {#if day.predicted_depth_inches}
                  <p class="text-red-600 font-medium">
                    <Icon icon="mdi:water" class="inline" />
                    {(day.predicted_depth_inches * 2.54).toFixed(1)} cm depth
                  </p>
                {/if}
              </div>
            </div>
            
            <!-- Key Weather Indicators -->
            <div class="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              {#if hasValidValue(day.features_used.Precip_mm_Today)}
                <div>Precipitation: {day.features_used.Precip_mm_Today} mm</div>
              {/if}
              {#if hasValidValue(day.features_used.Precipitation_Hours_Today)}
                <div>Rain Hours: {day.features_used.Precipitation_Hours_Today} hrs</div>
              {/if}
              {#if hasValidValue(day.features_used.Total_Precip_Last3Days_mm)}
                <div>3-Day Rain Total: {day.features_used.Total_Precip_Last3Days_mm} mm</div>
              {/if}
              {#if hasValidValue(day.features_used.Soil_Moisture_0_to_7cm_m3m3_Today)}
                <div>Soil Moisture: {formatValue('Soil_Moisture_0_to_7cm_m3m3_Today', day.features_used.Soil_Moisture_0_to_7cm_m3m3_Today)} m³/m³</div>
              {/if}
            </div>
            
            <!-- Expand/Collapse Button -->
            <button 
              on:click={() => toggleExpand(day.date)}
              class="mt-2 text-xs text-blue-600 hover:text-blue-800 focus:outline-none flex items-center"
            >
              <Icon icon={expandedPredictions[day.date] ? "mdi:chevron-up" : "mdi:chevron-down"} width="16" class="mr-1" />
              {expandedPredictions[day.date] ? 'Hide details' : 'Show all data'}
            </button>
            
            <!-- Expanded Details -->
            {#if expandedPredictions[day.date] && day.features_used}
              <div class="mt-2 p-2 bg-white rounded border border-gray-200 text-xs">
                <div class="mb-2">
                  <h5 class="font-medium text-gray-700">Location Data</h5>
                  <div class="grid grid-cols-2 gap-x-3 gap-y-1">
                    {#each groupFeatures(day.features_used)['Location'] as key}
                      {#if hasValidValue(day.features_used[key])}
                        <div>
                          <span class="text-gray-500">{getFeatureDisplayName(key)}:</span> 
                          {formatValue(key, day.features_used[key])}
                        </div>
                      {/if}
                    {/each}
                  </div>
                </div>
                
                <div class="mb-2">
                  <h5 class="font-medium text-gray-700">Forecast Day Weather ({day.date})</h5>
                  <div class="grid grid-cols-2 gap-x-3 gap-y-1">
                    {#each groupFeatures(day.features_used)['Current Day'] as key}
                      {#if hasValidValue(day.features_used[key])}
                        <div>
                          <span class="text-gray-500">{getFeatureDisplayName(key)}:</span> 
                          {formatValue(key, day.features_used[key])}
                        </div>
                      {/if}
                    {/each}
                  </div>
                </div>
                
                <div class="mb-2">
                  <h5 class="font-medium text-gray-700">Previous Days Weather</h5>
                  <div class="grid grid-cols-2 gap-x-3 gap-y-1">
                    {#each groupFeatures(day.features_used)['Previous Days'] as key}
                      {#if hasValidValue(day.features_used[key])}
                        <div>
                          <span class="text-gray-500">{getFeatureDisplayName(key)}:</span> 
                          {formatValue(key, day.features_used[key])}
                        </div>
                      {/if}
                    {/each}
                  </div>
                </div>
                
                <div class="mb-2">
                  <h5 class="font-medium text-gray-700">Accumulated Precipitation</h5>
                  <div class="grid grid-cols-2 gap-x-3 gap-y-1">
                    {#each groupFeatures(day.features_used)['Accumulated Precipitation'] as key}
                      {#if hasValidValue(day.features_used[key])}
                        <div>
                          <span class="text-gray-500">{getFeatureDisplayName(key)}:</span> 
                          {formatValue(key, day.features_used[key])}
                        </div>
                      {/if}
                    {/each}
                  </div>
                </div>
                
                <div class="mb-2">
                  <h5 class="font-medium text-gray-700">Water Levels</h5>
                  <div class="grid grid-cols-2 gap-x-3 gap-y-1">
                    {#each groupFeatures(day.features_used)['Water Levels'] as key}
                      {#if hasValidValue(day.features_used[key])}
                        <div>
                          <span class="text-gray-500">{getFeatureDisplayName(key)}:</span> 
                          {formatValue(key, day.features_used[key])}
                        </div>
                      {/if}
                    {/each}
                  </div>
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
      
      <div class="mt-3 text-xs text-gray-500">
        <p>Predictions are based on historical data, current weather conditions, and forecast models.</p>
        <p>Elevation: {floodPrediction.predictions[0]?.features_used.Elevation_m || 'N/A'} meters</p>
        <p>Distance to nearest water station: {floodPrediction.predictions[0]?.features_used.Distance_to_Water_Station_m.toFixed(1) || 'N/A'} meters</p>
      </div>
    </div>
  {:else if predictionError}
    <div class="mt-4 p-3 bg-red-50 rounded-md border border-red-200">
      <p class="text-red-600 font-medium">Error: {predictionError}</p>
    </div>
  {/if}

  <!-- How to use section -->
  <div class="mt-4 bg-blue-50 p-3 rounded-md border border-blue-200">
    <h3 class="text-lg text-[#0c3143] font-medium mb-2">How to use:</h3>
    <ul class="list-disc pl-5 text-gray-700 text-sm">
      <li class="mb-1">Use the search bar to find specific locations</li>
      <li class="mb-1">Enter coordinates (e.g., "14.5995, 120.9842") to jump to exact points</li>
      <li class="mb-1">Click on the map to select a point and view its elevation</li>
      <li class="mb-1">Use the "Predict Flooding" button to get a 5-day flood forecast</li>
      <li class="mb-1">Different models may provide varying predictions - RF is recommended</li>
    </ul>
  </div>
</div>
