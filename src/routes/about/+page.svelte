<script>
	import Icon from '@iconify/svelte';

	// Technical achievements data
	const achievements = [
		{
			title: 'High Accuracy Classification',
			description:
				'Our flood detection model achieves 88% accuracy in determining whether flooding will occur, with a 73% recall rate for identifying potential flood events.',
			icon: 'mdi:target',
			metric: '88% Accuracy'
		},
		{
			title: 'Reliable Depth Prediction',
			description:
				'When floods are predicted, our LSTM model estimates flood depth with a Mean Absolute Error of just 8.07 cm, providing highly valuable information for preparation.',
			icon: 'mdi:ruler',
			metric: '8.07cm MAE'
		},
		{
			title: 'Hourly Forecast Window',
			description:
				'Unlike traditional same-day flood warnings, APAW provides hourly predictions up to 5 days in advance, enabling better preparation time.',
			icon: 'mdi:calendar-range',
			metric: 'Hourly Up to 5 Days'
		},
		{
			title: 'Fast Response Time',
			description:
				'Our optimized system delivers predictions in 5-15 seconds, making it practical for real-time decision making.',
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
				'We combine weather forecasts, historical flood records, geographic features, and soil conditions from multiple reliable sources to create a comprehensive dataset.',
			icon: 'mdi:database',
		},
		{
			step: '2',
			title: 'Flood Detection with Random Forest',
			description:
				'Our Random Forest classifier analyzes patterns in the integrated data to predict whether flooding will occur at a specific location and time.',
			icon: 'mdi:tree',
		},
		{
			step: '3',
			title: 'Depth Prediction with LSTM',
			description:
				'When flooding is detected, our LSTM neural network processes temporal sequences to accurately predict flood depth by learning from historical water level patterns.',
			icon: 'mdi:waves',
		},
		{
			step: '4',
			title: 'Real-time Forecasting',
			description:
				'The system continuously processes current weather conditions to generate updated hourly flood risk forecasts up to 5 days ahead for any location in Metro Manila.',
			icon: 'mdi:clock-fast',
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
				'We are committed to thorough analysis and continuous improvement to provide the most reliable flood risk predictions possible, ensuring our models deliver precise and dependable results.',
			icon: 'mdi:bullseye-arrow'
		},
		{
			title: 'Preparedness',
			description:
				'We empower individuals, communities, and authorities with timely information that enables proactive planning and effective preparation for potential flood events before they occur.',
			icon: 'mdi:shield-alert'
		},
		{
			title: 'Accessibility',
			description:
				'We strive to make complex flood risk information understandable and readily available to everyone through user-friendly interfaces and clear, actionable communication.',
			icon: 'mdi:hand-heart'
		},
		{
			title: 'Wisdom',
			description:
				'We leverage data-driven insights and cutting-edge machine learning to transform raw information into actionable knowledge that helps communities make informed decisions about flood risks.',
			icon: 'mdi:brain'
		}
	];
	const valueCardGradient = 'from-primary-light to-primary-light';
</script>

<svelte:head>
	<title>APAW | About Us</title>
	<meta
		name="description"
		content="Learn about APAW's mission, technical achievements, methodology, and our commitment to improving flood preparedness through machine learning."
	/>
</svelte:head>

<!-- Header section -->
<div class="bg-primary relative mb-16 overflow-hidden px-4 py-16 text-white">
	<div class="absolute top-0 left-0 h-full w-full opacity-10">
		<div
			class="bg-primary-light absolute top-0 left-0 h-full w-1/2 translate-x-[-50%] translate-y-[-50%] rotate-45 transform"
		></div>
		<div
			class="bg-primary-light absolute right-0 bottom-0 h-full w-1/2 translate-x-[50%] translate-y-[50%] -rotate-45 transform"
		></div>
	</div>
	<div class="relative z-10 container mx-auto">
		<h1 class="mb-6 text-center text-5xl font-bold md:text-6xl">About APAW</h1>
		<div class="bg-primary-light mx-auto mb-8 h-1.5 w-32 rounded-full"></div>
		<p class="mx-auto max-w-3xl text-center text-xl leading-relaxed">
			Applying supervised learning models to analyze integrated hydrometeorological data and predict potential flood occurrences within Metro Manila.
		</p>
	</div>
</div>

<!-- Project Overview Section -->
<section class="bg-gradient-to-b from-white to-gray-50 py-20">
	<div class="container mx-auto px-6 md:px-12 lg:px-20">
		<div class="mx-auto max-w-5xl">
			<div class="border-primary-light rounded-2xl border-t-4 bg-white p-8 shadow-xl md:p-12">
				<div class="mb-8 flex items-start">
					<div class="mr-6 hidden flex-shrink-0 lg:block">
						<div class="rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 p-4">
							<img src="/APAW_SHORT_TRANSPARENT.webp" alt="APAW LOGO" class="w-10">
						</div>
					</div>
					<div>
						<h3 class="text-primary mb-4 text-center text-2xl font-bold lg:text-left">
							What is APAW?
						</h3>
						<p class="mb-6 text-lg leading-relaxed text-gray-700">
							APAW (Advanced Predictive Analysis of Water-related Flood Risk) is an innovative flood
							prediction platform developed as part of our academic capstone project. Using advanced
							machine learning techniques, APAW analyzes weather patterns, geographical features, and
							historical data to predict flood risks with hourly prediction of up to 5 days in
							advance.
						</p>
						<p class="text-lg leading-relaxed text-gray-700">
							Our system addresses a critical gap in flood preparedness by providing
							location-specific predictions for any area within Metro Manila, moving beyond
							traditional regional flood warnings to enable proactive community preparation.
						</p>
					</div>
				</div>

				<div class="mt-8 grid grid-cols-1 gap-6 border-t border-gray-200 pt-8 md:grid-cols-3">
					<div class="text-center">
						<div class="text-primary-light mb-2 text-4xl font-bold">5 Days</div>
						<div class="text-gray-600">Advance Forecast</div>
					</div>
					<div class="text-center">
						<div class="text-primary-light mb-2 text-4xl font-bold">Hourly</div>
						<div class="text-gray-600">Prediction Updates</div>
					</div>
					<div class="text-center">
						<div class="text-primary-light mb-2 text-4xl font-bold">2 Models</div>
						<div class="text-gray-600">RF + LSTM</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Technical Achievements Section -->
<section class="bg-white py-20">
	<div class="container mx-auto px-6 md:px-12 lg:px-20">
		<div class="mb-12 text-center">
			<h2 class="text-primary mb-4 text-3xl font-bold md:text-4xl">Technical Achievements</h2>
			<div class="bg-primary-light mx-auto mb-4 h-1 w-20 rounded-full"></div>
			<p class="mx-auto max-w-2xl text-lg text-gray-600">
				Our system demonstrates strong performance across multiple metrics
			</p>
		</div>

		<div class="mx-auto grid max-w-7xl grid-cols-1 gap-8 lg:grid-cols-2">
			{#each achievements as achievement}
				<div
					class="group relative overflow-hidden rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-gray-50 shadow-lg transition-all duration-300 hover:scale-101 hover:shadow-2xl"
				>
					<div class="bg-primary-light absolute top-0 left-0 h-1.5 w-full"></div>
					<div class="p-8">
						<div class="mb-6 flex items-center justify-between">
							<div
								class="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 shadow-md transition-transform duration-300 group-hover:scale-110"
							>
								<Icon icon={achievement.icon} class="text-primary-light" width="36" height="36" />
							</div>
						</div>
						<div class="mb-4">
							<div class="text-primary-light mb-2 text-2xl font-bold">{achievement.metric}</div>
							<h3 class="text-xl font-bold text-gray-800">{achievement.title}</h3>
						</div>
						<p class="leading-relaxed text-gray-600">{achievement.description}</p>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Methodology Section -->
<section class="bg-gradient-to-b from-gray-50 to-white py-20">
	<div class="container mx-auto px-6 md:px-12 lg:px-20">
		<div class="mb-12 text-center">
			<h2 class="text-primary mb-4 text-3xl font-bold md:text-4xl">Our Methodology</h2>
			<div class="bg-primary-light mx-auto mb-4 h-1 w-20 rounded-full"></div>
			<p class="mx-auto max-w-2xl text-lg text-gray-600">
				A sophisticated four-step process combining traditional ML and deep learning
			</p>
		</div>

		<div class="mx-auto max-w-5xl">
			<div class="relative">
				<!-- Connection line -->
				<div
					class="from-primary via-primary-light to-primary absolute top-1 bottom-1 left-8 hidden w-1 bg-gradient-to-b opacity-20 rounded lg:block"
				></div>

				<div class="space-y-8 mx-auto">
					{#each methodology as step, index}
						<div class="group relative flex items-start">
							<!-- Step number circle -->
							<div class="relative z-10 flex-shrink-0 mt-[0.05rem]">
								<div
									class=" bg-primary-light h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-lg transition-transform duration-300 group-hover:scale-110 hidden lg:flex"
								>
									{step.step}
								</div>
							</div>

							<!-- Content card -->
							<div class="ml-auto lg:ml-8 flex-grow">
								<div
									class="rounded-2xl border border-gray-100 bg-white p-8 shadow-lg transition-all duration-300 group-hover:shadow-xl"
								>
									<div class="mb-4 flex items-center gap-4 lg:gap-0">
										<div class="mr-4 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 p-3 hidden lg:block">
											<Icon icon={step.icon} class="text-primary-light" width="28" height="28" />
										</div>
										<div class="relative z-10 flex-shrink-0 lg:hidden">
											<div
												class="bg-gradient-to-br from-primary-light to-primary-light flex h-8 w-8 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-lg transition-transform duration-300 group-hover:scale-110"
											>
												{step.step}
											</div>
										</div>
										<h3 class="text-lg font-bold  text-gray-800 lg:text-2xl">{step.title}</h3>
									</div>
									<p class="text-lg leading-relaxed text-gray-700">{step.description}</p>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Comparison Section -->
<section class="bg-white py-20">
	<div class="container mx-auto px-6 md:px-12 lg:px-20">
		<div class="mb-12 text-center">
			<h2 class="text-primary mb-4 text-3xl font-bold md:text-4xl">APAW vs Traditional Systems</h2>
			<div class="bg-primary-light mx-auto mb-4 h-1 w-20 rounded-full"></div>
			<p class="mx-auto max-w-2xl text-lg text-gray-600">
				See how our platform advances beyond conventional flood warning systems
			</p>
		</div>

		<div class="mx-auto max-w-5xl">
			<div class="overflow-hidden rounded-2xl border border-gray-200 shadow-2xl">
				<div class="overflow-x-auto">
					<table class="w-full">
						<thead>
							<tr class="bg-primary-light text-white">
								<th class="px-8 py-5 text-left text-lg font-bold">Feature</th>
								<th class="px-8 py-5 text-left text-lg font-bold">APAW Platform</th>
								<th class="px-8 py-5 text-left text-lg font-bold">Traditional Systems</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200 bg-white">
							{#each features as feature, index}
								<tr
									class="transition-colors duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50"
								>
									<td class="px-8 py-6 text-lg font-bold text-gray-900">{feature.feature}</td>
									<td class="px-8 py-6">
										<div class="flex items-center">
											<Icon
												icon="mdi:check-circle"
												class="text-primary-light mr-2 w-5 h-5 flex-shrink-0"
												width="20"
												height="20"
												aria-hidden="true"
											/>
											<span class="text-primary-light font-semibold">{feature.apaw}</span>
										</div>
									</td>
									<td class="px-8 py-6 text-gray-600">{feature.traditional}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Academic Context Section -->
<!-- <section class="py-20 bg-gradient-to-b from-gray-50 to-white">
    <div class="container mx-auto px-6 md:px-12 lg:px-20">
        <div class="mb-12 text-center">
            <h2 class="text-primary text-3xl font-bold md:text-4xl mb-4">Academic Excellence</h2>
            <div class="bg-primary-light mx-auto h-1 w-20 rounded-full"></div>
        </div>
        
        <div class="max-w-5xl mx-auto">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div class="bg-white rounded-2xl p-8 shadow-xl border-t-4 border-blue-500 hover:shadow-2xl transition-all duration-300">
                    <div class="flex items-center mb-6">
                        <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 mr-4">
                            <Icon icon="mdi:school" class="text-blue-600" width="40" height="40" />
                        </div>
                        <h3 class="text-2xl font-bold text-gray-800">Educational Institution</h3>
                    </div>
                    <p class="text-gray-700 leading-relaxed text-lg">
                        We are Bachelor of Science in Information Technology students from Our Lady of Fatima University - Quezon City Campus, and this project represents our capstone research achievement.
                    </p>
                </div>

                <div class="bg-white rounded-2xl p-8 shadow-xl border-t-4 border-green-500 hover:shadow-2xl transition-all duration-300">
                    <div class="flex items-center mb-6">
                        <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 mr-4">
                            <Icon icon="mdi:flask" class="text-green-600" width="40" height="40" />
                        </div>
                        <h3 class="text-2xl font-bold text-gray-800">Research Focus</h3>
                    </div>
                    <p class="text-gray-700 leading-relaxed text-lg">
                        Our research explores the application of Random Forest classification and LSTM regression for predictive analysis of water-related flood risks in urban environments.
                    </p>
                </div>
            </div>
        </div>
    </div>
</section> -->

<!-- Mission and Vision Section -->
<section class="bg-white py-20">
	<div class="container mx-auto px-6 md:px-12 lg:px-20">
		<div class="mb-12 text-center">
			<h2 class="text-primary mb-4 text-3xl font-bold md:text-4xl">Our Mission & Vision</h2>
			<div class="bg-primary-light mx-auto h-1 w-20 rounded-full"></div>
		</div>

		<div class="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-2">
			<!-- Mission -->
			<div
				class="relative overflow-hidden rounded-2xl border border-gray-100  shadow-xl transition-all duration-300 hover:scale-101 hover:shadow-2xl"
			>
				<div
					class="absolute top-0 left-0 h-2 w-full bg-gradient-to-r from-primary-light to-primary-light"
				></div>
				<div class="p-10">
					<div class="mb-6 flex items-center">
						<div class="mr-4 rounded-xl bg-gradient-to-br from-primary-light to-primary-light p-4 shadow-lg">
							<Icon icon="mdi:target-variant" class="text-white" width="36" height="36" />
						</div>
						<h3 class="text-primary text-2xl font-bold">Our Mission</h3>
					</div>
					<p class="text-lg leading-relaxed text-gray-700">
						Our mission is to enhance community resilience and safety by developing and providing
						accessible, data-driven predictions for water-related flood risks, empowering proactive
						preparedness and response.
					</p>
				</div>
			</div>

			<!-- Vision -->
			<div
				class="relative overflow-hidden rounded-2xl border border-gray-100 shadow-xl transition-all duration-300 hover:scale-101 hover:shadow-2xl"
			>
				<div
					class="absolute top-0 left-0 h-2 w-full bg-gradient-to-r from-primary-light to-primary-light"
				></div>
				<div class="p-10">
					<div class="mb-6 flex items-center">
						<div
							class="mr-4 rounded-xl bg-gradient-to-br from-primary-light to-primary-light p-4 shadow-lg"
						>
							<Icon icon="mdi:eye-outline" class="text-white" width="36" height="36" />
						</div>
						<h3 class="text-primary text-2xl font-bold">Our Vision</h3>
					</div>
					<p class="text-lg leading-relaxed text-gray-700">
						Our vision is a future where communities are proactively safeguarded against flood
						impacts, utilizing accurate and timely predictive insights to minimize risk to lives,
						property, and livelihoods.
					</p>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Core Values Section - APAW -->
<section class="bg-gradient-to-b from-gray-50 to-white py-20">
	<div class="container mx-auto px-6 md:px-12 lg:px-20">
		<div class="mb-12 text-center">
			<h2 class="text-primary mb-4 text-3xl font-bold md:text-4xl">Our Core Values</h2>
			<div class="bg-primary-light mx-auto mb-4 h-1 w-20 rounded-full"></div>
			<p class="mx-auto max-w-2xl text-lg text-gray-600">
				The principles that guide our work, embodied in our name: <span
					class="text-primary-light text-xl font-bold">APAW</span
				>
			</p>
		</div>

		<div class="mx-auto grid max-w-7xl grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
			{#each values as value, index}
				<div
					class="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl transition-all duration-300 hover:scale-101 hover:shadow-2xl"
				>
					<div class="absolute top-0 left-0 h-2 w-full bg-gradient-to-r {valueCardGradient}"></div>
					<div class="p-8">
						<div class="mb-6">
							<div
								class="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br {valueCardGradient} shadow-lg transition-transform duration-300 group-hover:scale-110"
							>
								<Icon icon={value.icon} class="text-white" width="40" height="40" />
							</div>
						</div>
						<div class="mb-4">
							<h3 class="text-2xl font-bold">
								<span class="text-primary-light text-4xl">{value.title.charAt(0)}</span
								><span class="text-gray-800">{value.title.slice(1)}</span>
							</h3>
						</div>
						<p class="leading-relaxed text-gray-600">{value.description}</p>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>
