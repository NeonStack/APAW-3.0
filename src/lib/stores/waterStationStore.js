import { writable } from 'svelte/store';

export const waterStations = writable({
  loading: true,
  data: [],
  error: null
});

// Store for nearest water station
export const nearestWaterStation = writable(null);