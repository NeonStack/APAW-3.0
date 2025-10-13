<script>
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';
	import ButtonLink from '$lib/components/ButtonLink.svelte';

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
			<div class="mb-8 text-center lg:mb-10">
				<!-- Badge -->
				<div
					class="bg-primary-light/10 mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2 shadow-xs backdrop-blur-sm lg:mb-6"
				>
					<div class="bg-primary-light h-2 w-2 animate-pulse rounded-full"></div>
					<span class="text-primary text-sm font-medium">Flood Risk Prediction System</span>
				</div>

				<!-- Improved heading design with better mobile responsiveness -->
				<div class="relative">
					<h1 class="hero-heading font-bold tracking-tight">
						<span class="text-primary hidden whitespace-nowrap lg:inline"
							>Advanced Predictive Analysis of</span
						>
						<span class="text-primary lg:hidden">Advanced Predictive Analysis of</span>
						<br class="hidden lg:block" />
						<span class="text-primary-light block lg:inline lg:whitespace-nowrap">
							Water-Related Flood Risk
						</span>
					</h1>

					<!-- Decorative element -->
					<div class="mt-4 flex items-center justify-center gap-2 lg:mt-6">
						<div class="bg-primary-light/30 h-1 w-12 rounded-full"></div>
						<div class="bg-primary-light h-1 w-24 rounded-full"></div>
						<div class="bg-primary-light/30 h-1 w-12 rounded-full"></div>
					</div>
				</div>

				<!-- Improved subheading with better spacing and readability -->
				<p
					class="mx-auto mt-6 max-w-3xl px-4 text-base leading-relaxed text-gray-700 lg:mt-8 lg:text-xl"
				>
					Applying supervised learning models to analyze integrated hydrometeorological data and
					predict potential flood occurrences within Metro Manila.
				</p>
			</div>

			<!-- CTA Buttons with improved spacing and design -->
			<div
				class="mt-6 flex flex-col items-center justify-center gap-4 lg:mt-8 lg:flex-row lg:gap-6"
			>
				<ButtonLink href="/predict" className="group bg-primary-light text-white" nowrap>
					View Predictions
					<Icon icon="mdi:arrow-right" class="transition-transform group-hover:translate-x-1" />
				</ButtonLink>
				<ButtonLink
					href="/about"
					className="border-primary-light/30 text-primary hover:border-primary-light w-full rounded-xl border-2 bg-white/80"
					nowrap
				>
					Learn More
					<Icon
						icon="mdi:information-outline"
						class="transition-transform group-hover:translate-x-1"
					/>
				</ButtonLink>
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
<section class="features-section relative py-20">
	<!-- Subtle Background Pattern -->
	<div class="absolute inset-0 opacity-20">
		<div class="absolute top-10 left-10 h-72 w-72 rounded-full bg-white/30 blur-3xl"></div>
		<div class="absolute right-20 bottom-20 h-96 w-96 rounded-full bg-white/20 blur-3xl"></div>
	</div>

	<div class="relative z-10 container mx-auto px-6 lg:px-16">
		<div class="mb-16 text-center">
			<span
				class="mb-4 inline-block rounded-full border border-white/30 bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm"
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

		<!-- Stats Section -->
		<div class="mx-auto mb-12 grid max-w-4xl grid-cols-1 gap-4 lg:mb-16 lg:grid-cols-3 lg:gap-8">
			<div
				class="rounded-2xl border border-white/20 bg-white/10 p-6 text-center shadow-lg backdrop-blur-sm transition-all hover:bg-white/15 hover:shadow-xl"
			>
				<div class="mb-2 text-3xl font-bold text-white lg:text-4xl">5</div>
				<div class="text-sm font-medium text-blue-100 lg:text-base">Days Forecast</div>
			</div>
			<div
				class="rounded-2xl border border-white/20 bg-white/10 p-6 text-center shadow-lg backdrop-blur-sm transition-all hover:bg-white/15 hover:shadow-xl"
			>
				<div class="mb-2 text-3xl font-bold text-white lg:text-4xl">Metro Manila</div>
				<div class="text-sm font-medium text-blue-100 lg:text-base">Coverage Area</div>
			</div>
			<div
				class="rounded-2xl border border-white/20 bg-white/10 p-6 text-center shadow-lg backdrop-blur-sm transition-all hover:bg-white/15 hover:shadow-xl"
			>
				<div class="mb-2 text-3xl font-bold text-white lg:text-4xl">AI</div>
				<div class="text-sm font-medium text-blue-100 lg:text-base">Powered</div>
			</div>
		</div>

		<div class="grid grid-cols-1 gap-6 lg:grid-cols-4">
			{#each features as feature}
				<div
					class="feature-card group relative overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-8 shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-102 hover:bg-white/15 hover:shadow-2xl"
				>
					<!-- Gradient overlay on hover -->
					<div
						class="feature-card-overlay absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
					></div>

					<div class="relative z-10">
						<div
							class="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-3xl text-white shadow-lg backdrop-blur-sm transition-all duration-300 group-hover:scale-110 group-hover:rotate-3"
						>
							<Icon icon={feature.icon} />
						</div>
						<h3 class="mb-3 text-xl font-bold text-white">{feature.title}</h3>
						<p class="leading-relaxed text-blue-50">{feature.description}</p>
					</div>

					<!-- Accent border that appears on hover -->
					<div
						class="absolute bottom-0 left-0 h-1 w-0 bg-white/50 transition-all duration-300 group-hover:w-full"
					></div>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Call to Action Section -->
<section class="py-20 lg:py-28">
	<div class="mx-auto flex w-fit flex-col items-center justify-center px-5 text-center lg:px-3">
		<div
			class="bg-primary-light/10 mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2 shadow-xs backdrop-blur-sm lg:mb-6"
		>
			<Icon icon="mdi:alert-circle-outline" class="text-primary-light w-5" />
			<span class="text-primary text-sm font-medium">Get Started Today</span>
		</div>
		<h2 class="text-primary mb-6 text-[clamp(1.6rem,5vw,3rem)] leading-tight font-bold lg:w-8/12">
			Ready to explore APAW's flood prediction?
		</h2>
		<p class="mb-10 px-1 text-base leading-relaxed text-gray-700 lg:w-8/12 lg:px-4 lg:text-lg">
			Access our advanced prediction now and see how APAW can help your community stay safe from
			water-related flood risk.
		</p>
		<ButtonLink
			href="/predict"
			className="group bg-primary-light text-white hover:border-white"
			width="w-auto"
			nowrap
		>
			Get Started
			<Icon icon="mdi:arrow-right" class="transition-transform group-hover:translate-x-1" />
		</ButtonLink>
	</div>
</section>

<style>
	.hero-heading {
		font-size: clamp(1.7rem, 5vw, 4rem);
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
		animation: move-forever 20s cubic-bezier(0.55, 0.5, 0.45, 0.5) infinite;
	}

	.parallax > use:nth-child(1) {
		animation-delay: -2s;
	}

	.parallax > use:nth-child(2) {
		animation-delay: -3s;
	}

	.parallax > use:nth-child(3) {
		animation-delay: -4s;
	}

	.parallax > use:nth-child(4) {
		animation-delay: -5s;
	}

	@keyframes move-forever {
		0% {
			transform: translate3d(-90px, 0, 0);
		}
		100% {
			transform: translate3d(86px, 0, 0);
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

	/* Features Section Styles */
	.features-section {
		background: linear-gradient(180deg, #3ba6d0 0%, #2d8db5 50%, #1e6a8a 100%);
	}

	.feature-card-overlay {
		background: linear-gradient(135deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.1) 100%);
	}
</style>
