const DEFAULT_FORECAST_INDICES = [0, 1, 2, 3, 4];
const DEFAULT_MIN_PROBABILITY = 0.5;

async function fetchJson(fetchFn, endpoint, referer) {
	try {
		const response = await fetchFn(endpoint, {
			headers: {
				referer
			}
		});

		let payload = null;
		try {
			payload = await response.json();
		} catch {
			payload = null;
		}

		if (!response.ok) {
			return {
				ok: false,
				data: null,
				error:
					payload?.error || payload?.message || `Request failed with status ${response.status}`
			};
		}

		return { ok: true, data: payload, error: null };
	} catch (error) {
		return {
			ok: false,
			data: null,
			error: error?.message || 'Request failed'
		};
	}
}

export async function load({ fetch, url }) {
	const referer = `${url.origin}${url.pathname}`;
	const automatedQuery =
		`/api/automated-flood-detection?forecast_index=${DEFAULT_FORECAST_INDICES.join(',')}` +
		`&min_probability=${DEFAULT_MIN_PROBABILITY}`;

	const [weatherResult, waterStationsResult, tropicalCycloneResult, advisoryResult, automatedResult] =
		await Promise.all([
			fetchJson(fetch, '/api/get-weather', referer),
			fetchJson(fetch, '/api/water-stations', referer),
			fetchJson(fetch, '/api/tropicalCyclone-tracker', referer),
			fetchJson(fetch, '/api/general-flood-advisory', referer),
			fetchJson(fetch, automatedQuery, referer)
		]);

	const automatedPayload = automatedResult?.data && typeof automatedResult.data === 'object'
		? automatedResult.data
		: null;
	const bootstrapOk =
		weatherResult.ok ||
		waterStationsResult.ok ||
		tropicalCycloneResult.ok ||
		advisoryResult.ok ||
		automatedResult.ok;

	return {
		bootstrapAt: new Date().toISOString(),
		bootstrapOk,
		initialData: {
			weather: {
				data: Array.isArray(weatherResult.data) ? weatherResult.data : [],
				error: weatherResult.error
			},
			waterStations: {
				data: Array.isArray(waterStationsResult.data) ? waterStationsResult.data : [],
				error: waterStationsResult.error
			},
			tropicalCyclone: {
				data: Array.isArray(tropicalCycloneResult.data) ? tropicalCycloneResult.data : [],
				error: tropicalCycloneResult.error
			},
			generalFloodAdvisory: {
				data: advisoryResult.ok ? (advisoryResult.data ?? null) : null,
				error: advisoryResult.error
			},
			automatedFloodAlerts: {
				data: Array.isArray(automatedPayload?.data) ? automatedPayload.data : [],
				meta:
					automatedPayload?.meta && typeof automatedPayload.meta === 'object'
						? automatedPayload.meta
						: {
							request_date: null,
							forecast_indices: DEFAULT_FORECAST_INDICES,
							min_probability: DEFAULT_MIN_PROBABILITY,
							count: 0
						},
				error: automatedResult.error
			}
		}
	};
}
