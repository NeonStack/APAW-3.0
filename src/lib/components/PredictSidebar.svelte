<script>
  import { createEventDispatcher, onMount, afterUpdate } from 'svelte';
  import { waterStations } from '$lib/stores/waterStationStore.js';
  import { InfoTab, WaterStationsTab, WeatherTab, SettingsTab } from './predict-tabs';
  import Icon from '@iconify/svelte';
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';

  const dispatch = createEventDispatcher();

  let activeTab = 'info';
  let tabs = [
    { id: 'info', name: 'Information', icon: 'mdi:information-outline' },
    { id: 'water', name: 'Water Stations', icon: 'mdi:water' },
    { id: 'weather', name: 'Weather', icon: 'mdi:weather-partly-cloudy' },
    { id: 'settings', name: 'Settings', icon: 'mdi:cog-outline' }
  ];

  let tabButtonRefs = {};

  const bgLeft = tweened(0, { duration: 300, easing: cubicOut });
  const bgWidth = tweened(0, { duration: 300, easing: cubicOut });

  function setActiveTab(tabId) {
    activeTab = tabId;
    dispatch('tabChange', tabId);
  }

  $: if (typeof window !== 'undefined' && tabButtonRefs[activeTab]) {
    const activeEl = tabButtonRefs[activeTab];
    bgLeft.set(activeEl.offsetLeft);
    bgWidth.set(activeEl.offsetWidth);
  }

  function handleSettingChange(event) {
    const { setting, value } = event.detail;
    dispatch('settingChange', { setting, value });
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

     setTimeout(() => {
       if (tabButtonRefs[activeTab]) {
         const activeEl = tabButtonRefs[activeTab];
         bgLeft.set(activeEl.offsetLeft, { duration: 0 });
         bgWidth.set(activeEl.offsetWidth, { duration: 0 });
       }
     }, 0);
  });
</script>

<div class="bg-white h-full flex flex-col shadow-md">
  <div class="p-3 border-b border-gray-200 flex justify-between items-center bg-[#0c3143] text-white">
    <h2 class="font-semibold text-sm tracking-wide">FLOOD PREDICTION PANEL</h2>
  </div>

  <div class="px-3 pt-3 pb-1">
    <div class="relative flex flex-wrap gap-1 bg-gray-100 p-1 rounded-lg">
      <div
        class="absolute top-1 bottom-1 rounded-md bg-white shadow-sm z-0"
        style="left: {$bgLeft}px; width: {$bgWidth}px;"
        aria-hidden="true"
      ></div>

      {#each tabs as tab, index}
        <button
          bind:this={tabButtonRefs[tab.id]}
          class="relative z-10 py-1.5 px-3 text-sm font-medium rounded-md flex items-center flex-1 justify-center transition-colors duration-200 ease-out {activeTab === tab.id ? 'text-[#0c3143]' : 'text-gray-600 hover:text-gray-800'}"
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
    {:else if activeTab === 'settings'}
      <SettingsTab on:settingChange={handleSettingChange} />
    {/if}
  </div>
</div>

<style>
  /* Optional global styles or component-specific styles can go here */
</style>