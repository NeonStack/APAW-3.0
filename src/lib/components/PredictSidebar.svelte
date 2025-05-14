<script>
  import { createEventDispatcher, onMount, afterUpdate } from 'svelte';
  import { waterStations } from '$lib/stores/waterStationStore.js';
  import InfoTab from './predict-tabs/InfoTab.svelte';
  import WaterStationsTab from './predict-tabs/WaterStationsTab.svelte';
  import WeatherTab from './predict-tabs/WeatherTab.svelte';
  import Icon from '@iconify/svelte';
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';

  const dispatch = createEventDispatcher();

  let activeTab = 'info';
  let tabs = [
    { id: 'info', name: 'Information', icon: 'mdi:information-outline' },
    { id: 'water', name: 'Water Stations', icon: 'mdi:water' },
    { id: 'weather', name: 'Weather', icon: 'mdi:weather-partly-cloudy' }
  ];

  function setActiveTab(tabId) {
    activeTab = tabId;
    dispatch('tabChange', tabId);
  }

  onMount(async () => {
    try {
      waterStations.update(store => ({ ...store, loading: true, error: null }));
      const antiCacheToken = Date.now() + Math.random().toString(36).substring(2, 15);
      const response = await fetch(`/api/water-stations?_=${antiCacheToken}`);
      if (!response.ok) {
        throw new Error(`Error fetching data: ${response.status}`);
      }
      const data = await response.json();
      waterStations.set({ loading: false, data: data, error: null });
    } catch (error) {
      console.error('Failed to load data');
      waterStations.set({ loading: false, data: [], error: 'Unable to load water station data' });
    }
  });
</script>

<div class="bg-white h-full flex flex-col shadow-md">
  <div class="p-3 border-b border-gray-200 flex justify-between items-center bg-[#0c3143] text-white">
    <h2 class="font-semibold text-sm tracking-wide">FLOOD PREDICTION PANEL</h2>
    
    <!-- Mobile close button with proper event dispatch -->
    <button 
      class="md:hidden text-white flex items-center justify-center p-1"
      on:click={() => dispatch('closeSidebar')}
      aria-label="Close sidebar"
    >
      <Icon icon="mdi:close" width="20" />
    </button>
  </div>

  <div class="px-3 pt-3 pb-1">
    <div class="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-lg">
      
      {#each tabs as tab}
        <button
          class="py-1.5 px-3 text-sm font-medium rounded-md flex items-center justify-center cursor-pointer transition-all duration-200 ease-out flex-grow min-w-[120px] 
                 {activeTab === tab.id ? 'bg-white text-[#0c3143] shadow-sm' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'}"
          on:click={() => setActiveTab(tab.id)}
        >
          <Icon icon={tab.icon} class="mr-1.5" width="16" />
          <span class="truncate">{tab.name}</span>
        </button>
      {/each}
    </div>
  </div>

  <div class="flex-grow p-3 overflow-y-auto border-t border-gray-100">
    {#if activeTab === 'info'}
      <InfoTab />
    {:else if activeTab === 'water'}
      <WaterStationsTab />
    {:else if activeTab === 'weather'}
      <WeatherTab />
    {/if}
  </div>
</div>

<style>
  /* Optional global styles or component-specific styles can go here */
  /* Make sure the sidebar has proper z-index and background */
  :global(.predict-page > div > div:last-child) {
    background-color: white;
  }
  
  /* Additional mobile-specific styles */
  @media (max-width: 767px) {
    div.bg-white {
      border-radius: 0;
      height: 100%;
      max-height: 100%;
      overflow-y: auto;
    }
  }
</style>