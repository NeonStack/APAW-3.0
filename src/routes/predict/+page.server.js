import { fail } from '@sveltejs/kit';

const DEFAULT_FORECAST_INDICES = [0, 1, 2, 3, 4];
const DEFAULT_MIN_PROBABILITY = 0.5;
const ACTION_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const ACTION_RATE_LIMIT_MAX_REQUESTS = 40;

const actionRateBuckets = new Map();

async function fetchJson(fetchFn, endpoint, referer, options = {}) {
	try {
		const response = await fetchFn(endpoint, {
			...options,
			cache: 'no-store',
			headers: {
				'cache-control': 'no-cache',
				pragma: 'no-cache',
				referer,
				...(options.headers || {})
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
				status: response.status,
				payload,
				error: payload?.error || payload?.message || `Request failed with status ${response.status}`
			};
		}

		return { ok: true, data: payload, error: null, status: response.status, payload };
	} catch (error) {
		return {
			ok: false,
			data: null,
			status: 503,
			payload: null,
			error: error?.message || 'Request failed'
		};
	}
}

function parsePayloadFromFormData(formData) {
	const raw = formData.get('payload');
	if (typeof raw !== 'string' || raw.trim().length === 0) {
		return {};
	}

	try {
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === 'object' ? parsed : {};
	} catch {
		throw new Error('Invalid payload format');
	}
}

function actionFailure(status, message, details = null) {
	return fail(status, {
		status: 'error',
		message,
		details
	});
}

function getClientAddressFromRequest(request) {
	const forwardedFor = request.headers.get('x-forwarded-for');
	if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
		return forwardedFor.split(',')[0].trim();
	}

	const realIp = request.headers.get('x-real-ip');
	if (typeof realIp === 'string' && realIp.trim()) {
		return realIp.trim();
	}

	return 'unknown_client';
}

function consumeActionRateLimit(clientAddress, actionName) {
	const key = `${actionName}:${clientAddress}`;
	const now = Date.now();
	const existing = actionRateBuckets.get(key);

	let bucket = existing;
	if (!bucket || now > bucket.resetAt) {
		bucket = { count: 0, resetAt: now + ACTION_RATE_LIMIT_WINDOW_MS };
	}

	bucket.count += 1;
	actionRateBuckets.set(key, bucket);

	if (bucket.count <= ACTION_RATE_LIMIT_MAX_REQUESTS) {
		return { allowed: true, retryAfterSeconds: 0 };
	}

	const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
	return { allowed: false, retryAfterSeconds };
}

function enforceActionRateLimit(request, actionName) {
	const clientAddress = getClientAddressFromRequest(request);
	const verdict = consumeActionRateLimit(clientAddress, actionName);

	if (verdict.allowed) return null;

	return actionFailure(429, 'Too many requests. Please try again shortly.', {
		action: actionName,
		retry_after_seconds: verdict.retryAfterSeconds
	});
}

export async function load({ fetch, url, setHeaders }) {
	setHeaders({
		'cache-control': 'no-store, max-age=0'
	});

	const referer = `${url.origin}${url.pathname}`;
	const automatedQuery =
		`/api/automated-flood-detection?forecast_index=${DEFAULT_FORECAST_INDICES.join(',')}` +
		`&min_probability=${DEFAULT_MIN_PROBABILITY}`;

	const [
		weatherResult,
		waterStationsResult,
		tropicalCycloneResult,
		advisoryResult,
		automatedResult
	] = await Promise.all([
		fetchJson(fetch, '/api/get-weather', referer),
		fetchJson(fetch, '/api/water-stations', referer),
		fetchJson(fetch, '/api/tropicalCyclone-tracker', referer),
		fetchJson(fetch, '/api/general-flood-advisory', referer),
		fetchJson(fetch, automatedQuery, referer)
	]);

	const advisoryPayload = advisoryResult?.data;
	const advisoryEnvelope =
		advisoryPayload && typeof advisoryPayload === 'object' && !Array.isArray(advisoryPayload)
			? advisoryPayload
			: null;
	const advisoryData =
		advisoryEnvelope && Object.hasOwn(advisoryEnvelope, 'data')
			? (advisoryEnvelope.data ?? null)
			: (advisoryPayload ?? null);
	const advisoryMeta =
		advisoryEnvelope?.meta && typeof advisoryEnvelope.meta === 'object'
			? advisoryEnvelope.meta
			: {
					next_refresh_at: null
				};

	const automatedPayload =
		automatedResult?.data && typeof automatedResult.data === 'object' ? automatedResult.data : null;
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
				data: advisoryResult.ok ? advisoryData : null,
				meta: advisoryMeta,
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
								count: 0,
								next_refresh_at: null
							},
				error: automatedResult.error
			}
		}
	};
}

export const actions = {
	async predictFlood({ request, fetch, url }) {
		const rateLimited = enforceActionRateLimit(request, 'predictFlood');
		if (rateLimited) return rateLimited;

		let payload;
		try {
			const formData = await request.formData();
			payload = parsePayloadFromFormData(formData);
		} catch (error) {
			return actionFailure(400, error?.message || 'Invalid request payload');
		}

		const referer = `${url.origin}${url.pathname}`;
		const result = await fetchJson(fetch, '/api/flood-prediction', referer, {
			method: 'POST',
			headers: {
				'content-type': 'application/json'
			},
			body: JSON.stringify(payload)
		});

		const responseData = result.payload;
		if (!result.ok || responseData?.status === 'error' || responseData?.status === 'invalid') {
			return actionFailure(
				result.status || 502,
				responseData?.message || result.error || 'Failed to fetch prediction',
				responseData
			);
		}

		return {
			status: 'success',
			payload: responseData
		};
	},

	async pawiSummary({ request, fetch, url }) {
		const rateLimited = enforceActionRateLimit(request, 'pawiSummary');
		if (rateLimited) return rateLimited;

		let payload;
		try {
			const formData = await request.formData();
			payload = parsePayloadFromFormData(formData);
		} catch (error) {
			return actionFailure(400, error?.message || 'Invalid request payload');
		}

		const referer = `${url.origin}${url.pathname}`;
		const result = await fetchJson(fetch, '/api/pawi-summary', referer, {
			method: 'POST',
			headers: {
				'content-type': 'application/json'
			},
			body: JSON.stringify(payload)
		});

		const responseData = result.payload;
		if (!result.ok || responseData?.status === 'error' || responseData?.status === 'invalid') {
			return actionFailure(
				result.status || 502,
				responseData?.message || result.error || 'Failed to generate Pawi summary',
				responseData
			);
		}

		return {
			status: 'success',
			payload: responseData
		};
	},

	async weatherLocationForecast({ request, fetch, url }) {
		const rateLimited = enforceActionRateLimit(request, 'weatherLocationForecast');
		if (rateLimited) return rateLimited;

		let payload;
		try {
			const formData = await request.formData();
			payload = parsePayloadFromFormData(formData);
		} catch (error) {
			return actionFailure(400, error?.message || 'Invalid request payload');
		}

		const location =
			typeof payload?.location === 'string' && payload.location.trim()
				? payload.location.trim()
				: null;

		if (!location) {
			return actionFailure(400, 'location is required');
		}

		const referer = `${url.origin}${url.pathname}`;
		const endpoint = `/api/get-weather?location=${encodeURIComponent(location)}`;
		const result = await fetchJson(fetch, endpoint, referer);

		if (!result.ok) {
			return actionFailure(
				result.status || 502,
				result.error || 'Failed to fetch location forecast'
			);
		}

		return {
			status: 'success',
			payload: Array.isArray(result.payload) ? result.payload : []
		};
	}
};
