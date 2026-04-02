<script>
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import Icon from '@iconify/svelte';
	import ButtonLink from '$lib/components/ButtonLink.svelte';
	import { tweened } from 'svelte/motion';
	import { cubicInOut } from 'svelte/easing';

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

	let precip = tweened(45, {
		duration: 1500,
		easing: cubicInOut
	});
	let heights = [30, 45, 75, 100, 60];

	$: averageRisk = heights.reduce((a, b) => a + b, 0) / heights.length;
	$: riskLevelText =
		averageRisk <= 50
			? 'Low Flood Risk'
			: averageRisk <= 60
				? 'Moderate Flood Risk'
				: averageRisk <= 80
					? 'High Flood Risk'
					: 'Very High Flood Risk';
	$: riskLevelStatus =
		averageRisk <= 50
			? 'LOW'
			: averageRisk <= 60
				? 'MODERATE'
				: averageRisk <= 80
					? 'HIGH'
					: 'VERY HIGH';
	$: riskColorClasses =
		averageRisk <= 50
			? 'text-emerald-700 bg-emerald-100'
			: averageRisk <= 60
				? 'text-yellow-600 bg-yellow-100'
				: averageRisk <= 80
					? 'text-orange-600 bg-orange-100'
					: 'text-red-600 bg-red-100';
	$: riskIcon =
		averageRisk <= 50
			? 'mdi:check-circle-outline'
			: averageRisk <= 80
				? 'mdi:alert-circle-outline'
				: 'mdi:alert-decagram-outline';

	const scanningTexts = [
		'Estimating AI risk...',
		'Analyzing weather patterns...',
		'Fetching geographic data...',
		'Calculating risk trajectories...',
		'Predicting flood levels...',
		'Updating live datasets...'
	];
	let currentScanIndex = 0;

	onMount(() => {
		const precipInterval = setInterval(() => {
			precip.set(Math.floor(Math.random() * (55 - 15 + 1)) + 15);
		}, 3000);

		const timelineInterval = setInterval(() => {
			// dynamically fluctuate heights randomly drastically
			heights = heights.map((h) => {
				const operator = Math.random() > 0.5 ? 1 : -1;
				const randomVal = Math.floor(Math.random() * 60) + 10;
				let newH = h + operator * randomVal;
				return Math.max(5, Math.min(100, newH));
			});
		}, 2000);

		const scanningInterval = setInterval(() => {
			currentScanIndex = (currentScanIndex + 1) % scanningTexts.length;
		}, 2500);

		return () => {
			clearInterval(precipInterval);
			clearInterval(timelineInterval);
			clearInterval(scanningInterval);
		};
	});

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

<section class="relative flex overflow-hidden bg-[oklch(0.984_0.003_247.858)] pt-12 lg:py-10">
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

	<div class="relative z-10 container mx-auto flex justify-center px-6 pt-2 pb-12 lg:py-20">
		<!-- Content with enhanced layout -->
		<div
			class="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-12"
		>
			<!-- Left Column (Text & CTAs) -->
			<div
				class="relative z-10 flex flex-col items-center justify-center text-center lg:col-span-6 lg:items-start lg:text-left"
			>
				<!-- Logo instead of text -->
				<div class="group relative cursor-default">
					<img
						src="/APAW_TRANSPARENT.webp"
						alt="APAW Logo"
						class="relative z-10 mb-4 h-24 object-contain drop-shadow-[0_10px_20px_rgba(59,166,208,0.2)] transition-all duration-500 group-hover:scale-105 md:h-30 lg:mb-0 lg:h-24"
					/>
				</div>

				<h1
					class="text-[clamp(1.8em,5vw,3.5rem)] line-clamp-4 mt-2 font-extrabold tracking-tight md:leading-tight"
				>
					<span class="text-primary tracking-tight">
						Advanced AI-Powered
						<span class="text-primary-light block">Flood Risk Prediction</span>
					</span>
				</h1>

				<!-- Decorative element -->
				<div class="mt-6 flex w-full items-center justify-center gap-3 lg:justify-start">
					<div
						class="to-primary/40 h-[2px] w-full rounded-full bg-gradient-to-r from-transparent lg:hidden lg:w-20"
					></div>
					<div
						class="bg-primary h-2 w-5 rounded-full shadow-[0_0_10px_rgba(59,166,208,0.8)] lg:w-2"
					></div>
					<div
						class="from-primary/40 h-[2px] w-full rounded-full bg-gradient-to-r to-transparent lg:w-32"
					></div>
				</div>

				<!-- Improved subheading -->
				<p
					class="lg:text-md mx-auto mt-8 max-w-xl text-lg leading-relaxed font-light text-gray-600 lg:mx-0 xl:text-xl"
				>
					Experience <strong class="font-semibold text-gray-800">up to 5 days</strong> of early warning for flood risks in Metro Manila. <span class="hidden md:inline lg:inline">Actionable, intuitive, and completely free.</span>
				</p>

				<!-- CTA Buttons -->
				<div
					class="relative z-10 mt-8 flex w-full flex-col items-center justify-center gap-4 sm:flex-row lg:mt-10 lg:justify-start lg:gap-5"
				>
					<ButtonLink
						href="/predict"
						className="group relative border-none bg-primary text-white shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg text-base md:text-lg rounded-xl"
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

					<ButtonLink
						href="/about"
						className="group border border-slate-200/80 bg-white/80 text-slate-700 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary hover:shadow-md text-base md:text-lg rounded-xl"
						width="w-full sm:w-auto"
						nowrap
						ariaLabel="Learn more about APAW"
					>
						<div class="flex items-center justify-center gap-2 px-2 font-medium">
							Learn How It Works
							<Icon
								icon="mdi:chevron-right"
								class="text-xl transition-transform group-hover:translate-x-1"
							/>
						</div>
					</ButtonLink>
				</div>
			</div>

			<!-- Right Column (Dashboard Composition) -->
			<div
				class="relative z-0 hidden h-[500px] w-full items-center justify-center lg:col-span-6 lg:flex"
			>
				<!-- Giant backdrop glow for the UI -->
				<div
					class="bg-primary-light/20 pointer-events-none absolute top-1/2 left-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[100px]"
				></div>

				<!-- Main central glass board (Map/Radar abstraction) -->
				<div
					class="absolute z-10 h-[360px] w-[360px] animate-[float_8s_ease-in-out_infinite] rounded-[2rem] border border-white/60 bg-gradient-to-br from-white/80 to-white/40 p-6 shadow-[0_30px_60px_rgba(12,49,67,0.1)] backdrop-blur-xl xl:w-[420px]"
				>
					<div class="mb-4 flex items-center justify-between">
						<div class="flex items-center gap-2">
							<Icon icon="mdi:map-marker-radius" class="text-primary-light text-xl" />
							<div class="h-4 w-28 rounded-full bg-slate-200"></div>
						</div>
						<div
							class="border-primary-light flex h-5 items-center justify-center gap-1.5 rounded-full border bg-gray-100 px-4"
						>
							<div class="bg-primary-light h-2 w-2 animate-pulse rounded-full"></div>
							<p class="text-primary text-[10px] font-bold">LIVE</p>
						</div>
					</div>
					<!-- Radar/Map Area -->
					<div
						class="to-primary/5 group relative mb-5 flex h-48 w-full items-center justify-center overflow-hidden rounded-2xl border border-white/50 bg-gradient-to-br from-blue-50"
					>
						<!-- Scanline effect correctly masked as a circle out to the 4th ring -->
						<div class="absolute h-64 w-64 overflow-hidden rounded-full">
							<div
								class="absolute inset-0 animate-[spin_3s_linear_infinite]"
								style="background: conic-gradient(from 0deg, transparent 270deg, rgba(59,166,208,0.4) 360deg);"
							></div>
						</div>
						<!-- Target ring loops -->
						<div class="border-primary-light/20 absolute h-64 w-64 rounded-full border"></div>
						<div class="border-primary-light/30 absolute h-40 w-40 rounded-full border"></div>
						<div
							class="border-primary/40 bg-primary/5 absolute h-16 w-16 rounded-full border"
						></div>
						<!-- Marker ping -->
						<div
							class="bg-primary absolute h-3 w-3 rounded-full shadow-[0_0_15px_rgba(12,49,67,0.5)]"
						>
							<div class="bg-primary absolute inset-0 animate-ping rounded-full opacity-75"></div>
						</div>
					</div>
					<!-- Stats bottom -->
					<div class="flex w-full">
						<div
							class="relative flex h-12 w-full flex-col justify-center overflow-hidden rounded-xl border border-white/50 bg-white/60 px-3"
						>
							<div
								class="text-primary-light relative z-10 mb-0.5 flex items-center justify-between text-sm font-black tracking-tight uppercase"
							>
								<span>System Status</span>
								<div
									class="text-primary flex animate-pulse items-center gap-1.5 text-[9px] font-bold"
								>
									<div class="bg-primary h-1.5 w-1.5 rounded-full"></div>
									LIVE
								</div>
							</div>
							<div class="relative h-[15px] w-full">
								{#key currentScanIndex}
									<div
										in:fade={{ duration: 400, delay: 400 }}
										out:fade={{ duration: 400 }}
										class="absolute inset-0 flex items-center text-[9px] font-bold tracking-wider whitespace-nowrap text-slate-500 uppercase"
									>
										{scanningTexts[currentScanIndex]}
									</div>
								{/key}
							</div>
						</div>
					</div>
				</div>

				<!-- Floating Asset 1: Weather (Top left) -->
				<div
					class="absolute top-5 left-4 z-20 w-64 animate-[float_6s_ease-in-out_infinite_reverse] rounded-2xl border border-white/80 bg-white/90 p-4 shadow-[0_20px_40px_rgba(12,49,67,0.12)] backdrop-blur-md xl:left-[1rem]"
				>
					<div class="mb-3 flex items-center gap-3">
						<div
							class="bg-primary-light/10 text-primary-light flex h-12 w-12 items-center justify-center rounded-xl"
						>
							<Icon icon="mdi:weather-pouring" height="26" width="26" />
						</div>
						<div>
							<div class="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
								Precipitation
							</div>
							<div class="text-primary text-lg font-black tracking-tight">
								{Math.round($precip)} mm/hr
							</div>
						</div>
					</div>
				</div>

				<!-- Floating Asset 2: Timeline (Bottom Right) -->
				<div
					class="absolute -right-12 bottom-10 z-20 w-72 animate-[float_7s_ease-in-out_infinite] rounded-2xl border border-white bg-white p-5 shadow-[0_25px_50px_rgba(12,49,67,0.15)] backdrop-blur-md xl:-right-5"
				>
					<div class="mb-7 flex items-center justify-between">
						<div class="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
							Risk Level
						</div>
						<div
							class="{riskColorClasses} flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold transition-colors duration-500"
						>
							<Icon icon={riskIcon} />
							{riskLevelText}
						</div>
					</div>
					<div class="flex h-16 items-end gap-2">
						{#each heights as h, i}
							<div
								class="{i % 2 === 0
									? 'bg-primary-light'
									: 'bg-primary'} relative flex w-1/5 justify-center rounded-t-md transition-[height] duration-1000 ease-in-out"
								style="height: {h}%"
							>
								<div class="absolute -top-5 text-[9px] font-bold text-slate-500">
									Day {i + 1}
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
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
						PAWI summarizes flood predictions in a clear and friendly way, so you can easily understand them,
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
			<div class="bg-primary-light absolute -bottom-10 -left-10 h-40 w-40 rounded-full blur-[90px]"></div>

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

	@keyframes shimmer {
		100% {
			transform: translateX(100%);
		}
	}

	@keyframes float {
		0%,
		100% {
			transform: translateY(0) rotate(var(--tw-rotate));
		}
		50% {
			transform: translateY(-20px) rotate(var(--tw-rotate));
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
