<script>
  import { selectedLocation, findNearestPoint, locationLoadingStatus } from '$lib/stores/locationStore.js';
  import { waterStations, nearestWaterStation } from '$lib/stores/waterStationStore.js';
  import { metroManilaCities, nearestWeatherCity } from '$lib/stores/weatherStore.js';
  import { onMount, afterUpdate, createEventDispatcher } from 'svelte';
  import Icon from '@iconify/svelte';
  
  const dispatch = createEventDispatcher();
  
  // Flood prediction state
  let floodPrediction = null;
  let isPredicting = false;
  let predictionError = null;
  let selectedModel = 'rf'; // Default model (Random Forest)
  let locationLoadingState = false;
  let locationLoadingMessage = '';
  
  // Subscribe to location loading status
  locationLoadingStatus.subscribe(status => {
    locationLoadingState = status.isLoading;
    locationLoadingMessage = status.message;
  });
  
  // When prediction status changes, emit event for Map component
  $: {
    dispatch('predictionStatusChange', { isPredicting });
  }
  
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
      // Preserve full precision for lat/lng
      if (key === 'Latitude' || key === 'Longitude') {
        return value;
      }
      
      // Format percentages with 1 decimal place
      if (key.includes('%') || key.includes('Humidity') || key.includes('Cloud_Cover')) {
        return Math.round(value * 10) / 10;
      }
      
      // Handle soil moisture specially
      if (key.includes('Soil_Moisture')) {
        return (Math.round(value * 1000) / 1000).toFixed(3);
      }
      
      // For most values, limit to 1 decimal place
      return (Math.round(value * 10) / 10).toFixed(1);
    }
    
    return value;
  }

  // Format key weather indicators with better labels
  function getIndicatorLabel(key) {
    const labels = {
      'Precip_mm_Today': 'Rainfall',
      'Precipitation_Hours_Today': 'Rain Hours',
      'Total_Precip_Last3Days_mm': '3-Day Rain',
      'Soil_Moisture_0_to_7cm_m3m3_Today': 'Soil Moisture'
    };
    return labels[key] || key;
  }

  // Format indicator units properly
  function getIndicatorUnit(key) {
    const units = {
      'Precip_mm_Today': 'mm',
      'Precipitation_Hours_Today': 'hrs',
      'Total_Precip_Last3Days_mm': 'mm',
      'Soil_Moisture_0_to_7cm_m3m3_Today': 'm³/m³'
    };
    return units[key] || '';
  }
</script>

<div class="info-tab">
  <h2 class="text-lg font-semibold text-[#0c3143] mb-2 flex items-center">
    <Icon icon="mdi:weather-flood" class="mr-2" width="22" />
    Flood Prediction Tool
  </h2>

  <!-- Location Information Card: Redesigned layout -->
  <div class="mb-2 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
    <h3 class="text-sm font-medium text-[#0c3143] mb-2 flex items-center">
      <Icon icon="mdi:map-marker" class="mr-1.5" width="16" />
      Location Information
    </h3>
    
    {#if locationLoadingState}
      <!-- Loading indicator for location -->
      <div class="flex items-center justify-center py-2">
        <Icon icon="eos-icons:loading" class="animate-spin text-blue-500 mr-2" width="18" />
        <p class="text-blue-700 text-sm">{locationLoadingMessage || 'Loading location data...'}</p>
      </div>
    {:else if !$selectedLocation.lat}
      <!-- No location selected -->
      <div class="flex items-center p-2 bg-yellow-50 border border-yellow-200 rounded-md">
        <Icon icon="mdi:gesture-tap" class="text-yellow-600 mr-2 flex-shrink-0" width="16" />
        <p class="text-gray-700 text-sm">Click on the map to select a location or use the search bar.</p>
      </div>
    {:else}
      <!-- Location details with improved layout -->
      <div class="space-y-2">
        <!-- Location name with icon -->
        {#if $selectedLocation.locationName}
          <div class="flex items-start">
            <Icon icon="mdi:map-marker" class="text-red-500 mt-0.5 mr-1 flex-shrink-0" width="14" />
            <p class="text-gray-700 text-sm font-medium">{$selectedLocation.locationName}</p>
          </div>
        {/if}
        
        <!-- Location coordinates and elevation in a compact row -->
        <div class="flex flex-wrap gap-2">
          <div class="bg-gray-50 py-1 px-2 rounded-md flex items-center text-sm">
            <span class="font-medium text-gray-500">Lat:</span>
            <span class="ml-1">{$selectedLocation.lat}</span>
          </div>
          
          <div class="bg-gray-50 py-1 px-2 rounded-md flex items-center text-sm">
            <span class="font-medium text-gray-500">Lng:</span>
            <span class="ml-1">{$selectedLocation.lng}</span>
          </div>
          
          <div class="bg-gray-50 py-1 px-2 rounded-md flex items-center text-sm">
            <span class="font-medium text-gray-500">Elevation:</span>
            {#if $selectedLocation.error}
              <span class="ml-1 text-red-600">Error</span>
            {:else}
              <span class="ml-1">{$selectedLocation.elevation} m</span>
            {/if}
          </div>
        </div>
        
        <!-- Reference data in cards with clear spacing -->
        <div class="flex flex-wrap gap-2">
          {#if $nearestWeatherCity}
            <div class="bg-blue-50 py-1 px-2 rounded-md border border-blue-100 flex-1 min-w-[150px]">
              <div class="flex items-center justify-between">
                <div class="flex items-center">
                  <Icon icon="mdi:weather-partly-cloudy" class="text-blue-500 mr-1 flex-shrink-0" width="14" />
                  <span class="text-sm font-medium">Weather Station</span>
                </div>
                <span class="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">
                  {formatDistance($nearestWeatherCity.distance)}
                </span>
              </div>
              <div class="mt-0.5 ml-5 text-sm text-blue-800">
                {$nearestWeatherCity.name}
              </div>
            </div>
          {/if}
          
          {#if $nearestWaterStation}
            <div class="bg-blue-50 py-1 px-2 rounded-md border border-blue-100 flex-1 min-w-[150px]">
              <div class="flex items-center justify-between">
                <div class="flex items-center">
                  <Icon icon="mdi:water" class="text-blue-500 mr-1 flex-shrink-0" width="14" />
                  <span class="text-sm font-medium">Water Station</span>
                </div>
                <span class="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">
                  {formatDistance($nearestWaterStation.distance)}
                </span>
              </div>
              <div class="mt-0.5 ml-5 text-sm text-blue-800">
                {$nearestWaterStation.obsnm}
                {#if $nearestWaterStation.wl}
                  <span class="text-xs ml-1">(Level: {$nearestWaterStation.wl} m)</span>
                {/if}
              </div>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
  
  <!-- Prediction Controls: Compact design -->
  <div class="mb-2 bg-gradient-to-r from-blue-50 to-blue-100 p-3 rounded-lg border border-blue-200 shadow-sm">
    <h3 class="text-sm font-medium text-[#0c3143] mb-2 flex items-center">
      <div class="bg-[#0c3143] rounded-full p-1 mr-1.5">
        <Icon icon="mdi:chart-box" class="text-white" width="14" />
      </div>
      Get Flood Prediction
    </h3>
    
    <div class="flex flex-wrap md:flex-nowrap gap-2 items-stretch">
      <div class="w-full md:flex-1">
        <label for="model-select" class="block text-sm font-medium text-gray-700 mb-1">
          Model
        </label>
        <select
          id="model-select"
          bind:value={selectedModel}
          class="block w-full px-2 py-1.5 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
          disabled={isPredicting || !$selectedLocation.lat}
        >
          {#each modelOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </div>
      
      <div class="w-full md:w-auto flex flex-col">
        <label class="text-sm font-medium text-gray-700 mb-1 whitespace-nowrap">
          Action
        </label>
        <button 
          on:click={predictFlood}
          disabled={isPredicting || !$selectedLocation.lat || locationLoadingState}
          class="flex-1 px-4 py-1.5 bg-[#0c3143] text-white rounded-md shadow-sm hover:bg-[#1a4a5a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0c3143] disabled:opacity-50 flex items-center justify-center text-sm transition duration-150"
        >
          {#if isPredicting}
            <span class="inline-block animate-spin mr-1.5">
              <Icon icon="eos-icons:loading" width="16" />
            </span>
            Predicting...
          {:else}
            <span class="mr-1.5">
              <Icon icon="mdi:weather-flood" width="16" />
            </span>
            Predict Flooding
          {/if}
        </button>
      </div>
    </div>
    
    {#if predictionError}
      <p class="text-red-600 text-sm mt-1.5 flex items-center">
        <Icon icon="mdi:alert-circle" class="mr-1" width="14" />
        {predictionError}
      </p>
    {/if}
  </div>
  
  <!-- Prediction Results: Redesigned cards -->
  {#if isPredicting}
    <!-- Loading indicator for prediction -->
    <div class="mb-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
      <div class="flex justify-center items-center">
        <Icon icon="eos-icons:loading" class="animate-spin text-blue-500 mr-2" width="20" />
        <p class="text-blue-700 text-sm">Processing prediction data...</p>
      </div>
    </div>
  {:else if floodPrediction && Array.isArray(floodPrediction.predictions) && floodPrediction.predictions.length > 0}
    <!-- Results display with improved card layout -->
    <div class="mb-2">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-sm font-medium text-[#0c3143] flex items-center">
          <Icon icon="mdi:calendar-clock" class="mr-1.5" width="16" />
          Flood Prediction Results
        </h3>
        <span class="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">
          {floodPrediction.request_details?.request_time?.split(' ')[0] || 'Next 5 Days'}
        </span>
      </div>
      
      <div class="text-xs text-gray-500 mb-2 bg-gray-50 p-2 rounded border border-gray-200 flex flex-wrap justify-between">
        <div>
          <span class="text-gray-600 font-medium">Model:</span>
          <span class="ml-1">{floodPrediction.request_details?.model_used || selectedModel}</span>
        </div>
        <div>
          <span class="text-gray-600 font-medium">Prediction Time:</span>
          <span class="ml-1">{floodPrediction.request_details?.request_time || 'N/A'}</span>
        </div>
      </div>

      <!-- Prediction cards in a grid -->
      <div class="grid grid-cols-1 gap-2">
        {#each floodPrediction.predictions as day, index}
          <div class={`p-2.5 rounded-md border shadow-sm ${getPredictionCardStyle(day.prediction)}`}>
            <!-- Header with date and prediction -->
            <div class="flex justify-between items-start mb-2">
              <div>
                <h4 class="font-medium text-base flex items-center">
                  <Icon icon="mdi:calendar" class="mr-1.5" width="16" />
                  {formatDate(day.date)}
                </h4>
                <p class={`${getFloodProbabilityColor(day.probability_flood, day.prediction)} flex items-center mt-0.5 text-sm`}>
                  <Icon 
                    icon={day.prediction === 'FLOODED' ? "mdi:alert-circle" : "mdi:check-circle"} 
                    class="mr-1.5" 
                    width="16" 
                  />
                  {day.prediction} 
                  <span class="ml-1">({(day.probability_flood * 100).toFixed(1)}% probability)</span>
                </p>
              </div>
              <div class="text-right">
                {#if day.predicted_depth_inches}
                  <div class="bg-red-100 text-red-800 px-2 py-1 rounded-md flex items-center text-sm">
                    <Icon icon="mdi:water" class="mr-1.5" width="16" />
                    <span class="font-medium">{(day.predicted_depth_inches * 2.54).toFixed(1)} cm depth</span>
                  </div>
                {/if}
              </div>
            </div>
            
            <!-- Key Weather Indicators: Redesigned with better layout -->
            <div class="grid grid-cols-2 gap-2 mb-2">
              {#if hasValidValue(day.features_used.Precip_mm_Today)}
                <div class="bg-white shadow-md rounded p-2 flex items-center text-sm">
                  <Icon icon="mdi:weather-pouring" class="mr-1.5 text-blue-500" width="16" />
                  <div class="flex-1">
                    <div class="flex justify-between">
                      <span class="text-gray-700">Rainfall:</span>
                      <span class="font-medium">{formatValue('Precip_mm_Today', day.features_used.Precip_mm_Today)} mm</span>
                    </div>
                  </div>
                </div>
              {/if}
              {#if hasValidValue(day.features_used.Precipitation_Hours_Today)}
                <div class="bg-white shadow-md rounded p-2 flex items-center text-sm">
                  <Icon icon="mdi:clock-outline" class="mr-1.5 text-blue-500" width="16" />
                  <div class="flex-1">
                    <div class="flex justify-between">
                      <span class="text-gray-700">Rain Hours:</span>
                      <span class="font-medium">{formatValue('Precipitation_Hours_Today', day.features_used.Precipitation_Hours_Today)} hrs</span>
                    </div>
                  </div>
                </div>
              {/if}
              {#if hasValidValue(day.features_used.Total_Precip_Last3Days_mm)}
                <div class="bg-white shadow-md rounded p-2 flex items-center text-sm">
                  <Icon icon="mdi:history" class="mr-1.5 text-blue-500" width="16" />
                  <div class="flex-1">
                    <div class="flex justify-between">
                      <span class="text-gray-700">3-Day Rain:</span>
                      <span class="font-medium">{formatValue('Total_Precip_Last3Days_mm', day.features_used.Total_Precip_Last3Days_mm)} mm</span>
                    </div>
                  </div>
                </div>
              {/if}
              {#if hasValidValue(day.features_used.Soil_Moisture_0_to_7cm_m3m3_Today)}
                <div class="bg-white shadow-md rounded p-2 flex items-center text-sm">
                  <Icon icon="mdi:terrain" class="mr-1.5 text-blue-500" width="16" />
                  <div class="flex-1">
                    <div class="flex justify-between">
                      <span class="text-gray-700">Soil Moisture:</span>
                      <span class="font-medium">{formatValue('Soil_Moisture_0_to_7cm_m3m3_Today', day.features_used.Soil_Moisture_0_to_7cm_m3m3_Today)} m³/m³</span>
                    </div>
                  </div>
                </div>
              {/if}
            </div>
            
            <!-- Expand/Collapse Button -->
            <button 
              on:click={() => toggleExpand(day.date)}
              class="w-full text-sm text-blue-600 hover:text-blue-800 focus:outline-none flex items-center justify-center border border-blue-200 rounded-md px-2 py-1 transition-colors duration-150 hover:bg-blue-50"
            >
              <Icon icon={expandedPredictions[day.date] ? "mdi:chevron-up" : "mdi:chevron-down"} width="16" class="mr-1.5" />
              {expandedPredictions[day.date] ? 'Hide detailed data' : 'Show detailed data'}
            </button>
            
            <!-- Expanded Details: More efficient layout -->
            {#if expandedPredictions[day.date] && day.features_used}
              <div class="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                <!-- Feature groups displayed in a better layout -->
                <div class="bg-gray-50 p-2 rounded border border-gray-200">
                  <h5 class="font-medium text-gray-700 mb-1 flex items-center text-sm">
                    <Icon icon="mdi:map-marker" class="mr-1 text-gray-600" width="14" />
                    Location Data
                  </h5>
                  <div class="text-sm space-y-1">
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
                <div class="bg-gray-50 p-2 rounded border border-gray-200">
                  <h5 class="font-medium text-gray-700 mb-1 flex items-center text-sm">
                    <Icon icon="mdi:weather-partly-cloudy" class="mr-1 text-gray-600" width="14" />
                    Forecast Day Weather
                  </h5>
                  <div class="text-sm space-y-1">
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
                <div class="bg-gray-50 p-2 rounded border border-gray-200">
                  <h5 class="font-medium text-gray-700 mb-1 flex items-center text-sm">
                    <Icon icon="mdi:history" class="mr-1 text-gray-600" width="14" />
                    Previous Days Weather
                  </h5>
                  <div class="text-sm space-y-1">
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
                <div class="bg-gray-50 p-2 rounded border border-gray-200">
                  <h5 class="font-medium text-gray-700 mb-1 flex items-center text-sm">
                    <Icon icon="mdi:water-percent" class="mr-1 text-gray-600" width="14" />
                    Accumulated Precipitation
                  </h5>
                  <div class="text-sm space-y-1">
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
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}
  
  <!-- Instructions Card: More compact design -->
  <div class="mb-2 bg-white p-2.5 rounded-lg border border-gray-200">
    <h3 class="text-sm font-medium text-[#0c3143] mb-1.5 flex items-center">
      <Icon icon="mdi:help-circle-outline" class="mr-1.5" width="16" />
      How to Use This Tool
    </h3>
    
    <div class="flex flex-wrap gap-2">
      <div class="bg-gray-50 p-1.5 rounded-md flex items-center text-sm flex-1">
        <span class="bg-blue-100 text-blue-800 w-5 h-5 rounded-full flex items-center justify-center mr-1.5">1</span>
        <span>Select a location on map or use search</span>
      </div>
      <div class="bg-gray-50 p-1.5 rounded-md flex items-center text-sm flex-1">
        <span class="bg-blue-100 text-blue-800 w-5 h-5 rounded-full flex items-center justify-center mr-1.5">2</span>
        <span>Choose prediction model</span>
      </div>
      <div class="bg-gray-50 p-1.5 rounded-md flex items-center text-sm flex-1">
        <span class="bg-blue-100 text-blue-800 w-5 h-5 rounded-full flex items-center justify-center mr-1.5">3</span>
        <span>Click "Predict Flooding" button</span>
      </div>
      <div class="bg-gray-50 p-1.5 rounded-md flex items-center text-sm flex-1">
        <span class="bg-blue-100 text-blue-800 w-5 h-5 rounded-full flex items-center justify-center mr-1.5">4</span>
        <span>View 5-day flood risk prediction results</span>
      </div>
    </div>
  </div>
</div>

<style>
  /* Add an even smaller text size */
  .text-2xs {
    font-size: 0.625rem; /* 10px */
    line-height: 0.875rem; /* 14px */
  }
</style>
