<script>
  import Icon from '@iconify/svelte';
  
  // Weather data could be loaded from a store or API in the future
  const weatherData = {
    current: {
      temperature: 28,
      condition: 'Partly Cloudy',
      icon: 'mdi:weather-partly-cloudy',
      humidity: 75,
      precipitation: 30,
      wind: 12
    },
    forecast: [
      { day: 'Today', high: 28, low: 24, icon: 'mdi:weather-partly-cloudy' },
      { day: 'Tomorrow', high: 29, low: 24, icon: 'mdi:weather-cloudy' },
      { day: 'Day after', high: 27, low: 23, icon: 'mdi:weather-rainy' }
    ]
  };
</script>

<div class="weather-tab">
  <h2 class="text-xl font-semibold text-[#0c3143] mb-3">Weather Conditions</h2>
  <p class="text-gray-700 mb-4">
    Current and forecasted weather data for Metro Manila.
  </p>
  
  <!-- Current weather -->
  <div class="bg-gray-50 p-4 rounded-md mb-4">
    <div class="flex justify-between items-center">
      <div>
        <p class="text-sm text-gray-500">Current Conditions</p>
        <p class="text-2xl font-bold">{weatherData.current.temperature}°C</p>
        <p class="text-gray-700">{weatherData.current.condition}</p>
      </div>
      <div>
        <div class="w-12 h-12 bg-[#3ba6d0] rounded-full flex items-center justify-center text-white">
          <Icon icon={weatherData.current.icon} class="text-2xl" />
        </div>
      </div>
    </div>
  </div>
  
  <!-- Weather metrics -->
  <div class="grid grid-cols-3 gap-2 mb-4">
    <div class="bg-gray-50 p-2 rounded text-center">
      <p class="text-xs text-gray-500">Humidity</p>
      <p class="font-semibold">{weatherData.current.humidity}%</p>
    </div>
    <div class="bg-gray-50 p-2 rounded text-center">
      <p class="text-xs text-gray-500">Precipitation</p>
      <p class="font-semibold">{weatherData.current.precipitation}%</p>
    </div>
    <div class="bg-gray-50 p-2 rounded text-center">
      <p class="text-xs text-gray-500">Wind</p>
      <p class="font-semibold">{weatherData.current.wind} km/h</p>
    </div>
  </div>
  
  <!-- Forecast -->
  <h3 class="font-medium text-[#0c3143] mb-2">Forecast</h3>
  <div class="space-y-2">
    {#each weatherData.forecast as day}
      <div class="flex justify-between items-center bg-gray-50 p-2 rounded">
        <span class="text-gray-700">{day.day}</span>
        <div class="flex items-center">
          <Icon icon={day.icon} class="mr-2 text-xl text-[#3ba6d0]" />
          <span class="text-sm font-medium">{day.high}°C / {day.low}°C</span>
        </div>
      </div>
    {/each}
  </div>
</div>
