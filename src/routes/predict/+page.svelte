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
	<div class="m-0 flex h-full w-full p-0">
		<!-- Map Container -->
		<div class="m-0 h-full flex-1 p-0 md:w-2/3">
			<Map height="100%" />
		</div>

		<!-- Mobile Toggle Button -->
		<button
			class="bg-primary fixed right-4 bottom-4 z-40 flex items-center justify-center rounded-full p-3 text-white shadow-lg md:hidden"
			onclick={toggleSidebar}
			aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
		>
			<Icon icon={isSidebarOpen ? 'mdi:chevron-right' : 'mdi:chevron-left'} width="24" />
		</button>

		<!-- Sidebar Container -->
		<div
			class="sidebar-container {isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'} 
                fixed right-0 z-30 overflow-y-auto bg-white
                transition-transform duration-300 md:static md:transform-none md:shadow-none"
		>
			{#if isSidebarOpen}
				<PredictSidebar on:closeSidebar={handleCloseSidebar} />
			{/if}
		</div>
	</div>
</div>

// ...existing code...
<style>
    /* Only keep styles that can't be done with Tailwind */
    .predict-page {
        height: calc(100dvh - var(--header-height, 64px));
    }

    .sidebar-container {
        height: calc(100dvh - var(--header-height, 64px));
        /* Enable resizing for all screen sizes */
        resize: horizontal;
        overflow: auto; /* Required for resize to work */
        direction: rtl; /* Moves the resize handle to the left side */
    }

    /* Resets the text direction for the content inside the sidebar */
    .sidebar-container > :global(*) {
        direction: ltr;
    }

    .sidebar-open {
        transform: translateX(0);
        width: 85vw;
        max-width: 450px;
        min-width: 250px; /* Prevent it from becoming too small on mobile */
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
            width: 33.333333%; /* Initial width, replacing md:w-1/3 */
            min-width: 400px; /* Prevent it from becoming too small */
            max-width: 600px; /* Prevent it from becoming too large */
        }
    }
</style>