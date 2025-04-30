<script>
	import Icon from '@iconify/svelte';

	const features = [
		{
			title: 'Real-time Flood Prediction',
			description: 'Advanced AI algorithms to predict potential flooding with high accuracy.',
			icon: 'material-symbols:online-prediction'
		},
        {
            title: 'Interactive Mapping',
            description: 'Visualize flood risk areas with our intuitive mapping system.',
            icon: 'material-symbols:map'
        },
        {
            title: 'Early Warning System',
            description: 'Get timely notifications about potential flood risks in your area.',
            icon: 'material-symbols:notifications'
        },
        {
            title: 'Data-Driven Insights',
            description: 'Make informed decisions based on comprehensive water-related data analysis.',
            icon: 'material-symbols:database'
        }
	];
</script>

<svelte:head>
	<title>APAW - Advanced Predictive Analysis of Water-related Flood Risk</title>
</svelte:head>

<!-- Premium Contest-Worthy Hero Section -->
<section class="relative overflow-hidden bg-gradient-to-br from-gray-50 to-blue-50">
	<!-- Decorative Elements -->
	<div class="absolute top-0 left-0 z-0 h-full w-full overflow-hidden">
		<div
			class="absolute -top-32 -left-32 h-64 w-64 rounded-full bg-blue-100 opacity-40 blur-3xl"
		></div>
		<div
			class="absolute top-1/4 -right-32 h-96 w-96 rounded-full bg-primary-light opacity-10 blur-3xl"
		></div>
	</div>

	<div class="relative z-10 container mx-auto px-8 pt-12 pb-20 md:px-16 md:pt-20 md:pb-28">
		<!-- Content with enhanced layout -->
		<div class="mx-auto max-w-5xl">
			<div class="mb-12 text-center">
				<!-- Improved heading design with better spacing and visual hierarchy -->
				<div class="relative inline-block">
					<h1
						class="mb-2 text-3xl leading-tight font-bold tracking-tight text-primary md:mb-3 md:text-5xl lg:text-6xl"
					>
						Advanced Predictive Analysis
					</h1>
					<h1
						class="text-3xl leading-tight font-bold tracking-tight text-primary-light md:text-5xl lg:text-6xl"
					>
						of Water-Related Flood Risk
					</h1>
					<!-- Subtle accent line -->
					<div
						class="absolute -bottom-6 left-1/2 hidden h-1 w-24 -translate-x-1/2 transform rounded-full bg-primary-light opacity-70 md:block"
					></div>
				</div>

				<!-- Improved subheading with better spacing -->
				<p class="mx-auto mt-10 max-w-3xl text-lg leading-relaxed text-gray-700 md:text-xl">
					Applying AI and data science techniques to predict potential flood risks based on historical and environmental data.
				</p>
			</div>

			<!-- CTA Buttons with improved spacing -->
			<div class="mt-8 flex flex-col justify-center gap-5 sm:flex-row">
				<a
					href="/predict"
					class="w-48 transform rounded-lg bg-primary-light px-8 py-3 text-center font-medium text-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:bg-[#2d8fb3] hover:shadow-lg sm:w-auto sm:min-w-[180px]"
				>
					<i class="fas fa-chart-line mr-2"></i> View Predictions
				</a>
				<a
					href="/about"
					class="w-48 transform rounded-lg border border-gray-300 bg-white px-8 py-3 text-center font-medium text-primary shadow-md transition-all duration-300 hover:-translate-y-1 hover:bg-gray-50 hover:shadow-lg sm:w-auto sm:min-w-[180px]"
				>
					Learn More <i class="fas fa-arrow-right ml-2"></i>
				</a>
			</div>
		</div>
	</div>

	<!-- Enhanced Wave Animation with perspective - UNCHANGED as requested -->
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
	<div class="container mx-auto px-8 md:px-16">
		<div class="mb-16 text-center">
			<span
				class="bg-opacity-30 mb-4 inline-block rounded-full bg-primary px-3 py-1 text-sm font-medium text-white"
				>OUR PLATFORM</span
			>
			<h2 class="mb-4 text-3xl font-bold text-white md:text-4xl">
				Innovative Flood Prediction Tools
			</h2>
			<p class="text-opacity-90 mx-auto max-w-3xl text-xl text-white">
				Our advanced technology helps communities prepare for and respond to water-related
				emergencies.
			</p>
		</div>

		<div class="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
			{#each features as feature}
				<div
					class="bg-opacity-40 border-opacity-30 rounded-xl border border-primary bg-primary p-8 shadow-lg transition duration-300 hover:translate-y-[-5px] hover:shadow-xl"
				>
					<div
						class="bg-opacity-50 mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-3xl text-white"
					>
						<Icon icon={feature.icon} />
					</div>
					<h3 class="mb-3 text-xl font-semibold text-white">{feature.title}</h3>
					<p class="text-opacity-90 text-white">{feature.description}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Call to Action Section -->
<section class="bg-gray-50 py-24">
	<div class="container mx-auto px-8 md:px-16">
		<div
			class="rounded-2xl bg-gradient-to-r from-primary to-[#154a67] p-12 text-center shadow-xl md:p-16"
		>
			<div class="mx-auto max-w-3xl">
				<h2 class="mb-6 text-3xl font-bold text-white">Ready to explore APAW's flood prediction?</h2>
				<p class="mb-10 text-lg text-blue-100">
					Access our advanced prediction now and see how APAW can help your community stay safe
					from water-related flood risk.
				</p>
				<a
					href="/predict"
					class="inline-block rounded-lg bg-primary-light px-8 py-3 font-medium text-white shadow-md transition-colors hover:bg-[#2d8fb3]"
				>
					Get Started
				</a>
			</div>
		</div>
	</div>
</section>

<style>
	.waves-container {
		position: relative;
		width: 100%;
		height: 150px;
		overflow: hidden;
	}

	.waves {
		position: absolute;
		bottom: 0;
		width: 100%;
		height: 100%;
		min-height: 100px;
		max-height: 150px;
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

	/* Responsive adjustments for mobile */
	@media (max-width: 768px) {
		.waves-container {
			height: 80px;
		}

		.waves {
			height: 40px;
			min-height: 40px;
		}
	}
</style>