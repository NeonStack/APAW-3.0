<script>
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { selectedLocation } from '$lib/stores/locationStore.js';
  import { waterStations } from '$lib/stores/waterStationStore.js';
  import { get } from 'svelte/store';
  import Icon from '@iconify/svelte'; // Correct Iconify import

  let mapContainer;
  let map;
  let geojsonLayer;
  let marker = null; // For clicked location
  let waterStationMarkers = []; // Array for water station markers
  let L;
  let waterStationSubscription; // To hold the store subscription

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

    L = await import('leaflet');

    // Create a function to generate a div icon with Iconify
    const createWaterIcon = () => {
      // Create a container div and render the Iconify icon into it
      const iconContainer = document.createElement('div');
      iconContainer.className = 'water-station-icon';
      
      // Enhanced SVG with glow effect and brighter colors
      const svgIcon = `<svg width="30" height="30" viewBox="0 0 24 24">
        <defs>
          <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feFlood flood-color="#ffffff" result="glow" />
            <feComposite in="glow" in2="blur" operator="in" result="glowBlur" />
            <feComposite in="SourceGraphic" in2="glowBlur" operator="over" />
          </filter>
        </defs>
        <circle cx="12" cy="14" r="9" fill="#0055aa" opacity="0.3" />
        <path d="M12 20a6 6 0 0 1-6-6c0-4 6-10.75 6-10.75S18 10 18 14a6 6 0 0 1-6 6Z" 
              fill="#00b3ff" 
              stroke="#ffffff" 
              stroke-width="1"
              filter="url(#glow)" />
      </svg>`;
      
      iconContainer.innerHTML = svgIcon;
      
      return L.divIcon({
        html: iconContainer,
        className: 'water-station-marker',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
      });
    };

    const waterIcon = createWaterIcon();

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

    standard.addTo(map);

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
          color: 'blue',
          weight: 2,
          opacity: 0.6,
          fillOpacity: 0
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

    // Subscribe to water station data
    waterStationSubscription = waterStations.subscribe(value => {
      if (!map || !L) return;

      // Clear existing water station markers
      waterStationMarkers.forEach(m => map.removeLayer(m));
      waterStationMarkers = [];

      if (!value.loading && value.data && value.data.length > 0) {
        value.data.forEach((station, index) => {
          if (station.lat && station.lon) {
            try {
              const lat = typeof station.lat === 'string' ? parseFloat(station.lat) : station.lat;
              const lon = typeof station.lon === 'string' ? parseFloat(station.lon) : station.lon;
              
              if (!isNaN(lat) && !isNaN(lon)) {
                const stationIcon = createWaterIcon();
                
                const stationMarker = L.marker([lat, lon], { 
                  icon: stationIcon,
                  zIndexOffset: 1000 // Ensure water markers appear above other elements
                })
                .addTo(map)
                .bindPopup(`<b>${station.obsnm || 'Station ' + index}</b><br>Water Level: ${station.wl || 'N/A'} m`);
                
                waterStationMarkers.push(stationMarker);
              }
            } catch (err) {}
          }
        });
        
        // Fit map to show all markers
        if (waterStationMarkers.length > 0) {
          const group = L.featureGroup(waterStationMarkers);
          
          setTimeout(() => {
            map.fitBounds(group.getBounds(), { 
              padding: [50, 50],
              maxZoom: 12,
              animate: true 
            });
          }, 100);
        }
      }
    });

    // Initial fetch check (in case data is already loaded by sidebar)
    const currentStations = get(waterStations);
    if (!currentStations.loading && currentStations.data && currentStations.data.length > 0) {
        // Manually trigger plotting if data is already there
        waterStations.set(currentStations);
    }

    return () => {
      map.off('click');
      if (waterStationSubscription) {
        waterStationSubscription(); // Unsubscribe from store
      }
      // Clear markers on component destroy
      waterStationMarkers.forEach(m => map.removeLayer(m));
      if (marker) map.removeLayer(marker);
      map.remove();
    };
  });

  // Ensure onDestroy runs even if onMount fails or browser is false
  onDestroy(() => {
      if (waterStationSubscription) {
        waterStationSubscription();
      }
      // Potential cleanup if map was partially initialized
      if (map) {
          try {
              waterStationMarkers.forEach(m => map.removeLayer(m));
              if (marker) map.removeLayer(marker);
              map.remove();
          } catch(e) {
              console.warn("Error during map cleanup:", e);
          }
      }
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

  /* Style for water station popups (optional) */
  :global(.leaflet-popup-content) {
    font-size: 0.8rem;
  }
  :global(.leaflet-popup-content b) {
    color: #0c3143; /* primary-dark */
  }

  /* Enhanced style for water station icons */
  :global(.water-station-marker) {
    background: transparent;
    border: none;
  }
  
  :global(.water-station-icon) {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    transform-origin: center bottom;
    animation: pulse 2s infinite;
  }

  /* Add pulsing animation to make icons more noticeable */
  @keyframes pulse {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.1);
    }
    100% {
      transform: scale(1);
    }
  }
</style>
