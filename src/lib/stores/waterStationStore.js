import { writable } from 'svelte/store';

export const waterStations = writable({
  loading: true,
  data: [],
  error: null
});

// Store for nearest water station
export const nearestWaterStation = writable(null);

// Store for the water station to focus on the map
export const focusedWaterStation = writable(null);