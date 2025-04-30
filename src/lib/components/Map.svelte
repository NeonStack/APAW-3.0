<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  
  let mapContainer;
  let map;
  let geojsonLayer;
  
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

  onMount(async () => {
    if (!browser) return;

    // Dynamically import Leaflet
    const L = await import('leaflet');
    
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
    
    return () => {
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
