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
        <h2 class="text-xs font-bold text-[#0c3143] xl:text-lg">Weather Forecast</h2>

        <div class="ml-auto flex flex-wrap gap-2">
            <button
                class="flex cursor-pointer items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-900"
                on:click={refreshWeather}
            >
                <Icon icon="mdi:refresh" width="12" />
                <span class="hidden sm:inline">Refresh</span>
            </button>

            <button
                class="flex cursor-pointer items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-900"
                on:click={() => (showFilters = !showFilters)}
            >
                <Icon icon={showFilters ? 'mdi:filter-off' : 'mdi:filter'} width="12" />
                <span class="hidden sm:inline">{showFilters ? 'Hide' : 'Filters'}</span>
            </button>
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
                <div class="rounded-lg shadow-md bg-gray-50 border-gray-300 border-2">
                    <!-- Location Header -->
                    <div class="px-3 sm:px-4 py-2 rounded-t-lg">
                        <div class="flex items-start sm:items-center justify-between gap-2">
                            <h3 class="font-bold text-sm sm:text-base truncate flex-shrink min-w-0">
                               {location}
                            </h3>
                            
                            <div class="flex items-center text-xs opacity-80 whitespace-nowrap flex-shrink-0">
                                <Icon icon="mdi:clock-outline" class="mr-1" width="12" />
                                <span class="hidden sm:inline">{moment(currentData.datetime, 'YYYY-MM-DD HH:mm:ss').format('MMM D • h:mm A')}</span>
                                <span class="sm:hidden">{moment(currentData.datetime, 'YYYY-MM-DD HH:mm:ss').format('MMM D')}</span>
                            </div>
                        </div>
                    </div>

                    <div class="p-2 sm:p-3">
                        <!-- Main Temperature & Condition -->
                        <div class="flex items-center justify-between bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg p-2 sm:p-3 border border-blue-200 mb-2">
                            <div class="flex items-center min-w-0 flex-1">
                                <Icon 
                                    icon={iconMap[currentData.icon] || 'mdi:weather-partly-cloudy'} 
                                    class="mr-2 sm:mr-3 text-blue-600 flex-shrink-0" 
                                    width="40"
                                />
                                <div class="min-w-0">
                                    <div class="flex items-baseline">
                                        <span class="text-2xl sm:text-3xl font-bold text-gray-800">{currentData.temp_c}</span>
                                        <span class="ml-1 text-base sm:text-lg text-gray-600">°C</span>
                                    </div>
                                    <div class="text-xs text-gray-600 mt-0.5 sm:mt-1">
                                        Feels like <span class="font-semibold">{currentData.feelslike_c}°C</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="text-right flex-shrink-0 ml-2">
                                <span class="inline-flex items-center rounded-full px-2 sm:px-3 py-1 text-xs font-semibold bg-white shadow-sm border border-blue-300 text-blue-800 max-w-[120px] sm:max-w-none truncate">
                                    {currentData.conditions}
                                </span>
                            </div>
                        </div>
                        
                        <!-- Weather Metrics Grid - Mobile Optimized -->
                        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-2">
                            <!-- Rain Probability -->
                            <div class="bg-blue-50 rounded-lg p-2 border border-blue-200">
                                <div class="flex items-center justify-between mb-1">
                                    <Icon icon="mdi:water-percent" class="text-blue-600 flex-shrink-0" width="14" />
                                    <span class="text-xs font-medium text-gray-600 truncate ml-1">Rain</span>
                                </div>
                                <div class="text-base sm:text-lg font-bold text-blue-700">{currentData.precipprob}%</div>
                                <div class="text-xs text-gray-500 truncate">{currentData.precip_mm} mm</div>
                            </div>

                            <!-- Humidity -->
                            <div class="bg-cyan-50 rounded-lg p-2 border border-cyan-200">
                                <div class="flex items-center justify-between mb-1">
                                    <Icon icon="mdi:water" class="text-cyan-600 flex-shrink-0" width="14" />
                                    <span class="text-xs font-medium text-gray-600 truncate ml-1">Humidity</span>
                                </div>
                                <div class="text-base sm:text-lg font-bold text-cyan-700">{currentData.humidity}%</div>
                                <div class="text-xs text-gray-500 truncate">Moisture</div>
                            </div>

                            <!-- Wind Speed -->
                            <div class="bg-gray-50 rounded-lg p-2 border border-gray-200">
                                <div class="flex items-center justify-between mb-1">
                                    <Icon icon="mdi:weather-windy" class="text-gray-600 flex-shrink-0" width="14" />
                                    <span class="text-xs font-medium text-gray-600 truncate ml-1">Wind</span>
                                </div>
                                <div class="text-base sm:text-lg font-bold text-gray-700">{currentData.windspeed_kmh}</div>
                                <div class="text-xs text-gray-500 truncate">km/h</div>
                            </div>

                            <!-- Wind Gust -->
                            <div class="bg-slate-50 rounded-lg p-2 border border-slate-200">
                                <div class="flex items-center justify-between mb-1">
                                    <Icon icon="mdi:weather-windy-variant" class="text-slate-600 flex-shrink-0" width="14" />
                                    <span class="text-xs font-medium text-gray-600 truncate ml-1">Gust</span>
                                </div>
                                <div class="text-base sm:text-lg font-bold text-slate-700">{currentData.windgust_kmh}</div>
                                <div class="text-xs text-gray-500 truncate">km/h</div>
                            </div>

                            <!-- Pressure -->
                            <div class="bg-purple-50 rounded-lg p-2 border border-purple-200">
                                <div class="flex items-center justify-between mb-1">
                                    <Icon icon="mdi:gauge" class="text-purple-600 flex-shrink-0" width="14" />
                                    <span class="text-xs font-medium text-gray-600 truncate ml-1">Pressure</span>
                                </div>
                                <div class="text-base sm:text-lg font-bold text-purple-700">{currentData.pressure_mb}</div>
                                <div class="text-xs text-gray-500 truncate">mb</div>
                            </div>

                            <!-- Cloud Cover -->
                            <div class="bg-gray-50 rounded-lg p-2 border border-gray-200">
                                <div class="flex items-center justify-between mb-1">
                                    <Icon icon="mdi:weather-cloudy" class="text-gray-500 flex-shrink-0" width="14" />
                                    <span class="text-xs font-medium text-gray-600 truncate ml-1">Clouds</span>
                                </div>
                                <div class="text-base sm:text-lg font-bold text-gray-700">{currentData.cloudcover}%</div>
                                <div class="text-xs text-gray-500 truncate">Cover</div>
                            </div>

                            <!-- UV Index -->
                            <div class="bg-yellow-50 rounded-lg p-2 border border-yellow-200">
                                <div class="flex items-center justify-between mb-1">
                                    <Icon icon="mdi:weather-sunny" class="text-yellow-600 flex-shrink-0" width="14" />
                                    <span class="text-xs font-medium text-gray-600 truncate ml-1">UV Index</span>
                                </div>
                                <div class="text-base sm:text-lg font-bold text-yellow-700">{currentData.uvindex}</div>
                                <div class="text-xs text-gray-500 truncate">
                                    {currentData.uvindex <= 2 ? 'Low' : currentData.uvindex <= 5 ? 'Moderate' : currentData.uvindex <= 7 ? 'High' : 'Very High'}
                                </div>
                            </div>

                            <!-- Solar Radiation -->
                            <div class="bg-orange-50 rounded-lg p-2 border border-orange-200">
                                <div class="flex items-center justify-between mb-1">
                                    <Icon icon="mdi:solar-power" class="text-orange-600 flex-shrink-0" width="14" />
                                    <span class="text-xs font-medium text-gray-600 truncate ml-1">Solar</span>
                                </div>
                                <div class="text-base sm:text-lg font-bold text-orange-700">{currentData.solarradiation}</div>
                                <div class="text-xs text-gray-500 truncate">W/m²</div>
                            </div>
                        </div>
                    </div>

                    <!-- Compact Expand/Collapse Section for Hourly Forecast -->
                    <div class="border-t border-gray-200/50 bg-white/50 p-2">
                        <details class="group">
                            <summary class="flex w-full cursor-pointer items-center justify-center rounded border border-dashed border-blue-300 bg-blue-50/50 px-2 py-1.5 text-xs font-medium text-blue-700 transition-all duration-200 hover:bg-blue-100">
                                <Icon icon="mdi:chart-timeline-variant" class="mr-1 flex-shrink-0" width="14" />
                                <span class="group-open:hidden truncate">Show 5-Day Hourly Forecast</span>
                                <span class="hidden group-open:inline truncate">Hide 5-Day Hourly Forecast</span>
                                <Icon icon="mdi:chevron-down" class="ml-1 flex-shrink-0 transition-transform group-open:rotate-180" width="14" />
                            </summary>

                            <!-- 5-Day Hourly Forecast -->
                            <div class="mt-2 space-y-2 p-2">
                                <div class="rounded border border-blue-200 bg-blue-50 p-2">
                                    <h6 class="mb-2 flex items-center justify-between text-xs font-bold text-blue-800">
                                        <span class="flex items-center min-w-0 truncate">
                                            <Icon icon="mdi:chart-timeline-variant" class="mr-1 flex-shrink-0" width="12" />
                                            <span class="truncate">Hourly Forecast ({days.length} hours)</span>
                                        </span>
                                        <span class="text-blue-600 font-medium ml-2 whitespace-nowrap flex-shrink-0">Scroll →</span>
                                    </h6>
                                    
                                    <!-- Horizontal scrollable container -->
                                    <div class="overflow-x-auto pb-2 -mx-1 px-1">
                                        <div class="flex gap-2 min-w-max">
                                            {#each days as hour, index}
                                                {@const isCurrentHour = moment(hour.datetime, 'YYYY-MM-DD HH:mm:ss').isSame(moment().utcOffset('+08:00').startOf('hour'), 'hour')}
                                                <div class="flex-shrink-0 w-24 sm:w-28">
                                                    <div class="rounded-lg border-2 {isCurrentHour ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white'} p-2 shadow hover:shadow-md transition-all h-full">
                                                        <!-- Time -->
                                                        <div class="text-center mb-2">
                                                            <div class="text-xs font-bold text-gray-800 truncate">
                                                                {moment(hour.datetime, 'YYYY-MM-DD HH:mm:ss').format('h:mm A')}
                                                            </div>
                                                            <div class="text-xs text-gray-500 truncate">
                                                                {moment(hour.datetime, 'YYYY-MM-DD HH:mm:ss').format('MMM D')}
                                                            </div>
                                                        </div>
                                                        
                                                        <!-- Icon -->
                                                        <div class="text-center mb-2">
                                                            <Icon
                                                                icon={iconMap[hour.icon] || 'mdi:weather-partly-cloudy'}
                                                                class="mx-auto text-blue-600"
                                                                width="28"
                                                            />
                                                        </div>
                                                        
                                                        <!-- Temperature -->
                                                        <div class="text-center mb-2">
                                                            <div class="text-lg sm:text-xl font-bold text-gray-800">{hour.temp_c}°</div>
                                                            <div class="text-xs text-gray-500 truncate">Feels {hour.feelslike_c}°</div>
                                                        </div>
                                                        
                                                        <!-- Compact metrics -->
                                                        <div class="space-y-1 text-xs">
                                                            <div class="flex items-center justify-between">
                                                                <Icon icon="mdi:water-percent" class="text-blue-500 flex-shrink-0" width="12" />
                                                                <span class="font-semibold text-blue-700 ml-1">{hour.precipprob}%</span>
                                                            </div>
                                                            <div class="flex items-center justify-between">
                                                                <Icon icon="mdi:water" class="text-cyan-500 flex-shrink-0" width="12" />
                                                                <span class="ml-1">{hour.humidity}%</span>
                                                            </div>
                                                            <div class="flex items-center justify-between">
                                                                <Icon icon="mdi:weather-windy" class="text-gray-500 flex-shrink-0" width="12" />
                                                                <span class="ml-1 truncate">{hour.windspeed_kmh} km/h</span>
                                                            </div>
                                                        </div>
                                                        
                                                        <!-- Expandable details -->
                                                        <details class="mt-2">
                                                            <summary class="text-xs text-blue-600 cursor-pointer hover:text-blue-800 text-center font-medium">
                                                                + More
                                                            </summary>
                                                            <div class="mt-2 pt-2 border-t border-gray-200 space-y-1 text-xs">
                                                                <div class="flex justify-between">
                                                                    <span class="text-gray-600">Precip:</span>
                                                                    <span class="font-medium truncate ml-1">{hour.precip_mm} mm</span>
                                                                </div>
                                                                <div class="flex justify-between">
                                                                    <span class="text-gray-600">Gust:</span>
                                                                    <span class="font-medium truncate ml-1">{hour.windgust_kmh} km/h</span>
                                                                </div>
                                                                <div class="flex justify-between">
                                                                    <span class="text-gray-600">Pressure:</span>
                                                                    <span class="font-medium truncate ml-1">{hour.pressure_mb} mb</span>
                                                                </div>
                                                                <div class="flex justify-between">
                                                                    <span class="text-gray-600">Clouds:</span>
                                                                    <span class="font-medium">{hour.cloudcover}%</span>
                                                                </div>
                                                                <div class="flex justify-between">
                                                                    <span class="text-gray-600">UV:</span>
                                                                    <span class="font-medium">{hour.uvindex}</span>
                                                                </div>
                                                                <div class="flex justify-between">
                                                                    <span class="text-gray-600">Solar:</span>
                                                                    <span class="font-medium truncate ml-1">{hour.solarradiation} W/m²</span>
                                                                </div>
                                                                <div class="mt-2 pt-1 border-t border-gray-200">
                                                                    <div class="text-gray-700 font-medium text-center text-xs break-words">
                                                                        {hour.conditions}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </details>
                                                    </div>
                                                </div>
                                            {/each}
                                        </div>
                                    </div>
                                    
                                    <!-- Scroll indicator -->
                                    <div class="text-center mt-2 flex items-center justify-center gap-2">
                                        <Icon icon="mdi:gesture-swipe-horizontal" class="text-blue-500 flex-shrink-0" width="16" />
                                        <p class="text-xs text-blue-700 font-medium truncate">Swipe or scroll to view all forecasts</p>
                                    </div>
                                </div>
                            </div>
                        </details>
                    </div>

                    <!-- Visual Crossing Attribution -->
                    <div class="border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white px-3 py-2">
                        <a
                            href="https://www.visualcrossing.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="flex items-center justify-center gap-2 text-xs text-gray-600 transition-all hover:text-gray-900 group"
                            title="Weather data provided by Visual Crossing"
                        >
                            <span class="font-medium">Powered by</span>
                            <img 
                                src="/logo/visual-crossing-short.png" 
                                alt="Visual Crossing Weather"
                                class="h-5 w-auto transition-transform group-hover:scale-105"
                            />
                            <span class="font-semibold text-gray-700 group-hover:text-gray-900">Visual Crossing</span>
                        </a>
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

    /* Improve scrollbar for horizontal scroll */
    .overflow-x-auto {
        scrollbar-width: thin;
        scrollbar-color: #cbd5e1 #f1f5f9;
    }

    .overflow-x-auto::-webkit-scrollbar {
        height: 6px;
    }

    .overflow-x-auto::-webkit-scrollbar-track {
        background: #f1f5f9;
        border-radius: 3px;
    }

    .overflow-x-auto::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 3px;
    }

    .overflow-x-auto::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
    }
</style>