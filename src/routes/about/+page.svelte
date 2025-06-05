<script>
    import Icon from '@iconify/svelte';
    
    // Technical achievements data
    const achievements = [
        {
            title: 'High Accuracy Classification',
            description: 'Our flood detection model achieves 93% accuracy in determining whether flooding will occur, with excellent precision and recall rates.',
            icon: 'mdi:target',
            metric: '93% Accuracy'
        },
        {
            title: 'Reliable Depth Prediction',
            description: 'When floods are predicted, our model estimates flood depth with an average error of only 12-18 cm, providing valuable information for preparation.',
            icon: 'mdi:ruler',
            metric: '12-18cm MAE'
        },
        {
            title: '5-Day Forecast Window',
            description: 'Unlike traditional same-day flood warnings, APAW provides up to 5 days advance notice, enabling better preparation time.',
            icon: 'mdi:calendar-range',
            metric: '5 Days Ahead'
        },
        {
            title: 'Fast Response Time',
            description: 'Our optimized system delivers predictions in 5-15 seconds, making it practical for real-time decision making.',
            icon: 'mdi:speedometer',
            metric: '5-15 Seconds'
        }
    ];

    // Methodology steps
    const methodology = [
        {
            step: '1',
            title: 'Data Integration',
            description: 'We combine weather forecasts, historical flood records, geographic features, and soil conditions from multiple reliable sources.',
            icon: 'mdi:database'
        },
        {
            step: '2',
            title: 'Machine Learning Analysis',
            description: 'Our Random Forest algorithm analyzes patterns in the integrated data to identify flood risk indicators and relationships.',
            icon: 'mdi:brain'
        },
        {
            step: '3',
            title: 'Dual Prediction System',
            description: 'We first predict if flooding will occur, then estimate the depth if flooding is likely, providing comprehensive risk assessment.',
            icon: 'mdi:weather-flood'
        },
        {
            step: '4',
            title: 'Real-time Forecasting',
            description: 'The system continuously processes current weather conditions to generate updated 5-day flood risk forecasts.',
            icon: 'mdi:refresh'
        }
    ];

    // Key features comparison
    const features = [
        {
            feature: 'Prediction Timeframe',
            traditional: 'Same day warnings',
            apaw: '5-day advance forecasts'
        },
        {
            feature: 'Coverage Area',
            traditional: 'Limited monitoring points',
            apaw: 'Any location in Metro Manila'
        },
        {
            feature: 'Information Provided',
            traditional: 'General flood alerts',
            apaw: 'Specific depth predictions'
        },
        {
            feature: 'Accessibility',
            traditional: 'Government announcements',
            apaw: 'Public web platform'
        }
    ];
    
    // Values data
    const values = [
        {
            title: 'Accuracy',
            description: 'We are committed to thorough analysis and continuous improvement to provide the most reliable flood risk predictions possible based on available data.',
            icon: 'clarity:bullseye-line'
        },
        {
            title: 'Preparedness',
            description: 'We aim to empower individuals, communities, and authorities with timely information that facilitates effective planning and preparation for potential flood events.',
            icon: 'mdi:shield-check'
        },
        {
            title: 'Accessibility',
            description: 'We strive to make complex flood risk information understandable and readily available through user-friendly interfaces and clear communication.',
            icon: 'mdi:account-group'
        },
        {
            title: 'Innovation',
            description: 'We leverage cutting-edge machine learning techniques to transform how communities prepare for and respond to flood risks.',
            icon: 'mdi:lightbulb'
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

<!-- Header section -->
<div class="bg-primary relative mb-12 overflow-hidden px-4 py-12 text-white">
    <div class="absolute top-0 left-0 h-full w-full opacity-10">
        <div
            class="bg-primary-light absolute top-0 left-0 h-full w-1/2 translate-x-[-50%] translate-y-[-50%] rotate-45 transform"
        ></div>
        <div
            class="bg-primary-light absolute right-0 bottom-0 h-full w-1/2 translate-x-[50%] translate-y-[50%] -rotate-45 transform"
        ></div>
    </div>
    <div class="relative z-10 container mx-auto">
        <h1 class="mb-4 text-center text-4xl font-bold md:text-5xl">About APAW</h1>
        <div class="bg-primary-light mx-auto mb-6 h-1 w-24"></div>
        <p class="mx-auto max-w-2xl text-center text-lg">
            Advanced flood prediction technology helping Metro Manila communities prepare for water-related risks.
        </p>
    </div>
</div>

<!-- Project Overview Section -->
<section class="py-16 bg-white">
    <div class="container mx-auto px-8 md:px-16">
        <div class="mb-8 flex items-center">
            <h2 class="text-primary text-2xl font-bold md:text-3xl">Project Overview</h2>
            <div class="from-primary-light ml-4 h-px flex-grow bg-gradient-to-r to-transparent"></div>
        </div>
        
        <div class="max-w-4xl mx-auto">
            <div class="bg-gray-50 rounded-xl p-8 mb-8">
                <p class="text-lg leading-relaxed text-gray-700 mb-6">
                    APAW (Advanced Predictive Analysis of Water-related Flood Risk) is an innovative flood prediction platform that we developed as part of our academic capstone project. Using machine learning techniques, we analyze weather patterns, geographical features, and historical data to predict flood risks up to 5 days in advance.
                </p>
                <p class="text-lg leading-relaxed text-gray-700">
                    Our system addresses a critical gap in flood preparedness by providing location-specific predictions for any area within Metro Manila, moving beyond traditional reactive flood warnings to enable proactive community preparation.
                </p>
            </div>
        </div>
    </div>
</section>

<!-- Technical Achievements Section -->
<section class="py-16 bg-gray-50">
    <div class="container mx-auto px-8 md:px-16">
        <div class="mb-8 flex items-center">
            <h2 class="text-primary text-2xl font-bold md:text-3xl">Technical Achievements</h2>
            <div class="from-primary-light ml-4 h-px flex-grow bg-gradient-to-r to-transparent"></div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            {#each achievements as achievement}
                <div class="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg transition-all duration-300 hover:translate-y-[-5px] hover:shadow-xl">
                    <div class="bg-primary-light h-2 w-full"></div>
                    <div class="p-6">
                        <div class="mb-5 flex items-center justify-between">
                            <div class="flex h-14 w-14 items-center justify-center rounded-lg bg-blue-50 shadow-sm">
                                <Icon icon={achievement.icon} class="text-primary-light" width="32" height="32" />
                            </div>
                            <div class="text-right">
                                <span class="text-primary-light font-bold text-lg">{achievement.metric}</span>
                            </div>
                        </div>
                        <h3 class="text-xl font-bold text-gray-800 mb-3">{achievement.title}</h3>
                        <p class="leading-relaxed text-gray-600">{achievement.description}</p>
                    </div>
                </div>
            {/each}
        </div>
    </div>
</section>

<!-- Methodology Section -->
<section class="py-16 bg-white">
    <div class="container mx-auto px-8 md:px-16">
        <div class="mb-8 flex items-center">
            <h2 class="text-primary text-2xl font-bold md:text-3xl">Our Methodology</h2>
            <div class="from-primary-light ml-4 h-px flex-grow bg-gradient-to-r to-transparent"></div>
        </div>
        
        <div class="max-w-4xl mx-auto">
            <div class="space-y-6">
                {#each methodology as step}
                    <div class="flex items-start space-x-6 p-6 bg-gray-50 rounded-xl">
                        <div class="flex-shrink-0">
                            <div class="bg-primary text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg">
                                {step.step}
                            </div>
                        </div>
                        <div class="flex-grow">
                            <div class="flex items-center mb-3">
                                <Icon icon={step.icon} class="text-primary-light mr-3" width="24" height="24" />
                                <h3 class="text-xl font-bold text-gray-800">{step.title}</h3>
                            </div>
                            <p class="text-gray-700 leading-relaxed">{step.description}</p>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    </div>
</section>

<!-- Comparison Section -->
<section class="py-16 bg-gray-50">
    <div class="container mx-auto px-8 md:px-16">
        <div class="mb-8 flex items-center">
            <h2 class="text-primary text-2xl font-bold md:text-3xl">APAW vs Traditional Flood Warnings</h2>
            <div class="from-primary-light ml-4 h-px flex-grow bg-gradient-to-r to-transparent"></div>
        </div>
        
        <div class="max-w-4xl mx-auto">
            <div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-primary text-white">
                            <tr>
                                <th class="px-6 py-4 text-left font-semibold">Feature</th>
                                <th class="px-6 py-4 text-left font-semibold">Traditional Systems</th>
                                <th class="px-6 py-4 text-left font-semibold">APAW Platform</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                            {#each features as feature}
                                <tr class="hover:bg-gray-50">
                                    <td class="px-6 py-4 font-medium text-gray-900">{feature.feature}</td>
                                    <td class="px-6 py-4 text-gray-600">{feature.traditional}</td>
                                    <td class="px-6 py-4 text-primary-light font-medium">{feature.apaw}</td>
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
<section class="py-16 bg-white">
    <div class="container mx-auto px-8 md:px-16">
        <div class="mb-8 flex items-center">
            <h2 class="text-primary text-2xl font-bold md:text-3xl">Academic Excellence</h2>
            <div class="from-primary-light ml-4 h-px flex-grow bg-gradient-to-r to-transparent"></div>
        </div>
        
        <div class="max-w-4xl mx-auto">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div class="bg-gray-50 rounded-xl p-6">
                    <div class="flex items-center mb-4">
                        <Icon icon="mdi:school" class="text-primary-light mr-3" width="32" height="32" />
                        <h3 class="text-xl font-bold text-gray-800">Educational Institution</h3>
                    </div>
                    <p class="text-gray-700 leading-relaxed">
                        We are Bachelor of Science in Information Technology students from Our Lady of Fatima University - Quezon City Campus, and this project is developed as part of our capstone research project.
                    </p>
                </div>

                <div class="bg-gray-50 rounded-xl p-6">
                    <div class="flex items-center mb-4">
                        <Icon icon="mdi:medal" class="text-primary-light mr-3" width="32" height="32" />
                        <h3 class="text-xl font-bold text-gray-800">Research Focus</h3>
                    </div>
                    <p class="text-gray-700 leading-relaxed">
                        Our research explores the application of supervised machine learning algorithms for predictive analysis of water-related flood risks in urban environments.
                    </p>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- Future Plans Section -->
<section class="py-16 bg-gray-50">
    <div class="container mx-auto px-8 md:px-16">
        <div class="mb-8 flex items-center">
            <h2 class="text-primary text-2xl font-bold md:text-3xl">Future Development</h2>
            <div class="from-primary-light ml-4 h-px flex-grow bg-gradient-to-r to-transparent"></div>
        </div>
        
        <div class="max-w-4xl mx-auto">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="bg-white rounded-xl p-6 shadow-md">
                    <Icon icon="mdi:chart-line" class="text-primary-light mb-4" width="32" height="32" />
                    <h3 class="text-lg font-bold text-gray-800 mb-3">Enhanced Algorithms</h3>
                    <p class="text-gray-600">We are exploring advanced algorithms like XGBoost to further improve prediction accuracy.</p>
                </div>

                <div class="bg-white rounded-xl p-6 shadow-md">
                    <Icon icon="mdi:map-marker-multiple" class="text-primary-light mb-4" width="32" height="32" />
                    <h3 class="text-lg font-bold text-gray-800 mb-3">Expanded Coverage</h3>
                    <p class="text-gray-600">We plan to extend coverage beyond Metro Manila to other flood-prone regions.</p>
                </div>

                <div class="bg-white rounded-xl p-6 shadow-md">
                    <Icon icon="mdi:cellphone" class="text-primary-light mb-4" width="32" height="32" />
                    <h3 class="text-lg font-bold text-gray-800 mb-3">Mobile Application</h3>
                    <p class="text-gray-600">We are developing a mobile app for easier access and real-time notifications.</p>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- Mission and Vision Section -->
<section class="py-16 bg-white">
    <div class="container mx-auto px-8 md:px-16">
        <div class="mb-8 flex items-center">
            <h2 class="text-primary text-2xl font-bold md:text-3xl">Our Mission & Vision</h2>
            <div class="from-primary-light ml-4 h-px flex-grow bg-gradient-to-r to-transparent"></div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <!-- Mission -->
            <div class="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg transition-all duration-300 hover:translate-y-[-5px] hover:shadow-xl">
                <div class="bg-primary-light h-2 w-full"></div>
                <div class="p-6">
                    <div class="mb-5 flex items-center">
                        <div>
                            <h3 class="mb-1 text-xl font-semibold text-primary">Our Mission</h3>
                        </div>
                    </div>
                    <p class="leading-relaxed text-gray-600 mb-4">
                        Our mission is to enhance community resilience and safety by developing and providing accessible, data-driven predictions for water-related flood risks, empowering proactive preparedness and response.
                    </p>
                </div>
            </div>
            
            <!-- Vision -->
            <div class="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg transition-all duration-300 hover:translate-y-[-5px] hover:shadow-xl">
                <div class="bg-primary-light h-2 w-full"></div>
                <div class="p-6">
                    <div class="mb-5 flex items-center">
                        <div>
                            <h3 class="mb-1 text-xl font-semibold text-primary">Our Vision</h3>
                        </div>
                    </div>
                    <p class="leading-relaxed text-gray-600 mb-4">
                        Our vision is a future where communities are proactively safeguarded against flood impacts, utilizing accurate and timely predictive insights to minimize risk to lives, property, and livelihoods.
                    </p>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- Core Values Section -->
<section class="py-16 bg-gray-50">
    <div class="container mx-auto px-8 md:px-16">
        <div class="mb-8 flex items-center">
            <h2 class="text-primary text-2xl font-bold md:text-3xl">Our Core Values</h2>
            <div class="from-primary-light ml-4 h-px flex-grow bg-gradient-to-r to-transparent"></div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {#each values as value}
                <div class="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg transition-all duration-300 hover:translate-y-[-5px] hover:shadow-xl">
                    <div class="bg-primary-light h-2 w-full"></div>
                    <div class="p-6">
                        <div class="mb-5 flex h-14 w-14 items-center justify-center rounded-lg bg-blue-50 shadow-sm">
                            <Icon icon={value.icon} class="text-primary-light" width="32" height="32" />
                        </div>
                        <h3 class="text-xl font-bold text-gray-800 mb-3">{value.title}</h3>
                        <p class="leading-relaxed text-gray-600">{value.description}</p>
                    </div>
                </div>
            {/each}
        </div>
    </div>
</section>


