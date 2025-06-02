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

<div class="water-stations-tab space-y-3">
  <!-- Compact Header -->
  <div class="flex items-center space-x-2">
    <div class="rounded-md bg-gradient-to-br from-[#0c3143] to-[#1a4a5a] p-1.5">
      <Icon icon="mdi:water" class="text-white" width="18" />
    </div>
    <h2 class="text-lg font-bold text-[#0c3143]">Water Level Stations</h2>
    
    <!-- Action buttons aligned to the right -->
    <div class="ml-auto flex gap-2">
      <button 
        class="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-900"
        on:click={refreshWaterStations}
      >
        <Icon icon="mdi:refresh" width="12" />
        Refresh
      </button>
      
      <button 
        class="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-900"
        on:click={() => showFilters = !showFilters}
      >
        <Icon icon={showFilters ? "mdi:filter-off" : "mdi:filter"} width="12" />
        {showFilters ? 'Hide' : 'Filters'}
      </button>
    </div>
  </div>

  <!-- Compact Filter Section -->
  {#if showFilters}
    <div class="rounded-lg border border-gray-200 bg-gray-50 p-3 shadow-sm">
      <div class="mb-2 flex items-center space-x-2">
        <div class="rounded bg-[#0c3143] p-1">
          <Icon icon="mdi:filter" class="text-white" width="12" />
        </div>
        <h3 class="text-sm font-semibold text-[#0c3143]">Filter & Sort</h3>
      </div>

      <div class="space-y-2">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <!-- Status Filter -->
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Filter by Status</label>
            <select bind:value={statusFilter} class="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none">
              {#each statusOptions as option}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
          </div>

          <!-- Sort Options -->
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Sort by</label>
            <select bind:value={sortOption} class="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none">
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
        </div>
        
        <!-- Status Legend and Count -->
        <div class="flex items-center justify-between pt-2 border-t border-gray-200">
          <div class="flex flex-wrap gap-3 text-xs">
            <div class="flex items-center">
              <span class="h-2 w-2 bg-green-600 rounded-full mr-1"></span>
              <span>Normal</span>
            </div>
            <div class="flex items-center">
              <span class="h-2 w-2 bg-yellow-500 rounded-full mr-1"></span>
              <span>Alert</span>
            </div>
            <div class="flex items-center">
              <span class="h-2 w-2 bg-orange-500 rounded-full mr-1"></span>
              <span>Alarm</span>
            </div>
            <div class="flex items-center">
              <span class="h-2 w-2 bg-red-600 rounded-full mr-1"></span>
              <span>Critical</span>
            </div>
          </div>
          
          <div class="text-xs text-gray-500">
            Showing {filteredStations.length} of {waterStationsValue.data.length} stations
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Loading State -->
  {#if $waterStations.loading}
    <div class="rounded-lg border border-blue-200 bg-blue-50 p-6">
      <div class="flex items-center justify-center">
        <Icon icon="eos-icons:loading" class="mr-2 animate-spin text-blue-600" width="20" />
        <div>
          <p class="text-sm font-semibold text-blue-800">Loading Water Stations</p>
          <p class="text-xs text-blue-600">Fetching latest data...</p>
        </div>
      </div>
    </div>
  {:else if $waterStations.error}
    <!-- Error State -->
    <div class="rounded-lg border border-red-200 bg-red-50 p-4">
      <div class="flex items-start">
        <Icon icon="mdi:alert-circle" class="mr-2 mt-0.5 flex-shrink-0 text-red-500" width="18" />
        <div>
          <h4 class="text-sm font-bold text-red-900">Error Loading Data</h4>
          <p class="text-xs text-red-700 mt-1">{$waterStations.error}</p>
          <button 
            class="mt-2 flex items-center gap-1 rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-800 transition-colors hover:bg-red-200"
            on:click={refreshWaterStations}
          >
            <Icon icon="mdi:refresh" width="12" />
            Try Again
          </button>
        </div>
      </div>
    </div>
  {:else if $waterStations.data.length === 0}
    <!-- No Data State -->
    <div class="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
      <Icon icon="mdi:database-off" class="mx-auto mb-2 text-gray-400" width="24" />
      <p class="text-sm text-gray-600">No water station data available</p>
    </div>
  {:else if filteredStations.length === 0}
    <!-- No Results State -->
    <div class="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-center">
      <Icon icon="mdi:filter-off" class="mx-auto mb-2 text-yellow-600" width="20" />
      <p class="text-sm text-gray-700">No stations match your filters</p>
      <button 
        class="mt-2 flex items-center gap-1 mx-auto rounded bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800 transition-colors hover:bg-yellow-200"
        on:click={() => statusFilter = 'all'}
      >
        <Icon icon="mdi:filter-remove" width="12" />
        Clear Filters
      </button>
    </div>
  {:else}
    <!-- Compact Water Station Cards -->
    <div class="space-y-2">
      {#each filteredStations as station (station.obsnm)}
        {@const status = getStationStatus(station)}
        {@const change = calculateWaterChange(station)}
        
        <div class="rounded-lg border shadow-sm bg-white">
          <!-- Compact Station Header -->
          <div class="p-3">
            <div class="mb-2">
              <div class="flex items-center justify-between mb-1">
                <h4 class="flex items-center text-sm font-bold text-gray-800">
                  <Icon icon="mdi:water-check" class="mr-1.5 text-blue-600" width="14" />
                  {station.obsnm}
                </h4>
                
                <!-- Show on Map button -->
                <button 
                  class="flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
                  on:click={() => showStationOnMap(station)}
                >
                  <Icon icon="mdi:map-marker" width="12" />
                  Show on Map
                </button>
              </div>
              
              <!-- Status and Time Row -->
              <div class="flex items-center justify-between">
                <span class={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                  status.color === 'green' ? 'bg-green-100 text-green-800' :
                  status.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                  status.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                  status.color === 'red' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  <Icon icon={status.icon} class="mr-1" width="12" />
                  {status.text}
                </span>
                
                <div class="flex items-center text-xs text-gray-500">
                  <Icon icon="mdi:clock-outline" class="mr-1" width="12" />
                  {station.timestr}
                </div>
              </div>
            </div>
            
            <!-- Water Level Display -->
            <div class="rounded bg-white/70 p-3 border border-gray-200">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center">
                  <Icon icon="mdi:water" class={`mr-2 ${
                    status.color === 'green' ? 'text-green-600' :
                    status.color === 'yellow' ? 'text-yellow-600' :
                    status.color === 'orange' ? 'text-orange-600' :
                    status.color === 'red' ? 'text-red-600' :
                    'text-gray-600'
                  }`} width="20" />
                  <div>
                    <div class="flex items-baseline">
                      <span class="text-lg font-bold text-gray-800">{station.wl || 'N/A'}</span>
                      <span class="ml-1 text-xs text-gray-500">meters</span>
                    </div>
                    <div class="text-xs text-gray-600">Current Level</div>
                  </div>
                </div>
                
                <div class="text-right">
                  <div class={`flex items-center text-xs font-medium ${
                    change.color === 'red' ? 'text-red-600' :
                    change.color === 'orange' ? 'text-orange-600' :
                    change.color === 'blue' ? 'text-blue-600' :
                    'text-gray-600'
                  }`}>
                    <Icon icon={change.icon} class="mr-1" width="12" />
                    {change.text}
                  </div>
                  <div class="text-xs text-gray-500">vs 10m ago</div>
                </div>
              </div>
              
              <!-- Historical Readings Row -->
              <div class="grid grid-cols-3 gap-2 text-xs">
                <div class="text-center">
                  <div class="font-medium text-gray-700">{station.wl10m || 'N/A'}</div>
                  <div class="text-gray-500">10m ago</div>
                </div>
                <div class="text-center">
                  <div class="font-medium text-gray-700">{station.wl30m || 'N/A'}</div>
                  <div class="text-gray-500">30m ago</div>
                </div>
                <div class="text-center">
                  <div class="font-medium text-gray-700">{station.wl1h || 'N/A'}</div>
                  <div class="text-gray-500">1h ago</div>
                </div>
              </div>
            </div>
            
            <!-- Warning Levels (if any are set) -->
            {#if station.alertwl || station.alarmwl || station.criticalwl}
              <div class="mt-2 rounded bg-gray-50 border border-gray-200 p-2">
                <div class="mb-1 text-xs font-semibold text-gray-700">Warning Levels</div>
                <div class="grid grid-cols-3 gap-2 text-xs">
                  {#if station.alertwl}
                    <div class="text-center">
                      <div class="font-medium text-yellow-700">{station.alertwl}m</div>
                      <div class="text-yellow-600">Alert</div>
                    </div>
                  {/if}
                  {#if station.alarmwl}
                    <div class="text-center">
                      <div class="font-medium text-orange-700">{station.alarmwl}m</div>
                      <div class="text-orange-600">Alarm</div>
                    </div>
                  {/if}
                  {#if station.criticalwl}
                    <div class="text-center">
                      <div class="font-medium text-red-700">{station.criticalwl}m</div>
                      <div class="text-red-600">Critical</div>
                    </div>
                  {/if}
                </div>
              </div>
            {/if}
          </div>

          <!-- Compact Expand/Collapse Section -->
          <div class="border-t border-gray-200/50 bg-white/50 p-2">
            <details class="group">
              <summary class="flex w-full cursor-pointer items-center justify-center rounded border border-dashed border-blue-300 bg-blue-50/50 px-2 py-1.5 text-xs font-medium text-blue-700 transition-all duration-200 hover:bg-blue-100">
                <Icon icon="mdi:chart-line" class="mr-1" width="14" />
                <span class="group-open:hidden">Show Detailed Data</span>
                <span class="hidden group-open:inline">Hide Detailed Data</span>
                <Icon icon="mdi:chevron-down" class="ml-1 transition-transform group-open:rotate-180" width="14" />
              </summary>
              
              <!-- Detailed Data Section -->
              <div class="mt-2 space-y-2 p-2">
                <!-- Historical Readings -->
                <div class="rounded border border-blue-200 bg-blue-50 p-2">
                  <h6 class="mb-2 flex items-center text-xs font-bold text-blue-800">
                    <Icon icon="mdi:history" class="mr-1" width="12" />
                    Historical Readings
                  </h6>
                  <div class="space-y-1">
                    <div class="flex items-center justify-between rounded bg-white border border-gray-200 px-2 py-1">
                      <span class="text-xs text-gray-600">Current Level:</span>
                      <span class="text-xs font-bold text-gray-800">{station.wl || 'N/A'} m</span>
                    </div>
                    <div class="flex items-center justify-between rounded bg-white border border-gray-200 px-2 py-1">
                      <span class="text-xs text-gray-600">10 minutes ago:</span>
                      <span class="text-xs font-bold text-gray-800">{station.wl10m || 'N/A'} m</span>
                    </div>
                    <div class="flex items-center justify-between rounded bg-white border border-gray-200 px-2 py-1">
                      <span class="text-xs text-gray-600">30 minutes ago:</span>
                      <span class="text-xs font-bold text-gray-800">{station.wl30m || 'N/A'} m</span>
                    </div>
                    <div class="flex items-center justify-between rounded bg-white border border-gray-200 px-2 py-1">
                      <span class="text-xs text-gray-600">1 hour ago:</span>
                      <span class="text-xs font-bold text-gray-800">{station.wl1h || 'N/A'} m</span>
                    </div>
                  </div>
                </div>

                <!-- Warning Thresholds -->
                <div class="rounded border border-blue-200 bg-blue-50 p-2">
                  <h6 class="mb-2 flex items-center text-xs font-bold text-blue-800">
                    <Icon icon="mdi:alert" class="mr-1" width="12" />
                    Warning Thresholds
                  </h6>
                  <div class="space-y-1">
                    <div class="flex items-center justify-between rounded bg-white border border-gray-200 px-2 py-1">
                      <span class="text-xs text-gray-600">Alert Level:</span>
                      <span class="text-xs font-bold text-yellow-700">{station.alertwl || 'Not set'} m</span>
                    </div>
                    <div class="flex items-center justify-between rounded bg-white border border-gray-200 px-2 py-1">
                      <span class="text-xs text-gray-600">Alarm Level:</span>
                      <span class="text-xs font-bold text-orange-700">{station.alarmwl || 'Not set'} m</span>
                    </div>
                    <div class="flex items-center justify-between rounded bg-white border border-gray-200 px-2 py-1">
                      <span class="text-xs text-gray-600">Critical Level:</span>
                      <span class="text-xs font-bold text-red-700">{station.criticalwl || 'Not set'} m</span>
                    </div>
                    <div class="flex items-center justify-between rounded bg-white border border-gray-200 px-2 py-1">
                      <span class="text-xs text-gray-600">Current Status:</span>
                      <span class={`text-xs font-bold ${
                        status.color === 'green' ? 'text-green-700' :
                        status.color === 'yellow' ? 'text-yellow-700' :
                        status.color === 'orange' ? 'text-orange-700' :
                        status.color === 'red' ? 'text-red-700' :
                        'text-gray-700'
                      }`}>{status.text}</span>
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

<style>
  /* Enhanced styles for narrow containers */
  .text-2xs {
    font-size: 0.625rem;
    line-height: 0.875rem;
  }
  
  /* Smooth transitions */
  .water-stations-tab button {
    transition: all 0.2s ease-in-out;
  }
  
  /* Compact hover effects */
  .water-stations-tab button:hover:not(:disabled) {
    transform: translateY(-0.5px);
  }
  
  /* Better focus states */
  .water-stations-tab button:focus-visible {
    outline: 2px solid #0c3143;
    outline-offset: 1px;
  }
  
  /* Details/summary styling */
  details summary {
    list-style: none;
  }
  
  details summary::-webkit-details-marker {
    display: none;
  }
  
  /* Compact spacing for narrow layouts */
  .space-y-3 > :not([hidden]) ~ :not([hidden]) {
    margin-top: 0.75rem;
  }
  
  .space-y-2 > :not([hidden]) ~ :not([hidden]) {
    margin-top: 0.5rem;
  }
  
  .space-y-1 > :not([hidden]) ~ :not([hidden]) {
    margin-top: 0.25rem;
  }
</style>
