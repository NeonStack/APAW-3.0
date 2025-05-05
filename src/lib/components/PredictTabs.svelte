<script>
  import { createEventDispatcher } from 'svelte';
  import InfoTab from './predict-tabs/InfoTab.svelte';
  import WeatherTab from './predict-tabs/WeatherTab.svelte';
  import WaterStationsTab from './predict-tabs/WaterStationsTab.svelte';
  import Icon from '@iconify/svelte';
  
  const dispatch = createEventDispatcher();
  
  let activeTab = 'info';
  
  // Forward the predictionStatusChange event from InfoTab
  function handlePredictionStatusChange(event) {
    dispatch('predictionStatusChange', event.detail);
  }
  
  const tabs = [
    { id: 'info', label: 'Flood Prediction', icon: 'mdi:weather-flood' },
    { id: 'weather', label: 'Weather', icon: 'mdi:weather-partly-cloudy' },
    { id: 'water', label: 'Water Stations', icon: 'mdi:water' },
    { id: 'stats', label: 'Statistics', icon: 'mdi:chart-box' }
  ];
</script>

<div class="h-full flex flex-col">
  <div class="bg-gray-100 border-b border-gray-200">
    <div class="flex overflow-x-auto">
      {#each tabs as tab}
        <button
          class="px-4 py-3 text-sm font-medium whitespace-nowrap {activeTab === tab.id ? 'text-[#0c3143] border-b-2 border-[#0c3143]' : 'text-gray-500 hover:text-[#0c3143]'}"
          on:click={() => activeTab = tab.id}
        >
          <div class="flex items-center">
            <Icon icon={tab.icon} width="18" class="mr-1.5" />
            <span>{tab.label}</span>
          </div>
        </button>
      {/each}
    </div>
  </div>
  
  <div class="flex-grow overflow-y-auto p-4">
    {#if activeTab === 'info'}
      <InfoTab on:predictionStatusChange={handlePredictionStatusChange} />
    {:else if activeTab === 'weather'}
      <WeatherTab />
    {:else if activeTab === 'water'}
      <WaterStationsTab />
    {:else if activeTab === 'stats'}
      <StatsTab />
    {/if}
  </div>
</div>
