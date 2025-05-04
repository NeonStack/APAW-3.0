<script>
	import '../app.css';
	import { page } from '$app/stores';
    import { onMount } from 'svelte';

	let { children } = $props();
	let isMenuOpen = $state(false);
	let isPredictPage = $derived($page.url.pathname === '/predict');
	
	// Add state to capture and manage body overflow
	let bodyStyle = $state('');
	
	function toggleMenu() {
		isMenuOpen = !isMenuOpen;
	}
	
	onMount(() => {
		if (isPredictPage) {
			// Prevent scrolling when on predict page
			document.body.style.overflow = 'hidden';
		}
		
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
	});
</script>

<!-- Updated header with better spacing and theme colors -->
<header class="bg-white shadow-sm sticky top-0 z-50">
	<div class="container mx-auto px-8 md:px-16 py-4">
		<nav class="flex items-center justify-between">
			<div class="flex items-center">
				<img src="/APAW TRANSPARENT.png" alt="APAW Logo" class="h-7" />
			</div>
			
			<!-- Desktop Navigation -->
			<div class="hidden md:flex items-center space-x-10">
				<a href="/" class="text-gray-800 hover:text-primary-light font-medium transition-colors border-b-2 border-transparent hover:border-primary-light pb-1">Home</a>
				<a href="/predict" class="text-gray-800 hover:text-primary-light font-medium transition-colors border-b-2 border-transparent hover:border-primary-light pb-1">Predict</a>
				<a href="/about" class="text-gray-800 hover:text-primary-light font-medium transition-colors border-b-2 border-transparent hover:border-primary-light pb-1">About</a>
				<a href="/resources" class="text-gray-800 hover:text-primary-light font-medium transition-colors border-b-2 border-transparent hover:border-primary-light pb-1">Resources</a>
			</div>
			
			<!-- Mobile Menu Button -->
			<button class="md:hidden focus:outline-none" on:click={toggleMenu} aria-label="Toggle menu">
				<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-6 h-6">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
				</svg>
			</button>
		</nav>
		
		<!-- Mobile Navigation -->
		{#if isMenuOpen}
			<div class="md:hidden py-4 mt-3 border-t border-gray-200">
				<div class="flex flex-col space-y-4">
					<a href="/" class="text-gray-800 hover:text-primary-light font-medium transition-colors">Home</a>
					<a href="/predict" class="text-gray-800 hover:text-primary-light font-medium transition-colors">Predict</a>
					<a href="/about" class="text-gray-800 hover:text-primary-light font-medium transition-colors">About</a>
					<a href="/resources" class="text-gray-800 hover:text-primary-light font-medium transition-colors">Resources</a>
				</div>
			</div>
		{/if}
	</div>
</header>

<main class={isPredictPage ? 'h-screen overflow-hidden' : ''}>
	{@render children()}
</main>

<!-- Conditionally show footer except on predict page -->
{#if !isPredictPage}
<footer class=" py-12 shadow-lg">
	<div class="container mx-auto px-8 md:px-16">
		<div class="flex flex-col md:flex-row justify-between items-center mb-10">
			<div class="mb-6 md:mb-0">
				<img src="/APAW TRANSPARENT.png" alt="APAW Logo" class="h-12" />
			</div>
			<div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center md:text-left">
				<div>
					<h3 class="font-semibold text-gray-800 mb-3">Navigation</h3>
					<ul class="space-y-2">
						<li><a href="/" class="text-gray-600 hover:text-primary-light">Home</a></li>
						<li><a href="/predict" class="text-gray-600 hover:text-primary-light">Predict</a></li>
						<li><a href="/about" class="text-gray-600 hover:text-primary-light">About</a></li>
						<li><a href="/resources" class="text-gray-600 hover:text-primary-light">Resources</a></li>
					</ul>
				</div>
				<div>
					<h3 class="font-semibold text-gray-800 mb-3">Resources</h3>
					<ul class="space-y-2">
						<li><a href="#" class="text-gray-600 hover:text-primary-light">Documentation</a></li>
						<li><a href="#" class="text-gray-600 hover:text-primary-light">API</a></li>
						<li><a href="#" class="text-gray-600 hover:text-primary-light">Support</a></li>
					</ul>
				</div>
				<div>
					<h3 class="font-semibold text-gray-800 mb-3">Connect</h3>
					<ul class="space-y-2">
						<li><a href="#" class="text-gray-600 hover:text-primary-light">Twitter</a></li>
						<li><a href="#" class="text-gray-600 hover:text-primary-light">Facebook</a></li>
						<li><a href="#" class="text-gray-600 hover:text-primary-light">Instagram</a></li>
					</ul>
				</div>
				<div>
					<h3 class="font-semibold text-gray-800 mb-3">Contact</h3>
					<ul class="space-y-2">
						<li><a href="#" class="text-gray-600 hover:text-primary-light">Email</a></li>
						<li><a href="#" class="text-gray-600 hover:text-primary-light">Phone</a></li>
						<li><a href="#" class="text-gray-600 hover:text-primary-light">Address</a></li>
					</ul>
				</div>
			</div>
		</div>
		<div class="border-t border-gray-200 pt-8 text-center">
			<p class="text-sm text-gray-600">
				© {new Date().getFullYear()} APAW - Advanced Predictive Analysis of Water-related Flood Risk. All rights reserved.
			</p>
		</div>
	</div>
</footer>
{/if}
