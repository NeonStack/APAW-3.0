# APAW - Advanced Predictive Analysis of Water-related Flood Risk

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://apawph.vercel.app/)

APAW is an innovative flood prediction platform that uses machine learning to predict flood risks in Metro Manila, Philippines. The system provides hourly flood forecasts up to 5 days in advance, enabling proactive community preparation.

## 🌊 Features

### Core Functionality
- **5-Day Hourly Flood Forecasts** - Machine learning-based predictions for any location in Metro Manila
- **Interactive Map Interface** - Click anywhere on the map to get location-specific flood predictions
- **Flood Probability & Depth Prediction** - Dual-model approach using Random Forest (classification) and LSTM (regression)
- **Real-time Weather Integration** - Live weather data display for selected locations

### Data Sources & Alerts
- **Tropical Cyclone Tracker** - Real-time tracking of active tropical cyclones from PAGASA
- **General Flood Advisory** - Live flood advisories from PAGASA CAP feeds
- **Water Station Monitoring** - Real-time water level data from PAGASA monitoring stations
- **Flood Hazard Maps** - 5-year flood hazard overlay from official government data

### Map Layers
- **Multiple Basemaps** - OpenStreetMap, Satellite, CartoDB Positron/Dark Matter, ESRI imagery
- **Facilities Layer** - Emergency facilities, hospitals, evacuation centers
- **Waterways Layer** - Rivers, streams, and water bodies
- **Administrative Boundaries** - NCR city/municipality boundaries

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| [SvelteKit](https://kit.svelte.dev/) | Full-stack web framework |
| [Svelte 5](https://svelte.dev/) | UI component framework with runes |
| [Tailwind CSS v4](https://tailwindcss.com/) | Utility-first CSS framework |
| [Leaflet.js](https://leafletjs.com/) | Interactive map library |
| [Iconify/Svelte](https://iconify.design/) | Icon library |
| [Moment.js](https://momentjs.com/) | Date/time formatting |
| [svelte-sonner](https://github.com/wobsoriano/svelte-sonner) | Toast notifications |

### Backend & APIs
| Technology | Purpose |
|------------|---------|
| [Supabase](https://supabase.com/) | PostgreSQL database & backend services |
| [Hugging Face Spaces](https://huggingface.co/spaces) | ML model hosting (Gradio API) |
| [Google Gemini AI](https://deepmind.google/models/gemini/) | PDF parsing for PAGASA cyclone bulletins |
| [Visual Crossing Weather](https://www.visualcrossing.com/) | Weather forecast data |
| [Open-Meteo](https://open-meteo.com/) | Elevation data API |

### Machine Learning Stack (Backend)
| Technology | Purpose |
|------------|---------|
| Random Forest | Flood/no-flood classification (88% accuracy) |
| LSTM Neural Networks | Flood depth regression (8.07cm MAE) |
| TensorFlow/Keras | Deep learning framework |
| Scikit-learn | ML algorithms & evaluation |
| Pandas | Data manipulation |
| NumPy | Numerical computing |
| GeoPandas | Geospatial data processing |
| Shapely | Geometric operations |

### Data Sources
| Source | Data Provided |
|--------|---------------|
| [PAGASA](https://www.pagasa.dost.gov.ph/) | Water levels, cyclone data, flood advisories |
| [Visual Crossing](https://www.visualcrossing.com/) | Weather forecasts |
| [Open-Meteo](https://open-meteo.com/) | Elevation data |
| [OpenStreetMap](https://www.openstreetmap.org/) | Geographic features, waterways |
| [Open Topo Data](https://www.opentopodata.org/) | SRTM30m elevation data |

### Development & Deployment
| Tool | Purpose |
|------|---------|
| [Vercel](https://vercel.com/) | Frontend hosting & serverless functions |
| [GitHub Actions](https://github.com/features/actions) | Automated weather data updates |
| [Vite](https://vitejs.dev/) | Build tool & dev server |
| [Prettier](https://prettier.io/) | Code formatting |
| [Terser](https://terser.org/) | JavaScript minification |

### Geocoding Services
| Service | Purpose |
|---------|---------|
| [Nominatim](https://nominatim.org/) | Address search & geocoding |
| [Photon](https://photon.komoot.io/) | Alternative geocoding API |

## 📁 Project Structure

```
src/
├── app.css                 # Global styles with Tailwind
├── app.html                # HTML template with meta tags
├── hooks.server.js         # Server hooks
├── lib/
│   ├── components/
│   │   ├── Map.svelte              # Main Leaflet map component
│   │   ├── MapSearchBar.svelte     # Location search functionality
│   │   ├── PredictSidebar.svelte   # Sidebar with tabs
│   │   ├── map_components/         # Map utilities & layers
│   │   └── predict-tabs/           # InfoTab, WeatherTab, WaterStationsTab
│   ├── services/
│   │   └── MapService.js           # Map interaction service
│   ├── stores/                     # Svelte stores for state management
│   └── utils/                      # Utility functions
├── routes/
│   ├── +layout.svelte              # App layout with navigation
│   ├── +page.svelte                # Landing page
│   ├── about/                      # About page
│   ├── predict/                    # Main prediction interface
│   ├── resources/                  # Resources & credits page
│   └── api/                        # API endpoints
│       ├── flood-prediction/       # ML model proxy
│       ├── general-flood-advisory/ # PAGASA flood advisory
│       ├── tropical-cyclone-warning/ # TCW alerts
│       ├── tropicalCyclone-tracker/  # Cyclone tracking
│       ├── get-weather/            # Weather data
│       ├── update-weather/         # Automated weather updates
│       └── water-stations/         # Water level data
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd apaw-3.0

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys
```

### Environment Variables

```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key

# Hugging Face
VITE_HF_TOKEN=your_hf_token
APAW_HF_API_KEY=your_api_key

# Google Gemini (for cyclone PDF parsing)
GEMINI_API_KEY=your_gemini_key

# Visual Crossing Weather
VISUAL_CROSSING_API_KEY=your_vc_key

# Automated Jobs
JOB_TRIGGER_SECRET=your_secret
```

### Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Format code
npm run format
```

## 📊 Model Performance

| Metric | Value |
|--------|-------|
| Classification Accuracy | 88% |
| Flood Event Recall | 73% |
| Depth Prediction MAE | 8.07 cm |
| Response Time | 5-15 seconds |

## 🗺️ Coverage Area

The system currently supports flood predictions for **Metro Manila (NCR)**, Philippines, including:
- Manila, Quezon City, Makati, Pasig, Taguig
- Mandaluyong, San Juan, Marikina, Pasay
- Parañaque, Las Piñas, Muntinlupa, Valenzuela
- Caloocan, Malabon, Navotas, Pateros

## 📚 Academic Context

This project was developed as a capstone research project by Bachelor of Science in Information Technology students from **Our Lady of Fatima University - Quezon City Campus**.

## 📄 License

This project is private and developed for academic purposes.

## 🔗 Links

- **Live Demo**: [https://apawph.vercel.app/](https://apawph.vercel.app/)
- **PAGASA**: [https://www.pagasa.dost.gov.ph/](https://www.pagasa.dost.gov.ph/)

---

**APAW** - *Accuracy • Preparedness • Accessibility • Wisdom*