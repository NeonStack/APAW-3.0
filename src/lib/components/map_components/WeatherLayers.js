/**
 * Weather layer configuration and creation functions
 */

let weatherLayerGroups = {};

export function setupWeatherLayers(map, L, apiKey) {
  if (!map || !L || !apiKey) {
    console.error('Cannot setup weather layers: missing required parameters');
    return {};
  }

  // Create an empty layer group for the "None" option
  const none = L.layerGroup();
  
  // Precipitation layer
  const precipitation = L.tileLayer(
    `https://maps.openweathermap.org/maps/2.0/weather/PR0/{z}/{x}/{y}?appid=${apiKey}`,
    {
      attribution: '© OpenWeatherMap',
      maxZoom: 19,
      opacity: 0.5
    }
  );

  // Temperature layer
  const temperature = L.tileLayer(
    `https://maps.openweathermap.org/maps/2.0/weather/TA2/{z}/{x}/{y}?appid=${apiKey}`,
    {
      attribution: '© OpenWeatherMap',
      maxZoom: 19,
      opacity: 0.5
    }
  );

  // Wind direction layer
  const windDirection = L.tileLayer(
    `https://maps.openweathermap.org/maps/2.0/weather/WND/{z}/{x}/{y}?appid=${apiKey}`,
    {
      attribution: '© OpenWeatherMap',
      maxZoom: 19,
      opacity: 0.5
    }
  );

  // Wind speed layer
  const windSpeed = L.tileLayer(
    `https://maps.openweathermap.org/maps/2.0/weather/WS10/{z}/{x}/{y}?appid=${apiKey}`,
    {
      attribution: '© OpenWeatherMap',
      maxZoom: 19,
      opacity: 0.5
    }
  );

  // Group the wind layers for stacking
  const windGroup = L.layerGroup([windDirection, windSpeed]);

  // Clouds layer
  const clouds = L.tileLayer(
    `https://maps.openweathermap.org/maps/2.0/weather/CL/{z}/{x}/{y}?appid=${apiKey}&palette=0:0000FF00;10:1E90FF19;20:4169E126;30:0000CD33;40:00008B4C;50:00008066;60:1919708C;70:0000FFBF;80:0000FFCC;90:0000FFD8;100:0000FFFF;200:0000FFFF`,
    {
      attribution: '© OpenWeatherMap',
      maxZoom: 19,
      opacity: 0.5
    }
  );

  // Pressure layer
  const pressure = L.tileLayer(
    `https://maps.openweathermap.org/maps/2.0/weather/APM/{z}/{x}/{y}?appid=${apiKey}`,
    {
      attribution: '© OpenWeatherMap',
      maxZoom: 19,
      opacity: 0.5
    }
  );

  // Humidity layer
  const humidity = L.tileLayer(
    `https://maps.openweathermap.org/maps/2.0/weather/HRD0/{z}/{x}/{y}?appid=${apiKey}`,
    {
      attribution: '© OpenWeatherMap',
      maxZoom: 19,
      opacity: 0.5
    }
  );

  // Store all layers in an object
  weatherLayerGroups = {
    none,
    precipitation,
    temperature,
    windGroup,
    clouds,
    pressure,
    humidity
  };
  
  // Add the "None" layer to the map by default
  none.addTo(map);
  
  return weatherLayerGroups;
}

// This function adds weather layers to a standard Leaflet control
export function addWeatherLayersToControl(layerControl) {
  if (!layerControl || !weatherLayerGroups) return;
  
  layerControl.addOverlay(weatherLayerGroups.none, 'None', 'Weather');
  layerControl.addOverlay(weatherLayerGroups.precipitation, 'Precipitation', 'Weather');
  layerControl.addOverlay(weatherLayerGroups.temperature, 'Temperature', 'Weather');
  layerControl.addOverlay(weatherLayerGroups.windGroup, 'Wind', 'Weather');
  layerControl.addOverlay(weatherLayerGroups.clouds, 'Clouds', 'Weather');
  layerControl.addOverlay(weatherLayerGroups.pressure, 'Pressure', 'Weather');
  layerControl.addOverlay(weatherLayerGroups.humidity, 'Humidity', 'Weather');
  
  if (layerName !== 'Clouds' && map.hasLayer(weatherLayerGroups.clouds)) {
    map.removeLayer(weatherLayerGroups.clouds);
  }
  if (layerName !== 'Pressure' && map.hasLayer(weatherLayerGroups.pressure)) {
    map.removeLayer(weatherLayerGroups.pressure);
  }
  if (layerName !== 'Humidity' && map.hasLayer(weatherLayerGroups.humidity)) {
    map.removeLayer(weatherLayerGroups.humidity);
  }
}