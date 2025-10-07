<script>
  import Map from '$lib/components/Map.svelte';
  import PredictSidebar from '$lib/components/PredictSidebar.svelte';
  import { onMount } from 'svelte';
  import Icon from '@iconify/svelte';
  
  let navbarHeight = $state(0);
  let isSidebarOpen = $state(true);
  
  function handleResize() {
    const windowWidth = window.innerWidth;
    
    // Always show sidebar on desktop
    if (windowWidth >= 768) {
      isSidebarOpen = true;
    }
  }
  
  onMount(() => {
    const navbar = document.querySelector('header');
    if (navbar) {
      navbarHeight = navbar.offsetHeight;
      document.documentElement.style.setProperty('--header-height', `${navbarHeight}px`);
    }
    
    // Close sidebar by default on mobile
    if (window.innerWidth < 768) {
      isSidebarOpen = false;
    }
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  });
  
  function toggleSidebar() {
    isSidebarOpen = !isSidebarOpen;
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
</svelte:head>

<div class="predict-page">
  <div class="flex w-full h-full m-0 p-0">
    <!-- Map Container -->
    <div class="flex-1 h-full m-0 p-0 md:w-2/3">
      <Map height="100%" />
    </div>
    
    <!-- Mobile Toggle Button -->
    <button 
      class="md:hidden fixed bottom-4 right-4 z-40 bg-primary text-white p-3 rounded-full shadow-lg flex items-center justify-center"
      onclick={toggleSidebar}
      aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
    >
      <Icon icon={isSidebarOpen ? 'mdi:chevron-right' : 'mdi:chevron-left'} width="24" />
    </button>
    
    <!-- Sidebar Container -->
    <div class="sidebar-container {isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'} 
                fixed md:static right-0 z-30 bg-white border-l border-gray-200 
                md:w-1/3 md:transform-none md:shadow-none overflow-y-auto transition-transform duration-300">
      {#if isSidebarOpen}
        <PredictSidebar on:closeSidebar={handleCloseSidebar} />
      {/if}
    </div>
  </div>
</div>

<style>
  /* Only keep styles that can't be done with Tailwind */
  .predict-page {
    height: calc(100dvh - var(--header-height, 64px));
  }
  
  .sidebar-container {
    height: calc(100dvh - var(--header-height, 64px));
  }
  
  .sidebar-open {
    transform: translateX(0);
    width: 85vw;
    max-width: 450px;
  }
  
  .sidebar-closed {
    transform: translateX(100%);
    width: 85vw;
    max-width: 450px;
  }
  
  /* Desktop overrides that Tailwind md: handles */
  @media (min-width: 768px) {
    .sidebar-container {
      position: static;
      height: 100%;
    }
  }
</style>