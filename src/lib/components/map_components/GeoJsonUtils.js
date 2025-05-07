import { browser } from '$app/environment';
import { toast } from 'svelte-sonner';

const GEOJSON_CACHE_NAME = 'apaw-geojson-cache-v1';

export async function loadGeoJSON() {
  try {
    const response = await fetch('/provdists-region-1300000000.0.1.json');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error loading GeoJSON:', error);
    return null;
  }
}

export async function getFromCache(requestUrl) {
  if (!browser || !window.caches) return null;
  try {
    const cache = await caches.open(GEOJSON_CACHE_NAME);
    const response = await cache.match(requestUrl);
    if (response) {
      console.log(`Found ${requestUrl} in Cache API`);
      return response.json();
    }
  } catch (error) {
    console.warn(`Error accessing Cache API for ${requestUrl}:`, error);
  }
  return null;
}

export async function addToCache(requestUrl, responseToCache) {
  if (!browser || !window.caches) return;
  try {
    const cache = await caches.open(GEOJSON_CACHE_NAME);
    await cache.put(requestUrl, responseToCache.clone());
    console.log(`Successfully cached ${requestUrl} in Cache API.`);
  } catch (error) {
    console.warn(`Failed to cache ${requestUrl} in Cache API:`, error);
    if (error.name === 'QuotaExceededError') {
      toast.info('Browser cache storage is full. Older items might be removed.');
    }
  }
}

export async function loadAndProcessGeoJson(layerConfig, loadedGeojsonData, isInitialLoad = false) {
  const { id, name, filePath, type, estimatedSizeMB = 0 } = layerConfig;

  // 1. Check in-memory cache
  if (loadedGeojsonData[id]) {
    console.log(`Using in-memory cache for ${name}`);
    return loadedGeojsonData[id];
  }

  // 2. Check Cache API
  if (browser && window.caches) {
    const cachedData = await getFromCache(filePath);
    if (cachedData) {
      loadedGeojsonData[id] = cachedData;
      return cachedData;
    }
  }

  // 3. Confirmation for large hazard layers on user-triggered fetch
  if (type === 'hazard' && estimatedSizeMB > 0 && !isInitialLoad) {
    const userConfirmed = confirm(
      `The "${name}" layer is approximately ${estimatedSizeMB}MB. ` +
      `It will be downloaded and cached in your browser for faster access next time. ` +
      `Do you want to proceed?`
    );
    if (!userConfirmed) {
      throw new Error(`User cancelled download for ${name}.`);
    }
  }

  // 4. Fetch from network
  console.log(`Fetching ${name} data from network: ${filePath}`);
  const response = await fetch(filePath);
  if (!response.ok) {
    throw new Error(`HTTP error fetching ${name}! Status: ${response.status}`);
  }

  const responseForCache = response.clone();
  const geoJsonData = await response.json();

  // 5. Cache in Cache API (and then in memory)
  if (browser && window.caches) {
    await addToCache(filePath, responseForCache);
  }
  loadedGeojsonData[id] = geoJsonData;
  return geoJsonData;
}
