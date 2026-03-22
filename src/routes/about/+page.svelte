<script>
	import Icon from '@iconify/svelte';

	// Technical achievements data
	const achievements = [
		{
			title: 'Training Classification',
			description:
				'During initial model training, our flood detection algorithm achieved 88% accuracy in determining potential flood conditions, alongside a 73% recall rate.',
			icon: 'mdi:target',
			metric: '88% Accuracy'
		},
		{
			title: 'Depth Estimation Metrics',
			description:
				'When testing depth predictions, the LSTM model recorded a Mean Absolute Error of 8.07 cm on our historical data sets, providing a baseline for localized estimations.',
			icon: 'mdi:ruler',
			metric: '8.07cm MAE'
		},
		{
			title: 'Hourly Forecast Window',
			description:
				'We aim to provide hourly predictions up to 5 days in advance, a research approach intended to expand preparation windows.',
			icon: 'mdi:calendar-range',
			metric: 'Hourly Up to 5 Days'
		},
		{
			title: 'Fast Response Time',
			description:
				'Our system is computationally optimized to deliver predictive calculations within 5-15 seconds for timely data analysis.',
			icon: 'mdi:speedometer',
			metric: '5-15 Seconds'
		}
	];

	// Methodology steps
	const methodology = [
		{
			step: '1',
			title: 'Data Integration',
			description:
				'We combine weather forecasts, historical flood records, and geographic features from multiple reliable sources to create a comprehensive dataset.',
			icon: 'mdi:database'
		},
		{
			step: '2',
			title: 'Flood Detection with Random Forest',
			description:
				'Our Random Forest model (a pattern-matching algorithm) analyzes patterns in the integrated data to estimate the likelihood of flooding at a specific location and time.',
			icon: 'mdi:tree'
		},
		{
			step: '3',
			title: 'Depth Prediction with LSTM',
			description:
				'When a potential flood is detected, our LSTM model (which learns from historical sequences) processes temporal data to estimate flood depth based on past water level patterns.',
			icon: 'mdi:waves'
		},
		{
			step: '4',
			title: 'Real-time Aggregation',
			description:
				'The system continuously processes recent weather conditions to generate updated hourly flood risk assessments up to 5 days ahead for locations across Metro Manila.',
			icon: 'mdi:clock-fast'
		}
	];

	// Key features comparison
	const features = [
		{
			feature: 'Prediction Timeframe',
			traditional: 'Same-day or short-term warnings (hours ahead)',
			apaw: 'Hourly forecasts up to 5 days in advance'
		},
		{
			feature: 'Coverage Area',
			traditional: 'Regional coverage (e.g., NCR flood risk)',
			apaw: 'Any specific location in Metro Manila'
		},
		{
			feature: 'Information Provided',
			traditional: 'General flood alerts',
			apaw: 'Specific flood depth predictions'
		},
		{
			feature: 'Accessibility',
			traditional: 'Government announcements and media',
			apaw: 'Public web platform'
		}
	];

	// Values data - spelling APAW
	const values = [
		{
			title: 'Accuracy',
			description:
				'We are committed to thorough analysis and continuous improvement to provide reliable flood risk assessments, striving to make our experimental models as helpful as possible for academic research.',
			icon: 'mdi:bullseye-arrow'
		},
		{
			title: 'Preparedness',
			description:
				'We aim to empower individuals and communities with accessible information that fosters awareness and promotes proactive planning for potential localized flood events.',
			icon: 'mdi:shield-alert'
		},
		{
			title: 'Accessibility',
			description:
				'We strive to make complex flood risk data understandable and readily available to everyone through user-friendly interfaces and clear, community-focused communication.',
			icon: 'mdi:hand-heart'
		},
		{
			title: 'Wisdom',
			description:
				'We leverage data-driven insights and machine learning concepts to help translate raw statistical information into accessible knowledge for communities.',
			icon: 'mdi:brain'
		}
	];
</script>

<svelte:head>
	<title>APAW | About Us</title>
	<meta
		name="description"
		content="Learn about APAW's mission, technical achievements, methodology, and our commitment to improving flood preparedness through machine learning."
	/>
</svelte:head>

<section
	class="relative flex flex-col overflow-hidden bg-gradient-to-b from-primary-light/25 via-white to-slate-100 pt-20 pb-20"
>


	<div class="relative z-10 container mx-auto px-6">
		<div class="mx-auto max-w-5xl text-center">
			<img
				src="/APAW_TRANSPARENT.webp"
				alt="APAW Logo"
				class="mx-auto mb-8 h-auto w-full max-w-[220px] object-contain drop-shadow-md sm:max-w-[280px]"
			/>

			<p
				class="mx-auto max-w-3xl text-lg leading-relaxed font-light text-gray-600 md:text-xl lg:text-2xl"
			>
				A machine learning-based predictive analytics platform for flood risk assessment, applying
				trained models to evaluate complex hydrometeorological data for Metro Manila.
			</p>
		</div>
	</div>
</section>

<!-- Project Overview (Bento Grid Style) -->
<section class="relative z-20 bg-white py-24">
	<div class="container mx-auto max-w-7xl px-6">
		<div class="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
			<!-- Main info card -->
			<div
				class="group relative overflow-hidden rounded-[2rem] border border-gray-100 bg-white p-10 shadow-[0_20px_50px_rgba(12,49,67,0.08)] transition-transform duration-500 hover:-translate-y-1 lg:col-span-8 lg:p-16"
			>
				<div
					class="absolute top-0 right-0 p-8 opacity-5 transition-opacity duration-700 group-hover:opacity-10"
				>
					<Icon
						icon="mdi:water-search"
						width="200"
						height="200"
						class="text-primary-light translate-x-10 -translate-y-10"
					/>
				</div>
				<div class="relative z-10">
					<img
						src="/APAW_SHORT_TRANSPARENT.webp"
						alt="APAW Symbol"
						class="mb-8 h-16 drop-shadow-md"
					/>
					<h2 class="mb-6 text-4xl leading-tight font-extrabold text-slate-800">
						What is <span class="text-primary-light">APAW</span>?
					</h2>
					<p class="mb-6 text-lg leading-relaxed text-gray-600">
						APAW (Advanced Predictive Analysis of Water-related Flood Risk) is a machine
						learning-based predictive analytics platform developed as a capstone project. By
						leveraging pattern-matching algorithms and learning models, APAW interprets weather
						datasets, geographical features, and historical timelines to estimate potential flood
						risks.
					</p>
					<p class="text-lg leading-relaxed text-gray-600">
						Designed to complement official government systems, our experimental infrastructure
						explores localized insights for specific coordinates across Metro Manila, aiming to aid
						in community awareness and modern disaster preparedness education.
					</p>
				</div>
			</div>

			<!-- Core stats vertical stack -->
			<div class="flex flex-col gap-8 lg:col-span-4">
				<div
					class="from-primary to-primary-light relative flex flex-1 transform flex-col justify-center overflow-hidden rounded-[2rem] border border-blue-200 bg-gradient-to-br p-8 text-white shadow-xl transition-transform duration-500 hover:-translate-y-1"
				>
					<div class="absolute -right-4 -bottom-4 opacity-20">
						<Icon icon="mdi:calendar-clock" width="120" height="120" />
					</div>
					<div class="text-opacity-80 mb-2 text-sm font-bold tracking-widest text-white uppercase">
						Advance Forecast
					</div>
					<div class="mb-1 text-5xl font-black">5 Days</div>
					<div class="text-opacity-90 text-white">Detailed predictive window</div>
				</div>

				<div
					class="group relative flex flex-1 transform flex-col justify-center overflow-hidden rounded-[2rem] border border-gray-100 bg-white p-8 shadow-[0_15px_40px_rgba(12,49,67,0.06)] transition-transform duration-500 hover:-translate-y-1"
				>
					<div class="mb-2 text-sm font-bold tracking-widest text-blue-500 uppercase">
						Architecture
					</div>
					<div
						class="group-hover:text-primary mb-2 text-4xl font-black text-slate-800 transition-colors"
					>
						RF + LSTM
					</div>
					<div class="text-sm text-gray-500">
						<strong>Random Forest</strong> (a pattern-matching model) paired with
						<strong>LSTM</strong> (a system that learns from historical sequences)
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Technical Achievements -->
<section class="relative overflow-hidden bg-slate-50 py-24">
	<div
		class="pointer-events-none absolute top-0 right-0 h-full w-1/3 bg-gradient-to-l from-blue-50 to-transparent"
	></div>

	<div class="relative z-10 container mx-auto max-w-7xl px-6">
		<div class="mb-16 items-end justify-between gap-8 md:flex">
			<div class="max-w-2xl">
				<div class="text-primary-light mb-3 text-sm font-bold tracking-widest uppercase">
					Model Performance
				</div>
				<h2 class="text-4xl font-extrabold tracking-tight text-slate-900 lg:text-5xl">
					System Benchmarks
				</h2>
			</div>
			<p
				class="mt-4 max-w-sm border-l-2 border-blue-200 py-1 pl-4 font-medium text-gray-500 md:mt-0"
			>
				Our machine learning models were evaluated on training data to establish baseline
				performance metrics for our capstone research.
			</p>
		</div>

		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
			{#each achievements as achievement}
				<div
					class="group flex flex-col items-start gap-6 rounded-3xl border border-white bg-white p-8 shadow-[0_10px_30px_rgba(12,49,67,0.04)] transition-all duration-500 hover:border-blue-200 hover:shadow-[0_20px_40px_rgba(12,49,67,0.1)] sm:flex-row"
				>
					<div
						class="text-primary-light group-hover:bg-primary flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-50 shadow-inner transition-colors duration-500 group-hover:text-white"
					>
						<Icon icon={achievement.icon} width="32" height="32" />
					</div>
					<div>
						<div
							class="text-primary mb-3 inline-block rounded-lg bg-blue-50 px-3 py-1 text-sm font-black"
						>
							{achievement.metric}
						</div>
						<h3 class="mb-3 text-xl font-bold text-slate-800">{achievement.title}</h3>
						<p class="text-sm leading-relaxed text-gray-600 lg:text-base">
							{achievement.description}
						</p>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Methodology Streamline -->
<section class="relative bg-white py-32">
	<div class="container mx-auto max-w-5xl px-6">
		<div class="mb-20 text-center">
			<h2 class="mb-4 text-4xl font-extrabold tracking-tight text-slate-900 lg:text-5xl">
				The Methodology
			</h2>
			<p class="mx-auto max-w-2xl text-xl text-gray-500">
				A four-step pipeline combining data aggregation with predictive machine learning models.
			</p>
		</div>

		<div class="relative">
			<!-- Vertical Line -->
			<div
				class="from-primary via-primary-light absolute top-4 bottom-4 left-8 w-1 rounded-full bg-gradient-to-b to-transparent opacity-20 lg:left-1/2 lg:-translate-x-1/2"
			></div>

			<div class="space-y-12 lg:space-y-24">
				{#each methodology as step, index}
					<div
						class="group relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center lg:gap-16"
					>
						<!-- Timeline Node (Mobile: Left, Desktop: Center) -->
						<div
							class="absolute top-0 left-8 z-10 mt-1 flex h-8 w-8 -translate-x-[14px] items-center justify-center lg:left-1/2 lg:mt-0 lg:-translate-x-1/2"
						>
							<div
								class="bg-primary group-hover:bg-primary-light h-4 w-4 rounded-full shadow-[0_0_15px_rgba(12,49,67,0.3)] ring-4 ring-white transition-colors"
							></div>
							<div
								class="absolute inset-0 scale-[2] rounded-full border-2 border-blue-300 opacity-0 group-hover:animate-ping group-hover:opacity-100"
							></div>
						</div>

						<!-- Left side text (only on even indexes for desktop) -->
						<div
							class="hidden text-right lg:block lg:w-1/2 {index % 2 !== 0
								? 'order-1'
								: 'invisible order-3 opacity-0 hover:visible'} pr-12"
						>
							<div class="text-primary-light -mr-6 mb-[-1.5rem] text-6xl font-black opacity-10">
								0{step.step}
							</div>
							<h3 class="mb-3 text-2xl font-bold text-slate-800">{step.title}</h3>
							<p class="leading-relaxed text-gray-600">{step.description}</p>
						</div>

						<!-- Right side text (Mobile & odd indexes for desktop) -->
						<div
							class="pl-20 lg:w-1/2 lg:pl-12 {index % 2 === 0
								? 'lg:order-3'
								: 'lg:order-1 lg:hidden'}"
						>
							<div
								class="text-primary-light mb-[-1.5rem] -ml-2 text-6xl font-black opacity-10 lg:-ml-6"
							>
								0{step.step}
							</div>
							<h3 class="mb-3 text-2xl font-bold text-slate-800">{step.title}</h3>
							<p class="leading-relaxed text-gray-600">{step.description}</p>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
</section>

<!-- System Comparison -->
<section class="relative overflow-hidden bg-slate-900 py-24 text-white">
	<!-- Background Effects -->
	<div class="absolute inset-0 opacity-20">
		<div class="bg-primary absolute -top-20 -right-20 h-96 w-96 rounded-full blur-[100px]"></div>
		<div
			class="bg-primary-light bg-opacity-50 absolute -bottom-20 -left-20 h-96 w-96 rounded-full blur-[100px]"
		></div>
	</div>

	<div class="relative z-10 container mx-auto max-w-7xl px-6">
		<div class="mb-16 px-4 text-center">
			<h2 class="mb-4 text-3xl font-extrabold tracking-tight lg:text-5xl">
				A Localized Approach to Preparedness
			</h2>
			<p class="text-primary-light text-lg font-medium">
				How APAW explores targeted, location-specific flood risk assessment.
			</p>
		</div>

		<div class="grid gap-8 md:grid-cols-2 lg:gap-12">
			<!-- Traditional Systems -->
			<div
				class="bg-opacity-50 rounded-[2.5rem] border border-slate-700 bg-slate-800 p-8 backdrop-blur-md lg:p-12"
			>
				<h3 class="mb-8 flex items-center gap-3 text-2xl font-bold text-slate-300">
					<Icon icon="mdi:radio-tower" class="text-slate-500" /> Traditional Systems
				</h3>
				<ul class="space-y-6">
					{#each features as feature}
						<li
							class="border-opacity-50 flex flex-col gap-2 border-b border-slate-700 pb-6 last:border-0 last:pb-0"
						>
							<span class="text-xs font-bold tracking-widest text-slate-500 uppercase"
								>{feature.feature}</span
							>
							<div class="flex items-start gap-3 text-slate-400">
								<Icon
									icon="mdi:close-circle"
									class="text-opacity-80 mt-1 shrink-0 text-red-400"
									width="20"
									height="20"
								/>
								<span>{feature.traditional}</span>
							</div>
						</li>
					{/each}
				</ul>
			</div>

			<!-- APAW System -->
			<div
				class="from-primary relative rounded-[2.5rem] border border-blue-300 bg-gradient-to-br to-[#061b26] p-8 shadow-[0_20px_50px_rgba(59,166,208,0.2)] lg:p-12"
			>
				<div
					class="bg-primary-light absolute top-0 right-0 rounded-tr-[2.5rem] rounded-bl-2xl px-4 py-1.5 text-xs font-bold tracking-wider text-white uppercase"
				>
					Experimental Model
				</div>
				<h3 class="mb-8 flex items-center gap-3 text-2xl font-bold text-white">
					<Icon icon="mdi:shield-check" class="text-primary-light" /> APAW Architecture
				</h3>
				<ul class="space-y-6">
					{#each features as feature}
						<li class="flex flex-col gap-2 border-b border-blue-300 pb-6 last:border-0 last:pb-0">
							<span class="text-primary-light text-xs font-bold tracking-widest uppercase"
								>{feature.feature}</span
							>
							<div class="flex items-start gap-3 font-medium text-blue-50">
								<Icon
									icon="mdi:check-decagram"
									class="text-primary-light mt-1 shrink-0"
									width="22"
									height="22"
								/>
								<span>{feature.apaw}</span>
							</div>
						</li>
					{/each}
				</ul>
			</div>
		</div>
	</div>
</section>

<!-- Values Section -> Defining A P A W -->
<section class="bg-gradient-to-b from-gray-50 to-white py-24">
	<div class="container mx-auto max-w-7xl px-6">
		<div class="mb-16 text-center">
			<h2 class="mb-4 text-4xl font-extrabold tracking-tight text-slate-900 lg:text-5xl">
				Our Core Philosophy
			</h2>
			<p class="mx-auto max-w-2xl text-xl text-gray-500">
				The principles stitched into the very acronym of our identity.
			</p>
		</div>

		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
			{#each values as value, index}
				<div
					class="group relative z-10 flex h-full flex-col overflow-hidden rounded-[2rem] border border-gray-100 bg-white p-8 shadow-xl transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl"
				>
					<!-- Giant Background Letter -->
					<div
						class="absolute -right-4 -bottom-10 z-[-1] text-[12rem] leading-none font-black text-slate-50 transition-transform duration-500 select-none group-hover:scale-110 group-hover:text-slate-100"
					>
						{'APAW'.charAt(index)}
					</div>

					<div
						class="from-primary-light to-primary mb-6 flex h-14 w-14 transform items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3"
					>
						<Icon icon={value.icon} width="28" height="28" />
					</div>

					<h3 class="mb-4 text-2xl font-bold text-slate-800">{value.title}</h3>
					<p class="relative z-20 flex-grow text-sm leading-relaxed text-gray-600">
						{value.description}
					</p>

					<div
						class="bg-primary-light mt-8 h-1 w-0 rounded-full transition-all duration-500 group-hover:w-full"
					></div>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Mission & Vision Dual Card -->
<section class="bg-slate-50 py-20 pb-32">
	<div class="container mx-auto max-w-6xl px-6">
		<div
			class="grid grid-cols-1 overflow-hidden rounded-[3rem] shadow-[0_30px_80px_rgba(12,49,67,0.12)] lg:grid-cols-2"
		>
			<div class="bg-primary relative overflow-hidden p-12 lg:p-20">
				<div
					class="bg-primary-light absolute top-0 right-0 h-64 w-64 rounded-full opacity-20 blur-[60px]"
				></div>
				<div class="relative z-10 mb-8 flex items-center gap-4">
					<Icon icon="mdi:target" class="text-primary-light" width="48" height="48" />
					<h3 class="text-3xl font-black tracking-wide text-white">The Mission</h3>
				</div>
				<p class="relative z-10 text-lg leading-relaxed font-light text-blue-100 lg:text-xl">
					To contribute to community resilience research through accessible, predictive data models.
					We visualize a platform that can eventually help individuals and communities explore
					potential localized flood scenarios ahead of time.
				</p>
			</div>

			<div
				class="border-primary-light relative overflow-hidden border-t-4 bg-white p-12 lg:border-t-0 lg:border-l-4 lg:p-20"
			>
				<div
					class="absolute right-0 bottom-0 h-40 w-40 rounded-full bg-gray-100 mix-blend-multiply blur-[40px]"
				></div>
				<div class="relative z-10 mb-8 flex items-center gap-4">
					<Icon icon="mdi:telescope" class="text-primary" width="48" height="48" />
					<h3 class="text-3xl font-black tracking-wide text-slate-800">The Vision</h3>
				</div>
				<p class="relative z-10 text-lg leading-relaxed text-gray-600 lg:text-xl">
					To explore how localized machine learning can mitigate the impact of unexpected weather
					events, fostering a future where communities are better informed about data-driven risk
					assessment within Metro Manila.
				</p>
			</div>
		</div>
	</div>
</section>
