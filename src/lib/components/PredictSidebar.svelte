<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import { waterStations, fetchWaterStations } from '$lib/stores/waterStationStore.js';
	import InfoTab from './predict-tabs/InfoTab.svelte';
	import WaterStationsTab from './predict-tabs/WaterStationsTab.svelte';
	import { weatherData, fetchWeatherData } from '$lib/stores/weatherStore.js';
	import WeatherTab from './predict-tabs/WeatherTab.svelte';
	import Icon from '@iconify/svelte';

	const dispatch = createEventDispatcher();

	let activeTab = 'info';
	let tabs = [
		{ id: 'info', name: 'Information', icon: 'mdi:information-outline' },
		{ id: 'water', name: 'Water Level', icon: 'mdi:water' },
		{ id: 'weather', name: 'Weather', icon: 'mdi:weather-partly-cloudy' }
	];

	function setActiveTab(tabId) {
		activeTab = tabId;
		dispatch('tabChange', tabId);
	}

	onMount(async () => {
		fetchWaterStations();

		fetchWeatherData();

		console.log('weatherData on mount:', $weatherData);
	});
</script>

<div class="flex h-full flex-col bg-white shadow-md">
	<div
		class="flex items-center justify-between border-b border-gray-200 bg-[#0c3143] p-3 text-white"
	>
		<h2 class="text-sm font-semibold tracking-wide">FLOOD PREDICTION PANEL</h2>

		<!-- Mobile close button with proper event dispatch -->
		<button
			class="flex items-center justify-center p-1 text-white md:hidden"
			on:click={() => dispatch('closeSidebar')}
			aria-label="Close sidebar"
		>
			<Icon icon="mdi:close" width="20" />
		</button>
	</div>

	<div class="px-3 pt-3 pb-1">
		<div class="nowrap flex gap-1 rounded-lg bg-gray-100 p-1">
			{#each tabs as tab}
				<button
					class="flex flex-grow cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 ease-out {activeTab ===
					tab.id
						? 'bg-white text-[#0c3143] shadow-sm'
						: 'text-gray-600 hover:bg-gray-200 hover:text-gray-800'}"
					on:click={() => setActiveTab(tab.id)}
				>
					<Icon icon={tab.icon} width="16" />
					<span class="hidden truncate xl:inline">{tab.name}</span>
				</button>
			{/each}
		</div>
	</div>

	<div class="flex-grow overflow-y-auto border-t border-gray-100 p-3">
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