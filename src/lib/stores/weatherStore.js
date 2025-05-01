import { writable } from 'svelte/store';

// Create a store for weather data with initial loading state
export const weatherData = writable({
  loading: false,
  data: [],
  error: null,
  lastUpdated: null
});

// Create a store for selected city (to show detailed forecast)
export const selectedCity = writable(null);

// Add city coordinates data for distance calculations
export const metroManilaCities = [
  { id: "264885", name: "Manila", lat: 14.5958, lon: 120.9772 },
  { id: "768148", name: "Mandaluyong", lat: 14.5798, lon: 121.0326 },
  { id: "264874", name: "Marikina", lat: 14.6404, lon: 121.1063 },
  { id: "264876", name: "Pasig", lat: 14.5764, lon: 121.0813 },
  { id: "264873", name: "Quezon City", lat: 14.6760, lon: 121.0437 },
  { id: "264882", name: "San Juan", lat: 14.6017, lon: 121.0245 },
  { id: "264875", name: "Caloocan", lat: 14.7500, lon: 120.9797 },
  { id: "761333", name: "Malabon", lat: 14.7700, lon: 120.9370 },
  { id: "765956", name: "Navotas", lat: 14.7470, lon: 120.9170 },
  { id: "3424474", name: "Valenzuela", lat: 14.7011, lon: 120.9847 },
  { id: "264877", name: "Las Piñas", lat: 14.4497, lon: 120.9833 },
  { id: "21-264878_1_al", name: "Makati", lat: 14.5547, lon: 121.0244 },
  { id: "264879", name: "Muntinlupa", lat: 14.3600, lon: 121.0420 },
  { id: "3424484", name: "Parañaque", lat: 14.4889, lon: 121.0142 },
  { id: "2-264881_1_al", name: "Pasay", lat: 14.5350, lon: 121.0030 },
  { id: "764136", name: "Pateros", lat: 14.5560, lon: 121.0720 },
  { id: "759349", name: "Taguig", lat: 14.5167, lon: 121.0500 }
];

// Store for nearest weather location
export const nearestWeatherCity = writable(null);
