<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { waterStations } from '$lib/stores/waterStationStore.js';
  import { InfoTab, WaterStationsTab, WeatherTab, SettingsTab } from './predict-tabs';

  const dispatch = createEventDispatcher();

  let activeTab = 'info';
  let tabs = [
    { id: 'info', name: 'Information' },
    { id: 'water', name: 'Water Stations' },
    { id: 'weather', name: 'Weather' },
    { id: 'settings', name: 'Settings' }
  ];

  function setActiveTab(tabId) {
    activeTab = tabId;
    dispatch('tabChange', tabId);
  }

  // Handle settings changes
  function handleSettingChange(event) {
    const { setting, value } = event.detail;
    dispatch('settingChange', { setting, value });
  }

  // Fetch water station data on component mount
  onMount(async () => {
    try {
      waterStations.update(store => ({ ...store, loading: true, error: null }));
      
      // Add a random token to prevent caching and make tracking harder
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
      <InfoTab />
    {:else if activeTab === 'water'}
      <WaterStationsTab />
    {:else if activeTab === 'weather'}
      <WeatherTab />
    {:else if activeTab === 'settings'}
      <SettingsTab on:settingChange={handleSettingChange} />
    {/if}
  </div>
</div>
