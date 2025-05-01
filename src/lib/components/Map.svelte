<script>
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { selectedLocation, getLocationName, getCurrentPosition } from '$lib/stores/locationStore.js';
  import { waterStations } from '$lib/stores/waterStationStore.js';
  import { get } from 'svelte/store';
  import Icon from '@iconify/svelte';
  import MapSearchBar from './MapSearchBar.svelte';

  let mapContainer;
  let map;
  let geojsonLayer;
  let marker = null; // For clicked location
  let waterStationMarkers = []; // Array for water station markers
  let L;
  let waterStationSubscription; // To hold the store subscription
  let searchControl;

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

  // Function to set a location with all needed details
  async function setSelectedLocation(lat, lng, locationName = null) {
    // Remove previous marker if it exists
    if (marker && map) {
      map.removeLayer(marker);
    }

    // Add new marker
    if (map && L) {
      marker = L.marker([lat, lng]).addTo(map);
      
      // Center map to marker
      map.panTo([lat, lng]);
    }

    // Format coordinates
    const currentLat = parseFloat(lat).toFixed(6);
    const currentLng = parseFloat(lng).toFixed(6);

    // Fetch elevation via local API
    const elevationResult = await fetchElevation(currentLat, currentLng);

    // Get location name if not provided
    if (!locationName) {
      locationName = await getLocationName(currentLat, currentLng);
    }

    // Update the store based on the result
    if (typeof elevationResult === 'number') {
      selectedLocation.set({ 
        lat: currentLat, 
        lng: currentLng, 
        elevation: elevationResult.toFixed(2), 
        error: null, 
        locationName
      });
    } else {
      // Handle error case where fetchElevation returned an object like { error: 'message' }
      selectedLocation.set({ 
        lat: currentLat, 
        lng: currentLng, 
        elevation: 'N/A', 
        error: elevationResult.error, 
        locationName
      });
    }
  }

  async function handleLocateUser() {
    try {
      const position = await getCurrentPosition();
      const locationName = await getLocationName(position.lat, position.lng);
      setSelectedLocation(position.lat, position.lng, locationName || 'Current Location');
    } catch (error) {
      console.error('Error getting current position:', error);
      alert(`Could not get your location: ${error.message}`);
    }
  }

  // Handle a location selection from search
  function handleSearchLocation(event) {
    const { lat, lng, name } = event.detail;
    setSelectedLocation(lat, lng, name);
  }

  onMount(async () => {
    if (!browser) return;

    L = await import('leaflet');

    // Function to determine alert level and get appropriate color
    const getStationAlertInfo = (station) => {
      // Default to normal if we can't determine status
      let status = 'normal';
      let color = '#ffffff'; // White for normal
      
      // Parse water level and threshold values as numbers
      const currentWL = parseFloat(station.wl);
      const alertWL = parseFloat(station.alertwl);
      const alarmWL = parseFloat(station.alarmwl);
      const criticalWL = parseFloat(station.criticalwl);
      
      // Only proceed if we have a valid current water level
      if (!isNaN(currentWL)) {
        if (!isNaN(criticalWL) && currentWL >= criticalWL) {
          status = 'critical';
          color = '#ff0000'; // Red for critical
        } 
        else if (!isNaN(alarmWL) && currentWL >= alarmWL) {
          status = 'alarm';
          color = '#ff8800'; // Orange for alarm
        } 
        else if (!isNaN(alertWL) && currentWL >= alertWL) {
          status = 'alert';
          color = '#ffcc00'; // Yellow for alert
        }
      }
      
      return { status, color };
    };

    // Create a function to generate a div icon with Iconify
    const createWaterIcon = (alertStatus = 'normal') => {
      let color;
      
      // Set color based on alert status
      switch(alertStatus) {
        case 'critical':
          color = '#ff0000'; // Red
          break;
        case 'alarm':
          color = '#ff8800'; // Orange
          break;
        case 'alert':
          color = '#ffcc00'; // Yellow
          break;
        default:
          color = '#ffffff'; // White for normal
      }
      
      // Create a container div and render the Iconify icon into it
      const iconContainer = document.createElement('div');
      iconContainer.className = 'water-station-icon';
      iconContainer.dataset.status = alertStatus;
      
      // Enhanced SVG with glow effect and color based on alert level
      const svgIcon = `<svg width="30" height="30" viewBox="0 0 24 24">
        <defs>
          <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feFlood flood-color="${color}" result="glow" />
            <feComposite in="glow" in2="blur" operator="in" result="glowBlur" />
            <feComposite in="SourceGraphic" in2="glowBlur" operator="over" />
          </filter>
        </defs>
        <circle cx="12" cy="14" r="9" fill="#0055aa" opacity="0.3" />
        <path d="M12 20a6 6 0 0 1-6-6c0-4 6-10.75 6-10.75S18 10 18 14a6 6 0 0 1-6 6Z" 
              fill="#00b3ff" 
              stroke="${color}" 
              stroke-width="1.5"
              filter="url(#glow)" />
      </svg>`;
      
      iconContainer.innerHTML = svgIcon;
      
      return L.divIcon({
        html: iconContainer,
        className: `water-station-marker status-${alertStatus}`,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
      });
    };

    const waterIcon = createWaterIcon();

    map = L.map(mapContainer, {
      zoomControl: false // Disable default zoom control to reposition it
    }).setView([14.5995, 120.9842], 11);

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

    // Add zoom control to bottom left
    L.control.zoom({
      position: 'bottomleft'
    }).addTo(map);

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
      setSelectedLocation(lat, lng);
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
                // Determine alert status
                const { status, color } = getStationAlertInfo(station);
                
                // Create icon based on alert status
                const stationIcon = createWaterIcon(status);
                
                // Enhanced popup with alert level information
                let popupContent = `
                  <b>${station.obsnm || 'Station ' + index}</b><br>
                  Water Level: ${station.wl || 'N/A'} m`;
                
                // Add alert level thresholds if available
                if (station.alertwl) popupContent += `<br><span class="alert-threshold">Alert: ${station.alertwl} m</span>`;
                if (station.alarmwl) popupContent += `<br><span class="alarm-threshold">Alarm: ${station.alarmwl} m</span>`;
                if (station.criticalwl) popupContent += `<br><span class="critical-threshold">Critical: ${station.criticalwl} m</span>`;
                
                // Add current status
                popupContent += `<br><span class="status status-${status}">Status: ${status.toUpperCase()}</span>`;
                
                const stationMarker = L.marker([lat, lon], { 
                  icon: stationIcon,
                  zIndexOffset: status === 'normal' ? 1000 : (status === 'alert' ? 2000 : (status === 'alarm' ? 3000 : 4000))
                })
                .addTo(map)
                .bindPopup(popupContent);
                
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
      if (marker) map.removeLayer(marker); // Fixed: was map.removeLayer(m)
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
  
  <!-- Add the search bar component directly in the template -->
  <div class="search-overlay">
    <MapSearchBar on:selectLocation={handleSearchLocation} />
  </div>
</div>

<style>
  .map-container {
    min-height: 300px;
    position: relative;
  }

  /* Add styles for the search overlay */
  .search-overlay {
    position: absolute;
    top: 10px;
    left: 10px; /* Changed from 50px to 10px to move closer to side */
    z-index: 1000; /* High z-index to stay above map */
    width: 280px;
  }

  /* For mobile responsiveness */
  @media (max-width: 640px) {
    .search-overlay {
      width: calc(100% - 20px); /* Updated to match new left position */
      left: 10px; /* Changed from 40px to 10px */
    }
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

  /* Different pulsing animations based on alert status */
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }

  @keyframes fastPulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.15); }
    100% { transform: scale(1); }
  }

  /* Status-specific styles */
  :global(.water-station-icon[data-status="alert"]) {
    animation: pulse 1.5s infinite;
  }
  
  :global(.water-station-icon[data-status="alarm"]) {
    animation: fastPulse 1.2s infinite;
  }
  
  :global(.water-station-icon[data-status="critical"]) {
    animation: fastPulse 0.8s infinite;
  }

  /* Popup styles */
  :global(.leaflet-popup-content .alert-threshold) {
    color: #ffcc00;
    font-weight: 500;
  }
  
  :global(.leaflet-popup-content .alarm-threshold) {
    color: #ff8800;
    font-weight: 500;
  }
  
  :global(.leaflet-popup-content .critical-threshold) {
    color: #ff0000;
    font-weight: 500;
  }
  
  :global(.leaflet-popup-content .status) {
    margin-top: 5px;
    display: inline-block;
    padding: 2px 5px;
    border-radius: 3px;
    font-weight: 600;
  }
  
  :global(.leaflet-popup-content .status-normal) {
    background-color: rgba(255, 255, 255, 0.3);
    color: #0c3143;
  }
  
  :global(.leaflet-popup-content .status-alert) {
    background-color: rgba(255, 204, 0, 0.2);
    color: #9b7d00;
  }
  
  :global(.leaflet-popup-content .status-alarm) {
    background-color: rgba(255, 136, 0, 0.2);
    color: #964f00;
  }
  
  :global(.leaflet-popup-content .status-critical) {
    background-color: rgba(255, 0, 0, 0.2);
    color: #a30000;
  }

  /* Custom styles for search control */
  :global(.leaflet-search-control) {
    background: transparent !important;
    box-shadow: none !important;
    margin: 10px 10px 0 10px !important;
    padding: 0 !important;
    border: none !important;
  }

  /* Make search control responsive on small screens */
  @media (max-width: 640px) {
    :global(.leaflet-search-control) {
      width: calc(100% - 80px) !important;
      margin: 10px 10px 0 10px !important;
    }
  }
</style>