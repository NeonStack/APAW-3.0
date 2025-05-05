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

<div bind:this={searchContainer} class="search-bar-container" on:click={stopMapInteraction} on:dblclick={preventDoubleClickZoom}>
  <div class="search-section">
    <div class="search-input-wrapper">
      <div class="flex-1 relative">
        <div class="search-input-container">
          <Icon icon="mdi:magnify" class="search-icon" width="18" />
          <input
            type="text"
            bind:value={searchQuery}
            on:input={debounceSearch}
            on:focus={() => showResults = true}
            on:click={stopMapInteraction}
            placeholder="Search location or enter coordinates"
            class="search-input"
            disabled={disabled}
          />
          {#if searchQuery}
            <button
              on:click|stopPropagation={() => {
                searchQuery = '';
                searchResults = [];
              }}
              class="clear-button"
              aria-label="Clear search"
            >
              <Icon icon="mdi:close" width="16" />
            </button>
          {/if}
          {#if isLoading}
            <span class="loading-indicator">
              <Icon icon="eos-icons:loading" width="18" />
            </span>
          {/if}
        </div>
      </div>
      <button
        on:click|stopPropagation={handleGpsClick}
        class="gps-button"
        aria-label="Get current location"
        title="Get current location"
        type="button"
      >
        {#if isGettingLocation}
          <div class="loading-spinner"></div>
        {:else}
          <Icon icon="mdi:crosshairs-gps" width="18" />
        {/if}
      </button>
    </div>
    
    {#if showResults && searchResults.length > 0}
      <div class="search-results" on:click={stopMapInteraction} on:dblclick={preventDoubleClickZoom}>
        {#each searchResults as result}
          <button
            on:click|stopPropagation={(e) => handleResultClick(result, e)}
            class="result-item"
          >
            <div class="flex items-start">
              <Icon
                icon={result.type === 'coordinates' ? 'mdi:crosshairs-gps' : 'mdi:map-marker'}
                width="16"
                class="result-icon"
              />
              <div class="overflow-hidden">
                <div class="result-name">
                  {result.display_name.length > 50
                    ? result.display_name.substring(0, 50) + '...'
                    : result.display_name}
                </div>
                {#if result.type === 'place'}
                  <div class="result-coords">
                    {result.lat}, {result.lng}
                  </div>
                {/if}
              </div>
            </div>
          </button>
        {/each}
      </div>
    {:else if showResults && searchQuery.length >= 2 && !isLoading} <!-- Changed from 3 to 2 -->
      <div class="search-results empty-results" on:click={stopMapInteraction}>
        <p class="no-results-text">No results found</p>
        <p class="search-tip">Try adding your city/area name or use coordinates (14.xxxx, 121.xxxx)</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .search-bar-container {
    width: 100%;
    position: relative;
    z-index: 1000;
  }

  .search-section {
    background-color: transparent;
    border-radius: 8px;
    overflow: visible;
  }

  .search-input-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .search-input-container {
    display: flex;
    align-items: center;
    background-color: white;
    border-radius: 8px;
    padding: 0 12px;
    height: 40px;
    width: 100%;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    border: 1px solid #e2e8f0;
  }

  .search-icon {
    color: #64748b;
    margin-right: 8px;
    flex-shrink: 0;
  }

  .search-input {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    height: 100%;
    font-size: 14px;
    color: #1e293b;
  }

  .clear-button {
    color: #94a3b8;
    padding: 4px;
    margin-left: 4px;
    flex-shrink: 0;
    border-radius: 50%;
  }
  .clear-button:hover {
    color: #64748b;
    background-color: #f1f5f9;
  }

  .loading-indicator {
    margin-left: 4px;
    color: #3b82f6;
    animation: spin 1s linear infinite;
    flex-shrink: 0;
  }

  .gps-button {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 40px;
    height: 40px;
    background-color: white;
    color: #3b82f6;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    border: 1px solid #e2e8f0;
    flex-shrink: 0;
    transition: all 0.2s;
  }
  .gps-button:hover {
    background-color: #f8fafc;
    color: #2563eb;
  }
  .gps-button:active {
    transform: scale(0.95);
  }

  .loading-spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(59, 130, 246, 0.25);
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .search-results {
    position: absolute;
    width: 100%;
    max-height: 300px;
    overflow-y: auto;
    background-color: white;
    border-radius: 8px;
    margin-top: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1100;
  }

  .result-item {
    display: block;
    width: 100%;
    padding: 10px 12px;
    text-align: left;
    border-bottom: 1px solid #f1f5f9;
    transition: background-color 0.15s;
  }
  .result-item:last-child {
    border-bottom: none;
  }
  .result-item:hover {
    background-color: #f8fafc;
  }

  .result-icon {
    color: #3b82f6;
    margin-top: 2px;
    margin-right: 8px;
    flex-shrink: 0;
  }

  .result-name {
    font-size: 14px;
    font-weight: 500;
    color: #1e293b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .result-coords {
    font-size: 12px;
    color: #64748b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .empty-results {
    padding: 12px;
  }

  .no-results-text {
    color: #64748b;
    font-size: 13px;
    text-align: center;
  }

  .search-tip {
    color: #94a3b8;
    font-size: 12px;
    text-align: center;
    margin-top: 4px;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  /* Make sure the search interface works on mobile */
  @media (max-width: 640px) {
    .search-input-wrapper {
      width: 100%;
    }
  }
</style>
