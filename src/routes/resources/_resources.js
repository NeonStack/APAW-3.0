const resources = [
	{
		title: 'Random Forest',
		description:
			'Machine learning algorithm used for classification (Flood/No Flood).',
		category: 'Core Algorithms & Libraries',
		iconType: 'iconify',
		icon: 'carbon:tree-view-alt',
		url: 'https://scikit-learn.org/stable/modules/ensemble.html#forest'
	},
	{
		title: 'LSTM Neural Networks',
		description:
			'Long Short-Term Memory neural networks used for time-series classification and regression of flood events.',
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
		description: 'Deep learning framework used to build and train the LSTM neural network models.',
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
			'Philippine Atmospheric, Geophysical and Astronomical Services Administration - provided real-time and historical water level station data, tropical cyclone data, and general flood advisory.',
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
		title: 'Visual Crossing Weather',
		description:
			'Provided supplementary weather forecast data used in the prediction backend and for displaying weather information.',
		category: 'Data Sources',
		iconType: 'image',
		icon: '/logo/visual-crossing-short.png',
		url: 'https://www.visualcrossing.com/'
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
        title: 'Google Gemini AI',
        description: `Google AI model for parsing PAGASA's public cyclone data.`,
        category: 'Core Algorithms & Libraries',
        iconType: 'iconify',
        icon: 'logos:google-gemini',
        url: 'https://deepmind.google/models/gemini/'
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

	// Institution
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

let categories = [...new Set(resources.flatMap((r) => r.category))];

export { resources, categories };
