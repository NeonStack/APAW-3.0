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
