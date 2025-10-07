<script>
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';

	const features = [
		{
			title: '5-Day Flood Forecast',
			description: 'Machine learning-based predictions of flood risk up to five days ahead.',
			icon: 'material-symbols:online-prediction'
		},
		{
			title: 'Interactive Risk Map',
			description:
				'Select any location within the NCR on the map to view its 5-day flood risk forecast.',
			icon: 'mdi:map-marker-radius'
		},
		{
			title: 'Early Action Support',
			description: 'Advance forecasts to aid timely decisions and preventive measures.',
			icon: 'material-symbols:emergency-home'
		},
		{
			title: 'Insightful Forecasting',
			description: 'Data-driven predictions using historical patterns and weather data.',
			icon: 'mdi:chart-areaspline'
		}
	];

	// Generate raindrops with random properties
	const raindrops = Array(100)
		.fill()
		.map(() => ({
			left: Math.random() * 100,
			animationDuration: 0.5 + Math.random() * 1.5,
			delay: Math.random() * 5,
			opacity: 0.1 + Math.random() * 0.3,
			size: 1 + Math.random() * 4
		}));
</script>

<svelte:head>
	<title>APAW | Advanced Predictive Analysis of Water-related Flood Risk</title>
	<meta
		name="description"
		content="APAW provides 5-day flood risk forecasts for Metro Manila using machine learning. Explore interactive maps and data-driven predictions for proactive flood preparedness."
	/>
</svelte:head>

<!-- Premium Contest-Worthy Hero Section -->
<section class="relative overflow-hidden bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50">
	<!-- Decorative Elements -->
	<div class="absolute top-0 left-0 z-0 h-full w-full overflow-hidden">
		<div
			class="absolute -top-32 -left-32 h-64 w-64 rounded-full bg-blue-100 opacity-40 blur-3xl"
		></div>
		<div
			class="bg-primary-light absolute top-1/4 -right-32 h-96 w-96 rounded-full opacity-10 blur-3xl"
		></div>
		<div
			class="absolute bottom-1/4 left-1/3 h-72 w-72 rounded-full bg-blue-200 opacity-20 blur-3xl"
		></div>
	</div>

	<!-- Rain Effect -->
	<div class="raindrops-container">
		{#each raindrops as raindrop}
			<div
				class="raindrop"
				style="
          left: {raindrop.left}%; 
          animation-duration: {raindrop.animationDuration}s; 
          animation-delay: {raindrop.delay}s;
          opacity: {raindrop.opacity};
          width: {raindrop.size}px;
          height: {raindrop.size * 10}px;
        "
			></div>
		{/each}
	</div>

	<div class="relative z-10 container mx-auto px-6 pt-12 pb-4 lg:pt-12 lg:pb-3">
		<!-- Content with enhanced layout -->
		<div class="mx-auto max-w-6xl">
			<div class="mb-8 lg:mb-10 text-center">
				<!-- Badge -->
				<div
					class="bg-primary-light/10 mb-4 lg:mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 backdrop-blur-sm"
				>
					<div class="bg-primary-light h-2 w-2 animate-pulse rounded-full"></div>
					<span class="text-primary text-sm font-medium">Flood Risk Prediction System</span>
				</div>

				<!-- Improved heading design with better mobile responsiveness -->
				<div class="relative">
					<h1 class="font-bold tracking-tight hero-heading">
						<span class="text-primary whitespace-nowrap hidden lg:inline">Advanced Predictive Analysis of</span>
						<span class="text-primary lg:hidden">Advanced Predictive Analysis of</span>
						<br class="hidden lg:block" />
						<span class="text-primary-light block lg:inline lg:whitespace-nowrap"> Water-Related Flood Risk </span>
					</h1>

					<!-- Decorative element -->
					<div class="mt-4 lg:mt-6 flex items-center justify-center gap-2">
						<div class="bg-primary-light/30 h-1 w-12 rounded-full"></div>
						<div class="bg-primary-light h-1 w-24 rounded-full"></div>
						<div class="bg-primary-light/30 h-1 w-12 rounded-full"></div>
					</div>
				</div>

				<!-- Improved subheading with better spacing and readability -->
				<p
					class="mx-auto mt-6 lg:mt-8 max-w-3xl px-4 text-base leading-relaxed text-gray-700 lg:text-xl"
				>
					Applying supervised learning models to analyze integrated hydrometeorological data and
					predict potential flood occurrences at specific locations.
				</p>
			</div>

			<!-- Stats Section -->
			<div class="mx-auto mb-8 lg:mb-10 grid max-w-3xl grid-cols-3 gap-4 lg:gap-8">
				<div class="text-center">
					<div class="text-primary mb-1 text-2xl font-bold lg:text-3xl">5</div>
					<div class="text-xs text-gray-600 lg:text-sm">Days Forecast</div>
				</div>
				<div class="border-x border-gray-200 text-center">
					<div class="text-primary mb-1 text-2xl font-bold lg:text-3xl">NCR</div>
					<div class="text-xs text-gray-600 lg:text-sm">Coverage Area</div>
				</div>
				<div class="text-center">
					<div class="text-primary mb-1 text-2xl font-bold lg:text-3xl">AI</div>
					<div class="text-xs text-gray-600 lg:text-sm">Powered</div>
				</div>
			</div>

			<!-- CTA Buttons with improved spacing and design -->
			<div class="mt-6 lg:mt-8 flex flex-col items-center justify-center gap-4 lg:flex-row lg:gap-6">
				<a
					href="/predict"
					class="group bg-primary-light relative w-full overflow-hidden rounded-xl px-8 py-4 text-center font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl lg:w-auto"
				>
					<span class="relative z-10 flex items-center justify-center gap-2">
						View Predictions
						<Icon icon="mdi:arrow-right" class="transition-transform group-hover:translate-x-1" />
					</span>
					<div
						class="from-primary-light to-primary absolute inset-0 bg-gradient-to-r opacity-0 transition-opacity group-hover:opacity-100"
					></div>
				</a>
				<a
					href="/about"
					class="group border-primary-light/30 text-primary hover:border-primary-light w-full rounded-xl border-2 bg-white/80 px-8 py-4 text-center font-semibold backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:bg-white hover:shadow-lg lg:w-auto"
				>
					<span class="flex items-center justify-center gap-2">
						Learn More
						<Icon icon="mdi:information-outline" />
					</span>
				</a>
			</div>
		</div>
	</div>

	<!-- Enhanced Wave Animation -->
	<div class="waves-container">
		<svg
			class="waves"
			xmlns="http://www.w3.org/2000/svg"
			xmlns:xlink="http://www.w3.org/1999/xlink"
			viewBox="0 24 150 28"
			preserveAspectRatio="none"
			shape-rendering="auto"
		>
			<defs>
				<path
					id="gentle-wave"
					d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z"
				/>
			</defs>
			<g class="parallax">
				<use xlink:href="#gentle-wave" x="48" y="0" fill="rgba(129, 212, 250, 0.7)" />
				<use xlink:href="#gentle-wave" x="48" y="3" fill="rgba(79, 195, 247, 0.5)" />
				<use xlink:href="#gentle-wave" x="48" y="5" fill="rgba(59, 166, 208, 0.3)" />
				<use xlink:href="#gentle-wave" x="48" y="7" fill="#3ba6d0" />
			</g>
		</svg>
	</div>
</section>

<!-- Features Section -->
<section class="bg-primary-light py-20 text-white">
	<div class="container mx-auto px-6 lg:px-16">
		<div class="mb-16 text-center">
			<span
				class="mb-4 inline-block rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm"
				>OUR PLATFORM</span
			>
			<h2 class="mb-4 text-3xl font-bold text-white lg:text-5xl">
				Proactive Flood Preparedness Tools
			</h2>
			<p class="mx-auto max-w-3xl px-4 text-lg text-blue-50 lg:text-xl">
				Leveraging predictive models to generate location-specific flood risk forecasts, enabling
				communities and individuals to prepare more effectively for potential water-related events.
			</p>
		</div>

		<div class="grid grid-cols-1 gap-6 lg:grid-cols-4">
			{#each features as feature}
				<div
					class="group relative overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-8 shadow-lg backdrop-blur-sm transition-all duration-300 hover:-translate-y-2 hover:bg-white/15 hover:shadow-2xl"
				>
					<!-- Decorative gradient overlay on hover -->
					<div
						class="absolute inset-0 bg-gradient-to-br from-white/0 to-white/10 opacity-0 transition-opacity group-hover:opacity-100"
					></div>

					<div class="relative z-10">
						<div
							class="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-3xl text-white shadow-lg backdrop-blur-sm transition-transform group-hover:scale-110 group-hover:rotate-3"
						>
							<Icon icon={feature.icon} />
						</div>
						<h3 class="mb-3 text-xl font-bold text-white">{feature.title}</h3>
						<p class="leading-relaxed text-blue-50">{feature.description}</p>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Call to Action Section -->
<section class="py-20 lg:py-28">
	<div class="container mx-auto px-6 lg:px-16">
		<div
			class="from-primary relative overflow-hidden rounded-3xl bg-gradient-to-br to-[#154a67] p-10 text-center shadow-2xl lg:p-16"
		>
			<!-- Decorative elements -->
			<div class="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-white/10 blur-3xl"></div>
			<div class="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-white/10 blur-3xl"></div>

			<div class="relative z-10 mx-auto max-w-3xl">
				<div
					class="mb-6 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 backdrop-blur-sm"
				>
					<Icon icon="mdi:alert-circle-outline" class="text-white" />
					<span class="text-sm font-semibold text-white">Get Started Today</span>
				</div>

				<h2 class="mb-6 text-3xl font-bold text-white lg:text-5xl">
					Ready to explore APAW's<br class="hidden lg:block" /> flood prediction?
				</h2>
				<p class="mb-10 px-4 text-base leading-relaxed text-blue-100 lg:text-lg">
					Access our advanced prediction now and see how APAW can help your community stay safe from
					water-related flood risk.
				</p>
				<a
					href="/predict"
					class="group text-primary inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 font-semibold shadow-lg transition-all hover:scale-105 hover:shadow-xl"
				>
					Get Started
					<Icon icon="mdi:arrow-right" class="transition-transform group-hover:translate-x-1" />
				</a>
			</div>
		</div>
	</div>
</section>

<style>
	.hero-heading {
		font-size: clamp(1.875rem, 5vw, 4rem);
	}

	.waves-container {
		position: relative;
		width: 100%;
		height: 100px;
		overflow: hidden;
		margin-top: -10px;
	}

	.waves {
		position: absolute;
		bottom: 0;
		width: 100%;
		height: 100%;
		min-height: 60px;
		max-height: 100px;
	}

	.parallax > use {
		animation: move-forever 25s cubic-bezier(0.55, 0.5, 0.45, 0.5) infinite;
	}

	.parallax > use:nth-child(1) {
		animation-delay: -2s;
		animation-duration: 7s;
	}

	.parallax > use:nth-child(2) {
		animation-delay: -3s;
		animation-duration: 10s;
	}

	.parallax > use:nth-child(3) {
		animation-delay: -4s;
		animation-duration: 13s;
	}

	.parallax > use:nth-child(4) {
		animation-delay: -5s;
		animation-duration: 20s;
	}

	@keyframes move-forever {
		0% {
			transform: translate3d(-90px, 0, 0);
		}
		100% {
			transform: translate3d(85px, 0, 0);
		}
	}

	/* Single breakpoint for large screens */
	@media (min-width: 1024px) {
		.waves-container {
			height: 180px;
			margin-top: -20px;
		}

		.waves {
			height: 100%;
			min-height: 120px;
			max-height: 180px;
		}
	}

	/* Rain Effect */
	.raindrops-container {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		overflow: hidden;
		z-index: 1;
		pointer-events: none;
	}

	.raindrop {
		position: absolute;
		top: -10vh;
		background: linear-gradient(to bottom, rgba(59, 166, 208, 0), rgba(59, 166, 208, 0.6));
		border-radius: 0 0 5px 5px;
		transform-origin: top center;
		animation: falling linear infinite;
	}

	@keyframes falling {
		0% {
			transform: translateY(-10px) scaleY(0);
		}
		20% {
			transform: translateY(0) scaleY(1);
		}
		100% {
			transform: translateY(calc(100vh + 20px));
		}
	}

	/* Hide rain on small screens for better performance */
	@media (max-width: 1023px) {
		.raindrops-container {
			display: none;
		}
	}
</style>