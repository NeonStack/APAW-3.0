<script>
	import Icon from '@iconify/svelte';
	import ButtonLink from '$lib/components/ButtonLink.svelte';

	const features = [
		{
			title: 'AI Flood Predictions',
			description: 'Machine learning-based predictions of flood risks up to five days ahead.',
			icon: 'material-symbols:online-prediction'
		},
		{
			title: 'Interactive Risk Map',
			description:
				'Click any location in Metro Manila on the map to view instant 5-day flood risk predictions.',
			icon: 'mdi:map-marker-radius'
		},
		{
			title: 'Automated Alerts',
			description:
				'Instant, automated risk predictions for active predefined high-risk areas—no clicking required.',
			icon: 'material-symbols:notification-important-outline'
		},
		{
			title: 'Real-Time Weather',
			description: 'Integrated weather tracking and live forecasts (Powered by Visual Crossing).',
			icon: 'mdi:weather-partly-cloudy'
		},
		{
			title: 'Multi-Layered Data',
			description:
				'View custom map layers including tropical cyclones and water stations (Data from PAGASA).',
			icon: 'mdi:layers-triple-outline'
		},
		{
			title: 'Completely Free',
			description:
				'Unrestricted open access to critical flood prediction tools to help communities prepare.',
			icon: 'mdi:hand-coin-outline'
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
	<title>APAW | AI-Powered Flood Risk Prediction</title>
	<meta
		name="description"
		content="APAW delivers 5-day Metro Manila flood risk predictions using machine learning, with interactive maps and data-driven insights for early preparedness."
	/>
</svelte:head>

<section class="hero-section relative flex flex-col overflow-hidden bg-[oklch(0.984_0.003_247.858)]">
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

	<!-- Background Dot Pattern & Ambient Glows -->
	<div class="pointer-events-none absolute inset-0 z-0 overflow-hidden">
		<!-- Vibrant glowing aura behind text -->
		<div class="hero-center-aura"></div>
		<!-- High-tech dot and grid pattern -->
		<div class="hero-dots-pattern absolute inset-0"></div>
		<!-- Ambient corner atmospheric blooms -->
		<div class="absolute -top-20 -left-20 h-80 w-80 rounded-full bg-cyan-300/35 blur-3xl"></div>
		<div class="absolute top-12 -right-24 h-96 w-96 rounded-full bg-sky-300/30 blur-3xl"></div>
	</div>

	<!-- Hero content -->
	<div class="hero-content relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-6 text-center">

		<!-- Status pill badge -->
		<div class="hero-badge mb-3 inline-flex items-center gap-2 rounded-full border border-sky-300/80 bg-white/90 px-3.5 py-1.5 shadow-sm backdrop-blur-md sm:mb-4">
			<span class="relative flex h-2 w-2">
				<span class="bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"></span>
				<span class="bg-primary relative inline-flex h-2 w-2 rounded-full"></span>
			</span>
			<span class="text-primary text-[11px] font-semibold tracking-wider uppercase sm:text-xs">Metro Manila · APAW</span>
		</div>
		<!-- Headline -->
		<h1 class="hero-headline mx-auto max-w-3xl text-3xl font-extrabold leading-[1.12] tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
			Advanced AI-Powered
			<span class="hero-gradient-text mt-1 block">Flood Risk Prediction</span>
		</h1>

		<!-- Subheading (matching max-w-xs with buttons on mobile) -->
		<div class="mt-4 w-full max-w-xs text-base leading-relaxed font-normal text-slate-600 sm:mt-5 sm:max-w-xl sm:text-lg md:text-xl">
			<p>
				Experience <strong class="font-semibold text-slate-800">up to 5 days</strong> of early warning for flood risks in Metro Manila. Actionable, intuitive, and completely free.
			</p>
		</div>

		<!-- CTA Buttons (matching max-w-xs with subheading on mobile) -->
		<div class="mt-6 flex w-full max-w-xs flex-col items-center justify-center gap-3 sm:max-w-none sm:flex-row sm:gap-4">
			<ButtonLink
				href="/about"
				className="group border-none ring-1 ring-inset ring-slate-200/90 bg-white/95 text-slate-700 shadow-md backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:ring-primary/40 hover:text-primary hover:bg-white hover:shadow-md rounded-xl text-base"
				width="w-full sm:w-auto"
				nowrap
				ariaLabel="Learn more about APAW"
			>
				<div class="flex items-center justify-center gap-2 px-2 py-0.5 font-medium">
					<span>Learn How It Works</span>
					<Icon
						icon="mdi:arrow-right"
						class="text-lg transition-transform duration-200 group-hover:translate-x-1"
					/>
				</div>
			</ButtonLink>
			<ButtonLink
				href="/predict"
				className="group relative border-none bg-primary text-white shadow-md shadow-primary/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-primary/45 rounded-xl text-base"
				width="w-full sm:w-auto"
				nowrap
			>
				<div class="relative z-10 flex items-center justify-center gap-2 px-2 py-0.5 font-semibold">
					<span>Launch Application</span>
					<Icon
						icon="mdi:arrow-right"
						class="text-lg transition-transform duration-200 group-hover:translate-x-1"
					/>
				</div>
			</ButtonLink>
		</div>

	</div>

	<!-- Enhanced Wave Animation -->
	<div class="waves-container absolute bottom-0 left-0 w-full">
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
			<h2 class="mb-4 text-3xl font-extrabold tracking-tight text-white drop-shadow-md lg:text-5xl">
				Proactive Preparedness Tools
			</h2>
			<p class="mx-auto max-w-3xl px-4 text-lg font-light text-blue-50 lg:text-xl">
				Explore powerful, AI-driven tools wrapped in an intuitive interactive map to ensure your
				community is always one step ahead of the weather.
			</p>
		</div>

		<!-- Stats Section -->
		<div class="mx-auto mb-16 grid max-w-5xl grid-cols-1 gap-6 lg:mb-20 lg:grid-cols-3 lg:gap-8">
			<div
				class="stats-box flex items-center gap-6 rounded-[2rem] border border-white/20 bg-gradient-to-r from-white/10 to-transparent p-6 shadow-xl backdrop-blur-md transition-all hover:-translate-y-1 hover:border-white/40"
			>
				<div
					class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/20 text-3xl font-black text-white shadow-inner lg:h-20 lg:w-20 lg:text-4xl"
				>
					5
				</div>
				<div>
					<div class="text-xs font-bold tracking-widest text-blue-200 uppercase lg:text-sm">
						Days Ahead
					</div>
					<div class="text-lg font-medium text-white lg:text-xl">Early Prediction</div>
				</div>
			</div>

			<div
				class="stats-box flex items-center gap-6 rounded-[2rem] border border-white/20 bg-gradient-to-r from-white/10 to-transparent p-6 shadow-xl backdrop-blur-md transition-all hover:-translate-y-1 hover:border-white/40"
			>
				<div
					class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/20 text-3xl text-white shadow-inner lg:h-20 lg:w-20 lg:text-4xl"
				>
					<Icon icon="mdi:city-variant-outline" />
				</div>
				<div>
					<div class="text-xs font-bold tracking-widest text-blue-200 uppercase lg:text-sm">
						Coverage
					</div>
					<div class="text-lg font-medium text-white lg:text-xl">Metro Manila</div>
				</div>
			</div>

			<div
				class="stats-box flex items-center gap-6 rounded-[2rem] border border-white/20 bg-gradient-to-r from-white/10 to-transparent p-6 shadow-xl backdrop-blur-md transition-all hover:-translate-y-1 hover:border-white/40"
			>
				<div
					class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/20 text-4xl text-white shadow-inner lg:h-20 lg:w-20 lg:text-5xl"
				>
					<Icon icon="material-symbols:smart-toy-outline" />
				</div>
				<div>
					<div class="text-xs font-bold tracking-widest text-blue-200 uppercase lg:text-sm">
						Technology
					</div>
					<div class="text-lg font-medium text-white lg:text-xl">AI-Powered</div>
				</div>
			</div>
		</div>

		<div
			class="pawi-feature-callout group relative mx-auto mb-12 w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/25 bg-gradient-to-r from-white/15 via-white/10 to-transparent p-5 shadow-xl backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-white/45 hover:shadow-[0_20px_40px_-10px_rgba(15,76,107,0.4)] md:p-6"
		>
			<div class="absolute -top-20 -right-16 h-56 w-56 rounded-full bg-white/10 blur-3xl"></div>

			<div
				class="relative z-10 flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:text-left"
			>
				<div class="relative h-24 w-24 shrink-0 sm:h-28 sm:w-28" aria-hidden="true">
					<img
						src="/pawi/pawi-idle.svg"
						alt=""
						class="pawi-home-idle absolute inset-0 h-full w-full"
					/>
					<img
						src="/pawi/pawi-teach.svg"
						alt=""
						class="pawi-home-teach absolute inset-0 h-full w-full"
					/>
				</div>

				<div class="min-w-0">
					<p
						class="inline-flex items-center rounded-full border border-white/30 bg-white/20 px-3 py-1 text-[11px] font-bold tracking-[0.12em] text-white uppercase"
					>
						Meet PAWI
					</p>
					<h3 class="mt-2 text-xl font-black tracking-tight text-white sm:text-2xl">
						Your Playful Flood Guide
					</h3>
					<p class="mt-1 max-w-3xl text-sm leading-relaxed text-blue-100 sm:text-base">
						PAWI summarizes flood predictions in a clear and friendly way, so you can easily
						understand them.
					</p>
				</div>
			</div>
		</div>

		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each features as feature}
				<div
					class="feature-card group relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-white/10 to-white/5 p-8 shadow-xl backdrop-blur-md transition-all duration-500 hover:-translate-y-2 hover:bg-white/15 hover:shadow-[0_20px_40px_-5px_rgba(255,255,255,0.15)]"
				>
					<!-- Giant Background Icon for Depth -->
					<div
						class="absolute -right-8 -bottom-8 opacity-10 transition-transform duration-700 ease-out group-hover:scale-125 group-hover:rotate-12"
					>
						<Icon icon={feature.icon} width="160" height="160" class="text-white" />
					</div>

					<!-- Hover Glow Glow Effect -->
					<div
						class="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
					></div>

					<div class="relative z-10 flex h-full flex-col justify-between">
						<div>
							<div
								class="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/40 bg-white/20 text-3xl text-white shadow-lg backdrop-blur-lg transition-transform duration-300 group-hover:scale-110"
							>
								<Icon icon={feature.icon} />
							</div>
							<h3 class="mb-3 text-2xl font-bold tracking-tight text-white">{feature.title}</h3>
							<p class="leading-relaxed font-light text-blue-100">{feature.description}</p>
						</div>

						<!-- Subtle divider line bottom effect -->
						<div
							class="mt-6 h-1 w-12 rounded bg-white/30 transition-all duration-300 group-hover:w-full group-hover:bg-white/80"
						></div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Call to Action Section with Glassmorphism -->
<section class="relative overflow-hidden bg-slate-50 py-24 lg:py-32">
	<div class=" z-10 mx-auto max-w-5xl px-6">
		<div
			class="relative overflow-hidden rounded-3xl border border-white/60 bg-white/40 p-10 text-center shadow-[0_20px_60px_-15px_rgba(59,166,208,0.15)] backdrop-blur-xl lg:p-20"
		>
			<!-- Subtle corner decoration -->
			<div
				class="bg-primary-light absolute -top-10 -right-10 h-40 w-40 rounded-full blur-[90px]"
			></div>
			<div
				class="bg-primary-light absolute -bottom-10 -left-10 h-40 w-40 rounded-full blur-[90px]"
			></div>

			<h2 class="mb-6 text-[clamp(2rem,5vw,3.5rem)] leading-tight font-black text-gray-900">
				Ready to explore <span class="text-primary-light">APAW's</span> flood risk predictions?
			</h2>

			<p
				class="mx-auto mb-10 max-w-2xl text-lg leading-relaxed font-light text-gray-600 lg:text-xl"
			>
				Step into the future of flood risk management. Access advanced, AI-driven predictions now
				and give your community the foresight it deserves.
			</p>

			<ButtonLink
				href="/predict"
				className="group block relative border-none bg-primary text-white shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg text-base md:text-lg rounded-xl"
				width="w-full sm:w-auto"
				nowrap
			>
				<div class="relative z-10 flex items-center justify-center gap-2 px-2 font-semibold">
					Launch Application
					<Icon
						icon="mdi:arrow-right"
						class="text-xl transition-transform group-hover:translate-x-1"
					/>
				</div>
			</ButtonLink>
		</div>
	</div>
</section>

<style>
	.waves-container {
		position: absolute;
		bottom: 0;
		left: 0;
		width: 100%;
		height: 100px;
		overflow: hidden;
		z-index: 5;
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

	/* Hero section — exactly one viewport tall below the sticky navbar (~60px) */
	.hero-section {
		height: calc(100dvh - 60px);
		max-height: calc(100dvh - 60px);
		min-height: unset;
		overflow: hidden;
		background: radial-gradient(120% 90% at 50% 5%, #dbeafe 0%, #e0f2fe 30%, #f0f9ff 65%, #f8fafc 100%);
	}

	/* Inner content: vertical padding clears the wave (bottom) and gives breathing room (top) */
	.hero-content {
		padding-top: clamp(1rem, 3vh, 3rem);
		padding-bottom: clamp(5rem, 12vh, 10rem);
		overflow: hidden;
	}

	/* Rich, crisp tech dot grid with fine mesh overlay */
	.hero-dots-pattern {
		background-image: 
			radial-gradient(rgba(14, 165, 233, 0.38) 1.5px, transparent 1.5px),
			linear-gradient(to right, rgba(59, 166, 208, 0.08) 1px, transparent 1px),
			linear-gradient(to bottom, rgba(59, 166, 208, 0.08) 1px, transparent 1px);
		background-size: 24px 24px, 48px 48px, 48px 48px;
		mask-image: radial-gradient(ellipse 85% 75% at 50% 35%, black 45%, transparent 100%);
		-webkit-mask-image: radial-gradient(ellipse 85% 75% at 50% 35%, black 45%, transparent 100%);
	}

	/* Glowing pulsating center aura behind the text */
	.hero-center-aura {
		position: absolute;
		top: 10%;
		left: 50%;
		transform: translateX(-50%);
		width: clamp(320px, 65vw, 750px);
		height: clamp(220px, 45vh, 500px);
		background: radial-gradient(circle, rgba(59, 166, 208, 0.4) 0%, rgba(129, 212, 250, 0.25) 45%, transparent 75%);
		filter: blur(60px);
		border-radius: 50%;
		animation: aura-pulse 8s ease-in-out infinite alternate;
	}

	@keyframes aura-pulse {
		0% {
			transform: translateX(-50%) scale(0.95);
			opacity: 0.75;
		}
		100% {
			transform: translateX(-50%) scale(1.1);
			opacity: 1;
		}
	}

	/* Hero section redesign */
	.hero-gradient-text {
		background: linear-gradient(135deg, #3ba6d0 0%, #217ba1 60%, #0f4c6b 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.hero-badge {
		animation: hero-badge-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	.hero-headline {
		animation: hero-fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both;
	}

	@keyframes hero-badge-in {
		from {
			opacity: 0;
			transform: translateY(-10px) scale(0.95);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	@keyframes hero-fade-up {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
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
		background: linear-gradient(180deg, #3ba6d0 0%, #217ba1 50%, #0f4c6b 100%);
		position: relative;
	}

	.features-section::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-image: radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px);
		background-size: 30px 30px;
		opacity: 0.3;
		pointer-events: none;
	}

	.feature-card-overlay {
		background: linear-gradient(135deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.1) 100%);
	}

	.pawi-home-idle,
	.pawi-home-teach {
		transform-origin: center bottom;
		will-change: transform, opacity;
	}

	.pawi-home-idle {
		opacity: 1;
		animation: pawi-home-hop 2.2s cubic-bezier(0.22, 1, 0.36, 1) infinite;
		transition: opacity 0.25s ease;
	}

	.pawi-home-teach {
		opacity: 0;
		animation:
			pawi-home-hop 2s cubic-bezier(0.22, 1, 0.36, 1) infinite,
			pawi-home-teach-wiggle 1.1s ease-in-out infinite;
		transition: opacity 0.25s ease;
	}

	.pawi-feature-callout:hover .pawi-home-idle {
		opacity: 0;
	}

	.pawi-feature-callout:hover .pawi-home-teach {
		opacity: 1;
	}

	@keyframes pawi-home-hop {
		0%,
		100% {
			transform: translateY(0) rotate(0deg);
		}
		25% {
			transform: translateY(-8px) rotate(-1deg);
		}
		50% {
			transform: translateY(0) rotate(0deg);
		}
		75% {
			transform: translateY(-5px) rotate(1deg);
		}
	}

	@keyframes pawi-home-teach-wiggle {
		0%,
		100% {
			transform: translateY(0) rotate(0deg);
		}
		25% {
			transform: translateY(-3px) rotate(-5deg);
		}
		50% {
			transform: translateY(0) rotate(0deg);
		}
		75% {
			transform: translateY(-2px) rotate(4deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.pawi-home-idle,
		.pawi-home-teach {
			animation: none !important;
		}
	}
</style>
