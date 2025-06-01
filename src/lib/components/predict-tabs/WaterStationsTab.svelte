<script>
  import { waterStations, focusedWaterStation } from '$lib/stores/waterStationStore.js';
  import Icon from '@iconify/svelte';
  
  // Helper function to determine water station status
  function getStationStatus(station) {
    if (!station.wl) return { level: 'unknown', color: 'gray', text: 'Unknown', icon: 'mdi:help-circle' };
    
    const currentWL = parseFloat(station.wl);
    const alertWL = station.alertwl ? parseFloat(station.alertwl) : null;
    const alarmWL = station.alarmwl ? parseFloat(station.alarmwl) : null;
    const criticalWL = station.criticalwl ? parseFloat(station.criticalwl) : null;
    
    if (criticalWL && currentWL >= criticalWL) {
      return { level: 'critical', color: 'red', text: 'Critical', icon: 'mdi:waves-arrow-up' };
    } else if (alarmWL && currentWL >= alarmWL) {
      return { level: 'alarm', color: 'orange', text: 'Alarm', icon: 'mdi:wave' };
    } else if (alertWL && currentWL >= alertWL) {
      return { level: 'alert', color: 'yellow', text: 'Alert', icon: 'mdi:water-plus' };
    } else {
      return { level: 'normal', color: 'green', text: 'Normal', icon: 'mdi:water-check' };
    }
  }
  
  // Improved helper function to calculate water level change based on 10-minute reading
  function calculateWaterChange(station) {
    if (!station.wl || !station.wl10m) return { text: 'No change data', icon: 'mdi:minus', color: 'gray' };
    
    const currentWL = parseFloat(station.wl);
    const wl10m = parseFloat(station.wl10m);
    
    if (isNaN(currentWL) || isNaN(wl10m)) return { text: 'Unknown', icon: 'mdi:help-circle', color: 'gray' };
    
    const change = (currentWL - wl10m).toFixed(2);
    const value = parseFloat(change);
    
    if (value === 0) {
      return { text: 'Stable', icon: 'mdi:minus', color: 'gray' };
    } else if (value > 0) {
      return { 
        text: `Rising ${Math.abs(value)} m`, 
        icon: 'mdi:arrow-up-bold', 
        color: value > 0.1 ? 'red' : 'orange'
      };
    } else {
      return { 
        text: `Falling ${Math.abs(value)} m`, 
        icon: 'mdi:arrow-down-bold', 
        color: 'blue' 
      };
    }
  }

  // Function to reload water station data
  async function refreshWaterStations() {
    try {
      waterStations.update(current => ({ ...current, loading: true, error: null }));
      
      const response = await fetch('/api/water-stations');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      waterStations.set({ loading: false, data: data, error: null });
    } catch (error) {
      console.error('Failed to load water stations:', error);
      waterStations.set({ loading: false, data: [], error: error.message });
    }
  }

  // Function to format the datetime display in a compact way
  function formatDateTime(timeStr) {
    if (!timeStr) return '';
 
    const parts = timeStr.split(' at ');
    
    if (parts.length === 2) {
      const datePart = parts[0]; // "Month D, YYYY"
      const timePart = parts[1]; // "h:mm AM/PM"
      
      return `${datePart} • ${timePart}`;
    }
    
    return timeStr;
  }
  
  // Add filter and sorting options
  let statusFilter = $state('all');
  let sortOption = $state('name');
  
  // Define status filter options
  const statusOptions = [
    { value: 'all', label: 'All Stations' },
    { value: 'critical', label: 'Critical Status' },
    { value: 'alarm', label: 'Alarm Status' },
    { value: 'alert', label: 'Alert Status' },
    { value: 'normal', label: 'Normal Status' }
  ];
  
  // Define sorting options
  const sortOptions = [
    { value: 'name', label: 'Station Name (A-Z)' },
    { value: 'name-desc', label: 'Station Name (Z-A)' },
    { value: 'level-high', label: 'Water Level (High-Low)' },
    { value: 'level-low', label: 'Water Level (Low-High)' },
    { value: 'change-high', label: 'Level Change (Rising)' },
    { value: 'change-low', label: 'Level Change (Falling)' }
  ];
  
  // Access the water stations store value directly
  let waterStationsValue = $derived($waterStations);
  
  // Computed property for filtered and sorted stations - fixed the $derived syntax
  let filteredStations = $derived(
    waterStationsValue.data
      .filter(station => {
        if (statusFilter === 'all') return true;
        
        const status = getStationStatus(station);
        return status.level === statusFilter;
      })
      .sort((a, b) => {
        // Get numeric water levels for sorting
        const aLevel = parseFloat(a.wl) || 0;
        const bLevel = parseFloat(b.wl) || 0;
        
        // Get water level changes for sorting
        const aChange = a.wl && a.wl10m ? parseFloat(a.wl) - parseFloat(a.wl10m) : 0;
        const bChange = b.wl && b.wl10m ? parseFloat(b.wl) - parseFloat(b.wl10m) : 0;
        
        switch (sortOption) {
          case 'name':
            return a.obsnm.localeCompare(b.obsnm);
          case 'name-desc':
            return b.obsnm.localeCompare(a.obsnm);
          case 'level-high':
            return bLevel - aLevel;
          case 'level-low':
            return aLevel - bLevel;
          case 'change-high':
            return bChange - aChange; // Sort by rising (highest positive change first)
          case 'change-low':
            return aChange - bChange; // Sort by falling (lowest negative change first)
          default:
            return 0;
        }
      })
  );

  // Add filter visibility toggle
  let showFilters = $state(false);

  // Add function to show a station on the map
  function showStationOnMap(station) {
    focusedWaterStation.set(station);
  }
</script>

<div class="water-stations-tab h-full flex flex-col">
  <div class="flex justify-between items-center mb-2">
    <h2 class="text-xl font-semibold text-gray-800">Water Level Stations</h2>
    <div class="flex gap-2">
      <button 
        class="text-sm flex items-center gap-1 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 py-1 px-2 rounded transition-colors"
        on:click={refreshWaterStations}
      >
        <Icon icon="mdi:refresh" />
        Refresh
      </button>
      
      <!-- Updated filter toggle button to match WeatherTab -->
      <button 
        class="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-sm text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-900"
        on:click={() => showFilters = !showFilters}
      >
        <Icon icon={showFilters ? "mdi:filter-off" : "mdi:filter"} />
        {showFilters ? 'Hide Filters' : 'Show Filters'}
      </button>
    </div>
  </div>

  <!-- Updated filter section to match WeatherTab layout exactly -->
  {#if showFilters}
    <div class="mb-2 bg-gray-50 p-2 rounded-md border border-gray-200 transition-all">
      <div class="flex flex-wrap gap-3 text-xs">
        <div class="filter-group">
          <div class="font-medium mb-1 text-gray-700">Status</div>
          <select bind:value={statusFilter} class="rounded border bg-white px-2 py-1.5 text-xs w-full">
            {#each statusOptions as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </div>

        <div class="filter-group">
          <div class="font-medium mb-1 text-gray-700">Sort by</div>
          <select bind:value={sortOption} class="rounded border bg-white px-2 py-1.5 text-xs w-full">
            <optgroup label="Name">
              {#each sortOptions.filter(o => o.value.includes('name')) as option}
                <option value={option.value}>{option.label}</option>
              {/each}
            </optgroup>
            <optgroup label="Water Level">
              {#each sortOptions.filter(o => o.value.includes('level')) as option}
                <option value={option.value}>{option.label}</option>
              {/each}
            </optgroup>
            <optgroup label="Change Rate">
              {#each sortOptions.filter(o => o.value.includes('change')) as option}
                <option value={option.value}>{option.label}</option>
              {/each}
            </optgroup>
          </select>
        </div>
        
        <div class="ml-auto text-right text-xs text-gray-500 self-end">
          <div>Showing {filteredStations.length} of {waterStationsValue.data.length} stations</div>
        </div>
      </div>
      
      <!-- Status legend - now inside the filter box -->
      <div class="mt-2 pt-2 border-t border-gray-200 text-xs flex justify-between items-center">
        <div class="flex gap-3">
          <div class="flex items-center"><span class="h-2 w-2 bg-green-600 rounded-full mr-1"></span>Normal</div>
          <div class="flex items-center"><span class="h-2 w-2 bg-yellow-500 rounded-full mr-1"></span>Alert</div>
          <div class="flex items-center"><span class="h-2 w-2 bg-orange-500 rounded-full mr-1"></span>Alarm</div>
          <div class="flex items-center"><span class="h-2 w-2 bg-red-600 rounded-full mr-1"></span>Critical</div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Content wrapper - Main scrollable area -->
  <div class="flex-1 overflow-auto">
    {#if $waterStations.loading}
      <div class="flex flex-col items-center justify-center h-36">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p class="mt-2 text-gray-600 text-sm">Loading data...</p>
      </div>
    {:else if $waterStations.error}
      <div class="bg-gray-50 border border-gray-200 rounded p-3 text-center">
        <Icon icon="mdi:alert-circle" class="text-red-600 text-lg" />
        <p class="text-gray-700 text-sm mt-1">{$waterStations.error}</p>
        <button 
          class="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-xs"
          on:click={refreshWaterStations}
        >Try Again</button>
      </div>
    {:else if $waterStations.data.length === 0}
      <div class="bg-gray-50 border border-gray-200 rounded p-4 text-center">
        <p class="text-gray-600">No water station data available.</p>
      </div>
    {:else if filteredStations.length === 0}
      <div class="bg-gray-50 border border-gray-200 rounded p-4 text-center">
        <p class="text-gray-600">No stations found with the selected filters.</p>
        <button 
          class="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-xs"
          on:click={() => statusFilter = 'all'}
        >Show All Stations</button>
      </div>
    {:else}
      <div class="space-y-1 pb-4">
        {#each filteredStations as station (station.obsnm)}
          {@const status = getStationStatus(station)}
          {@const change = calculateWaterChange(station)}
          
          <div class="mb-5 rounded border border-gray-200 bg-white shadow-sm transition-all">
            <!-- Station header - Updated to match WeatherTab structure -->
            <div class="flex flex-col border-l-3 border-l-blue-500 p-2">
              <div class="mb-1 flex items-center justify-between">
                <div class="flex items-center gap-1.5">
                  <h3 class="font-medium text-gray-800">{station.obsnm}</h3>
                  <div class="rounded-sm px-1.5 py-0.5 text-xs font-medium text-gray-600" style="background-color: {status.color === 'green' ? '#dcfce7' : status.color === 'yellow' ? '#fef3c7' : status.color === 'orange' ? '#fed7aa' : status.color === 'red' ? '#fecaca' : '#f3f4f6'}; color: {status.color === 'green' ? '#166534' : status.color === 'yellow' ? '#a16207' : status.color === 'orange' ? '#c2410c' : status.color === 'red' ? '#dc2626' : '#4b5563'};">
                    {status.text}
                  </div>
                </div>
                
                <!-- Show on Map button -->
                <button 
                  class="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1 rounded transition-colors"
                  on:click={() => showStationOnMap(station)}
                  title="Show on map"
                >
                  <Icon icon="mdi:map-marker" />
                  <span>Show on Map</span>
                </button>
              </div>
              
              <!-- Date and time -->
              <div class="flex flex-col text-xs text-gray-500">
                <div>
                  <Icon icon="mdi:clock-outline" class="mr-0.5 inline-block text-xs" />
                  <span class="font-medium">{station.timestr}</span>
                </div>
              </div>
            </div>

            <!-- Main content section - Updated to match WeatherTab layout -->
            <div class="border-t border-gray-100 p-3">
              <!-- Water level summary - matching WeatherTab structure -->
              <div class="mb-3 flex flex-wrap md:items-center justify-between gap-2">
                <!-- Left: Current level and change -->
                <div class="flex items-center gap-3">
                  <!-- Water level icon/indicator - Updated to use status-specific icons -->
                  <div class="flex h-12 w-12 items-center justify-center" style="color: {status.color === 'green' ? '#16a34a' : status.color === 'yellow' ? '#eab308' : status.color === 'orange' ? '#ea580c' : status.color === 'red' ? '#dc2626' : '#6b7280'};">
                    <Icon icon={status.icon} width="40" />
                  </div>

                  <!-- Water level data -->
                  <div>
                    <div class="flex items-baseline">
                      <span class="text-2xl font-bold">{station.wl || 'N/A'}</span>
                      <span class="ml-1 text-sm text-gray-500">meters</span>
                    </div>
                    <div class="text-sm">{status.text} Level</div>
                    <div class="text-xs text-gray-600 flex items-center" style="color: {change.color === 'gray' ? '#6B7280' : change.color === 'red' ? '#DC2626' : change.color === 'orange' ? '#EA580C' : change.color === 'blue' ? '#2563EB' : '#6B7280'}">
                      <Icon icon={change.icon} class="mr-0.5" />
                      {change.text}
                    </div>
                  </div>
                </div>

                <!-- Right: Status indicator -->
                <div class="flex flex-col">
                  <div class="flex items-center">
                    <div class="h-3 w-3 rounded-full mr-2" style="background-color: {status.color === 'green' ? '#16a34a' : status.color === 'yellow' ? '#eab308' : status.color === 'orange' ? '#ea580c' : status.color === 'red' ? '#dc2626' : '#6b7280'};"></div>
                    <span class="font-medium">
                      {status.text} Status
                    </span>
                  </div>
                </div>
              </div>

              <!-- Key metrics - matching WeatherTab grid layout -->
              <div class="mb-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div class="rounded border border-blue-100 bg-blue-50 p-2">
                  <div class="text-blue-700">Current Level</div>
                  <div class="font-medium">{station.wl || 'N/A'} m</div>
                </div>
                <div class="rounded bg-gray-50 p-2 border">
                  <div class="text-gray-500">10m Ago</div>
                  <div class="font-medium">{station.wl10m || 'N/A'} m</div>
                </div>
                <div class="rounded bg-gray-50 p-2 border">
                  <div class="text-gray-500">30m Ago</div>
                  <div class="font-medium">{station.wl30m || 'N/A'} m</div>
                </div>
                <div class="rounded bg-gray-50 p-2 border">
                  <div class="text-gray-500">1h Ago</div>
                  <div class="font-medium">{station.wl1h || 'N/A'} m</div>
                </div>
              </div>

              <!-- Threshold levels - matching WeatherTab additional metrics -->
              <div class="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm mb-3">
                {#if station.alertwl}
                  <div class="rounded border border-yellow-100 bg-yellow-50 p-2">
                    <div class="text-yellow-700">Alert Level</div>
                    <div class="font-medium">{station.alertwl} m</div>
                  </div>
                {/if}
                {#if station.alarmwl}
                  <div class="rounded border border-orange-100 bg-orange-50 p-2">
                    <div class="text-orange-700">Alarm Level</div>
                    <div class="font-medium">{station.alarmwl} m</div>
                  </div>
                {/if}
                {#if station.criticalwl}
                  <div class="rounded border border-red-100 bg-red-50 p-2">
                    <div class="text-red-700">Critical Level</div>
                    <div class="font-medium">{station.criticalwl} m</div>
                  </div>
                {/if}
              </div>

              <!-- Detailed data accordion - matching WeatherTab structure -->
              <details class="border rounded mb-2">
                <summary class="cursor-pointer px-3 py-2 bg-gray-50 text-sm font-medium">
                  Detailed Station Data
                </summary>
                <div class="p-3">
                  <!-- Historical readings grid -->
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <!-- Historical readings -->
                    <div class="rounded border bg-white p-2">
                      <h4 class="mb-1 font-medium text-gray-700">Historical Readings</h4>
                      <div class="space-y-1">
                        <div class="flex justify-between">
                          <span>Current:</span>
                          <span class="font-medium">{station.wl || 'N/A'} m</span>
                        </div>
                        <div class="flex justify-between">
                          <span>10 min ago:</span>
                          <span class="font-medium">{station.wl10m || 'N/A'} m</span>
                        </div>
                        <div class="flex justify-between">
                          <span>30 min ago:</span>
                          <span class="font-medium">{station.wl30m || 'N/A'} m</span>
                        </div>
                        <div class="flex justify-between">
                          <span>1 hour ago:</span>
                          <span class="font-medium">{station.wl1h || 'N/A'} m</span>
                        </div>
                      </div>
                    </div>

                    <!-- Threshold levels -->
                    <div class="rounded border bg-white p-2">
                      <h4 class="mb-1 font-medium text-gray-700">Warning Levels</h4>
                      <div class="space-y-1">
                        <div class="flex justify-between">
                          <span>Alert Level:</span>
                          <span class="font-medium">{station.alertwl || 'Not set'} m</span>
                        </div>
                        <div class="flex justify-between">
                          <span>Alarm Level:</span>
                          <span class="font-medium">{station.alarmwl || 'Not set'} m</span>
                        </div>
                        <div class="flex justify-between">
                          <span>Critical Level:</span>
                          <span class="font-medium">{station.criticalwl || 'Not set'} m</span>
                        </div>
                        <div class="flex justify-between">
                          <span>Current Status:</span>
                          <span class="font-medium" style="color: {status.color === 'green' ? '#16a34a' : status.color === 'yellow' ? '#eab308' : status.color === 'orange' ? '#ea580c' : status.color === 'red' ? '#dc2626' : '#6b7280'};">{status.text}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </details>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  /* Add custom border width */
  .border-l-3 {
    border-left-width: 3px;
  }

  /* Add styles for filter layout */
  .filter-group {
    display: flex;
    flex-direction: column;
    min-width: 150px;
    flex: 1;
    max-width: 220px;
  }
  
  /* Prevent filters from becoming too large on wide screens */
  @media (min-width: 1200px) {
    .filter-group {
      max-width: 200px;
    }
  }
  
  /* Adjust for very small screens */
  @media (max-width: 480px) {
    .filter-group {
      min-width: 100%;
      max-width: 100%;
    }
  }
</style>
