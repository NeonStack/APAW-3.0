<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { searchLocations, getCurrentPosition, getLocationName } from '$lib/stores/locationStore.js';
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
    if (disabled) return;

    if (searchQuery.trim().length < 2) { // Reduce minimum query length from 3 to 2
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
    clearTimeout(timeout);
    timeout = setTimeout(handleSearch, 500);
  }
  
  function handleResultClick(result, event) {
    if (disabled) return;

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
  
  // Add this function to stop propagation to the map
  function stopMapInteraction(event) {
    event.stopPropagation();
  }
  
  // Close results when clicking outside
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

<div bind:this={searchContainer} class="relative w-full z-[1000]" on:click={stopMapInteraction} on:dblclick={preventDoubleClickZoom}>
  <div class="overflow-visible rounded-lg bg-transparent">
    <div class="flex items-center gap-2">
      <div class="flex-1 relative">
        <div class="flex items-center w-full h-10 px-3 bg-white rounded-lg shadow-md border border-gray-200">
          <Icon icon="mdi:magnify" class="mr-3" width="18" />
          <input
            type="text"
            bind:value={searchQuery}
            on:input={debounceSearch}
            on:focus={() => showResults = true}
            on:click={stopMapInteraction}
            placeholder="Search location or enter coordinates"
            class="flex-1 h-full border-none outline-none bg-transparent text-sm text-gray-800"
            disabled={disabled}
          />
          {#if searchQuery}
            <button
              on:click|stopPropagation={() => {
                searchQuery = '';
                searchResults = [];
              }}
              class="p-1 ml-1 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-full flex-shrink-0"
              aria-label="Clear search"
            >
              <Icon icon="mdi:close" width="16" />
            </button>
          {/if}
          {#if isLoading}
            <span class="ml-1 text-blue-500 animate-spin">
              <Icon icon="eos-icons:loading" width="18" />
            </span>
          {/if}
        </div>
      </div>
      <button
        on:click|stopPropagation={handleGpsClick}
        class="flex justify-center items-center w-10 h-10 bg-white text-blue-500 rounded-lg shadow-md border border-gray-200 flex-shrink-0 transition-all duration-200 hover:bg-gray-50 hover:text-blue-600 active:scale-95"
        aria-label="Get current location"
        title="Get current location"
        type="button"
      >
        {#if isGettingLocation}
          <div class="w-[18px] h-[18px] border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
        {:else}
          <Icon icon="mdi:crosshairs-gps" width="18" />
        {/if}
      </button>
    </div>
    
    {#if showResults && searchResults.length > 0}
      <div class="absolute w-full max-h-[300px] overflow-y-auto bg-white rounded-lg mt-2 shadow-lg z-[1100]" on:click={stopMapInteraction} on:dblclick={preventDoubleClickZoom}>
        {#each searchResults as result}
          <button
            on:click|stopPropagation={(e) => handleResultClick(result, e)}
            class="block w-full py-2.5 px-3 text-left border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors duration-150"
          >
            <div class="flex items-center">
              <Icon
                icon={result.type === 'coordinates' ? 'mdi:crosshairs-gps' : 'mdi:map-marker'}
                width="16"
                class="mr-3"
              />
              <div class="overflow-hidden">
                <div class="text-sm font-medium text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis">
                  {result.display_name.length > 50
                    ? result.display_name.substring(0, 50) + '...'
                    : result.display_name}
                </div>
                {#if result.type === 'place'}
                  <div class="text-xs text-gray-500 whitespace-nowrap overflow-hidden text-ellipsis">
                    {result.lat}, {result.lng}
                  </div>
                {/if}
              </div>
            </div>
          </button>
        {/each}
      </div>
    {:else if showResults && searchQuery.length >= 2 && !isLoading} <!-- Changed from 3 to 2 -->
      <div class="absolute w-full bg-white rounded-lg mt-2 shadow-lg p-3 z-[1100]" on:click={stopMapInteraction}>
        <p class="text-gray-500 text-sm text-center">No results found</p>
        <p class="text-gray-400 text-xs text-center mt-1">Try adding your city/area name or use coordinates (14.xxxx, 121.xxxx)</p>
      </div>
    {/if}
  </div>
</div>

<style>
  /* Improved responsive styling */
  @media (max-width: 640px) {
    .search-input-wrapper {
      width: 100%;
    }
    
    /* Add background to search results on mobile for better visibility */
    div.absolute.w-full.bg-white {
      background-color: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(5px);
    }
  }
</style>
