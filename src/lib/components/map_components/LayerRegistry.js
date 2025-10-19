/**
 * Central registry for all map layers.
 * This file consolidates layer configurations from various files
 * to simplify maintenance and management.
 */

// --- Helper function (moved from WeatherLayers.js) ---
function createPagasaSatelliteLayer(L) {
	const northEast = L.latLng(29.0, 147.0);
	const southWest = L.latLng(-1.0, 104.0);
	const bounds = L.latLngBounds(southWest, northEast);
	const satelliteUrl =
		'https://src.meteopilipinas.gov.ph/repo/mtsat-colored/24hour/latest-him-colored-hourly.gif';
	return L.imageOverlay(satelliteUrl, bounds, {
		opacity: 0.5,
		interactive: false,
		attribution: '© PAGASA',
		className: 'pagasa-satellite-layer',
		zIndex: 250
	});
}

// --- Base Layer Definitions ---
export const baseLayers = [
	{
		id: 'standard',
		name: 'Standard',
		createLayer: (L) =>
			L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution: '© OpenStreetMap contributors',
				maxZoom: 19
			})
	},
	{
		id: 'satellite',
		name: 'Satellite',
		createLayer: (L) =>
			L.tileLayer(
				'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
				{
					attribution: 'Imagery © Esri',
					maxZoom: 19
				}
			)
	},
	{
		id: 'topographic',
		name: 'Topographic',
		createLayer: (L) =>
			L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
				attribution: 'Map data © OpenTopoMap contributors',
				maxZoom: 19
			})
	},
	{
		id: 'osmHot',
		name: 'Humanitarian',
		createLayer: (L) =>
			L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
				attribution:
					'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">Humanitarian OpenStreetMap Team</a> hosted by <a href="https://openstreetmap.fr/" target="_blank">OpenStreetMap France</a>',
				maxZoom: 19
			})
	},
	{
		id: 'positron',
		name: 'Positron (Light)',
		createLayer: (L) =>
			L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
				attribution:
					'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
				subdomains: 'abcd',
				maxZoom: 20
			})
	},
	{
		id: 'darkMatter',
		name: 'Dark Matter',
		createLayer: (L) =>
			L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
				attribution:
					'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
				subdomains: 'abcd',
				maxZoom: 20
			})
	},
	{
		id: 'esriStreet',
		name: 'Esri Street',
		createLayer: (L) =>
			L.tileLayer(
				'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
				{
					attribution: 'Tiles &copy; Esri',
					maxZoom: 19
				}
			)
	},
	{
		id: 'esriTopo',
		name: 'Topographic (Esri)',
		createLayer: (L) =>
			L.tileLayer(
				'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
				{
					attribution: '© Esri, DeLorme, NAVTEQ',
					maxZoom: 19
				}
			)
	}
];

// --- Overlay Layer Definitions ---
export const overlayLayers = [
	{
		id: 'facilities',
		name: 'Nearby Facilities',
		group: 'Facilities',
		type: 'facility',
		filePath: '/geojson/facilities.geojson'
	},
	{
		id: 'tropical_cyclone',
		name: 'Tropical Cyclone Tracker',
		group: 'Weather Hazards',
		type: 'dynamic'
	},
	{
		id: 'flood_hazard_5yr',
		name: '5-year Flood Hazard',
		group: 'Flood Hazards',
		type: 'hazard',
		filePath: '/geojson/MetroManila_Flood_5year_lite.json',
		estimatedSizeMB: 15,
		style: (feature) => {
			const varValue = feature.properties.Var;
			let fillColor = 'rgba(128,128,128,0.5)';
			if (varValue === 1.0) fillColor = 'rgba(255, 255, 0, 0.6)';
			else if (varValue === 2.0) fillColor = 'rgba(255, 165, 0, 0.6)';
			else if (varValue === 3.0) fillColor = 'rgba(255, 0, 0, 0.6)';
			return { fillColor, weight: 0, fillOpacity: 0.6 };
		}
	}
];

// --- Weather Layer Definitions ---
export const weatherLayers = [
	{
		id: 'none',
		name: 'None',
		group: 'Weather',
		exclusive: true,
		createLayer: (L) => L.layerGroup()
	},
	{
		id: 'pagasaSatellite',
		name: 'Himawari',
		group: 'Weather',
		exclusive: true,
		createLayer: (L) => createPagasaSatelliteLayer(L)
	},
	{
		id: 'wind',
		name: 'Wind',
		group: 'Weather',
		exclusive: true,
		createLayer: (L, apiKey) => {
			const windDirection = L.tileLayer(
				`https://maps.openweathermap.org/maps/2.0/weather/WND/{z}/{x}/{y}?appid=${apiKey}`,
				{ attribution: '© OpenWeatherMap', maxZoom: 19, opacity: 0.5 }
			);
			const windSpeed = L.tileLayer(
				`https://maps.openweathermap.org/maps/2.0/weather/WS10/{z}/{x}/{y}?appid=${apiKey}`,
				{ attribution: '© OpenWeatherMap', maxZoom: 19, opacity: 0.5 }
			);
			return L.layerGroup([windDirection, windSpeed]);
		}
	}
];

// A combined list for easier iteration in map event handlers
export const allOverlayLayers = [...overlayLayers, ...weatherLayers];
