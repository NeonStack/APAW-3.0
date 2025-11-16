const resources = [
    // Core Algorithms used in your Flood Prediction backend training and inference
    {
        title: 'Random Forest',
        description:
            'Machine learning algorithm used for classification of flood/no flood in training and prediction.',
        category: 'Core Algorithms & Libraries',
        iconType: 'iconify',
        icon: 'carbon:tree-view-alt',
        url: 'https://scikit-learn.org/stable/modules/ensemble.html#forest'
    },
    {
        title: 'LSTM Neural Networks',
        description:
            'Long Short-Term Memory networks used for time-series regression predicting flood height in training and inference.',
        category: 'Core Algorithms & Libraries',
        iconType: 'iconify',
        icon: 'carbon:network-4',
        url: 'https://www.tensorflow.org/guide/keras/rnn'
    },
    {
        title: 'Scikit-learn',
        description:
            'Provides foundational ML algorithms, model tuning, and evaluation tools used during training.',
        category: 'Core Algorithms & Libraries',
        iconType: 'iconify',
        icon: 'devicon:scikitlearn',
        url: 'https://scikit-learn.org/'
    },
    {
        title: 'TensorFlow/Keras',
        description: 'Deep learning framework used for building and training the LSTM flood height regression model.',
        category: 'Core Algorithms & Libraries',
        iconType: 'iconify',
        icon: 'devicon:tensorflow',
        url: 'https://www.tensorflow.org/'
    },
    {
        title: 'Pandas',
        description:
            'Used extensively for time-series and tabular data manipulation in training data preparation and inference.',
        category: 'Core Algorithms & Libraries',
        iconType: 'iconify',
        icon: 'devicon:pandas',
        url: 'https://pandas.pydata.org/'
    },
    {
        title: 'NumPy',
        description:
            'Fundamental numerical computing library utilized for array operations during model training and inference.',
        category: 'Core Algorithms & Libraries',
        iconType: 'iconify',
        icon: 'devicon:numpy',
        url: 'https://numpy.org/'
    },
    {
        title: 'GeoPandas',
        description:
            'Employed for geospatial data processing and offline preparation of geographic features used as model inputs.',
        category: 'Core Algorithms & Libraries',
        iconType: 'iconify',
        icon: 'simple-icons:geopandas',
        url: 'https://geopandas.org/'
    },
    {
        title: 'Shapely',
        description:
            'Used for manipulation and analysis of planar geometric objects, instrumental in geospatial feature engineering.',
        category: 'Core Algorithms & Libraries',
        iconType: 'image',
        icon: '/logo/shapely.png',
        url: 'https://shapely.readthedocs.io/'
    },
    {
        title: 'Joblib',
        description:
            'Used for efficient serialization and loading of trained machine learning models and preprocessing pipelines.',
        category: 'Core Algorithms & Libraries',
        iconType: 'image',
        icon: '/logo/joblib.svg',
        url: 'https://joblib.readthedocs.io/'
    },
    {
        title: 'Requests',
        description:
            'Python library used to fetch external API data such as weather and live water levels during inference.',
        category: 'Core Algorithms & Libraries',
        iconType: 'iconify',
        icon: 'material-symbols:http',
        url: 'https://requests.readthedocs.io/'
    },
    {
        title: 'Pytz',
        description: 'Used for accurate timezone conversions in handling date-time data during preprocessing and inference.',
        category: 'Core Algorithms & Libraries',
        iconType: 'iconify',
        icon: 'carbon:earth',
        url: 'https://pythonhosted.org/pytz/'
    },

    // Ancillary AI system, not directly used in backend training or inference but related
    {
        title: 'Google Gemini AI',
        description: 'Referenced as an AI model for parsing external PAGASA cyclone data, not integrated in backend model training or prediction.',
        category: 'Ancillary AI Models',
        iconType: 'iconify',
        icon: 'logos:google-gemini',
        url: 'https://deepmind.google/models/gemini/'
    },

    // Data sources
    {
        title: 'PAGASA',
        description:
            'Primary source for real-time and historical water level station data, tropical cyclone data, and flood advisories.',
        category: 'Data Sources',
        iconType: 'image',
        icon: '/logo/pagasa.png',
        url: 'https://www.pagasa.dost.gov.ph/'
    },
    {
        title: 'Open-Meteo APIs',
        description:
            'Provided elevation data used to calculate geospatial features like elevation difference to waterways.',
        category: 'Data Sources',
        iconType: 'image',
        icon: '/logo/open-meteo.png',
        url: 'https://open-meteo.com/'
    },
    {
        title: 'Visual Crossing Weather',
        description:
            'Supplementary weather forecasting data source integrated into model features and user interface displays.',
        category: 'Data Sources',
        iconType: 'image',
        icon: '/logo/visual-crossing-short.png',
        url: 'https://www.visualcrossing.com/'
    },
    {
        title: 'OpenStreetMap (OSM)',
        description:
            'Provider of geographic baseline features like waterways, used in offline spatial feature engineering and context extraction.',
        category: 'Data Sources',
        iconType: 'iconify',
        icon: 'openmoji:openstreetmap',
        url: 'https://www.openstreetmap.org/'
    },
    {
        title: 'Open Topo Data API',
        description: 'Source for SRTM30m elevation data, used to derive key geospatial features.',
        category: 'Data Sources',
        iconType: 'iconify',
        icon: 'arcticons:opentopomap',
        url: 'https://www.opentopodata.org/'
    },
    {
        title: 'Historical Flood Event Records',
        description:
            'Aggregated from government advisories and public records, used for training label generation and evaluation.',
        category: 'Data Sources',
        iconType: 'iconify',
        icon: 'material-symbols:flood',
        url: ''
    },

    // Development & deployment stack
    {
        title: 'Python',
        description:
            'Primary language for backend API, data processing, and model development.',
        category: 'Development & Deployment Stack',
        iconType: 'iconify',
        icon: 'devicon:python',
        url: 'https://www.python.org/'
    },
    {
        title: 'Google Colab',
        description:
            'Cloud-based development environment utilized for initial data processing, model training, and model evaluation experiments.',
        category: 'Development & Deployment Stack',
        iconType: 'iconify',
        icon: 'devicon:googlecolab',
        url: 'https://colab.research.google.com/'
    },
    {
        title: 'Gradio',
        description:
            'Framework used for rapid prototyping and deployment of the frontend prediction interface.',
        category: 'Development & Deployment Stack',
        iconType: 'iconify',
        icon: 'logos:gradio-icon',
        url: 'https://www.gradio.app/'
    },
    {
        title: 'Hugging Face Spaces',
        description: 'Hosting platform for serving the Gradio prediction API.',
        category: 'Development & Deployment Stack',
        iconType: 'iconify',
        icon: 'logos:hugging-face-icon',
        url: 'https://huggingface.co/spaces'
    },
    {
        title: 'Supabase (PostgreSQL)',
        description:
            'Backend service platform storing pre-fetched weather and soil forecast data needed for model input features.',
        category: 'Development & Deployment Stack',
        iconType: 'iconify',
        icon: 'devicon:supabase',
        url: 'https://supabase.com/'
    },
    {
        title: 'SvelteKit',
        description: 'Framework for building the frontend application that visualizes flood predictions.',
        category: 'Development & Deployment Stack',
        iconType: 'iconify',
        icon: 'devicon:svelte',
        url: 'https://kit.svelte.dev/'
    },
    {
        title: 'Vercel',
        description: 'Cloud platform hosting the frontend SvelteKit web application.',
        category: 'Development & Deployment Stack',
        iconType: 'iconify',
        icon: 'devicon:vercel',
        url: 'https://vercel.com/'
    },
    {
        title: 'Leaflet.js',
        description:
            'JavaScript library enabling interactive maps within the frontend user interface.',
        category: 'Development & Deployment Stack',
        iconType: 'iconify',
        icon: 'simple-icons:leaflet',
        url: 'https://leafletjs.com/'
    },
    {
        title: 'Nominatim',
        description:
            'OpenStreetMap-based geocoding service utilized for location search features in the frontend.',
        category: 'Development & Deployment Stack',
        iconType: 'iconify',
        icon: 'carbon:location',
        url: 'https://nominatim.org/'
    },
    {
        title: 'Photon',
        description:
            'OpenStreetMap-based geocoding API for querying coordinates for search functionality.',
        category: 'Development & Deployment Stack',
        iconType: 'image',
        icon: '/logo/photon.png',
        url: 'https://photon.komoot.io/'
    },
    {
        title: 'GitHub',
        description: 'Source code repository and version control platform.',
        category: 'Development & Deployment Stack',
        iconType: 'iconify',
        icon: 'devicon:github',
        url: 'https://github.com/'
    },

    // Other Tools
    {
        title: 'Awesome Table',
        description:
            'Web application utilized during data collection for organizing location data.',
        category: 'Other Tools',
        iconType: 'image',
        icon: '/logo/awesome-table.png',
        url: 'https://awesome-table.com/'
    },
    {
        title: 'Philippines JSON Maps',
        description:
            'GitHub repository providing administrative boundaries in GeoJSON for visualization and context.',
        category: 'Other Tools',
        iconType: 'iconify',
        icon: 'carbon:map',
        url: 'https://github.com/faeldon/philippines-json-maps'
    },

    // Institution
    {
        title: 'Our Lady of Fatima University - Quezon City Campus',
        description:
            'Academic institution providing project support for the capstone.',
        category: 'Institution',
        iconType: 'image',
        icon: '/logo/olfu.png',
        url: 'https://www.fatima.edu.ph/'
    }
];


let categories = [...new Set(resources.flatMap((r) => r.category))];

export { resources, categories };
