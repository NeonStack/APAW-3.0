<script>
	import '../app.css';
	import { page } from '$app/stores';
	import Icon from '@iconify/svelte';
	import { Toaster } from 'svelte-sonner';
	import { fly, fade } from 'svelte/transition';
	import { browser } from '$app/environment';
	import { injectAnalytics } from '@vercel/analytics/sveltekit'

	let { children } = $props();

	injectAnalytics();

	// State management
	let isMenuOpen = $state(false);

	// Derived states
	let isPredictPage = $derived($page.url.pathname === '/predict');
	let activeRoute = $derived($page.url.pathname);

	// Navigation items for the header
	const navItems = [
		{ href: '/', label: 'Home' },
		{ href: '/predict', label: 'Predict' },
		{ href: '/about', label: 'About' },
		{ href: '/resources', label: 'Resources' }
	];

	// Link references for position calculation
	let navLinks = $state({});
	let indicatorStyle = $state({ width: 0, left: 0 });

	// Menu toggle handler
	function toggleMenu() {
		isMenuOpen = !isMenuOpen;
	}

	// Close menu when clicking a link
	function closeMenu() {
		isMenuOpen = false;
	}

	// Map routes to grid column positions for the sliding indicator
	const routePositions = {
		'/': 1,
		'/predict': 2,
		'/about': 3,
		'/resources': 4
	};

	// Calculate indicator position based on active link
	$effect(() => {
		if (browser) {
			// <-- 2. ADD THIS CHECK
			const activeLink = navLinks[activeRoute];
			if (activeLink) {
				const rect = activeLink.getBoundingClientRect();
				const parentRect = activeLink.parentElement.getBoundingClientRect();

				indicatorStyle = {
					width: rect.width,
					left: rect.left - parentRect.left
				};
			}
		}
	});

	// Manage body overflow
	$effect(() => {
		if (browser) {
			// <-- 3. ADD THIS CHECK
			if (isPredictPage || isMenuOpen) {
				document.body.style.overflow = 'hidden';
			} else {
				document.body.style.overflow = '';
			}

			return () => {
				document.body.style.overflow = '';
			};
		}
	});

	// line indicator below link offset adjustment
	const indicatorOffset = 8;
</script>

<!-- Header -->
<header class="sticky top-0 z-[60] bg-white shadow-sm">
	<div class="container mx-auto px-8 py-4 md:px-16">
		<nav class="flex items-center justify-between">
			<!-- Logo -->
			<div class="flex items-center">
				<a href="/">
					<img src="/APAW_TRANSPARENT.webp" alt="APAW Logo" class="h-7" />
				</a>
			</div>

			<!-- Desktop Navigation -->
			<div class="relative hidden grid-cols-4 gap-6 md:grid">
				{#each navItems as item}
					<a
						bind:this={navLinks[item.href]}
						href={item.href}
						class="hover:text-primary relative pb-2 text-center font-medium text-gray-800 transition-colors"
						class:text-primary={activeRoute === item.href}
					>
						{item.label}
					</a>
				{/each}

				<!-- Sliding indicator -->
				{#if indicatorStyle.width > 0}
					<span
						class="bg-primary-light absolute bottom-0 h-1 rounded-full transition-all duration-300 ease-out"
						style="
							width: {indicatorStyle.width}px;
							left: {indicatorStyle.left}px;
						"
					></span>
				{/if}
			</div>

			<!-- Mobile Menu Button -->
			<button
				class="relative z-[60] focus:outline-none md:hidden"
				onclick={toggleMenu}
				aria-label="Toggle menu"
			>
				{#if !isMenuOpen}
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
				{:else}
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
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				{/if}
			</button>
		</nav>
	</div>
</header>

<!-- Mobile Navigation Overlay -->
{#if isMenuOpen}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-[58] bg-black/50 md:hidden"
		onclick={closeMenu}
		transition:fade={{ duration: 200 }}
	></div>

	<!-- Sidebar -->
	<div
		class="fixed top-0 right-0 bottom-0 z-[59] w-64 bg-white shadow-2xl md:hidden"
		transition:fly={{ x: 300, duration: 300 }}
	>
		<div class="flex h-full flex-col px-6 pt-20">
			<!-- Navigation Links -->
			<nav class="flex flex-col space-y-6">
				<a
					href="/"
					onclick={closeMenu}
					class="hover:text-primary relative -mx-6 flex items-center px-6 py-2 text-lg font-medium text-gray-800 transition-colors"
					class:text-primary={activeRoute === '/'}
				>
					{#if activeRoute === '/'}
						<span class="bg-primary-light absolute top-0 bottom-0 left-0 w-1 rounded-r-full"></span>
					{/if}
					<Icon icon="mdi:home" class="mr-3" width="24" height="24" />
					Home
				</a>
				<a
					href="/predict"
					onclick={closeMenu}
					class="hover:text-primary relative -mx-6 flex items-center px-6 py-2 text-lg font-medium text-gray-800 transition-colors"
					class:text-primary={activeRoute === '/predict'}
				>
					{#if activeRoute === '/predict'}
						<span class="bg-primary-light absolute top-0 bottom-0 left-0 w-1 rounded-r-full"></span>
					{/if}
					<Icon icon="mdi:chart-line" class="mr-3" width="24" height="24" />
					Predict
				</a>
				<a
					href="/about"
					onclick={closeMenu}
					class="hover:text-primary relative -mx-6 flex items-center px-6 py-2 text-lg font-medium text-gray-800 transition-colors"
					class:text-primary={activeRoute === '/about'}
				>
					{#if activeRoute === '/about'}
						<span class="bg-primary-light absolute top-0 bottom-0 left-0 w-1 rounded-r-full"></span>
					{/if}
					<Icon icon="mdi:information" class="mr-3" width="24" height="24" />
					About
				</a>
				<a
					href="/resources"
					onclick={closeMenu}
					class="hover:text-primary relative -mx-6 flex items-center px-6 py-2 text-lg font-medium text-gray-800 transition-colors"
					class:text-primary={activeRoute === '/resources'}
				>
					{#if activeRoute === '/resources'}
						<span class="bg-primary-light absolute top-0 bottom-0 left-0 w-1 rounded-r-full"></span>
					{/if}
					<Icon icon="mdi:bookshelf" class="mr-3" width="24" height="24" />
					Resources
				</a>
			</nav>

			<!-- Footer info in sidebar -->
			<div class="mt-auto pb-8">
				<div class="border-t border-gray-200 pt-6">
					<img src="/APAW_TRANSPARENT.webp" alt="APAW Logo" class="mb-3 h-8" />
					<p class="text-xs text-gray-600">
						© {new Date().getFullYear()} APAW
					</p>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Toast Notifications -->
<Toaster richColors position="top-center" expand={true} />

<!-- Main Content -->
<main class="min-h-dvh w-full">
	{@render children()}
</main>

<!-- Footer (hidden on predict page) -->
{#if !isPredictPage}
	<footer class="bg-primary-light relative overflow-hidden pt-16 pb-8 text-white">
		<!-- Wave Decoration -->
		<div class="absolute top-0 right-0 left-0 w-full overflow-hidden leading-0">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 1200 120"
				preserveAspectRatio="none"
				class="block h-16 w-full fill-[#f7f9fb]"
			>
				<path
					d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"
				></path>
			</svg>
		</div>

		<div class="relative z-10 container mx-auto px-8 md:px-16">
			<div class="mb-12 grid grid-cols-1 gap-10 md:grid-cols-12">
				<!-- About Section -->
				<div class="md:col-span-5 lg:col-span-5">
					<div class="mb-4 inline-block rounded-lg bg-white p-3 shadow-lg">
						<img src="/APAW_TRANSPARENT.webp" alt="APAW Logo" class="h-12" />
					</div>
					<p class="mb-5 max-w-md text-blue-100">
						Applying supervised learning models to analyze integrated hydrometeorological data and
						predict potential flood occurrences within Metro Manila, Philippines.
					</p>
				</div>

				<!-- Navigation Links -->
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
			</div>

			<!-- Copyright -->
			<div class="border-t border-blue-300/20 pt-8 text-center">
				<p class="text-sm text-blue-100">
					© {new Date().getFullYear()} APAW. All rights reserved.
				</p>
			</div>
		</div>
	</footer>
{/if}
