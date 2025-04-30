import { writable } from 'svelte/store';

export const waterStations = writable({
  loading: true,
  data: [],
  error: null
});