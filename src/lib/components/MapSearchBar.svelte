<script>
	import { onMount, createEventDispatcher } from 'svelte';
	import { searchLocations, getCurrentPosition, getLocationName } from '$lib/stores/locationStore.js';
	import { selectedLocation } from '$lib/stores/locationStore.js';
	import Icon from '@iconify/svelte';

	const dispatch = createEventDispatcher();

	let searchQuery = '';
	let searchResults = [];
	let isLoading = false;
	let showResults = false;
	let searchTimeout;
	let isGettingLocation = false;

	async function handleSearch() {
		if (searchQuery.trim().length < 3) {
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

	async function handleGpsClick() {
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
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(handleSearch, 500);
	}

	function handleResultClick(result, event) {
		// Prevent the event from reaching the map
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

	// Stop propagation of click events within the search component
	function handleContainerClick(event) {
		event.stopPropagation();
	}

	// Prevent double-click zoom on search bar
	function preventDoubleClickZoom(event) {
		event.stopPropagation();
	}

	// Close results when clicking outside
	function handleClickOutside(event) {
		const searchBar = document.querySelector('.search-container');
		if (searchBar && !searchBar.contains(event.target)) {
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
	class="search-container"
	on:click={handleContainerClick}
	on:mousedown={handleContainerClick}
	on:pointerdown={handleContainerClick}
	on:dblclick={preventDoubleClickZoom}
>
	<div class="search-input-wrapper">
		<input
			type="text"
			bind:value={searchQuery}
			on:input={debounceSearch}
			on:dblclick={preventDoubleClickZoom}
			placeholder="Search in Metro Manila..."
			class="search-input w-full rounded-md py-2 pr-8 pl-8 focus:outline-none"
		/>
		<div class="absolute top-2.5 left-2 text-gray-500">
			<Icon icon="mdi:magnify" width="18" />
		</div>
		<div class="absolute top-2.5 right-2 flex">
			<button
				on:click|stopPropagation={handleGpsClick}
				class="mr-1 text-blue-500 hover:text-blue-700"
				aria-label="Get current location"
				title="Get current location"
				type="button"
			>
				{#if isGettingLocation}
					<div
						class="h-5 w-5 animate-spin rounded-full border-t-2 border-b-2 border-blue-500"
					></div>
				{:else}
					<Icon icon="mdi:crosshairs-gps" width="18" />
				{/if}
			</button>

			{#if isLoading}
				<div class="h-5 w-5 animate-spin rounded-full border-t-2 border-b-2 border-blue-500"></div>
			{:else if searchQuery}
				<button
					on:click|stopPropagation={() => {
						searchQuery = '';
						searchResults = [];
					}}
					class="text-gray-400 hover:text-gray-600"
					aria-label="Clear search"
				>
					<Icon icon="mdi:close" width="18" />
				</button>
			{/if}
		</div>
	</div>

	{#if showResults && searchResults.length > 0}
		<div class="search-results z-50 mt-1 max-h-48 overflow-y-auto rounded-md bg-white shadow-lg">
			{#each searchResults as result}
				<button
					on:click|stopPropagation={(e) => handleResultClick(result, e)}
					class="block w-full border-b border-gray-100 px-3 py-1.5 text-left last:border-b-0 hover:bg-gray-100"
				>
					<div class="flex items-start">
						<Icon
							icon={result.type === 'coordinates' ? 'mdi:crosshairs-gps' : 'mdi:map-marker'}
							width="16"
							class="mt-0.5 mr-2 shrink-0 text-blue-500"
						/>
						<div class="overflow-hidden">
							<div class="truncate text-sm font-medium text-gray-900">
								{result.display_name.length > 50
									? result.display_name.substring(0, 50) + '...'
									: result.display_name}
							</div>
							{#if result.type === 'place'}
								<div class="truncate text-xs text-gray-500">
									{result.lat}, {result.lng}
								</div>
							{/if}
						</div>
					</div>
				</button>
			{/each}
		</div>
	{:else if showResults && searchQuery.length >= 3 && !isLoading}
		<div class="search-results z-50 mt-1 rounded-md bg-white p-2 shadow-lg">
			<p class="text-xs text-gray-500">No results found</p>
		</div>
	{/if}
</div>

<style>
	.search-container {
		width: 100%;
		position: relative;
	}

	.search-input-wrapper {
		position: relative;
		width: 100%;
	}

	.search-input {
		background-color: white;
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
		font-size: 0.9rem;
		border: none;
	}

	.search-results {
		position: absolute;
		width: 100%;
		border: none;
	}

	/* Ensure truncated text has ellipsis */
	.truncate {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
