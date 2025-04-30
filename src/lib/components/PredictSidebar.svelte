<script>
  import { createEventDispatcher } from 'svelte';
  import { selectedLocation } from '$lib/stores/locationStore.js';

  const dispatch = createEventDispatcher();
  
  let activeTab = 'info';
  let tabs = [
    { id: 'info', name: 'Information' },
    { id: 'weather', name: 'Weather' },
    { id: 'settings', name: 'Settings' }
  ];

  function setActiveTab(tabId) {
    activeTab = tabId;
    dispatch('tabChange', tabId);
  }
</script>

<div class="bg-white h-full flex flex-col">
  <!-- Tabs navigation -->
  <div class="tabs px-2 pt-2">
    <div class="flex border-b">
      {#each tabs as tab}
        <button
          class="py-2 px-4 text-sm font-medium {activeTab === tab.id ? 'text-[#0c3143] border-b-2 border-[#3ba6d0] font-semibold' : 'text-gray-500 hover:text-[#0c3143] hover:border-b-2 hover:border-gray-300'}"
          on:click={() => setActiveTab(tab.id)}
        >
          {tab.name}
        </button>
      {/each}
    </div>
  </div>

  <!-- Tab content -->
  <div class="flex-grow p-4 overflow-y-auto">
    {#if activeTab === 'info'}
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
    {:else if activeTab === 'weather'}
      <div class="weather-tab">
        <h2 class="text-xl font-semibold text-[#0c3143] mb-3">Weather Conditions</h2>
        <p class="text-gray-700 mb-4">
          Current and forecasted weather data for Metro Manila.
        </p>
        
        <!-- Current weather -->
        <div class="bg-gray-50 p-4 rounded-md mb-4">
          <div class="flex justify-between items-center">
            <div>
              <p class="text-sm text-gray-500">Current Conditions</p>
              <p class="text-2xl font-bold">28°C</p>
              <p class="text-gray-700">Partly Cloudy</p>
            </div>
            <div>
              <div class="w-12 h-12 bg-[#3ba6d0] rounded-full flex items-center justify-center text-white">
                <span>☁️</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Weather metrics -->
        <div class="grid grid-cols-3 gap-2 mb-4">
          <div class="bg-gray-50 p-2 rounded text-center">
            <p class="text-xs text-gray-500">Humidity</p>
            <p class="font-semibold">75%</p>
          </div>
          <div class="bg-gray-50 p-2 rounded text-center">
            <p class="text-xs text-gray-500">Precipitation</p>
            <p class="font-semibold">30%</p>
          </div>
          <div class="bg-gray-50 p-2 rounded text-center">
            <p class="text-xs text-gray-500">Wind</p>
            <p class="font-semibold">12 km/h</p>
          </div>
        </div>
        
        <!-- Forecast -->
        <h3 class="font-medium text-[#0c3143] mb-2">Forecast</h3>
        <div class="space-y-2">
          {#each Array(3) as _, i}
            <div class="flex justify-between items-center bg-gray-50 p-2 rounded">
              <span class="text-gray-700">{['Today', 'Tomorrow', 'Day after'][i]}</span>
              <div class="flex items-center">
                <span class="mr-2">☁️</span>
                <span class="text-sm font-medium">28°C / 24°C</span>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {:else if activeTab === 'settings'}
      <div class="settings-tab">
        <h2 class="text-xl font-semibold text-[#0c3143] mb-3">Settings</h2>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Map View</label>
            <select class="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-[#0c3143] focus:border-[#3ba6d0]">
              <option value="topographic">Topographic</option>
              <option value="satellite">Satellite</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Alert Notifications</label>
            <label class="inline-flex items-center">
              <input type="checkbox" class="rounded text-[#0c3143] focus:ring-[#3ba6d0]" checked>
              <span class="ml-2 text-sm text-gray-700">Enable notifications</span>
            </label>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Update Frequency</label>
            <select class="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-[#0c3143] focus:border-[#3ba6d0]">
              <option value="30">Every 30 minutes</option>
              <option value="60">Every hour</option>
              <option value="180">Every 3 hours</option>
              <option value="360">Every 6 hours</option>
            </select>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>
