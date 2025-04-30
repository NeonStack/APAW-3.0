<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { selectedLocation } from '$lib/stores/locationStore.js'; // Import the store

  let mapContainer;
  let map;
  let geojsonLayer;
  let marker = null; // Variable to hold the marker instance
  let L; // Make L accessible in the script scope

  export let height = '100%';

  async function loadGeoJSON() {
    try {
      const response = await fetch('/provdists-region-1300000000.0.1.json');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error loading GeoJSON:', error);
      return null;
    }
  }

  // Function to fetch elevation data via local API endpoint
  async function fetchElevation(lat, lng) {
    try {
      const response = await fetch(`/api/elevation?lat=${lat}&lng=${lng}`); // Call local endpoint
      const data = await response.json(); // Always parse JSON first

      if (!response.ok) {
        // Use error message from server if available, otherwise provide a default
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      if (data.elevation !== undefined) {
        return data.elevation;
      } else {
        // This case might occur if the server sends a 200 OK but no elevation (shouldn't happen with current server logic)
        throw new Error('Elevation data missing in server response.');
      }
    } catch (error) {
      console.error('Error fetching elevation via local API:', error);
      // Pass the error message along to be displayed
      return { error: error.message || 'Failed to fetch elevation' };
    }
  }

  onMount(async () => {
    if (!browser) return;

    // Dynamically import Leaflet
    L = await import('leaflet'); // Assign to the script-scoped L
    
    // Create map centered on Metro Manila
    map = L.map(mapContainer).setView([14.5995, 120.9842], 11);
    
    // Define base layers
    const standard = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    });
    
    const topographic = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      attribution: 'Map data © OpenTopoMap contributors',
      maxZoom: 19
    });
    
    const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Imagery © Esri',
      maxZoom: 19
    });

    // Add standard OSM as default layer
    standard.addTo(map);
    
    // Add layer control
    const baseLayers = {
      "Standard": standard,
      "Topographic": topographic,
      "Satellite": satellite
    };
    
    L.control.layers(baseLayers).addTo(map);

    // Load and add GeoJSON for Metro Manila
    const geojsonData = await loadGeoJSON();
    if (geojsonData) {
      geojsonLayer = L.geoJSON(geojsonData, {
        style: {
          color: '#3ba6d0', // primary-light
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0 // Changed from 0.2 to 0 to remove the shading
        }
      }).addTo(map);
      
      // Fit map to GeoJSON bounds
      map.fitBounds(geojsonLayer.getBounds());
    }

    // Add map click listener
    map.on('click', async (e) => {
      const { lat, lng } = e.latlng;
      const currentLat = lat.toFixed(6);
      const currentLng = lng.toFixed(6);

      // Remove previous marker if it exists
      if (marker) {
        map.removeLayer(marker);
      }

      // Add new marker
      marker = L.marker([lat, lng]).addTo(map);

      // Fetch elevation via local API
      const elevationResult = await fetchElevation(currentLat, currentLng);

      // Update the store based on the result
      if (typeof elevationResult === 'number') {
        selectedLocation.set({ lat: currentLat, lng: currentLng, elevation: elevationResult.toFixed(2), error: null });
      } else {
        // Handle error case where fetchElevation returned an object like { error: 'message' }
        selectedLocation.set({ lat: currentLat, lng: currentLng, elevation: 'N/A', error: elevationResult.error });
      }
    });
    
    return () => {
      map.off('click'); // Clean up click listener
      map.remove();
    };
  });
</script>

<svelte:head>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.3/dist/leaflet.css" />
</svelte:head>

<div bind:this={mapContainer} style="height: {height}; width: 100%;" class="map-container z-10">
  <!-- Map will render here -->
</div>

<style>
  .map-container {
    min-height: 300px;
    position: relative;
  }

  /* Ensure map controls stay below navbar */
  :global(.leaflet-control-container) {
    z-index: 40 !important;
  }
</style>
