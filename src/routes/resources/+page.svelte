<script>
	import Icon from '@iconify/svelte';
	// Resources data structure
	const resources = [
		// Core Algorithms & Libraries
		{
			title: 'Random Forest',
			description:
				'Machine learning algorithm used for classification (Flood/No Flood) and regression (Flood Depth) prediction.',
			category: 'Core Algorithms & Libraries',
			iconType: 'iconify',
			icon: 'carbon:tree-view-alt',
			url: 'https://scikit-learn.org/stable/modules/ensemble.html#forest'
		},
		{
			title: 'LSTM Neural Networks',
			description:
				'Long Short-Term Memory neural networks explored for time-series classification and regression of flood events.',
			category: 'Core Algorithms & Libraries',
			iconType: 'iconify',
			icon: 'carbon:network-4',
			url: 'https://www.tensorflow.org/guide/keras/rnn'
		},
		{
			title: 'Scikit-learn',
			description:
				'Core Python library providing machine learning algorithms, preprocessing tools, and evaluation metrics.',
			category: 'Core Algorithms & Libraries',
			iconType: 'iconify',
			icon: 'devicon:scikitlearn',
			url: 'https://scikit-learn.org/'
		},
		{
			title: 'TensorFlow/Keras',
			description:
				'Deep learning framework used to build and train the LSTM neural network models.',
			category: 'Core Algorithms & Libraries',
			iconType: 'iconify',
			icon: 'devicon:tensorflow',
			url: 'https://www.tensorflow.org/'
		},
		{
			title: 'Pandas',
			description:
				'Essential data manipulation and analysis library used extensively for handling time-series and tabular data.',
			category: 'Core Algorithms & Libraries',
			iconType: 'iconify',
			icon: 'devicon:pandas',
			url: 'https://pandas.pydata.org/'
		},
		{
			title: 'NumPy',
			description:
				'Fundamental package for numerical computing in Python, used for array operations.', 
			category: 'Core Algorithms & Libraries',
			iconType: 'iconify',
			icon: 'devicon:numpy',
			url: 'https://numpy.org/'
		},
		{
			title: 'GeoPandas',
			description:
				'Library extending Pandas for geospatial data processing, used in offline preparation of map-based features.',
			category: 'Core Algorithms & Libraries',
			iconType: 'iconify',
			icon: 'simple-icons:geopandas',
			url: 'https://geopandas.org/'
		},
		{
			title: 'Shapely',
			description:
				'Python package for manipulation and analysis of planar geometric objects (used via GeoPandas).',
			category: 'Core Algorithms & Libraries',
			iconType: 'image',
			icon: '/logo/shapely.png',
			url: 'https://shapely.readthedocs.io/'
		},
		{
			title: 'OSMnx',
			description:
				'Python package used for retrieving and analyzing OpenStreetMap data during offline feature preparation.',
			category: 'Core Algorithms & Libraries',
			iconType: 'image',
			icon: '/logo/osmnx.png',
			url: 'https://osmnx.readthedocs.io/'
		},
		{
			// <<< ADDED
			title: 'Joblib',
			description:
				'Python library used for efficiently saving and loading trained Scikit-learn models and pipelines.',
			category: 'Core Algorithms & Libraries',
			iconType: 'image',
			icon: '/logo/joblib.svg', 
			url: 'https://joblib.readthedocs.io/'
		},
		{
			title: 'Requests',
			description:
				'Standard Python library for making HTTP requests to fetch data from external APIs.',
			category: 'Core Algorithms & Libraries',
			iconType: 'iconify',
			icon: 'material-symbols:http',
			url: 'https://requests.readthedocs.io/'
		},
		{
			title: 'Pytz',
			description: 'Python library used for accurate timezone calculations and conversions.',
			category: 'Core Algorithms & Libraries',
			iconType: 'iconify',
			icon: 'carbon:earth',
			url: 'https://pythonhosted.org/pytz/'
		},

		// Data Sources (Looks Good!)
		{
			title: 'PAGASA',
			description:
				'Philippine Atmospheric, Geophysical and Astronomical Services Administration - provided real-time and historical water level station data.',
			category: 'Data Sources',
			iconType: 'image',
			icon: '/logo/pagasa.png',
			url: 'https://www.pagasa.dost.gov.ph/'
		},
		{
			title: 'Open-Meteo APIs',
			description:
				'Provided historical and forecast weather parameters including precipitation, temperature, humidity, wind, cloud cover, and soil conditions.',
			category: 'Data Sources',
			iconType: 'image',
			icon: '/logo/open-meteo.png',
			url: 'https://open-meteo.com/'
		},
		{
			title: 'AccuWeather API',
			description: 'Provided supplementary weather forecast data used in the prediction backend.', 
			category: 'Data Sources',
			iconType: 'iconify',
			icon: 'simple-icons:accuweather',
			url: 'https://developer.accuweather.com/'
		},
		{
			title: 'OpenStreetMap (OSM)',
			description:
				'Utilized for sourcing baseline geographic features (like waterways for offline analysis) and location context via Nominatim.',
			category: 'Data Sources',
			iconType: 'iconify',
			icon: 'openmoji:openstreetmap',
			url: 'https://www.openstreetmap.org/'
		},
		{
			title: 'Open Topo Data API',
			description: 'Provided SRTM30m elevation data for specific locations.',
			category: 'Data Sources',
			iconType: 'iconify',
			icon: 'arcticons:opentopomap',
			url: 'https://www.opentopodata.org/'
		},
		{
			title: 'Historical Flood Event Records',
			description:
				'Compiled from publicly available reports and advisories issued by relevant government agencies during past weather events.',
			category: 'Data Sources',
			iconType: 'iconify',
			icon: 'material-symbols:flood',
			url: ''
		},

		// Development & Deployment Stack 
		{
			title: 'Python',
			description:
				'Primary programming language used for backend API, data processing, and model development.', 
			category: 'Development & Deployment Stack',
			iconType: 'iconify',
			icon: 'devicon:python',
			url: 'https://www.python.org/'
		},
		{
			title: 'Google Colab',
			description:
				'Cloud-based development environment used for initial data processing, model training, and evaluation.',
			category: 'Development & Deployment Stack',
			iconType: 'iconify',
			icon: 'devicon:googlecolab',
			url: 'https://colab.research.google.com/'
		},
		{
			title: 'Gradio',
			description:
				'Framework used to rapidly build and deploy the web interface for the backend prediction API.',
			category: 'Development & Deployment Stack',
			iconType: 'iconify',
			icon: 'logos:gradio-icon',
			url: 'https://www.gradio.app/'
		},
		{
			title: 'Hugging Face Spaces',
			description: 'Platform used for hosting the Gradio prediction API.',
			category: 'Development & Deployment Stack',
			iconType: 'iconify',
			icon: 'logos:hugging-face-icon',
			url: 'https://huggingface.co/spaces'
		},
		{
			title: 'Supabase (PostgreSQL)',
			description:
				'Backend-as-a-Service platform used for storing and retrieving pre-fetched weather/soil forecast data.', // More specific than 'caching'
			category: 'Development & Deployment Stack',
			iconType: 'iconify',
			icon: 'devicon:supabase',
			url: 'https://supabase.com/'
		},
		{
			title: 'SvelteKit',
			description: 'JavaScript framework used to build the user-facing frontend web application.',
			category: 'Development & Deployment Stack',
			iconType: 'iconify',
			icon: 'devicon:svelte',
			url: 'https://kit.svelte.dev/'
		},
		{
			title: 'Vercel',
			description: 'Platform used for hosting the SvelteKit frontend application.',
			category: 'Development & Deployment Stack',
			iconType: 'iconify',
			icon: 'devicon:vercel',
			url: 'https://vercel.com/'
		},
		{
			title: 'Leaflet.js',
			description:
				'JavaScript library used for creating interactive maps within the frontend application.',
			category: 'Development & Deployment Stack',
			iconType: 'iconify',
			icon: 'simple-icons:leaflet',
			url: 'https://leafletjs.com/'
		},
		{
			title: 'Nominatim',
			description:
				'Geocoding service based on OpenStreetMap data used for location search functionality.',
			category: 'Development & Deployment Stack',
			iconType: 'iconify',
			icon: 'carbon:location',
			url: 'https://nominatim.org/'
		},
		{
			title: 'Photon',
			description:
				'Geocoding API based on OpenStreetMap data used to find locations and return their coordinates for the search functionality.',
			category: 'Development & Deployment Stack',
			iconType: 'image',
			icon: '/logo/photon.png',
			url: 'https://photon.komoot.io/'
		},
		{
			title: 'GitHub',
			description: 'Platform used for version control and source code management.', 
			category: 'Development & Deployment Stack',
			iconType: 'iconify',
			icon: 'devicon:github',
			url: 'https://github.com/'
		},
		// Other Tools 
		{
			title: 'Awesome Table',
			description:
				'Web application used during data collection phase for organizing and finding location coordinates.',
			category: 'Other Tools',
			iconType: 'image',
			icon: '/logo/awesome-table.png',
			url: 'https://awesome-table.com/'
		},
		{
			title: 'Philippines JSON Maps',
			description:
				'GitHub repository providing administrative boundary data (GeoJSON) used for NCR context/visualization during development.',
			category: 'Other Tools',
			iconType: 'iconify',
			icon: 'carbon:map',
			url: 'https://github.com/faeldon/philippines-json-maps'
		},

		// Institution (Looks good)
		{
			title: 'Our Lady of Fatima University - Quezon City Campus',
			description:
				'College of Computer Studies - Academic institution supporting this capstone project.',
			category: 'Institution',
			iconType: 'image',
			icon: '/logo/olfu.png',
			url: 'https://www.fatima.edu.ph/'
		}
	];

	// Get unique categories
	const categories = [...new Set(resources.map((resource) => resource.category))];
</script>

<svelte:head>
  <title>APAW | Resources</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-gray-50 to-white">
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
			<h1 class="mb-4 text-center text-4xl font-bold md:text-5xl">Project Resources</h1>
			<div class="bg-primary-light mx-auto mb-6 h-1 w-24"></div>
			<p class="mx-auto max-w-2xl text-center text-lg">
				These are the libraries, data sources, and tools that power our APAW project.
			</p>
		</div>
	</div>

	<div class="container mx-auto px-2 pb-16 lg:px-10">
		{#each categories as category}
			<div class="mb-16">
				<div class="mb-8 flex items-center">
					<h2 class="text-primary text-2xl font-bold md:text-3xl">{category}</h2>
					<div class="from-primary-light ml-4 h-px flex-grow bg-gradient-to-r to-transparent"></div>
				</div>

				<div class="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
					{#each resources.filter((r) => r.category === category) as resource}
						<div
							class="group overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg transition-all duration-300 hover:translate-y-[-5px] hover:shadow-xl"
						>
							<div class="bg-primary-light h-2 w-full"></div>
							<div class="p-6">
								<div class="mb-5 flex items-center">
									<div
										class="mr-4 flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-white shadow-md transition-transform duration-300 group-hover:scale-110"
									>
										{#if resource.iconType === 'iconify'}
											<Icon icon={resource.icon} width="32" height="32" />
										{:else if resource.iconType === 'image'}
											<img
												src={resource.icon}
												alt={resource.title}
												class="h-8 w-8 object-contain"
											/>
										{/if}
									</div>
									<div>
										<!-- Made title color consistent -->
										<h3 class="mb-1 text-xl leading-tight font-semibold">
											{#if resource.url}
												<a
													href={resource.url}
													target="_blank"
													rel="noopener noreferrer"
													class="text-primary hover:text-primary-light transition-colors duration-300"
													>{resource.title}</a
												>
											{:else}
												<span class="text-primary">{resource.title}</span>
											{/if}
										</h3>
									</div>
								</div>
								<p class="leading-relaxed text-gray-600">{resource.description}</p>

								{#if resource.url}
									<div class="mt-4 text-right">
										<a
											href={resource.url}
											target="_blank"
											rel="noopener noreferrer"
											class="text-primary-light hover:text-primary inline-flex items-center text-sm font-medium transition-colors duration-300 group-hover:translate-x-1"
										>
											Learn more
											<svg
												xmlns="http://www.w3.org/2000/svg"
												class="ml-1 h-4 w-4"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M14 5l7 7m0 0l-7 7m7-7H3"
												/>
											</svg>
										</a>
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	@keyframes float {
		0% {
			transform: translateY(0px);
		}
		50% {
			transform: translateY(-10px);
		}
		100% {
			transform: translateY(0px);
		}
	}
</style>
