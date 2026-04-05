<script>
	import { invalidateAll } from '$app/navigation';
	import { waterStations, focusedWaterStation } from '$lib/stores/waterStationStore.js';
	import Icon from '@iconify/svelte';
	import TabActionButton from '$lib/components/predict-tabs/shared/TabActionButton.svelte';
	import TabFilterCard from '$lib/components/predict-tabs/shared/TabFilterCard.svelte';

	// Helper function to determine water station status
	function getStationStatus(station) {
		if (!station.wl)
			return { level: 'unknown', color: 'gray', text: 'Unknown', icon: 'mdi:help-circle' };

		const currentWL = parseFloat(station.wl);
		const alertWL = station.alertwl ? parseFloat(station.alertwl) : null;
		const alarmWL = station.alarmwl ? parseFloat(station.alarmwl) : null;
		const criticalWL = station.criticalwl ? parseFloat(station.criticalwl) : null;

		if (criticalWL && currentWL >= criticalWL) {
			return { level: 'critical', color: 'red', text: 'Critical', icon: 'mdi:waves-arrow-up' };
		} else if (alarmWL && currentWL >= alarmWL) {
			return { level: 'alarm', color: 'orange', text: 'Alarm', icon: 'mdi:wave' };
		} else if (alertWL && currentWL >= alertWL) {
			return { level: 'alert', color: 'yellow', text: 'Alert', icon: 'mdi:water-plus' };
		} else {
			return { level: 'normal', color: 'green', text: 'Normal', icon: 'mdi:water-check' };
		}
	}

	// Improved helper function to calculate water level change based on 10-minute reading
	function calculateWaterChange(station) {
		if (!station.wl || !station.wl10m)
			return { text: 'No change data', icon: 'mdi:minus', color: 'gray' };

		const currentWL = parseFloat(station.wl);
		const wl10m = parseFloat(station.wl10m);

		if (isNaN(currentWL) || isNaN(wl10m))
			return { text: 'Unknown', icon: 'mdi:help-circle', color: 'gray' };

		const change = (currentWL - wl10m).toFixed(2);
		const value = parseFloat(change);

		if (value === 0) {
			return { text: 'Stable', icon: '', color: 'gray' };
		} else if (value > 0) {
			return {
				text: `Rising ${Math.abs(value)} m`,
				icon: 'mdi:arrow-up-bold',
				color: value > 0.1 ? 'red' : 'orange'
			};
		} else {
			return {
				text: `Falling ${Math.abs(value)} m`,
				icon: 'mdi:arrow-down-bold',
				color: 'blue'
			};
		}
	}

	// Function to reload water station data
	async function refreshWaterStations() {
		waterStations.update((current) => ({ ...current, loading: true, error: null }));

		try {
			await invalidateAll();
		} catch (error) {
			console.error('Failed to refresh water stations:', error);
			waterStations.update((current) => ({
				...current,
				loading: false,
				error: error?.message || 'Unable to refresh water station data'
			}));
		}
	}

	// Add filter and sorting options
	let statusFilter = $state('all');
	let sortOption = $state('name');

	// Define status filter options
	const statusOptions = [
		{ value: 'all', label: 'All Stations' },
		{ value: 'critical', label: 'Critical Status' },
		{ value: 'alarm', label: 'Alarm Status' },
		{ value: 'alert', label: 'Alert Status' },
		{ value: 'normal', label: 'Normal Status' }
	];

	// Define sorting options
	const sortOptions = [
		{ value: 'name', label: 'Station Name (A-Z)' },
		{ value: 'name-desc', label: 'Station Name (Z-A)' },
		{ value: 'level-high', label: 'Water Level (High-Low)' },
		{ value: 'level-low', label: 'Water Level (Low-High)' },
		{ value: 'change-high', label: 'Level Change (Rising)' },
		{ value: 'change-low', label: 'Level Change (Falling)' }
	];

	const sortOptionGroups = [
		{ label: 'Name', options: sortOptions.filter((option) => option.value.includes('name')) },
		{
			label: 'Water Level',
			options: sortOptions.filter((option) => option.value.includes('level'))
		},
		{
			label: 'Change Rate',
			options: sortOptions.filter((option) => option.value.includes('change'))
		}
	];

	const statusColorClasses = {
		green: {
			accentBar: 'bg-emerald-500',
			panel: 'border-emerald-100/50 bg-emerald-50/50',
			badge: 'bg-emerald-100 text-emerald-800'
		},
		yellow: {
			accentBar: 'bg-yellow-400',
			panel: 'border-yellow-100/50 bg-yellow-50/50',
			badge: 'bg-yellow-100 text-yellow-800'
		},
		orange: {
			accentBar: 'bg-orange-500',
			panel: 'border-orange-100/50 bg-orange-50/50',
			badge: 'bg-orange-100 text-orange-800'
		},
		red: {
			accentBar: 'bg-red-500',
			panel: 'border-red-100/50 bg-red-50/50',
			badge: 'bg-red-100 text-red-800'
		},
		default: {
			accentBar: 'bg-slate-400',
			panel: 'border-slate-100/50 bg-slate-50/50',
			badge: 'bg-slate-100 text-slate-800'
		}
	};

	const changeColorClasses = {
		red: 'text-red-600',
		orange: 'text-orange-600',
		blue: 'text-blue-600',
		default: 'text-slate-500'
	};

	function getStatusColorClasses(color) {
		return statusColorClasses[color] || statusColorClasses.default;
	}

	function getChangeTextClass(color) {
		return changeColorClasses[color] || changeColorClasses.default;
	}

	// Access the water stations store value directly
	let waterStationsValue = $derived($waterStations);

	// Computed property for filtered and sorted stations - fixed the $derived syntax
	let filteredStations = $derived(
		waterStationsValue.data
			.filter((station) => {
				if (statusFilter === 'all') return true;

				const status = getStationStatus(station);
				return status.level === statusFilter;
			})
			.sort((a, b) => {
				// Get numeric water levels for sorting
				const aLevel = parseFloat(a.wl) || 0;
				const bLevel = parseFloat(b.wl) || 0;

				// Get water level changes for sorting
				const aChange = a.wl && a.wl10m ? parseFloat(a.wl) - parseFloat(a.wl10m) : 0;
				const bChange = b.wl && b.wl10m ? parseFloat(b.wl) - parseFloat(b.wl10m) : 0;

				switch (sortOption) {
					case 'name':
						return a.obsnm.localeCompare(b.obsnm);
					case 'name-desc':
						return b.obsnm.localeCompare(a.obsnm);
					case 'level-high':
						return bLevel - aLevel;
					case 'level-low':
						return aLevel - bLevel;
					case 'change-high':
						return bChange - aChange; // Sort by rising (highest positive change first)
					case 'change-low':
						return aChange - bChange; // Sort by falling (lowest negative change first)
					default:
						return 0;
				}
			})
	);

	// Add filter visibility toggle
	let showFilters = $state(false);

	// Add function to show a station on the map
	function showStationOnMap(station) {
		focusedWaterStation.set(station);
	}
</script>

<div class="water-stations-tab space-y-3">
	<!-- Compact Header -->
	<div class="flex items-center justify-center gap-5">
		<!-- Action buttons aligned to the right -->
		<TabActionButton
			onclick={refreshWaterStations}
			disabled={$waterStations.loading}
			icon="mdi:refresh"
			label="Refresh"
		/>

		<TabActionButton
			onclick={() => (showFilters = !showFilters)}
			icon={showFilters ? 'mdi:filter-off' : 'mdi:filter'}
			label={showFilters ? 'Hide' : 'Filters'}
		/>
	</div>

	<!-- Compact Filter Section -->
	{#if showFilters}
		<TabFilterCard headingIconWrapperClass="bg-[#0c3143]" headingTextClass="text-[#0c3143]">
			<div class="space-y-2">
				<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
					<!-- Status Filter -->
					<div>
						<label class="mb-1 block text-xs font-medium text-gray-600" for="status-filter"
							>Filter by Status</label
						>
						<select
							bind:value={statusFilter}
							id="status-filter"
							class="w-full cursor-pointer rounded border border-gray-300 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
						>
							{#each statusOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>

					<!-- Sort Options -->
					<div>
						<label class="mb-1 block text-xs font-medium text-gray-600" for="sort-option"
							>Sort by</label
						>
						<select
							bind:value={sortOption}
							id="sort-option"
							class="w-full cursor-pointer rounded border border-gray-300 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
						>
							{#each sortOptionGroups as group}
								<optgroup label={group.label}>
									{#each group.options as option}
										<option value={option.value}>{option.label}</option>
									{/each}
								</optgroup>
							{/each}
						</select>
					</div>
				</div>

				<!-- Status Legend and Count -->
				<div class="flex items-center justify-between border-t border-gray-200 pt-2">
					<div class="flex flex-wrap gap-3 text-xs">
						<div class="flex items-center">
							<span class="mr-1 h-2 w-2 rounded-full bg-green-600"></span>
							<span>Normal</span>
						</div>
						<div class="flex items-center">
							<span class="mr-1 h-2 w-2 rounded-full bg-yellow-500"></span>
							<span>Alert</span>
						</div>
						<div class="flex items-center">
							<span class="mr-1 h-2 w-2 rounded-full bg-orange-500"></span>
							<span>Alarm</span>
						</div>
						<div class="flex items-center">
							<span class="mr-1 h-2 w-2 rounded-full bg-red-600"></span>
							<span>Critical</span>
						</div>
					</div>

					<div class="text-xs text-gray-500">
						Showing {filteredStations.length} of {waterStationsValue.data.length} stations
					</div>
				</div>
			</div>
		</TabFilterCard>
	{/if}

	<!-- Loading State -->
	{#if $waterStations.loading}
		<div class="rounded-lg border border-blue-200 bg-blue-50 p-6">
			<div class="flex items-center justify-center">
				<Icon icon="eos-icons:loading" class="mr-2 animate-spin text-blue-600" width="20" />
				<div>
					<p class="text-sm font-semibold text-blue-800">Loading Water Stations</p>
					<p class="text-xs text-blue-600">Fetching latest data...</p>
				</div>
			</div>
		</div>
	{:else if $waterStations.error && $waterStations.data.length === 0}
		<!-- Error State -->
		<div class="rounded-lg border border-red-200 bg-red-50 p-4">
			<div class="flex items-start">
				<Icon icon="mdi:alert-circle" class="mt-0.5 mr-2 flex-shrink-0 text-red-500" width="18" />
				<div>
					<h4 class="text-sm font-bold text-red-900">Error Loading Data</h4>
					<p class="mt-1 text-xs text-red-700">{$waterStations.error}</p>
					<button
						class="mt-2 flex cursor-pointer items-center gap-1 rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-800 transition-colors hover:bg-red-200"
						onclick={refreshWaterStations}
					>
						<Icon icon="mdi:refresh" width="12" />
						Try Again
					</button>
				</div>
			</div>
		</div>
	{:else if $waterStations.data.length === 0}
		<!-- No Data State -->
		<div class="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
			<Icon icon="mdi:database-off" class="mx-auto mb-2 text-gray-400" width="24" />
			<p class="text-sm text-gray-600">No water station data available</p>
		</div>
	{:else if filteredStations.length === 0}
		<!-- No Results State -->
		<div class="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-center">
			<Icon icon="mdi:filter-off" class="mx-auto mb-2 text-yellow-600" width="20" />
			<p class="text-sm text-gray-700">No stations match your filters</p>
			<button
				class="mx-auto mt-2 flex items-center gap-1 rounded bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800 transition-colors hover:bg-yellow-200"
				onclick={() => (statusFilter = 'all')}
			>
				<Icon icon="mdi:filter-remove" width="12" />
				Clear Filters
			</button>
		</div>
	{:else}
		<!-- Compact Water Station Cards -->
		<div class="space-y-5">
			{#if $waterStations.error}
				<div class="rounded-lg border border-amber-200 bg-amber-50 p-3">
					<div class="flex items-start">
						<Icon
							icon="mdi:alert-outline"
							class="mt-0.5 mr-2 flex-shrink-0 text-amber-600"
							width="16"
						/>
						<div>
							<p class="text-xs font-semibold text-amber-800">Refresh temporarily limited</p>
							<p class="mt-1 text-xs text-amber-700">{$waterStations.error}</p>
							<p class="mt-1 text-[11px] text-amber-700/90">
								Showing last available water-station data.
							</p>
						</div>
					</div>
				</div>
			{/if}

			{#each filteredStations as station (station.obsnm)}
				{@const status = getStationStatus(station)}
				{@const change = calculateWaterChange(station)}
				{@const statusClasses = getStatusColorClasses(status.color)}

				<div
					class="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
				>
					<!-- Color accent bar at the top -->
					<div class={`absolute top-0 left-0 h-1 w-full ${statusClasses.accentBar}`}></div>

					<div class="p-4 pt-5">
						<div class="mb-4">
							<div class="flex items-start justify-between gap-3">
								<div>
									<h4 class="flex items-center text-[15px] font-extrabold text-slate-800">
										<Icon icon="mdi:water-check" class="mr-2 text-blue-500" width="16" />
										{station.obsnm}
									</h4>
									<div class="mt-1 flex items-center text-xs font-semibold text-slate-500">
										<Icon icon="mdi:clock-outline" class="mr-1" width="12" />
										{station.timestr}
									</div>
								</div>

								<!-- Show on Map button -->
								<button
									class="flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 text-[11px] font-bold text-blue-700 shadow-sm transition-colors hover:bg-blue-100"
									onclick={() => showStationOnMap(station)}
								>
									<Icon icon="mdi:map-marker" width="14" />
									<span>Map View</span>
								</button>
							</div>
						</div>

						<!-- Main Water Level Area -->
						<div class={`mb-4 rounded-xl border p-3.5 ${statusClasses.panel}`}>
							<div class="mb-3 flex items-center justify-center">
								<span
									class={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black tracking-wider uppercase ${statusClasses.badge}`}
								>
									<Icon icon={status.icon} class="mr-1.5" width="12" />
									{status.text} Status
								</span>
							</div>

							<div class="flex">
								<div
									class="flex w-full flex-col items-center justify-center rounded-lg border border-white/70 bg-white/70 p-2.5"
								>
									<div
										class="text-center text-[10px] font-bold tracking-wider text-slate-500 uppercase"
									>
										Current Level
									</div>
									<div class="mt-1 flex items-baseline gap-1">
										<span class="text-3xl font-black tracking-tight text-slate-800">
											{station.wl || '--'}
										</span>
										<span class="text-sm font-bold text-slate-500">m</span>
									</div>
								</div>

								<div
									class="flex w-full flex-col items-center justify-center rounded-lg border border-white/70 bg-white/70 p-2.5"
								>
									<div
										class={`mt-1 flex items-center text-sm font-black ${getChangeTextClass(change.color)}`}
									>
										<Icon icon={change.icon} class="mr-1 flex-shrink-0" width="14" />
										<span class="truncate">{change.text}</span>
									</div>
									<div
										class="mt-0.5 text-center text-[10px] font-bold tracking-wider text-slate-400 uppercase"
									>
										Compared to 10m ago
									</div>
								</div>
							</div>
						</div>

						<!-- Historical Readings Strip -->
						<div class="mb-4">
							<div
								class="grid grid-cols-3 divide-x divide-slate-200/60 rounded-lg border border-slate-200/60 bg-slate-50 py-2"
							>
								<div class="text-center">
									<div class="mb-0.5 text-[9px] font-bold tracking-widest text-slate-400 uppercase">
										10m Ago
									</div>
									<div class="font-bold text-slate-700">
										{station.wl10m || '--'}
										<span class="text-[10px] font-medium text-slate-500">m</span>
									</div>
								</div>
								<div class="text-center">
									<div class="mb-0.5 text-[9px] font-bold tracking-widest text-slate-400 uppercase">
										30m Ago
									</div>
									<div class="font-bold text-slate-700">
										{station.wl30m || '--'}
										<span class="text-[10px] font-medium text-slate-500">m</span>
									</div>
								</div>
								<div class="text-center">
									<div class="mb-0.5 text-[9px] font-bold tracking-widest text-slate-400 uppercase">
										1h Ago
									</div>
									<div class="font-bold text-slate-700">
										{station.wl1h || '--'}
										<span class="text-[10px] font-medium text-slate-500">m</span>
									</div>
								</div>
							</div>
						</div>

						<!-- Warning Levels (if any are set) -->
						{#if station.alertwl || station.alarmwl || station.criticalwl}
							<div class="space-y-2">
								<div class="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
									Warning Thresholds
								</div>
								<div class="flex gap-2 text-xs">
									{#if station.alertwl}
										<div
											class="flex-1 rounded-lg border border-yellow-200/60 bg-yellow-50/50 p-2 text-center"
										>
											<div class="text-[9px] font-bold text-yellow-600 uppercase">Alert</div>
											<div class="font-bold text-yellow-800">{station.alertwl}m</div>
										</div>
									{/if}
									{#if station.alarmwl}
										<div
											class="flex-1 rounded-lg border border-orange-200/60 bg-orange-50/50 p-2 text-center"
										>
											<div class="text-[9px] font-bold text-orange-600 uppercase">Alarm</div>
											<div class="font-bold text-orange-800">{station.alarmwl}m</div>
										</div>
									{/if}
									{#if station.criticalwl}
										<div
											class="flex-1 rounded-lg border border-red-200/60 bg-red-50/50 p-2 text-center"
										>
											<div class="text-[9px] font-bold text-red-600 uppercase">Critical</div>
											<div class="font-bold text-red-800">{station.criticalwl}m</div>
										</div>
									{/if}
								</div>
							</div>
						{/if}
					</div>

					<!-- PAGASA Attribution -->
					<div class="flex justify-center border-t border-slate-100 bg-slate-50/80 px-4 py-2.5">
						<a
							href="https://www.pagasa.dost.gov.ph/flood#koica"
							target="_blank"
							rel="noopener noreferrer"
							class="group flex items-center justify-center gap-2 px-2 py-1 text-xs text-slate-500 transition-all hover:text-slate-800"
							title="Water level data from PAGASA"
						>
							<span class="font-medium">Data from</span>
							<img
								src="/logo/pagasa.png"
								alt="PAGASA"
								class="h-4 w-auto transition-transform group-hover:scale-105"
							/>
							<span class="font-medium">PAGASA</span>
						</a>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	/* Better focus states */
	.water-stations-tab button:focus-visible {
		outline: 2px solid #0c3143;
		outline-offset: 1px;
	}

	/* Compact spacing for narrow layouts */
	.space-y-3 > :not([hidden]) ~ :not([hidden]) {
		margin-top: 0.75rem;
	}

	.space-y-2 > :not([hidden]) ~ :not([hidden]) {
		margin-top: 0.5rem;
	}
</style>
