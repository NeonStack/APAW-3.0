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
  <h2 class="text-xl font-semibold text-[#0c3143] mb-4">Flood Prediction Information</h2>
  
  <!-- Quick Help Cards -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
    <div class="bg-blue-50 p-3 rounded-md border border-blue-200 h-full">
      <h3 class="text-sm font-semibold text-[#0c3143] mb-2 flex items-center">
        <Icon icon="mdi:information-outline" class="mr-1" />
        About This Tool
      </h3>
      <p class="text-gray-700 text-xs">
        This tool provides predictions for potential flooding in Metro Manila based on current and forecasted weather conditions. Click on the map to get location-specific elevation data.
      </p>
    </div>
    <div class="bg-blue-50 p-3 rounded-md border border-blue-200 h-full">
      <h3 class="text-sm font-semibold text-[#0c3143] mb-2 flex items-center">
        <Icon icon="mdi:map-marker-radius" class="mr-1" />
        Map Highlights
      </h3>
      <p class="text-gray-700 text-xs">
        Areas highlighted on the map indicate different levels of flood risk. Water stations are color-coded by alert level.
      </p>
    </div>
  </div>
  
  <!-- Selected Location Info - Better Card Design -->
  {#if $selectedLocation.lat !== null}
    <div class="mt-4 bg-white p-4 rounded-md border border-gray-200 shadow-sm">
      <div class="flex justify-between items-start mb-2">
        <h3 class="text-lg text-[#0c3143] font-medium">Selected Location</h3>
        <!-- Location Details Badge -->
        <span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Details</span>
      </div>
      
      <!-- Location name with icon -->
      {#if $selectedLocation.locationName}
        <div class="flex items-start mb-3">
          <Icon icon="mdi:map-marker" class="text-red-500 mt-1 mr-1.5" width="16" />
          <p class="text-gray-700 font-medium">{$selectedLocation.locationName}</p>
        </div>
      {/if}
      
      <!-- Main info in a grid layout -->
      <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-3">
        <div class="flex items-center">
          <Icon icon="mdi:latitude" class="text-gray-500 mr-1.5" width="16" />
          <div>
            <span class="text-gray-500">Latitude:</span>
            <span class="font-medium ml-1">{$selectedLocation.lat}</span>
          </div>
        </div>
        <div class="flex items-center">
          <Icon icon="mdi:longitude" class="text-gray-500 mr-1.5" width="16" />
          <div>
            <span class="text-gray-500">Longitude:</span>
            <span class="font-medium ml-1">{$selectedLocation.lng}</span>
          </div>
        </div>
        <div class="flex items-center col-span-2">
          <Icon icon="mdi:elevation-rise" class="text-gray-500 mr-1.5" width="16" />
          <div>
            <span class="text-gray-500">Elevation:</span>
            {#if $selectedLocation.error}
              <span class="font-medium ml-1">{$selectedLocation.elevation}</span>
              <span class="text-red-600 text-xs ml-1">({$selectedLocation.error})</span>
            {:else}
              <span class="font-medium ml-1">{$selectedLocation.elevation} meters</span>
            {/if}
          </div>
        </div>
      </div>
      
      <!-- Nearest Stations with Visual Separators -->
      <div class="space-y-3">
        <!-- Nearest Weather City -->
        {#if $nearestWeatherCity}
          <div class="pt-3 border-t border-gray-100">
            <div class="flex items-center">
              <Icon icon="mdi:weather-partly-cloudy" class="text-blue-500 mr-1.5" width="18" />
              <h4 class="font-medium text-[#0c3143]">Nearest Weather Forecast</h4>
            </div>
            <div class="flex items-center mt-1 ml-6">
              <span class="text-sm text-gray-700">{$nearestWeatherCity.name}</span>
              <span class="bg-blue-50 text-blue-700 text-xs rounded-full px-2 py-0.5 ml-2">
                {formatDistance($nearestWeatherCity.distance)}
              </span>
            </div>
          </div>
        {/if}
        
        <!-- Nearest Water Station -->
        {#if $nearestWaterStation}
          <div class="pt-3 border-t border-gray-100">
            <div class="flex items-center">
              <Icon icon="mdi:water" class="text-blue-500 mr-1.5" width="18" />
              <h4 class="font-medium text-[#0c3143]">Nearest Water Level Station</h4>
            </div>
            <div class="flex items-center mt-1 ml-6">
              <span class="text-sm text-gray-700">{$nearestWaterStation.obsnm}</span>
              <span class="bg-blue-50 text-blue-700 text-xs rounded-full px-2 py-0.5 ml-2">
                {formatDistance($nearestWaterStation.distance)}
              </span>
            </div>
            {#if $nearestWaterStation.wl}
              <div class="flex items-center mt-1 ml-6">
                <span class="text-xs text-gray-600">Current water level:</span>
                <span class="text-xs font-medium ml-1 text-blue-800">{$nearestWaterStation.wl}</span>
              </div>
            {/if}
          </div>
        {/if}
        
        <!-- Model Selection and Prediction Button - Better Layout -->
        <div class="pt-3 border-t border-gray-100">
          <div class="mb-2">
            <label for="model-select" class="flex items-center text-sm font-medium text-[#0c3143] mb-1.5">
              <Icon icon="mdi:chart-box" class="mr-1.5" width="18" />
              Prediction Model
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
            class="w-full px-4 py-2.5 bg-[#0c3143] text-white rounded-md shadow-sm hover:bg-[#1a4a5a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0c3143] disabled:opacity-50 flex items-center justify-center text-sm transition duration-150"
          >
            {#if isPredicting}
              <span class="inline-block animate-spin mr-2">
                <Icon icon="eos-icons:loading" width="18" />
              </span>
              Predicting...
            {:else}
              <span class="mr-1.5">
                <Icon icon="mdi:weather-flood" width="18" />
              </span>
              Predict Flooding
            {/if}
          </button>
          
          {#if predictionError}
            <p class="text-red-600 text-sm mt-1 flex items-center">
              <Icon icon="mdi:alert-circle" class="mr-1" width="16" />
              {predictionError}
            </p>
          {/if}
        </div>
      </div>
    </div>
  {:else}
     <div class="mt-4 bg-blue-50 p-4 rounded-md border border-blue-200 flex items-center">
       <Icon icon="mdi:gesture-tap" class="text-blue-500 mr-2" width="20" />
       <p class="text-gray-600 text-sm italic">Click on the map to select a location and view its elevation, or use the search bar to find a specific location.</p>
     </div>
  {/if}

  <!-- Flood Prediction Results - Loading State -->
  {#if isPredicting}
    <div class="mt-4 p-4 bg-blue-50 rounded-md border border-blue-200">
      <div class="flex justify-center items-center">
        <Icon icon="eos-icons:loading" class="animate-spin text-blue-500 mr-2" width="24" />
        <p class="text-blue-700">Processing prediction data...</p>
      </div>
    </div>
  {:else if floodPrediction}
    <pre class="hidden">Debug: {JSON.stringify(floodPrediction, null, 2)}</pre>
  {/if}

  <!-- Flood Prediction Results - Modern Card Design -->
  {#if floodPrediction && Array.isArray(floodPrediction.predictions) && floodPrediction.predictions.length > 0}
    <div class="mt-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-lg font-medium text-[#0c3143]">
          <Icon icon="mdi:calendar-clock" class="inline mr-1.5" width="20" />
          Flood Predictions
        </h3>
        <span class="text-sm bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
          {floodPrediction.request_details?.request_time?.split(' ')[0] || 'Next 5 Days'}
        </span>
      </div>
      
      <div class="text-xs text-gray-500 mb-3 bg-gray-50 p-2.5 rounded border border-gray-200 flex justify-between">
        <div>
          <span class="text-gray-600 font-medium">Model:</span>
          <span class="ml-1">{floodPrediction.request_details?.model_used || selectedModel}</span>
        </div>
        <div>
          <span class="text-gray-600 font-medium">Prediction Time:</span>
          <span class="ml-1">{floodPrediction.request_details?.request_time || 'N/A'}</span>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-3">
        {#each floodPrediction.predictions as day, index}
          <div class={`p-4 rounded-md border shadow-sm ${getPredictionCardStyle(day.prediction)}`}>
            <div class="flex justify-between items-start">
              <div>
                <h4 class="font-medium text-lg flex items-center">
                  <Icon icon="mdi:calendar" class="mr-1.5" width="18" />
                  {formatDate(day.date)}
                </h4>
                <p class={`${getFloodProbabilityColor(day.probability_flood, day.prediction)} flex items-center mt-1`}>
                  <Icon 
                    icon={day.prediction === 'FLOODED' ? "mdi:alert-circle" : "mdi:check-circle"} 
                    class="mr-1.5" 
                    width="18" 
                  />
                  {day.prediction} 
                  <span class="text-sm ml-1">({(day.probability_flood * 100).toFixed(1)}% probability)</span>
                </p>
              </div>
              <div class="text-right">
                {#if day.predicted_depth_inches}
                  <div class="bg-red-100 text-red-800 px-2 py-1 rounded-md flex items-center">
                    <Icon icon="mdi:water" class="mr-1" width="16" />
                    <span class="font-medium">{(day.predicted_depth_inches * 2.54).toFixed(1)} cm depth</span>
                  </div>
                {/if}
              </div>
            </div>
            
            <!-- Key Weather Indicators - Better Visual Design -->
            <div class="mt-3 grid grid-cols-2 gap-3">
              {#if hasValidValue(day.features_used.Precip_mm_Today)}
                <div class="bg-blue-50 rounded p-2 flex items-center text-xs">
                  <Icon icon="mdi:weather-pouring" class="mr-1.5 text-blue-500" width="16" />
                  <div>
                    <span class="text-gray-500">Precipitation:</span>
                    <span class="font-medium ml-1">{day.features_used.Precip_mm_Today} mm</span>
                  </div>
                </div>
              {/if}
              {#if hasValidValue(day.features_used.Precipitation_Hours_Today)}
                <div class="bg-blue-50 rounded p-2 flex items-center text-xs">
                  <Icon icon="mdi:clock-outline" class="mr-1.5 text-blue-500" width="16" />
                  <div>
                    <span class="text-gray-500">Rain Hours:</span>
                    <span class="font-medium ml-1">{day.features_used.Precipitation_Hours_Today} hrs</span>
                  </div>
                </div>
              {/if}
              {#if hasValidValue(day.features_used.Total_Precip_Last3Days_mm)}
                <div class="bg-blue-50 rounded p-2 flex items-center text-xs">
                  <Icon icon="mdi:history" class="mr-1.5 text-blue-500" width="16" />
                  <div>
                    <span class="text-gray-500">3-Day Rain:</span>
                    <span class="font-medium ml-1">{day.features_used.Total_Precip_Last3Days_mm} mm</span>
                  </div>
                </div>
              {/if}
              {#if hasValidValue(day.features_used.Soil_Moisture_0_to_7cm_m3m3_Today)}
                <div class="bg-blue-50 rounded p-2 flex items-center text-xs">
                  <Icon icon="mdi:terrain" class="mr-1.5 text-blue-500" width="16" />
                  <div>
                    <span class="text-gray-500">Soil Moisture:</span>
                    <span class="font-medium ml-1">{formatValue('Soil_Moisture_0_to_7cm_m3m3_Today', day.features_used.Soil_Moisture_0_to_7cm_m3m3_Today)} m³/m³</span>
                  </div>
                </div>
              {/if}
            </div>
            
            <!-- Expand/Collapse Button - Better Style -->
            <button 
              on:click={() => toggleExpand(day.date)}
              class="mt-3 text-xs text-blue-600 hover:text-blue-800 focus:outline-none flex items-center border border-blue-200 rounded px-2 py-1 transition-colors duration-150 hover:bg-blue-50"
            >
              <Icon icon={expandedPredictions[day.date] ? "mdi:chevron-up" : "mdi:chevron-down"} width="16" class="mr-1" />
              {expandedPredictions[day.date] ? 'Hide details' : 'Show all data'}
            </button>
            
            <!-- Expanded Details - Better Organization -->
            {#if expandedPredictions[day.date] && day.features_used}
              <div class="mt-3 p-3 bg-white rounded border border-gray-200 text-xs">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <!-- Location Data -->
                  <div class="bg-gray-50 p-2.5 rounded border border-gray-200">
                    <h5 class="font-medium text-gray-700 mb-2 flex items-center">
                      <Icon icon="mdi:map-marker" class="mr-1.5 text-gray-600" width="14" />
                      Location Data
                    </h5>
                    <div class="grid grid-cols-1 gap-y-1">
                      {#each groupFeatures(day.features_used)['Location'] as key}
                        {#if hasValidValue(day.features_used[key])}
                          <div class="flex justify-between">
                            <span class="text-gray-500">{getFeatureDisplayName(key)}:</span> 
                            <span class="font-medium">{formatValue(key, day.features_used[key])}</span>
                          </div>
                        {/if}
                      {/each}
                    </div>
                  </div>
                  
                  <!-- Current Day Weather -->
                  <div class="bg-gray-50 p-2.5 rounded border border-gray-200">
                    <h5 class="font-medium text-gray-700 mb-2 flex items-center">
                      <Icon icon="mdi:weather-partly-cloudy" class="mr-1.5 text-gray-600" width="14" />
                      Forecast Day Weather
                    </h5>
                    <div class="grid grid-cols-1 gap-y-1">
                      {#each groupFeatures(day.features_used)['Current Day'] as key}
                        {#if hasValidValue(day.features_used[key])}
                          <div class="flex justify-between">
                            <span class="text-gray-500">{getFeatureDisplayName(key)}:</span> 
                            <span class="font-medium">{formatValue(key, day.features_used[key])}</span>
                          </div>
                        {/if}
                      {/each}
                    </div>
                  </div>
                  
                  <!-- Previous Days Weather -->
                  <div class="bg-gray-50 p-2.5 rounded border border-gray-200">
                    <h5 class="font-medium text-gray-700 mb-2 flex items-center">
                      <Icon icon="mdi:history" class="mr-1.5 text-gray-600" width="14" />
                      Previous Days Weather
                    </h5>
                    <div class="grid grid-cols-1 gap-y-1">
                      {#each groupFeatures(day.features_used)['Previous Days'] as key}
                        {#if hasValidValue(day.features_used[key])}
                          <div class="flex justify-between">
                            <span class="text-gray-500">{getFeatureDisplayName(key)}:</span> 
                            <span class="font-medium">{formatValue(key, day.features_used[key])}</span>
                          </div>
                        {/if}
                      {/each}
                    </div>
                  </div>
                  
                  <!-- Accumulated Precipitation -->
                  <div class="bg-gray-50 p-2.5 rounded border border-gray-200">
                    <h5 class="font-medium text-gray-700 mb-2 flex items-center">
                      <Icon icon="mdi:water-percent" class="mr-1.5 text-gray-600" width="14" />
                      Accumulated Precipitation
                    </h5>
                    <div class="grid grid-cols-1 gap-y-1">
                      {#each groupFeatures(day.features_used)['Accumulated Precipitation'] as key}
                        {#if hasValidValue(day.features_used[key])}
                          <div class="flex justify-between">
                            <span class="text-gray-500">{getFeatureDisplayName(key)}:</span> 
                            <span class="font-medium">{formatValue(key, day.features_used[key])}</span>
                          </div>
                        {/if}
                      {/each}
                    </div>
                  </div>
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
      
      <div class="mt-3 text-xs text-gray-500 bg-gray-50 p-2.5 rounded border border-gray-200">
        <p class="mb-1 flex items-center">
          <Icon icon="mdi:information-outline" class="mr-1.5 text-gray-600" width="14" />
          Predictions are based on historical data, current weather conditions, and forecast models.
        </p>
        <div class="grid grid-cols-2 gap-x-3">
          <p class="flex items-center">
            <Icon icon="mdi:elevation-rise" class="mr-1.5 text-gray-600" width="14" />
            Elevation: {floodPrediction.predictions[0]?.features_used.Elevation_m || 'N/A'} meters
          </p>
          <p class="flex items-center">
            <Icon icon="mdi:water" class="mr-1.5 text-gray-600" width="14" />
            Distance to water station: {floodPrediction.predictions[0]?.features_used.Distance_to_Water_Station_m.toFixed(1) || 'N/A'} meters
          </p>
        </div>
      </div>
    </div>
  {:else if predictionError}
    <div class="mt-4 p-3 bg-red-50 rounded-md border border-red-200 flex items-start">
      <Icon icon="mdi:alert-circle" class="text-red-500 mr-2 mt-0.5" width="18" />
      <p class="text-red-600 font-medium">Error: {predictionError}</p>
    </div>
  {/if}

  <!-- How to use section - Better visual organization -->
  <div class="mt-5 bg-blue-50 p-4 rounded-md border border-blue-200">
    <h3 class="text-lg text-[#0c3143] font-medium mb-3 flex items-center">
      <Icon icon="mdi:help-circle-outline" class="mr-1.5" width="20" />
      How to use
    </h3>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-700 text-sm">
      <div class="flex items-start">
        <Icon icon="mdi:magnify" class="mr-1.5 text-blue-500 mt-0.5" width="16" />
        <span>Use the search bar to find specific locations</span>
      </div>
      <div class="flex items-start">
        <Icon icon="mdi:map-marker-radius" class="mr-1.5 text-blue-500 mt-0.5" width="16" />
        <span>Enter coordinates (e.g., "14.5995, 120.9842") to jump to exact points</span>
      </div>
      <div class="flex items-start">
        <Icon icon="mdi:gesture-tap" class="mr-1.5 text-blue-500 mt-0.5" width="16" />
        <span>Click on the map to select a point and view its elevation</span>
      </div>
      <div class="flex items-start">
        <Icon icon="mdi:weather-flood" class="mr-1.5 text-blue-500 mt-0.5" width="16" />
        <span>Use the "Predict Flooding" button to get a 5-day forecast</span>
      </div>
      <div class="flex items-start">
        <Icon icon="mdi:chart-box" class="mr-1.5 text-blue-500 mt-0.5" width="16" />
        <span>Different models may provide varying predictions - RF is recommended</span>
      </div>
    </div>
  </div>
</div>
