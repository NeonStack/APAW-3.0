import { writable } from 'svelte/store';

export const weatherData = writable({
  loading: true,
  data: [],
  error: null
});

export async function fetchWeatherData() {
  weatherData.update((store) => ({ ...store, loading: true, error: null }));
  try {
    const response = await fetch('/api/get-weather');
    if (!response.ok) {
      throw new Error(`Error fetching data: ${response.status}`);
    }
    const data = await response.json();
    weatherData.set({ loading: false, data: data, error: null });
  } catch (error) {
    console.error('Failed to load weather data:', error);
    weatherData.set({ loading: false, data: [], error: 'Unable to load weather data' });
  }
}

export async function fetchLocationForecast(location) {
  try {
    const response = await fetch(`/api/get-weather?location=${encodeURIComponent(location)}`);
    if (!response.ok) {
      throw new Error(`Error fetching data: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Failed to load forecast for ${location}:`, error);
    throw error;
  }
}