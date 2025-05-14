<script>
  import Map from '$lib/components/Map.svelte';
  import PredictSidebar from '$lib/components/PredictSidebar.svelte';
  import { onMount } from 'svelte';
  import Icon from '@iconify/svelte';
  
  let navbarHeight = $state(0);
  let isSidebarOpen = $state(true);
  let mapContainerHeight = $state(0);
  
  // Add window resize handler to show sidebar on desktop
  function handleResize() {
    // Get window width
    const windowWidth = window.innerWidth;
    
    // If on desktop (md breakpoint and above), always show sidebar
    if (windowWidth >= 768) {
      isSidebarOpen = true;
    }
    
    // Update container heights
    const predictPage = document.querySelector('.predict-page');
    if (predictPage) {
      mapContainerHeight = predictPage.offsetHeight;
      document.documentElement.style.setProperty('--map-container-height', `${mapContainerHeight}px`);
    }
  }
  
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
    
    // Close sidebar by default on mobile only
    if (window.innerWidth < 768) {
      isSidebarOpen = false;
    }
    
    // Add resize listener to handle responsive behavior
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
<div class="predict-page w-full overflow-hidden">
  <div class="flex flex-col md:flex-row h-full w-full">
    <!-- Map takes full width and height on mobile -->
    <div class="w-full md:w-2/3 h-full">
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
    
    <!-- Radically simplified mobile sidebar with explicit large width -->
    <div class="
      mobile-sidebar-container
      md:static md:w-1/3 md:h-full md:block
      {isSidebarOpen ? 'mobile-sidebar-open' : 'mobile-sidebar-closed'}
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
  
  /* Fix for empty space issue - ensure containers take full width */
  .predict-page > div {
    width: 100%;
    max-width: 100%;
  }
  
  /* Remove flex-grow: 0 that might be causing the issue */
  .predict-page > div {
    width: 100%;
  }
  
  /* Ensure the map and sidebar containers fill their parent completely */
  .predict-page > div > div {
    flex-shrink: 0;
  }
  
  /* Sidebar should fill its container on desktop */
  .predict-page > div > div:last-child {
    width: 33.333%;
  }
  
  @media (min-width: 768px) {
    .predict-page > div > div:last-child {
      flex: 1 0 33.333%;
      max-width: none !important;
    }
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
  
  /* Explicit sidebar styles to prevent conflicts */
  .sidebar-container {
    height: var(--map-container-height, calc(100vh - var(--nav-height, 0px)));
  }
  
  /* Open sidebar state for mobile */
  .sidebar-open {
    right: 0;
    width: 85%; /* Explicit width as percentage of viewport */
    max-width: 400px;
  }
  
  /* Closed sidebar state for mobile */
  .sidebar-closed {
    right: -100%;
    width: 0;
  }
  
  /* Desktop sidebar overrides */
  @media (min-width: 768px) {
    .sidebar-container {
      width: 33.333% !important;
      max-width: none !important;
      flex: 1 !important;
    }
  }
  
  /* Mobile sidebar positioning */
  @media (max-width: 767px) {
    .sidebar-container {
      top: var(--nav-height, 0px);
      bottom: 0;
      width: 85vw; /* Use viewport width units for mobile */
      max-width: 400px;
      overflow-y: auto;
    }
  }
  
  /* Remove all conflicting styles */
  .mobile-sidebar-container {
    position: fixed;
    height: var(--map-container-height, calc(100vh - var(--nav-height, 0px)));
    top: var(--nav-height, 0px);
    z-index: 30;
    border-left: 1px solid #e5e7eb;
    box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease-in-out;
    overflow-y: auto;
    background-color: white;
  }
  
  /* Force wide sidebar on mobile */
  .mobile-sidebar-open {
    right: 0;
    width: 85vw !important; /* Use viewport width with !important */
    max-width: 450px !important;
  }
  
  /* Hidden sidebar */
  .mobile-sidebar-closed {
    right: -100%;
    width: 0;
  }
  
  /* Desktop override - make sure it's exactly 1/3 */
  @media (min-width: 768px) {
    .mobile-sidebar-container {
      position: static;
      width: 33.333% !important;
      right: auto !important;
      box-shadow: none;
      border-left: 1px solid #e5e7eb;
    }
  }
  
  /* Remove all the old style rules that might be conflicting */
  .predict-page > div > div:last-child {
    width: auto; /* Override any previous width settings */
  }
  
  .sidebar-container, .sidebar-open, .sidebar-closed {
    /* Override any existing styles */
    width: auto !important;
  }
</style>
