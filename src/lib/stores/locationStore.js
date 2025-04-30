import { writable } from 'svelte/store';

export const selectedLocation = writable({
  lat: null,
  lng: null,
  elevation: null,
  error: null
});