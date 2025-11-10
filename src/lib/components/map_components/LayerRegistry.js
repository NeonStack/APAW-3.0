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
        createLayer: async (L) => L.layerGroup()
    },
    {
        id: 'pagasaSatellite',
        name: 'DOST PAGASA Himawari',
        group: 'Weather',
        exclusive: true,
        createLayer: async (L) => createPagasaSatelliteLayer(L),
        updateInterval: 5000, // 1 hour
        updateLayer: async (layer) => {
            const baseUrl =
                'https://src.meteopilipinas.gov.ph/repo/mtsat-colored/24hour/latest-him-colored-hourly.gif';
            const newUrl = `${baseUrl}?t=${new Date().getTime()}`;
            if (layer && typeof layer.setUrl === 'function') {
                layer.setUrl(newUrl);
                console.log('PAGASA Satellite layer updated.');
            }
        }
    },
    {
        id: 'rainviewer',
        name: 'RainViewer Radar',
        group: 'Weather',
        exclusive: true,
        createLayer: async (L) => {
            try {
                const response = await fetch('https://api.rainviewer.com/public/weather-maps.json');
                const data = await response.json();
                const lastFrame = data.radar.past[data.radar.past.length - 1];
                return L.tileLayer(
                    `${data.host}${lastFrame.path}/256/{z}/{x}/{y}/2/1_1.png`,
                    {
                        attribution: '© RainViewer.com',
                        opacity: 0.6,
                        maxZoom: 10,
                        zIndex: 200
                    }
                );
            } catch (error) {
                console.error('RainViewer error:', error);
                return L.layerGroup();
            }
        },
        updateInterval: 600000, // 10 minutes
        updateLayer: async (layer) => {
            if (!layer || typeof layer.setUrl !== 'function') return;
            try {
                const response = await fetch('https://api.rainviewer.com/public/weather-maps.json');
                const data = await response.json();
                const lastFrame = data.radar.past[data.radar.past.length - 1];
                const newUrl = `${data.host}${lastFrame.path}/256/{z}/{x}/{y}/2/1_1.png`;
                layer.setUrl(newUrl);
                console.log('RainViewer layer updated.');
            } catch (error) {
                console.error('RainViewer update error:', error);
            }
        }
    },
    {
        id: 'wind',
        name: 'Open Weather Wind',
        group: 'Weather',
        exclusive: true,
        createLayer: async (L, apiKey) => {
            const windDirection = L.tileLayer(
                `https://maps.openweathermap.org/maps/2.0/weather/WND/{z}/{x}/{y}?appid=${apiKey}`,
                { attribution: '© OpenWeatherMap', maxZoom: 19, opacity: 0.5 }
            );
            const windSpeed = L.tileLayer(
                `https://maps.openweathermap.org/maps/2.0/weather/WS10/{z}/{x}/{y}?appid=${apiKey}`,
                { attribution: '© OpenWeatherMap', maxZoom: 19, opacity: 0.5 }
            );
            return L.layerGroup([windDirection, windSpeed]);
        },
        updateInterval: 600000, // 10 minutes
        updateLayer: async (layer) => {
            if (layer && typeof layer.eachLayer === 'function') {
                layer.eachLayer((subLayer) => {
                    if (typeof subLayer.redraw === 'function') {
                        subLayer.redraw();
                    }
                });
                console.log('Open Weather Wind layer updated.');
            }
        }
    }
];


// A combined list for easier iteration in map event handlers
export const allOverlayLayers = [...overlayLayers, ...weatherLayers];
