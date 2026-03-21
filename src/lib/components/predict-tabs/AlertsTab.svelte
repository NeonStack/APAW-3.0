<script>
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';
	import FilterButton from '$lib/components/FilterButton.svelte';
	import {
		automatedFloodAlerts,
		fetchAutomatedFloodAlerts,
		focusedAutomatedAlert,
		setAutomatedAlertsForecastIndex,
		setAutomatedAlertsMapVisibility
	} from '$lib/stores/automatedFloodAlertStore.js';

	const FIXED_MIN_PROBABILITY = 0.5;

	let alertsValue = $derived($automatedFloodAlerts);
	let selectedIndex = $derived(alertsValue.selectedForecastIndex ?? 0);

	function toDateLabel(dateText) {
		if (!dateText) return 'Unknown date';
		const parsed = new Date(`${dateText}T00:00:00`);
		if (Number.isNaN(parsed.getTime())) return dateText;
		return new Intl.DateTimeFormat('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}).format(parsed);
	}

	let dateChips = $derived.by(() => {
		const chipMap = new Map();
		for (const item of alertsValue.data) {
			const idx = Number(item.forecast_index);
			if (!Number.isInteger(idx) || idx < 0 || idx > 4) continue;
			if (!chipMap.has(idx)) {
				chipMap.set(idx, {
					index: idx,
					date: item.forecast_date,
					label: toDateLabel(item.forecast_date)
				});
			}
		}

		if (chipMap.size === 0) {
			for (let idx = 0; idx <= 4; idx += 1) {
				chipMap.set(idx, { index: idx, date: null, label: `Day ${idx + 1}` });
			}
		}

		return [...chipMap.values()].sort((a, b) => a.index - b.index);
	});

	let filteredAlerts = $derived(
		alertsValue.data
			.filter((item) => Number(item.forecast_index) === Number(selectedIndex))
			.filter((item) => Number(item.flood_probability) >= FIXED_MIN_PROBABILITY)
			.sort((a, b) => Number(b.flood_probability) - Number(a.flood_probability))
	);

	function probabilityLabel(probability) {
		return `${(Number(probability) * 100).toFixed(1)}%`;
	}

	function riskClass(probability) {
		const p = Number(probability);
		if (p >= 0.8) return 'bg-red-100 text-red-700 border-red-200';
		if (p >= 0.65) return 'bg-orange-100 text-orange-700 border-orange-200';
		return 'bg-yellow-100 text-yellow-700 border-yellow-200';
	}

	function riskSummary(probability) {
		const p = Number(probability);
		if (p >= 0.8) return 'Very high flood likelihood';
		if (p >= 0.65) return 'High flood likelihood';
		return 'Elevated flood watch';
	}

	async function refreshAlerts() {
		await fetchAutomatedFloodAlerts({
			requestDate: alertsValue.meta?.request_date,
			forecastIndices: [0, 1, 2, 3, 4],
			minProbability: FIXED_MIN_PROBABILITY
		});
	}

	function focusAlert(item) {
		setAutomatedAlertsForecastIndex(Number(item.forecast_index));
		focusedAutomatedAlert.set(item);
	}

	onMount(async () => {
		if ((alertsValue?.data?.length ?? 0) === 0) {
			await fetchAutomatedFloodAlerts({
				forecastIndices: [0, 1, 2, 3, 4],
				minProbability: FIXED_MIN_PROBABILITY
			});
		}
	});
</script>

<div class="space-y-3">
	<div class="flex items-center justify-between gap-2">
		<FilterButton onclick={refreshAlerts} className="grow max-w-44">
			<Icon icon="mdi:refresh" width="15" />
			<span class="hidden sm:inline">Refresh Alerts</span>
			<span class="sm:hidden">Refresh</span>
		</FilterButton>

		<button
			type="button"
			class="flex cursor-pointer items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
			onclick={() => setAutomatedAlertsMapVisibility(!alertsValue.showOnMap)}
		>
			<Icon icon={alertsValue.showOnMap ? 'mdi:eye' : 'mdi:eye-off'} width="14" />
			{alertsValue.showOnMap ? 'Map Alerts On' : 'Map Alerts Off'}
		</button>
	</div>

	<div class="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700">
		Showing automated alerts with probability 50% and above.
	</div>

	<div class="rounded-lg border border-gray-200 bg-gray-50 p-3">
		<p class="mb-2 text-xs font-semibold text-[#0c3143]">Forecast Date</p>
		<div class="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
			{#each dateChips as chip}
				<button
					type="button"
					class="rounded px-2 py-2 text-left text-xs font-medium transition-colors {selectedIndex ===
					chip.index
						? 'bg-[#0c3143] text-white'
						: 'bg-white text-gray-700 hover:bg-gray-100'}"
					onclick={() => setAutomatedAlertsForecastIndex(chip.index)}
				>
					{chip.label}
				</button>
			{/each}
		</div>
	</div>

	{#if alertsValue.loading}
		<div class="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center text-sm text-blue-700">
			Loading automated alerts...
		</div>
	{:else if alertsValue.error}
		<div class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
			{alertsValue.error}
		</div>
	{:else if filteredAlerts.length === 0}
		<div class="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
			No high-confidence alerts for this forecast date.
		</div>
	{:else}
		<div class="space-y-2">
			{#each filteredAlerts as item (item.id)}
				<div class="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
					<div class="mb-2 flex items-center justify-between gap-2">
						<p class="text-sm font-semibold text-gray-800">{item.location_name}</p>
						<span
							class="rounded border px-2 py-0.5 text-xs font-semibold {riskClass(
								item.flood_probability
							)}"
						>
							{probabilityLabel(item.flood_probability)}
						</span>
					</div>
					<div class="mb-2 text-xs text-gray-500">{toDateLabel(item.forecast_date)}</div>
					<p class="mb-2 text-xs text-gray-700">{riskSummary(item.flood_probability)}</p>
					<button
						type="button"
						class="flex cursor-pointer items-center gap-1 rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
						onclick={() => focusAlert(item)}
					>
						<Icon icon="mdi:crosshairs-gps" width="12" />
						Focus on Map
					</button>
				</div>
			{/each}
		</div>
	{/if}
</div>
