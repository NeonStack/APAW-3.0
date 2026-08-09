import { writable } from 'svelte/store';

function getPhilippineDate() {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Asia/Manila'
	}).format(new Date());
}

export const automatedFloodAlerts = writable({
	loading: true,
	data: [],
	error: null,
	selectedForecastIndex: 0,
	showOnMap: true,
	meta: {
		request_date: getPhilippineDate(),
		forecast_indices: [0],
		min_probability: 0.5,
		count: 0,
		next_refresh_at: null
	}
});

export const focusedAutomatedAlert = writable(null);

export function setAutomatedAlertsForecastIndex(index) {
	automatedFloodAlerts.update((store) => ({
		...store,
		selectedForecastIndex: Number.isInteger(Number(index)) ? Number(index) : 0
	}));
}

export function setAutomatedAlertsMapVisibility(isVisible) {
	automatedFloodAlerts.update((store) => ({
		...store,
		showOnMap: Boolean(isVisible)
	}));
}

export async function fetchAutomatedFloodAlerts({
	requestDate,
	forecastIndices = [0, 1, 2, 3, 4],
	minProbability = 0.5
} = {}) {
	automatedFloodAlerts.update((store) => ({ ...store, loading: true, error: null }));

	try {
		const params = new URLSearchParams();
		if (requestDate) params.set('request_date', requestDate);
		params.set('forecast_index', forecastIndices.join(','));
		params.set('min_probability', String(minProbability));

		const response = await fetch(`/api/automated-flood-detection?${params.toString()}`);
		if (!response.ok) {
			const errorPayload = await response.json().catch(() => ({}));
			throw new Error(errorPayload?.error || `Error fetching automated alerts: ${response.status}`);
		}

		const payload = await response.json();
		automatedFloodAlerts.update((store) => ({
			...store,
			loading: false,
			data: Array.isArray(payload?.data) ? payload.data : [],
			error: null,
			meta: {
				request_date: payload?.meta?.request_date || requestDate || getPhilippineDate(),
				forecast_indices:
					Array.isArray(payload?.meta?.forecast_indices) && payload.meta.forecast_indices.length > 0
						? payload.meta.forecast_indices
						: forecastIndices,
				min_probability:
					typeof payload?.meta?.min_probability === 'number'
						? payload.meta.min_probability
						: minProbability,
				count: Number(payload?.meta?.count ?? 0),
				next_refresh_at: payload?.meta?.next_refresh_at || null,
				// Use triggered_at from any data row — all rows in a run share the same triggered_at
				generated_at:
					(Array.isArray(payload?.data) && payload.data.length > 0
						? payload.data[0].triggered_at
						: null) ||
					payload?.meta?.generated_at ||
					null
			}
		}));
	} catch (error) {
		console.error('Failed to load automated flood alerts:', error);
		automatedFloodAlerts.set({
			loading: false,
			data: [],
			error: error.message || 'Unable to load automated flood alerts.',
			selectedForecastIndex: 0,
			showOnMap: true,
			meta: {
				request_date: requestDate || getPhilippineDate(),
				forecast_indices: forecastIndices,
				min_probability: minProbability,
				count: 0,
				next_refresh_at: null
			}
		});
	}
}
