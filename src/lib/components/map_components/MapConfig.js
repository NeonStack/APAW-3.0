export const NEARBY_RADIUS_METERS = 1500;

export const facilityTypes = [
  {
    id: 'fire_station',
    name: 'Fire Station',
    icon: 'mdi:fire-station',
    color: '#FF6347',
    filePath: '/geojson/fire_station.geojson',
    type: 'facility'
  },
  {
    id: 'police_station',
    name: 'Police Station',
    icon: 'mdi:police-station',
    color: '#1E90FF',
    filePath: '/geojson/police_station.geojson',
    type: 'facility'
  },
  {
    id: 'hospitals',
    name: 'Hospitals',
    icon: 'mdi:hospital-building',
    color: '#32CD32',
    filePath: '/geojson/hospitals.geojson',
    type: 'facility'
  },
  {
    id: 'schools',
    name: 'Schools',
    icon: 'mdi:school',
    color: '#FFCC00',
    filePath: '/geojson/schools.geojson',
    type: 'facility'
  }
];

export const floodHazardLayers = [
  {
    id: 'flood_hazard_5yr',
    name: '5-year Flood Hazard',
    filePath: '/geojson/MetroManila_Flood_5year_lite.json',
    type: 'hazard',
    estimatedSizeMB: 15,
    style: function (feature) {
      const varValue = feature.properties.Var;
      let fillColor = 'rgba(128,128,128,0.5)';

      if (varValue === 1.0) {
        fillColor = 'rgba(255, 255, 0, 0.6)';
      } else if (varValue === 2.0) {
        fillColor = 'rgba(255, 165, 0, 0.6)';
      } else if (varValue === 3.0) {
        fillColor = 'rgba(255, 0, 0, 0.6)';
      }
      return {
        fillColor: fillColor,
        weight: 0,
        fillOpacity: 0.6
      };
    }
  }
];

export const allLayerConfigs = [...facilityTypes, ...floodHazardLayers];

export const baseMaps = {
  standard: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  topographic: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  osmHot: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
  positron: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  darkMatter: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  esriStreet: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'
};
