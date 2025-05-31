<script>
  import { waterStations, focusedWaterStation } from '$lib/stores/waterStationStore.js';
  import Icon from '@iconify/svelte';
  
  // Helper function to determine water station status
  function getStationStatus(station) {
    if (!station.wl) return { level: 'unknown', color: 'gray', text: 'Unknown' };
    
    const currentWL = parseFloat(station.wl);
    const alertWL = station.alertwl ? parseFloat(station.alertwl) : null;
    const alarmWL = station.alarmwl ? parseFloat(station.alarmwl) : null;
    const criticalWL = station.criticalwl ? parseFloat(station.criticalwl) : null;
    
    if (criticalWL && currentWL >= criticalWL) {
      return { level: 'critical', color: 'red', text: 'Critical' };
    } else if (alarmWL && currentWL >= alarmWL) {
      return { level: 'alarm', color: 'orange', text: 'Alarm' };
    } else if (alertWL && currentWL >= alertWL) {
      return { level: 'alert', color: 'yellow', text: 'Alert' };
    } else {
      return { level: 'normal', color: 'green', text: 'Normal' };
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
      
      <!-- Add filter toggle button -->
      <button 
        class="text-sm flex items-center gap-1 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 py-1 px-2 rounded transition-colors"
        on:click={() => showFilters = !showFilters}
      >
        <Icon icon={showFilters ? "mdi:filter-off" : "mdi:filter"} />
        {showFilters ? 'Hide Filters' : 'Show Filters'}
      </button>
    </div>
  </div>

  <!-- Collapsible filter section and legend -->
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
        
        <div class="ml-auto text-gray-500 self-end text-right">
          Showing: {filteredStations.length} of {waterStationsValue.data.length} stations
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
          
          <div class="bg-white border border-gray-200 rounded shadow-sm transition-all mb-5">
            <!-- Station header - Updated to show full date and time -->
            <div class="flex flex-col p-2 border-l-3" style="border-left-color: {status.color};">
              <div class="flex items-center justify-between mb-1">
                <div class="flex items-center gap-1.5">
                  <h3 class="font-medium text-gray-800 text-sm">{station.obsnm}</h3>
                  <div class="px-1 py-0.5 rounded-sm text-xs font-medium text-white" style="background-color: {status.color};">
                    {status.text}
                  </div>
                </div>
                
                <!-- Add Show on Map button -->
                <button 
                  class="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1 rounded transition-colors"
                  on:click={() => showStationOnMap(station)}
                  title="Show on map"
                >
                  <Icon icon="mdi:map-marker" />
                  <span>Show on Map</span>
                </button>
              </div>
              <!-- Add date and time on its own line with smaller text -->
              <div class="text-xs text-gray-500">
                <Icon icon="mdi:clock-outline" class="inline-block mr-0.5 text-xs" /> 
                {station.timestr}
              </div>
            </div>
            
            <!-- Water level info - Compact design -->
            <div class="px-2 py-1.5 border-t border-gray-100 flex items-center justify-between">
              <!-- Left side: Current level & change indicator -->
              <div class="flex items-center gap-2">
                <!-- Current level -->
                <div class="flex flex-col justify-center">
                  <span class="text-xs text-gray-500">Current</span>
                  <span class="font-bold text-gray-900">{station.wl || 'N/A'} m</span>
                </div>
                
                <!-- Change indicator -->
                <div class="flex items-center text-xs" style="color: {change.color === 'gray' ? '#6B7280' : change.color === 'red' ? '#DC2626' : change.color === 'orange' ? '#EA580C' : change.color === 'blue' ? '#2563EB' : '#6B7280'}">
                  <Icon icon={change.icon} class="mr-0.5" />
                  <span class="whitespace-nowrap">{change.text}</span>
                </div>
              </div>
              
              <!-- Right side: Threshold badges - FIXED: full words instead of abbreviations -->
              <div class="flex gap-1">
                {#if station.alertwl}
                  <div class="bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded-sm text-xs whitespace-nowrap">
                    Alert:{station.alertwl}
                  </div>
                {/if}
                {#if station.alarmwl}
                  <div class="bg-orange-100 text-orange-800 px-1 py-0.5 rounded-sm text-xs whitespace-nowrap">
                    Alarm:{station.alarmwl}
                  </div>
                {/if}
                {#if station.criticalwl}
                  <div class="bg-red-100 text-red-800 px-1 py-0.5 rounded-sm text-xs whitespace-nowrap">
                    Critical:{station.criticalwl}
                  </div>
                {/if}
              </div>
            </div>
            
            <!-- Historical readings - More compact inline format -->
            <details class="text-sm border-t border-gray-100">
              <summary class="cursor-pointer bg-gray-50 px-2 py-1 text-gray-600 hover:text-gray-900 text-xs flex items-center">
                <Icon icon="mdi:history" class="mr-1 text-xs" /> Historical
              </summary>
              <div class="flex justify-between px-2 py-1.5 bg-gray-50 text-xs">
                <div>
                  <span class="text-gray-500">Current:</span>
                  <span class="font-medium text-gray-800">{station.wl || 'N/A'} m</span>
                </div>
                <div>
                  <span class="text-gray-500">10m:</span>
                  <span class="font-medium text-gray-800">{station.wl10m || 'N/A'} m</span>
                </div>
                <div>
                  <span class="text-gray-500">30m:</span>
                  <span class="font-medium text-gray-800">{station.wl30m || 'N/A'} m</span>
                </div>
                <div>
                  <span class="text-gray-500">1h:</span>
                  <span class="font-medium text-gray-800">{station.wl1h || 'N/A'} m</span>
                </div>
              </div>
            </details>
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
