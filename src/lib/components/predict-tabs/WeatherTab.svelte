<script>
    import { weatherData, fetchWeatherData } from '$lib/stores/weatherStore.js';
    import Icon from '@iconify/svelte';
    import moment from 'moment';

    // Define districts
    const districts = {
        '1st District': ['Manila'],
        '2nd District': ['Mandaluyong', 'Marikina', 'Pasig', 'Quezon City', 'San Juan'],
        '3rd District': ['Caloocan (North)', 'Caloocan (South)', 'Malabon', 'Navotas', 'Valenzuela'],
        '4th District': ['Las Piñas', 'Makati', 'Muntinlupa', 'Parañaque', 'Pasay', 'Pateros', 'Taguig']
    };

    // Icon mapping
    const iconMap = {
        snow: 'meteocons:snowflake-fill',
        rain: 'meteocons:extreme-rain-fill',
        fog: 'meteocons:fog-fill',
        wind: 'meteocons:wind-fill',
        cloudy: 'meteocons:cloudy-fill',
        'partly-cloudy-day': 'meteocons:partly-cloudy-day-fill',
        'partly-cloudy-night': 'meteocons:partly-cloudy-night-fill',
        'clear-day': 'meteocons:clear-day-fill',
        'clear-night': 'meteocons:clear-night-fill'
    };

    // Get current Manila time and find closest hour
    function getCurrentHourData(locationData) {
        const now = moment().utcOffset('+08:00'); // Manila time
        const currentHour = now.startOf('hour');
        return (
            locationData.find((item) =>
                moment(item.datetime, 'YYYY-MM-DD HH:mm:ss').isSame(currentHour, 'hour')
            ) || locationData[0]
        );
    }

    // Group data by location
    function groupWeatherData(data) {
        const grouped = {};
        data.forEach((item) => {
            if (!grouped[item.location_name]) grouped[item.location_name] = [];
            grouped[item.location_name].push(item);
        });
        // Sort hours for each location
        Object.keys(grouped).forEach((location) => {
            grouped[location].sort((a, b) =>
                moment(a.datetime, 'YYYY-MM-DD HH:mm:ss').diff(moment(b.datetime, 'YYYY-MM-DD HH:mm:ss'))
            );
        });
        return grouped;
    }

    // Filters
    let districtFilter = $state('1st District'); // Default to 1st District
    let sortOption = $state('location-asc');

    // Derived filtered and sorted data
    let filteredData = $derived(() => {
        if (!$weatherData.data.length) return {};

        let filtered = $weatherData.data;

        // Filter by district
        if (districtFilter !== 'all') {
            const districtLocations = districts[districtFilter];
            filtered = filtered.filter((item) => districtLocations.includes(item.location_name));
        }

        const grouped = groupWeatherData(filtered);

        // Sort locations
        const sortedLocations = Object.keys(grouped).sort((a, b) => {
            const aData = getCurrentHourData(grouped[a]);
            const bData = getCurrentHourData(grouped[b]);
            if (sortOption === 'location-asc') return a.localeCompare(b);
            if (sortOption === 'location-desc') return b.localeCompare(a);
            if (sortOption === 'temp-high') return (bData?.temp_c || 0) - (aData?.temp_c || 0);
            if (sortOption === 'temp-low') return (aData?.temp_c || 0) - (bData?.temp_c || 0);
            if (sortOption === 'precip-high') return (bData?.precipprob || 0) - (aData?.precipprob || 0);
            if (sortOption === 'humidity-high') return (bData?.humidity || 0) - (aData?.humidity || 0);
            if (sortOption === 'wind-high') return (bData?.windspeed_kmh || 0) - (aData?.windspeed_kmh || 0);
            return 0;
        });

        const sortedGrouped = {};
        sortedLocations.forEach((loc) => (sortedGrouped[loc] = grouped[loc]));
        return sortedGrouped;
    });

    // Refresh function
    async function refreshWeather() {
        await fetchWeatherData();
    }

    // Toggle filters
    let showFilters = $state(false);
</script>

<div class="weather-tab space-y-3">
    <!-- Header -->
    <div class="flex items-center space-x-2">
        <div class="rounded-md bg-gradient-to-br from-[#0c3143] to-[#1a4a5a] p-1.5">
            <Icon icon="mdi:weather-partly-cloudy" class="text-white" width="18" />
        </div>
        <h2 class="text-xs font-bold text-[#0c3143] xl:text-lg">Weather</h2>

        <div class="ml-auto flex gap-2">
            <button
                class="flex cursor-pointer items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-900"
                on:click={refreshWeather}
            >
                <Icon icon="mdi:refresh" width="12" />
                Refresh
            </button>

            <button
                class="flex cursor-pointer items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-900"
                on:click={() => (showFilters = !showFilters)}
            >
                <Icon icon={showFilters ? 'mdi:filter-off' : 'mdi:filter'} width="12" />
                {showFilters ? 'Hide' : 'Filters'}
            </button>

            <a
                href="https://www.visualcrossing.com"
                target="_blank"
                rel="noopener noreferrer"
                class="flex cursor-pointer items-center rounded bg-gray-100 px-2 py-1 transition-colors hover:bg-gray-200"
                title="Weather data provided by Visual Crossing"
            >
                <img 
                    src="/logo/powered-visual-crossing.png" 
                    alt="Powered by Visual Crossing Weather"
                    class="h-6 w-auto"
                />
            </a>
        </div>
    </div>

    <!-- Filters -->
    {#if showFilters}
        <div class="rounded-lg border border-gray-200 bg-gray-50 p-3 shadow-sm">
            <div class="mb-2 flex items-center space-x-2">
                <div class="rounded bg-[#0c3143] p-1">
                    <Icon icon="mdi:filter" class="text-white" width="12" />
                </div>
                <h3 class="text-sm font-semibold text-[#0c3143]">Filter & Sort</h3>
            </div>

            <div class="space-y-2">
                <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">District</label>
                    <select
                        bind:value={districtFilter}
                        class="w-full cursor-pointer rounded border border-gray-300 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                    >
                        <option value="all">All Districts</option>
                        {#each Object.keys(districts) as district}
                            <option value={district}>{district}</option>
                        {/each}
                    </select>
                </div>

                <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Sort by</label>
                    <select
                        bind:value={sortOption}
                        class="w-full cursor-pointer rounded border border-gray-300 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                    >
                        <option value="location-asc">Location A-Z</option>
                        <option value="location-desc">Location Z-A</option>
                        <option value="temp-high">Highest Temperature</option>
                        <option value="temp-low">Lowest Temperature</option>
                        <option value="precip-high">Highest Rain Chance</option>
                        <option value="humidity-high">Highest Humidity</option>
                        <option value="wind-high">Highest Wind Speed</option>
                    </select>
                </div>
            </div>
        </div>
    {/if}

    <!-- Loading/Error States -->
    {#if $weatherData.loading}
        <div class="rounded-lg border border-blue-200 bg-blue-50 p-6">
            <div class="flex items-center justify-center">
                <Icon icon="eos-icons:loading" class="mr-2 animate-spin text-blue-600" width="20" />
                <div>
                    <p class="text-sm font-semibold text-blue-800">Loading Weather Data</p>
                    <p class="text-xs text-blue-600">Fetching latest forecasts...</p>
                </div>
            </div>
        </div>
    {:else if $weatherData.error}
        <div class="rounded-lg border border-red-200 bg-red-50 p-4">
            <div class="flex items-start">
                <Icon icon="mdi:alert-circle" class="mt-0.5 mr-2 flex-shrink-0 text-red-500" width="18" />
                <div>
                    <h4 class="text-sm font-bold text-red-900">Error Loading Data</h4>
                    <p class="mt-1 text-xs text-red-700">{$weatherData.error}</p>
                    <button
                        class="mt-2 flex items-center gap-1 rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-800 transition-colors hover:bg-red-200"
                        on:click={refreshWeather}
                    >
                        <Icon icon="mdi:refresh" width="12" />
                        Try Again
                    </button>
                </div>
            </div>
        </div>
    {:else if $weatherData.data.length === 0}
        <div class="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
            <Icon icon="mdi:weather-cloudy" class="mx-auto mb-2 text-gray-400" width="24" />
            <p class="text-sm text-gray-600">No weather data available</p>
        </div>
    {:else if Object.keys(filteredData()).length === 0}
        <div class="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
            <Icon icon="mdi:filter-off" class="mx-auto mb-2 text-gray-400" width="24" />
            <p class="text-sm text-gray-600">No data matches the current filters</p>
        </div>
    {:else}
        <!-- Weather Cards -->
        <div class="space-y-2">
            {#each Object.entries(filteredData()) as [location, days]}
                {@const currentData = getCurrentHourData(days)}
                <div class="rounded-lg border shadow-sm bg-white">
                    <!-- Location Header -->
                    <div class="p-3">
                        <div class="mb-2">
                            <div class="flex items-center justify-between mb-1">
                                <h4 class="flex items-center text-sm font-bold text-gray-800">
                                    <Icon
                                        icon={iconMap[currentData.icon] || 'mdi:weather-partly-cloudy'}
                                        class="mr-1.5 text-blue-600"
                                        width="14"
                                    />
                                    {location}
                                </h4>
                                
                                <div class="flex items-center text-xs text-gray-500">
                                    <Icon icon="mdi:clock-outline" class="mr-1" width="12" />
                                    {moment(currentData.datetime, 'YYYY-MM-DD HH:mm:ss').format('MMM D • h:mm A')}
                                </div>
                            </div>
                            
                            <!-- Weather Status -->
                            <div class="flex items-center justify-between">
                                <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800">
                                    <Icon icon={iconMap[currentData.icon] || 'mdi:weather-partly-cloudy'} class="mr-1" width="12" />
                                    {currentData.conditions}
                                </span>
                                
                                <div class="flex items-center text-xs text-gray-500">
                                    <Icon icon="mdi:thermometer" class="mr-1" width="12" />
                                    Feels like {currentData.feelslike_c}°C
                                </div>
                            </div>
                        </div>
                        
                        <!-- Main Weather Display -->
                        <div class="rounded bg-white/70 p-3 border border-gray-200">
                            <div class="flex items-center justify-between mb-3">
                                <div class="flex items-center">
                                    <Icon 
                                        icon={iconMap[currentData.icon] || 'mdi:weather-partly-cloudy'} 
                                        class="mr-3 text-blue-600" 
                                        width="32" 
                                    />
                                    <div>
                                        <div class="flex items-baseline">
                                            <span class="text-2xl font-bold text-gray-800">{currentData.temp_c}</span>
                                            <span class="ml-1 text-sm text-gray-500">°C</span>
                                        </div>
                                        <div class="text-xs text-gray-600">Temperature</div>
                                    </div>
                                </div>
                                
                                <div class="text-right">
                                    <div class="flex items-center text-xs font-medium text-blue-600">
                                        <Icon icon="mdi:water-percent" class="mr-1" width="12" />
                                        {currentData.precipprob}% chance
                                    </div>
                                    <div class="text-xs text-gray-500">of rain</div>
                                </div>
                            </div>
                            
                            <!-- Key Weather Metrics Row -->
                            <div class="grid grid-cols-4 gap-2 text-xs">
                                <div class="text-center">
                                    <div class="flex items-center justify-center mb-1">
                                        <Icon icon="mdi:water-percent" class="text-blue-500" width="16" />
                                    </div>
                                    <div class="font-medium text-gray-700">{currentData.humidity}%</div>
                                    <div class="text-gray-500">Humidity</div>
                                </div>
                                <div class="text-center">
                                    <div class="flex items-center justify-center mb-1">
                                        <Icon icon="mdi:weather-windy" class="text-gray-500" width="16" />
                                    </div>
                                    <div class="font-medium text-gray-700">{currentData.windspeed_kmh} km/h</div>
                                    <div class="text-gray-500">Wind</div>
                                </div>
                                <div class="text-center">
                                    <div class="flex items-center justify-center mb-1">
                                        <Icon icon="mdi:gauge" class="text-purple-500" width="16" />
                                    </div>
                                    <div class="font-medium text-gray-700">{currentData.pressure_mb} mb</div>
                                    <div class="text-gray-500">Pressure</div>
                                </div>
                                <div class="text-center">
                                    <div class="flex items-center justify-center mb-1">
                                        <Icon icon="mdi:weather-sunny" class="text-yellow-500" width="16" />
                                    </div>
                                    <div class="font-medium text-gray-700">{currentData.uvindex}</div>
                                    <div class="text-gray-500">UV Index</div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Additional Weather Details -->
                        <div class="mt-2 rounded bg-gray-50 border border-gray-200 p-2">
                            <div class="mb-1 text-xs font-semibold text-gray-700">Additional Details</div>
                            <div class="grid grid-cols-3 gap-2 text-xs">
                                <div class="text-center">
                                    <div class="flex items-center justify-center mb-1">
                                        <Icon icon="mdi:weather-rainy" class="text-blue-500" width="14" />
                                    </div>
                                    <div class="font-medium text-gray-700">{currentData.precip_mm} mm</div>
                                    <div class="text-gray-600">Precipitation</div>
                                </div>
                                <div class="text-center">
                                    <div class="flex items-center justify-center mb-1">
                                        <Icon icon="mdi:weather-windy-variant" class="text-gray-500" width="14" />
                                    </div>
                                    <div class="font-medium text-gray-700">{currentData.windgust_kmh} km/h</div>
                                    <div class="text-gray-600">Wind Gust</div>
                                </div>
                                <div class="text-center">
                                    <div class="flex items-center justify-center mb-1">
                                        <Icon icon="mdi:weather-cloudy" class="text-gray-400" width="14" />
                                    </div>
                                    <div class="font-medium text-gray-700">{currentData.cloudcover}%</div>
                                    <div class="text-gray-600">Cloud Cover</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Compact Expand/Collapse Section -->
                    <div class="border-t border-gray-200/50 bg-white/50 p-2">
                        <details class="group">
                            <summary
                                class="flex w-full cursor-pointer items-center justify-center rounded border border-dashed border-blue-300 bg-blue-50/50 px-2 py-1.5 text-xs font-medium text-blue-700 transition-all duration-200 hover:bg-blue-100"
                            >
                                <Icon icon="mdi:chart-line" class="mr-1" width="14" />
                                <span class="group-open:hidden">Show Hourly Forecast</span>
                                <span class="hidden group-open:inline">Hide Hourly Forecast</span>
                                <Icon
                                    icon="mdi:chevron-down"
                                    class="ml-1 transition-transform group-open:rotate-180"
                                    width="14"
                                />
                            </summary>

                            <!-- Hourly Data -->
                            <div class="mt-2 space-y-2 p-2">
                                <div class="rounded border border-blue-200 bg-blue-50 p-3">
                                    <h6 class="mb-3 flex items-center text-xs font-bold text-blue-800">
                                        <Icon icon="mdi:clock-time-four-outline" class="mr-1" width="12" />
                                        Hourly 5-Day Forecast
                                    </h6>
                                    
                                    <!-- Horizontal scrollable container -->
                                    <div class="overflow-x-auto pb-2">
                                        <div class="flex gap-3 min-w-max">
                                            {#each days as hour, index}
                                                <div class="flex-shrink-0 w-32">
                                                    <div class="rounded-lg border border-gray-200 bg-white p-3 shadow-sm hover:shadow-md transition-shadow">
                                                        <!-- Time and Icon -->
                                                        <div class="text-center mb-3">
                                                            <div class="text-xs font-semibold text-gray-700 mb-1">
                                                                {moment(hour.datetime, 'YYYY-MM-DD HH:mm:ss').format('h:mm A')}
                                                            </div>
                                                            <div class="text-xs text-gray-500 mb-2">
                                                                {moment(hour.datetime, 'YYYY-MM-DD HH:mm:ss').format('MMM D')}
                                                            </div>
                                                            <Icon
                                                                icon={iconMap[hour.icon] || 'mdi:weather-partly-cloudy'}
                                                                class="mx-auto mb-2 text-blue-600"
                                                                width="28"
                                                            />
                                                        </div>
                                                        
                                                        <!-- Temperature -->
                                                        <div class="text-center mb-3">
                                                            <div class="text-lg font-bold text-gray-800 mb-1">{hour.temp_c}°C</div>
                                                            <div class="text-xs text-gray-500">Feels {hour.feelslike_c}°C</div>
                                                        </div>
                                                        
                                                        <!-- Key Metrics -->
                                                        <div class="space-y-2">
                                                            <!-- Rain Chance -->
                                                            <div class="flex items-center justify-between">
                                                                <div class="flex items-center">
                                                                    <Icon icon="mdi:water-percent" class="text-blue-500 mr-1" width="12" />
                                                                    <span class="text-xs text-gray-600">Rain</span>
                                                                </div>
                                                                <span class="text-xs font-semibold text-blue-700">{hour.precipprob}%</span>
                                                            </div>
                                                            
                                                            <!-- Humidity -->
                                                            <div class="flex items-center justify-between">
                                                                <div class="flex items-center">
                                                                    <Icon icon="mdi:water" class="text-cyan-500 mr-1" width="12" />
                                                                    <span class="text-xs text-gray-600">Humidity</span>
                                                                </div>
                                                                <span class="text-xs font-semibold text-gray-700">{hour.humidity}%</span>
                                                            </div>
                                                            
                                                            <!-- Wind -->
                                                            <div class="flex items-center justify-between">
                                                                <div class="flex items-center">
                                                                    <Icon icon="mdi:weather-windy" class="text-gray-500 mr-1" width="12" />
                                                                    <span class="text-xs text-gray-600">Wind</span>
                                                                </div>
                                                                <span class="text-xs font-semibold text-gray-700">{hour.windspeed_kmh} km/h</span>
                                                            </div>
                                                        </div>
                                                        
                                                        <!-- Conditions Badge -->
                                                        <div class="mt-3 text-center">
                                                            <div class="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
                                                                {hour.conditions.split(' ').slice(0, 2).join(' ')}
                                                            </div>
                                                        </div>
                                                        
                                                        <!-- Additional Details (Collapsible) -->
                                                        <details class="mt-2">
                                                            <summary class="text-xs text-blue-600 cursor-pointer hover:text-blue-800 text-center">
                                                                More details
                                                            </summary>
                                                            <div class="mt-2 pt-2 border-t border-gray-200 space-y-1">
                                                                <div class="flex items-center justify-between text-xs">
                                                                    <span class="text-gray-600">Precipitation</span>
                                                                    <span class="font-medium">{hour.precip_mm} mm</span>
                                                                </div>
                                                                <div class="flex items-center justify-between text-xs">
                                                                    <span class="text-gray-600">Wind Gust</span>
                                                                    <span class="font-medium">{hour.windgust_kmh} km/h</span>
                                                                </div>
                                                                <div class="flex items-center justify-between text-xs">
                                                                    <span class="text-gray-600">Pressure</span>
                                                                    <span class="font-medium">{hour.pressure_mb} mb</span>
                                                                </div>
                                                                <div class="flex items-center justify-between text-xs">
                                                                    <span class="text-gray-600">Cloud Cover</span>
                                                                    <span class="font-medium">{hour.cloudcover}%</span>
                                                                </div>
                                                                <div class="flex items-center justify-between text-xs">
                                                                    <span class="text-gray-600">UV Index</span>
                                                                    <span class="font-medium">{hour.uvindex}</span>
                                                                </div>
                                                                <div class="flex items-center justify-between text-xs">
                                                                    <span class="text-gray-600">Solar Radiation</span>
                                                                    <span class="font-medium">{hour.solarradiation}</span>
                                                                </div>
                                                            </div>
                                                        </details>
                                                    </div>
                                                </div>
                                            {/each}
                                        </div>
                                    </div>
                                    
                                    <!-- Scroll indicator -->
                                    <div class="text-center mt-2">
                                        <p class="text-xs text-gray-500">← Scroll horizontally to see more hours →</p>
                                    </div>
                                </div>
                            </div>
                        </details>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .weather-tab button {
        transition: all 0.2s ease-in-out;
    }

    .weather-tab button:hover:not(:disabled) {
        transform: translateY(-0.5px);
    }

    .weather-tab button:focus-visible {
        outline: 2px solid #0c3143;
        outline-offset: 1px;
    }

    details summary {
        list-style: none;
    }

    details summary::-webkit-details-marker {
        display: none;
    }

    .space-y-3 > :not([hidden]) ~ :not([hidden]) {
        margin-top: 0.75rem;
    }

    .space-y-2 > :not([hidden]) ~ :not([hidden]) {
        margin-top: 0.5rem;
    }
</style>