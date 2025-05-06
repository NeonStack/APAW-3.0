<script>
	import '../app.css';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';
	import { Toaster } from 'svelte-sonner'
	

	let { children } = $props();
	let isMenuOpen = $state(false);
	let isPredictPage = $derived($page.url.pathname === '/predict');
	
	// Add state for active route
	let activeRoute = $state('');
	// Reference to nav link container
	let navLinksContainer;
	// References to each nav link for position calculation
	let homeLink;
	let predictLink;
	let aboutLink;
	let resourcesLink;
	
	// Indicator properties
	let indicatorStyles = $state({
		width: '0px',
		transform: 'translateX(0)',
		opacity: 0
	});

	// Add state to capture and manage body overflow
	let bodyStyle = $state('');

	function toggleMenu() {
		isMenuOpen = !isMenuOpen;
	}
	
	// Update indicator position based on active route
	function updateIndicator() {
		if (!navLinksContainer) return;
		
		let targetLink;
		switch (activeRoute) {
			case '/':
				targetLink = homeLink;
				break;
			case '/predict':
				targetLink = predictLink;
				break;
			case '/about':
				targetLink = aboutLink;
				break;
			case '/resources':
				targetLink = resourcesLink;
				break;
			default:
				indicatorStyles = { width: '0px', transform: 'translateX(0)', opacity: 0 };
				return;
		}
		
		if (targetLink) {
			const containerRect = navLinksContainer.getBoundingClientRect();
			const linkRect = targetLink.getBoundingClientRect();
			
			indicatorStyles = {
				width: `${linkRect.width}px`,
				transform: `translateX(${linkRect.left - containerRect.left}px)`,
				opacity: 1
			};
		}
	}

	onMount(() => {
		if (isPredictPage) {
			// Prevent scrolling when on predict page
			document.body.style.overflow = 'hidden';
		}
		
		// Set active route on mount
		activeRoute = $page.url.pathname;
		// Initial indicator position
		setTimeout(updateIndicator, 100); // Delay to ensure DOM is ready
		
		return () => {
			document.body.style.overflow = '';
		};
	});

	$effect(() => {
		// Update body overflow whenever route changes
		if (isPredictPage) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
		
		// Update active route and indicator when route changes
		activeRoute = $page.url.pathname;
		updateIndicator();
	});
</script>

<!-- Updated header with better spacing and theme colors -->
<header class="sticky top-0 z-50 bg-white shadow-sm">
	<div class="container mx-auto px-8 py-4 md:px-16">
		<nav class="flex items-center justify-between">
			<div class="flex items-center">
				<a href="/">
					<img src="/APAW_TRANSPARENT.png" alt="APAW Logo" class="h-7" />
				</a>
			</div>

			<!-- Desktop Navigation -->
			<div class="hidden md:flex items-center space-x-10 relative" bind:this={navLinksContainer}>
				<a
					href="/"
					class="pb-1 font-medium text-gray-800"
					class:text-primary={activeRoute === '/'}
					bind:this={homeLink}
				>Home</a>
				<a
					href="/predict"
					class="pb-1 font-medium text-gray-800"
					class:text-primary={activeRoute === '/predict'}
					bind:this={predictLink}
				>Predict</a>
				<a
					href="/about"
					class="pb-1 font-medium text-gray-800"
					class:text-primary={activeRoute === '/about'}
					bind:this={aboutLink}
				>About</a>
				<a
					href="/resources"
					class="pb-1 font-medium text-gray-800"
					class:text-primary={activeRoute === '/resources'}
					bind:this={resourcesLink}
				>Resources</a>
				
				<!-- Sliding indicator -->
				<div 
					class="absolute bottom-0 h-1 bg-primary-light rounded-full transition-all duration-300 ease-in-out"
					style:width={indicatorStyles.width}
					style:transform={indicatorStyles.transform}
					style:opacity={indicatorStyles.opacity}
				></div>
			</div>

			<!-- Mobile Menu Button -->
			<button class="focus:outline-none md:hidden" on:click={toggleMenu} aria-label="Toggle menu">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					class="h-6 w-6"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 6h16M4 12h16M4 18h16"
					/>
				</svg>
			</button>
		</nav>

		<!-- Mobile Navigation -->
		{#if isMenuOpen}
			<div class="mt-3 border-t border-gray-200 py-4 md:hidden">
				<div class="flex flex-col space-y-4">
					<a href="/" class="hover:text-primary-light font-medium text-gray-800 transition-colors"
						class:text-primary={activeRoute === '/'}
					>Home</a>
					<a
						href="/predict"
						class="hover:text-primary-light font-medium text-gray-800 transition-colors"
						class:text-primary={activeRoute === '/predict'}
					>Predict</a>
					<a
						href="/about"
						class="hover:text-primary-light font-medium text-gray-800 transition-colors"
						class:text-primary={activeRoute === '/about'}
					>About</a>
					<a
						href="/resources"
						class="hover:text-primary-light font-medium text-gray-800 transition-colors"
						class:text-primary={activeRoute === '/resources'}
					>Resources</a>
				</div>
			</div>
		{/if}
	</div>

</header>

<Toaster richColors  position="top-center" expand={true}/>

<main class={isPredictPage ? 'h-screen overflow-hidden' : ''}>
	{@render children()}
</main>

<!-- Conditionally show footer except on predict page -->
{#if !isPredictPage}
	<footer class="bg-primary-light relative overflow-hidden pt-16 pb-8 text-white">
		<!-- Wave decoration at top of footer -->
		<div class="absolute top-0 right-0 left-0 w-full overflow-hidden leading-0">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 1200 120"
				preserveAspectRatio="none"
				class="h-6 w-full fill-white"
			>
				<path
					d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"
				></path>
			</svg>
		</div>

		<div class="relative z-10 container mx-auto px-8 md:px-16">
			<div class="mb-12 grid grid-cols-1 gap-10 md:grid-cols-12">
				<!-- About/Logo Section - Reduced width -->
				<div class="md:col-span-5 lg:col-span-5">
					<!-- Logo with background container to make it visible -->
					<div class="mb-4 inline-block rounded-lg bg-white p-3 shadow-lg">
						<img src="/APAW_TRANSPARENT.png" alt="APAW Logo" class="h-12" />
					</div>
					<p class="mb-5 max-w-md text-blue-100">
						Applying supervised learning models to analyze integrated hydrometeorological data and
						predict potential flood occurrences at specific locations.
					</p>
					<div class="flex space-x-4">
						<a
							href="#"
							class="text-white transition-colors hover:text-blue-200"
							aria-label="Twitter"
						>
							<Icon icon="mdi:twitter" width="20" height="20" />
						</a>
						<a
							href="#"
							class="text-white transition-colors hover:text-blue-200"
							aria-label="Facebook"
						>
							<Icon icon="mdi:facebook" width="20" height="20" />
						</a>
						<a
							href="#"
							class="text-white transition-colors hover:text-blue-200"
							aria-label="Instagram"
						>
							<Icon icon="mdi:instagram" width="20" height="20" />
						</a>
					</div>
				</div>

				<!-- Navigation Section - Adjusted spacing -->
				<div class="md:col-span-3 md:ml-auto lg:col-span-3">
					<h3 class="mb-4 text-lg font-bold text-white">Navigation</h3>
					<ul class="space-y-3">
						<li>
							<a
								href="/"
								class="flex items-center text-blue-100 transition-colors hover:text-white"
							>
								<Icon icon="mdi:home" class="mr-2" width="16" height="16" />
								Home
							</a>
						</li>
						<li>
							<a
								href="/predict"
								class="flex items-center text-blue-100 transition-colors hover:text-white"
							>
								<Icon icon="mdi:chart-line" class="mr-2" width="16" height="16" />
								Predict
							</a>
						</li>
						<li>
							<a
								href="/about"
								class="flex items-center text-blue-100 transition-colors hover:text-white"
							>
								<Icon icon="mdi:information" class="mr-2" width="16" height="16" />
								About
							</a>
						</li>
						<li>
							<a
								href="/resources"
								class="flex items-center text-blue-100 transition-colors hover:text-white"
							>
								<Icon icon="mdi:bookshelf" class="mr-2" width="16" height="16" />
								Resources
							</a>
						</li>
					</ul>
				</div>

				<!-- Contact Us Section - Right side -->
				<div class="md:col-span-4 lg:col-span-4">
					<h3 class="mb-4 text-lg font-bold text-white">Contact Us</h3>
					<ul class="space-y-3">
						<li>
							<a
								href="mailto:info@apaw.org"
								class="flex items-center text-blue-100 transition-colors hover:text-white"
							>
								<Icon icon="mdi:email" class="mr-2" width="16" height="16" />
								info@apaw.org
							</a>
						</li>
						<li>
							<a
								href="tel:+639123456789"
								class="flex items-center text-blue-100 transition-colors hover:text-white"
							>
								<Icon icon="mdi:phone" class="mr-2" width="16" height="16" />
								+63 912 345 6789
							</a>
						</li>
					</ul>
				</div>
			</div>

			<!-- Footer Bottom Section - Simplified -->
			<div class="border-t border-blue-300/20 pt-8 text-center">
				<p class="text-sm text-blue-100">
					© {new Date().getFullYear()} APAW. All rights reserved.
				</p>
			</div>
		</div>
	</footer>
{/if}
