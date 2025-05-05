<script>
  import Map from '$lib/components/Map.svelte';
  import PredictSidebar from '$lib/components/PredictSidebar.svelte';
  import { onMount } from 'svelte';
  
  let navbarHeight = $state(0);
  
  onMount(() => {
    // Get exact navbar height
    const navbar = document.querySelector('header');
    if (navbar) {
      navbarHeight = navbar.offsetHeight;
      
      // Apply the height to the predict-page container
      const predictPage = document.querySelector('.predict-page');
      if (predictPage) {
        predictPage.style.height = `calc(100vh - ${navbarHeight}px)`;
      }
    }
  });
  
  function handleTabChange(event) {
    const tabId = event.detail;
    // Handle tab changes if needed
  }
</script>
<svelte:head>
  <title>APAW | Flood Predictions</title>
</svelte:head>

<!-- Full height predict page that accounts for navbar -->
<div class="predict-page w-full">
  <div class="flex flex-col md:flex-row h-full">
    <!-- Map takes full width on mobile, 2/3 on desktop -->
    <div class="w-full md:w-2/3 h-1/2 md:h-full relative">
      <Map height="100%" />
    </div>
    
    <!-- Sidebar takes full width on mobile, 1/3 on desktop -->
    <div class="w-full md:w-1/3 h-1/2 md:h-full border-l border-gray-200 shadow-lg overflow-y-auto">
      <PredictSidebar on:tabChange={handleTabChange} />
    </div>
  </div>
</div>

<style>
  .predict-page {
    width: 100%;
    overflow: hidden;
    /* Height will be dynamically set via JavaScript */
  }
  
  /* Remove any default margins that might cause scrolling */
  :global(body) {
    margin: 0;
    padding: 0;
  }
  
  :global(#svelte) {
    display: flex;
    flex-direction: column;
  }
</style>
