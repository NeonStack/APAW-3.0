import { writable } from 'svelte/store';

export const weatherData = writable({
  loading: true,
  data: [],
  error: null
});

export async function fetchWeatherData() {
  weatherData.update((store) => ({ ...store, loading: true, error: null }));
  try {
    const antiCacheToken = Date.now() + Math.random().toString(36).substring(2, 15);
    const response = await fetch(`/api/get-weather?_=${antiCacheToken}`);
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