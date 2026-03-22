<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import {
		searchLocations,
		getCurrentPosition,
		getLocationName
	} from '$lib/stores/locationStore.js';
	import Icon from '@iconify/svelte';

	const dispatch = createEventDispatcher();

	let searchQuery = '';
	let searchResults = [];
	let isLoading = false;
	let timeout = null;
	let showResults = false;
	let isGettingLocation = false;
	let searchContainer;

	// Accept disabled prop to disable search during prediction
	export let disabled = false;

	async function handleSearch() {
		if (disabled || searchQuery.trim().length < 2) {
			searchResults = [];
			showResults = false;
			return;
		}

		isLoading = true;
		showResults = true;

		try {
			searchResults = await searchLocations(searchQuery);
		} catch (error) {
			console.error('Search error:', error);
			searchResults = [];
		} finally {
			isLoading = false;
		}
	}

	async function handleGpsClick(event) {
		event.stopPropagation();
		isGettingLocation = true;

		try {
			const position = await getCurrentPosition();
			const locationName = await getLocationName(position.lat, position.lng);

			// Clear search
			searchQuery = '';
			showResults = false;
			searchResults = [];

			// Dispatch event to move map and create marker
			dispatch('selectLocation', {
				lat: position.lat,
				lng: position.lng,
				name: locationName || 'Current Location'
			});
		} catch (error) {
			console.error('Error getting current position:', error);
			alert(`Error: ${error.message}`);
		} finally {
			isGettingLocation = false;
		}
	}

	function debounceSearch() {
		clearTimeout(timeout);
		timeout = setTimeout(handleSearch, 500);
	}

	function handleResultClick(result, event) {
		if (disabled) return;
		event.stopPropagation();
		event.preventDefault();

		// Clear search
		searchQuery = '';
		showResults = false;
		searchResults = [];

		// Dispatch event to move map and create marker
		dispatch('selectLocation', {
			lat: result.lat,
			lng: result.lng,
			name: result.display_name
		});
	}

	function stopMapPropagation(event) {
		event.stopPropagation();
	}

	function handleClickOutside(event) {
		if (searchContainer && !searchContainer.contains(event.target)) {
			showResults = false;
		}
	}

	onMount(() => {
		document.addEventListener('click', handleClickOutside);
		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});
</script>

<div
	bind:this={searchContainer}
	class="relative z-[1000] w-full"
	on:click={stopMapPropagation}
	on:dblclick={stopMapPropagation}
	on:mousedown={stopMapPropagation}
	on:wheel|stopPropagation
	on:touchstart|stopPropagation
	on:touchmove|stopPropagation
>
	<div class="flex items-center gap-2">
		<!-- Search Input Wrapper -->
		<div class="relative flex-1">
			<div
				class="flex h-12 w-full items-center rounded-xl border border-slate-200 bg-white px-4 shadow-md transition-all"
			>
				<Icon icon="mdi:magnify" class="mr-3 text-slate-400" width="22" />
				<input
					type="text"
					bind:value={searchQuery}
					on:input={debounceSearch}
					on:focus={() => {
						if (searchQuery.length > 0) showResults = true;
					}}
					placeholder="Search location or enter coordinates"
					class="h-full flex-1 border-none bg-transparent text-[15px] font-medium text-slate-800 placeholder-slate-400 outline-none"
					{disabled}
				/>

				{#if isLoading}
					<span class="text-primary ml-2 animate-spin">
						<Icon icon="eos-icons:loading" width="20" />
					</span>
				{:else if searchQuery}
					<button
						on:click|stopPropagation={() => {
							searchQuery = '';
							searchResults = [];
							showResults = false;
						}}
						class="ml-1 flex-shrink-0 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
						aria-label="Clear search"
					>
						<Icon icon="mdi:close" width="18" />
					</button>
				{/if}
			</div>
		</div>

		<!-- GPS Button -->
		<button
			on:click={handleGpsClick}
			class="text-primary hover:text-primary-light flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-md transition-all outline-none hover:bg-slate-50"
			aria-label="Get current location"
			title="Get current location"
			type="button"
		>
			{#if isGettingLocation}
				<div
					class="border-t-primary h-5 w-5 animate-spin rounded-full border-2 border-slate-200"
				></div>
			{:else}
				<Icon icon="mdi:crosshairs-gps" width="22" />
			{/if}
		</button>
	</div>

	<!-- Dropdown Results Container -->
	{#if showResults && searchResults.length > 0}
		<div
			class="custom-scrollbar absolute z-[1100] mt-2 max-h-[300px] w-full overflow-y-auto rounded-xl border border-slate-100 bg-white shadow-xl"
		>
			{#each searchResults as result}
				<button
					on:click={(e) => handleResultClick(result, e)}
					class="group block w-full border-b border-slate-50 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-slate-50"
				>
					<div class="flex items-start">
						<Icon
							icon={result.type === 'coordinates' ? 'mdi:crosshairs-gps' : 'mdi:map-marker'}
							width="20"
							class="group-hover:text-primary mt-0.5 mr-3 flex-shrink-0 text-slate-400 transition-colors"
						/>
						<div class="flex-1 overflow-hidden">
							<div
								class="group-hover:text-primary mb-1 text-sm leading-snug font-semibold text-slate-800 transition-colors"
							>
								{result.display_name}
							</div>
							{#if result.type === 'place'}
								<div class="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
									{Number(result.lat).toFixed(4)}, {Number(result.lng).toFixed(4)}
								</div>
							{/if}
						</div>
					</div>
				</button>
			{/each}
		</div>
	{:else if showResults && searchQuery.length >= 2 && !isLoading}
		<div
			class="absolute z-[1100] mt-2 w-full rounded-xl border border-slate-100 bg-white p-4 shadow-xl"
		>
			<div class="flex flex-col items-center justify-center py-3 text-center">
				<Icon icon="mdi:map-search-outline" class="mb-2 text-slate-300" width="36" />
				<p class="text-sm font-semibold text-slate-700">No results found</p>
				<p class="mt-1 max-w-[80%] text-xs text-slate-400">
					Try adding your city or enter coordinates.
				</p>
			</div>
		</div>
	{/if}
</div>

<style>
	/* Clean custom scrollbar so scrolling isn't clunky */
	.custom-scrollbar::-webkit-scrollbar {
		width: 6px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: transparent;
		margin: 4px 0;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background-color: #cbd5e1;
		border-radius: 10px;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb:hover {
		background-color: #94a3b8;
	}

	@media (max-width: 640px) {
		div.absolute.w-full.bg-white {
			max-height: 250px;
		}
	}
</style>
