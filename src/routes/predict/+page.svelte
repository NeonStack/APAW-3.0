<script>
  import Map from '$lib/components/Map.svelte';
  import PredictSidebar from '$lib/components/PredictSidebar.svelte';
  import { onMount } from 'svelte';
  import Icon from '@iconify/svelte';
  
  let navbarHeight = $state(0);
  let isSidebarOpen = $state(true);
  let mapContainerHeight = $state(0);
  
  onMount(() => {
    // Get exact navbar height
    const navbar = document.querySelector('header');
    if (navbar) {
      navbarHeight = navbar.offsetHeight;
      
      // Apply the height to the predict-page container
      const predictPage = document.querySelector('.predict-page');
      if (predictPage) {
        predictPage.style.height = `calc(100vh - ${navbarHeight}px)`;
        
        // Store map container height for sidebar
        mapContainerHeight = predictPage.offsetHeight;
        document.documentElement.style.setProperty('--map-container-height', `${mapContainerHeight}px`);
      }
    }
    
    // Close sidebar by default on mobile
    if (window.innerWidth < 768) {
      isSidebarOpen = false;
    }
    
    // Update height on window resize
    const handleResize = () => {
      const predictPage = document.querySelector('.predict-page');
      if (predictPage) {
        mapContainerHeight = predictPage.offsetHeight;
        document.documentElement.style.setProperty('--map-container-height', `${mapContainerHeight}px`);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  });
  
  function toggleSidebar() {
    isSidebarOpen = !isSidebarOpen;
  }
  
  function handleTabChange(event) {
    const tabId = event.detail;
    // Handle tab changes if needed
  }
  
  function handleCloseSidebar() {
    isSidebarOpen = false;
  }
</script>

<svelte:head>
  <title>APAW | Flood Predictions</title>
  <meta 
    name="description" 
    content="View interactive 5-day flood risk predictions for specific locations within Metro Manila using APAW's advanced prediction model." 
  />
  <style>
    :root {
      --nav-height: {navbarHeight}px;
      --map-container-height: 100vh;
    }
  </style>
</svelte:head>

<!-- Full height predict page that accounts for navbar -->
<div class="predict-page w-full">
  <div class="flex flex-col md:flex-row h-full relative">
    <!-- Map takes full width and height on mobile -->
    <div class="w-full h-full relative">
      <Map height="100%" />
    </div>
    
    <!-- Toggle button for mobile - fixed position -->
    <button 
      class="md:hidden fixed bottom-4 right-4 z-40 bg-[#0c3143] text-white p-3 rounded-full shadow-lg flex items-center justify-center"
      on:click={toggleSidebar}
      aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
    >
      <Icon icon={isSidebarOpen ? 'mdi:chevron-right' : 'mdi:chevron-left'} width="24" />
    </button>
    
    <!-- Sidebar as floating container on mobile - with strictly contained height -->
    <div class="
      md:w-1/3 md:h-full md:border-l md:border-gray-200 md:shadow-lg md:static md:block md:overflow-y-auto
      fixed z-30 transition-all duration-300 ease-in-out
      {isSidebarOpen ? 'right-0 w-[85%] max-w-md' : 'right-[-100%] w-0'}
      mobile-sidebar
    ">
      {#if isSidebarOpen || window?.innerWidth >= 768}
        <PredictSidebar on:tabChange={handleTabChange} on:closeSidebar={handleCloseSidebar} />
      {/if}
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
  
  /* Add smooth shadow effect to the floating sidebar */
  @media (max-width: 767px) {
    .predict-page > div > div:last-child {
      box-shadow: -5px 0 15px rgba(0, 0, 0, 0.1);
    }
    
    /* Explicitly set sidebar position and height */
    .mobile-sidebar {
      top: var(--nav-height, 0px) !important;
      height: var(--map-container-height, calc(100vh - var(--nav-height, 0px))) !important;
      max-height: var(--map-container-height, calc(100vh - var(--nav-height, 0px))) !important;
      bottom: 0 !important;
      overflow-y: auto !important;
    }
  }
</style>
