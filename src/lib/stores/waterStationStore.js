import { writable } from 'svelte/store';

export const waterStations = writable({
  loading: true,
  data: [],
  error: null
});

export async function fetchWaterStations() {
    waterStations.update((store) => ({ ...store, loading: true, error: null }));
    try {
        const antiCacheToken = Date.now() + Math.random().toString(36).substring(2, 15);
        const response = await fetch(`/api/water-stations?_=${antiCacheToken}`);
        if (!response.ok) {
            throw new Error(`Error fetching data: ${response.status}`);
        }
        const data = await response.json();
        waterStations.set({ loading: false, data: data, error: null });
    } catch (error) {
        console.error('Failed to load water station data:', error);
        waterStations.set({ loading: false, data: [], error: 'Unable to load water station data' });
    }
}

// Store for nearest water station
export const nearestWaterStation = writable(null);

// Store for the water station to focus on the map
export const focusedWaterStation = writable(null);