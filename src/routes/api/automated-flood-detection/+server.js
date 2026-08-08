import { json } from '@sveltejs/kit';
import https from 'node:https';
import { getSupabaseServiceClient } from '$lib/server/supabaseClient.js';

import {
	SUPABASE_URL,
	SUPABASE_SERVICE_KEY,
	JOB_TRIGGER_SECRET,
	APAW_HF_API_KEY,
	VITE_HF_TOKEN
} from '$env/static/private';

const HF_BATCH_API_URL =
	'https://hunterexist2-apaw-hourly-docker-2.hf.space/predict_flood_with_data_batch_persist';
const WATER_STATIONS_API_URL =
	'https://pasig-marikina-tullahanffws.pagasa.dost.gov.ph/water/main_list.do';
const WATER_STATIONS_CACHE_TABLE = 'pagasa_water_stations_cache';
const WATER_STATIONS_CACHE_KEY = 'ACTIVE_PAGASA_WATER_STATIONS';
const WATER_STATIONS_CACHE_SUCCESS_MINS = 10;
const COORDINATES_TABLE = 'automated_detection_locations';
const AUTOMATED_FLOOD_TABLE = 'automated_flood_detection';
const MAX_CONCURRENCY = 2;
const MAX_RETRIES = 2;
const HF_BATCH_TIMEOUT_MS = 180000;
const PHILIPPINE_UTC_OFFSET_MS = 8 * 60 * 60 * 1000;
const AUTOMATED_REFRESH_SCHEDULE_HOURS = [7, 13, 19];
const AUTOMATED_REFRESH_SCHEDULE_MINUTE = 30;

function msSince(startedAt) {
	return Date.now() - startedAt;
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeSecret(value) {
	if (typeof value !== 'string') return '';
	const trimmed = value.trim();
	if (
		(trimmed.startsWith('"') && trimmed.endsWith('"')) ||
		(trimmed.startsWith("'") && trimmed.endsWith("'"))
	) {
		return trimmed.slice(1, -1).trim();
	}
	return trimmed;
}

function cleanWaterLevel(wl) {
	if (typeof wl !== 'string') return wl;
	return wl.replace(/\(\*\)|\(\)|\*/g, '').trim();
}

function isStationFunctioning(station) {
	const readings = [station.wl, station.wl10m, station.wl30m, station.wl1h, station.wl2h];
	return readings.some((wl) => parseFloat(wl || 0) !== 0);
}

function normalizeStations(rawStations) {
	if (!Array.isArray(rawStations)) return [];

	return rawStations
		.map((station) => ({
			obscd: station.obscd,
			obsnm: station.obsnm,
			lon: station.lon,
			lat: station.lat,
			wl: cleanWaterLevel(station.wl),
			wl10m: cleanWaterLevel(station.wl10m),
			wl30m: cleanWaterLevel(station.wl30m),
			wl1h: cleanWaterLevel(station.wl1h),
			wl2h: cleanWaterLevel(station.wl2h),
			wlchange: station.wlchange,
			alertwl: station.alertwl,
			alarmwl: station.alarmwl,
			criticalwl: station.criticalwl
		}))
		.filter(isStationFunctioning);
}

function isCacheFresh(cacheRow, now = new Date()) {
	const expiryMs = Date.parse(String(cacheRow?.cache_expiry_time || ''));
	return Number.isFinite(expiryMs) && expiryMs > now.getTime();
}

function extractCachedStations(cacheRow) {
	const raw = cacheRow?.stations_data;
	if (Array.isArray(raw)) return raw;
	if (typeof raw === 'string') {
		try {
			const parsed = JSON.parse(raw);
			return Array.isArray(parsed) ? parsed : [];
		} catch {
			return [];
		}
	}
	return [];
}

function getCacheAgeMs(cacheRow, now = new Date()) {
	const lastSuccessMs = Date.parse(String(cacheRow?.last_success_at || ''));
	return Number.isFinite(lastSuccessMs) ? now.getTime() - lastSuccessMs : null;
}

async function readStationsCache(supabase) {
	const { data, error } = await supabase
		.from(WATER_STATIONS_CACHE_TABLE)
		.select('stations_data, cache_expiry_time, last_success_at')
		.eq('cache_key', WATER_STATIONS_CACHE_KEY)
		.maybeSingle();

	if (error) {
		console.warn('[automated-flood-detection] Water stations cache read failed:', error);
		return null;
	}

	return data || null;
}

async function writeSuccessCache(supabase, stations, now = new Date()) {
	const cacheExpiryTime = new Date(
		now.getTime() + WATER_STATIONS_CACHE_SUCCESS_MINS * 60 * 1000
	).toISOString();

	const { error } = await supabase.from(WATER_STATIONS_CACHE_TABLE).upsert(
		{
			cache_key: WATER_STATIONS_CACHE_KEY,
			stations_data: stations,
			station_count: stations.length,
			cache_expiry_time: cacheExpiryTime,
			last_attempt_at: now.toISOString(),
			last_success_at: now.toISOString(),
			source: 'pagasa_live'
		},
		{ onConflict: 'cache_key' }
	);

	if (error) {
		throw new Error(`Failed to update water stations cache: ${error.message}`);
	}
}

function fetchPagasaJson(url) {
	return new Promise((resolve, reject) => {
		https
			.get(url, { rejectUnauthorized: false }, (res) => {
				if (res.statusCode < 200 || res.statusCode >= 300) {
					return reject(new Error(`PAGASA request failed with status ${res.statusCode}`));
				}
				let data = '';
				res.on('data', (chunk) => (data += chunk));
				res.on('end', () => {
					try {
						resolve(JSON.parse(data));
					} catch (err) {
						reject(err);
					}
				});
			})
			.on('error', reject);
	});
}

async function fetchLiveStationsFromPagasa() {
	const data = await fetchPagasaJson(WATER_STATIONS_API_URL);
	return normalizeStations(data);
}

function getPhilippineDate() {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Asia/Manila'
	}).format(new Date());
}

function getNextAutomatedRefreshAt(now = new Date()) {
	const nowMs = now.getTime();
	const manilaNow = new Date(nowMs + PHILIPPINE_UTC_OFFSET_MS);
	const year = manilaNow.getUTCFullYear();
	const month = manilaNow.getUTCMonth();
	const day = manilaNow.getUTCDate();

	for (let dayOffset = 0; dayOffset <= 2; dayOffset += 1) {
		for (const hour of AUTOMATED_REFRESH_SCHEDULE_HOURS) {
			const candidateAsUtcMs = Date.UTC(
				year,
				month,
				day + dayOffset,
				hour,
				AUTOMATED_REFRESH_SCHEDULE_MINUTE,
				0,
				0
			);
			const realUtcMs = candidateAsUtcMs - PHILIPPINE_UTC_OFFSET_MS;
			if (realUtcMs > nowMs) {
				return new Date(realUtcMs).toISOString();
			}
		}
	}

	return new Date(nowMs + 6 * 60 * 60 * 1000).toISOString();
}

function toNumberOrNull(value) {
	const num = Number(value);
	return Number.isFinite(num) ? num : null;
}

function parseBoolean(value) {
	if (typeof value === 'boolean') return value;
	if (typeof value !== 'string') return false;
	return value.toLowerCase() === 'true';
}

function parseInteger(value, fallback) {
	if (value === undefined || value === null || value === '') return fallback;
	const parsed = Number.parseInt(String(value), 10);
	return Number.isFinite(parsed) ? parsed : fallback;
}

function parseIds(value) {
	if (!value) return [];
	if (Array.isArray(value)) return value.map((id) => String(id).trim()).filter(Boolean);
	return String(value)
		.split(',')
		.map((id) => id.trim())
		.filter(Boolean);
}

function parseForecastIndices(value) {
	const raw = parseIds(value);
	if (raw.length === 0) return [0];
	const parsed = raw
		.map((item) => Number.parseInt(item, 10))
		.filter((item) => Number.isInteger(item) && item >= 0 && item <= 4);
	return parsed.length > 0 ? [...new Set(parsed)] : [0];
}

function parseProbability(value, fallback = 0.5) {
	if (value === undefined || value === null || value === '') return fallback;
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) return fallback;
	if (parsed < 0) return 0;
	if (parsed > 1) return 1;
	return parsed;
}

function normalizeStaticParams(rawValue) {
	let parsed = rawValue;
	if (typeof parsed === 'string') {
		try {
			parsed = JSON.parse(parsed);
		} catch {
			parsed = null;
		}
	}
	if (!parsed || typeof parsed !== 'object') return null;

	const output = {
		elevation_m: toNumberOrNull(parsed.elevation_m),
		dist_to_nearest_river_m: toNumberOrNull(parsed.dist_to_nearest_river_m),
		dist_to_river_m: toNumberOrNull(parsed.dist_to_river_m),
		dist_to_stream_m: toNumberOrNull(parsed.dist_to_stream_m),
		dist_to_canal_m: toNumberOrNull(parsed.dist_to_canal_m),
		dist_to_drain_m: toNumberOrNull(parsed.dist_to_drain_m),
		dist_to_ditch_m: toNumberOrNull(parsed.dist_to_ditch_m),
		waterway_elevation_m: toNumberOrNull(parsed.waterway_elevation_m),
		elevation_diff_to_waterway_m: toNumberOrNull(parsed.elevation_diff_to_waterway_m),
		distance_to_water_m: toNumberOrNull(parsed.distance_to_water_m)
	};

	const hasAnyValue = Object.values(output).some((value) => value !== null);
	return hasAnyValue ? output : null;
}

async function runWithConcurrency(items, concurrency, worker) {
	const results = new Array(items.length);
	let cursor = 0;

	const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
		while (cursor < items.length) {
			const currentIndex = cursor;
			cursor += 1;
			results[currentIndex] = await worker(items[currentIndex], currentIndex);
		}
	});

	await Promise.all(runners);
	return results;
}

async function fetchWaterStationsWithFallback() {
	const supabase = getSupabaseServiceClient();
	const now = new Date();
	const cacheRow = await readStationsCache(supabase);
	const cachedStations = normalizeStations(extractCachedStations(cacheRow));
	const cacheAgeMs = getCacheAgeMs(cacheRow, now);
	const cacheStale = cacheRow ? !isCacheFresh(cacheRow, now) : null;

	try {
		const liveStations = await fetchLiveStationsFromPagasa();
		if (liveStations.length > 0) {
			try {
				await writeSuccessCache(supabase, liveStations, now);
			} catch (error) {
				console.warn('[automated-flood-detection] Water stations cache write failed:', error);
			}
			return {
				stations: liveStations,
				meta: {
					source: 'pagasa_live',
					cache_age_ms: null,
					cache_stale: null
				}
			};
		}
	} catch (error) {
		console.warn('[automated-flood-detection] Water stations live fetch failed:', error);
	}

	if (cachedStations.length > 0) {
		return {
			stations: cachedStations,
			meta: {
				source: 'supabase_cache',
				cache_age_ms: cacheAgeMs,
				cache_stale: cacheStale
			}
		};
	}

	throw new Error('No available water station data from PAGASA or cache.');
}

async function fetchConfiguredCoordinates() {
	const supabase = getSupabaseServiceClient();
	let { data, error } = await supabase
		.from(COORDINATES_TABLE)
		.select(
			'coordinate_id, location_name, latitude, longitude, is_active, static_params, static_params_version, static_params_computed_at'
		)
		.order('location_name', { ascending: true });

	if (error) {
		console.warn(
			`[automated-flood-detection] Could not load extended coordinate fields from ${COORDINATES_TABLE}. Retrying with base fields. Error: ${error.message}`
		);

		const fallbackQuery = await supabase
			.from(COORDINATES_TABLE)
			.select('coordinate_id, location_name, latitude, longitude, is_active')
			.order('location_name', { ascending: true });

		if (fallbackQuery.error) {
			throw new Error(`Could not load coordinates: ${fallbackQuery.error.message}`);
		}

		data = fallbackQuery.data;
	}

	const configured = (data ?? [])
		.filter((row) => row.is_active !== false)
		.map((row) => ({
			coordinate_id: String(row.coordinate_id ?? '').trim(),
			location_name: String(row.location_name ?? '').trim(),
			lat: Number(row.latitude),
			lon: Number(row.longitude),
			static_params: normalizeStaticParams(row?.static_params)
		}))
		.filter(
			(row) =>
				row.coordinate_id &&
				row.location_name &&
				Number.isFinite(row.lat) &&
				Number.isFinite(row.lon)
		);

	return configured;
}

function pickCoordinates(controls, sourceCoordinates) {
	let selected = [...sourceCoordinates];
	if (controls.ids.length > 0) {
		const idSet = new Set(controls.ids);
		selected = selected.filter((item) => idSet.has(item.coordinate_id));
	}
	if (controls.offset > 0) {
		selected = selected.slice(controls.offset);
	}
	if (controls.limit > 0) {
		selected = selected.slice(0, controls.limit);
	}
	return selected;
}

async function requestBatchPredictionWithRetry(payload, runId = 'n/a') {
	let lastError = null;

	for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
		const attemptStartedAt = Date.now();
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), HF_BATCH_TIMEOUT_MS);

		try {
			const hfToken = normalizeSecret(VITE_HF_TOKEN);
			const payloadText = JSON.stringify(payload);
			console.log(
				`[automated-flood-detection] run_id=${runId} hf_batch attempt=${attempt + 1} payload_bytes=${payloadText.length} timeout_ms=${HF_BATCH_TIMEOUT_MS} start`
			);

			const headersStartedAt = Date.now();
			const response = await fetch(HF_BATCH_API_URL, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${hfToken}`,
					'Content-Type': 'application/json'
				},
				body: payloadText,
				signal: controller.signal
			});

			const headersMs = msSince(headersStartedAt);
			const contentLength = response.headers.get('content-length') ?? 'unknown';
			console.log(
				`[automated-flood-detection] run_id=${runId} hf_batch attempt=${attempt + 1} headers_received_ms=${headersMs} status=${response.status} content_length=${contentLength}`
			);

			const bodyStartedAt = Date.now();
			const resultText = await response.text();
			const bodyMs = msSince(bodyStartedAt);
			console.log(
				`[automated-flood-detection] run_id=${runId} hf_batch attempt=${attempt + 1} body_read_ms=${bodyMs} body_bytes=${resultText.length}`
			);

			let result;
			try {
				result = resultText ? JSON.parse(resultText) : {};
			} catch (parseError) {
				console.warn(
					`[automated-flood-detection] run_id=${runId} hf_batch attempt=${attempt + 1} body_parse_failed name=${parseError.name ?? 'Error'} message=${parseError.message}`
				);
				result = {
					status: 'error',
					message: 'Invalid JSON response from batch prediction service.'
				};
			}

			const isInvalidResponse = !response.ok || result.status === 'error';
			if (!isInvalidResponse) {
				console.log(
					`[automated-flood-detection] run_id=${runId} hf_batch attempt=${attempt + 1} success total_attempt_ms=${msSince(attemptStartedAt)}`
				);
				return { ok: true, result };
			}

			const retryable = response.status >= 500 || response.status === 429;
			lastError = {
				message: result.message || 'Batch prediction service returned an error.',
				status: response.status,
				result
			};

			console.warn(
				`[automated-flood-detection] run_id=${runId} hf_batch attempt=${attempt + 1} failed status=${response.status} retryable=${retryable} total_attempt_ms=${msSince(attemptStartedAt)} message=${lastError.message}`
			);

			if (!retryable || attempt === MAX_RETRIES) {
				return { ok: false, error: lastError };
			}
		} catch (error) {
			const wasTimeout = error?.name === 'AbortError';
			lastError = {
				message: wasTimeout
					? `Batch prediction request timed out after ${HF_BATCH_TIMEOUT_MS}ms.`
					: error.message || 'Network error while requesting batch prediction service.'
			};
			console.warn(
				`[automated-flood-detection] run_id=${runId} hf_batch attempt=${attempt + 1} transport_error timeout=${wasTimeout} total_attempt_ms=${msSince(attemptStartedAt)} message=${lastError.message}`
			);
			if (attempt === MAX_RETRIES) {
				return { ok: false, error: lastError };
			}
		} finally {
			clearTimeout(timeoutId);
		}

		const backoffMs = 1000 * 2 ** attempt;
		console.log(
			`[automated-flood-detection] run_id=${runId} hf_batch retrying_in_ms=${backoffMs} next_attempt=${attempt + 2}`
		);
		await sleep(backoffMs);
	}

	return {
		ok: false,
		error: lastError || { message: 'Unknown batch prediction error.' }
	};
}

export async function GET({ url }) {
	if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
		return json({ error: 'Configuration error: Supabase variables are missing.' }, { status: 500 });
	}

	const supabase = getSupabaseServiceClient();
	const requestedDate = url.searchParams.get('request_date');
	const requestedRunId = url.searchParams.get('run_id');
	const forecastIndices = parseForecastIndices(url.searchParams.get('forecast_index'));
	const minProbability = parseProbability(url.searchParams.get('min_probability'), 0.5);

	let requestDate = requestedDate;
	let runId = requestedRunId;
	if (!requestDate && !runId) {
		requestDate = getPhilippineDate();
	}

	let query = supabase
		.from(AUTOMATED_FLOOD_TABLE)
		.select(
			'id, run_id, triggered_at, trigger_source, coordinate_id, location_name, latitude, longitude, request_date, forecast_date, forecast_index, risk_level, flood_probability, forecast_payload, model_payload'
		)
		.gte('flood_probability', minProbability)
		.order('flood_probability', { ascending: false })
		.order('location_name', { ascending: true });

	if (runId) {
		query = query.eq('run_id', runId);
	} else if (requestedDate) {
		query = query.eq('request_date', requestDate);
	}

	if (forecastIndices.length > 0) {
		query = query.in('forecast_index', forecastIndices);
	}

	const { data, error } = await query;
	if (error) {
		return json(
			{ error: 'Failed to fetch automated flood alerts.', details: error.message },
			{ status: 500 }
		);
	}

	const normalized = (data ?? []).map((row) => ({
		...row,
		lat: Number(row.latitude),
		lon: Number(row.longitude)
	}));
	const generatedAt = new Date();

	return json({
		data: normalized,
		meta: {
			request_date: requestDate,
			run_id: runId,
			snapshot_mode: runId ? 'run' : requestedDate ? 'request_date' : 'aggregate',
			forecast_indices: forecastIndices,
			min_probability: minProbability,
			count: normalized.length,
			next_refresh_at: getNextAutomatedRefreshAt(generatedAt),
			generated_at: generatedAt.toISOString()
		}
	});
}

export async function POST({ request, url }) {
	const requestStartedAt = Date.now();
	const authHeader = request.headers.get('Authorization') ?? request.headers.get('authorization');
	const receivedToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
	const expectedToken = JOB_TRIGGER_SECRET?.trim();

	if (receivedToken == null || receivedToken !== expectedToken) {
		return json({ error: 'Unauthorized: Invalid or missing secret token.' }, { status: 401 });
	}

	const normalizedHfApiKey = normalizeSecret(APAW_HF_API_KEY);
	const normalizedHfToken = normalizeSecret(VITE_HF_TOKEN);

	if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !normalizedHfApiKey || !normalizedHfToken) {
		return json(
			{ error: 'Configuration error: Required server environment variables are missing.' },
			{ status: 500 }
		);
	}

	let body = {};
	try {
		body = await request.json();
	} catch {
		body = {};
	}

	const controls = {
		limit: parseInteger(body.limit ?? url.searchParams.get('limit'), 0),
		offset: parseInteger(body.offset ?? url.searchParams.get('offset'), 0),
		ids: parseIds(body.ids ?? url.searchParams.get('ids')),
		dryRun: parseBoolean(body.dry_run ?? url.searchParams.get('dry_run')),
		inputDate: String(body.date ?? url.searchParams.get('date') ?? getPhilippineDate()),
		triggerSource: String(body.trigger_source ?? 'github-actions')
	};

	let availableCoordinates = [];
	const coordinatesLoadStartedAt = Date.now();
	try {
		availableCoordinates = await fetchConfiguredCoordinates();
	} catch (error) {
		return json(
			{ error: 'Failed to load configured coordinates.', details: error.message },
			{ status: 500 }
		);
	}
	const selectedCoordinates = pickCoordinates(controls, availableCoordinates);
	const coordinatesLoadMs = msSince(coordinatesLoadStartedAt);

	if (selectedCoordinates.length === 0) {
		return json(
			{
				message: 'No coordinates selected after applying filters.',
				controls,
				total_available: availableCoordinates.length
			},
			{ status: 400 }
		);
	}

	if (controls.dryRun) {
		return json({
			message: 'Dry run completed.',
			controls,
			total_available: availableCoordinates.length,
			selected_count: selectedCoordinates.length,
			selected_coordinates: selectedCoordinates
		});
	}

	const runId = crypto.randomUUID();
	const triggeredAt = new Date().toISOString();

	let waterStationData = [];
	let waterStationsMeta = { source: 'unknown', cache_age_ms: null, cache_stale: null };
	const waterStationsStartedAt = Date.now();
	try {
		const waterStationsResult = await fetchWaterStationsWithFallback();
		waterStationData = waterStationsResult.stations;
		waterStationsMeta = waterStationsResult.meta;
	} catch (error) {
		return json(
			{
				run_id: runId,
				status: 'error',
				message: 'Failed to fetch water station data.',
				details: error.message
			},
			{ status: 503 }
		);
	}
	const waterStationsFetchMs = msSince(waterStationsStartedAt);

	const coordinatePrepStartedAt = Date.now();
	const preparedCoordinates = await runWithConcurrency(
		selectedCoordinates,
		MAX_CONCURRENCY,
		async (coordinate) => {
			const precomputedStaticParams = normalizeStaticParams(coordinate.static_params);

			return {
				coordinate_id: coordinate.coordinate_id,
				location_name: coordinate.location_name,
				lat: coordinate.lat,
				lon: coordinate.lon,
				precomputed_static_params: precomputedStaticParams,
				status: 'ready'
			};
		}
	);

	const coordinatePrepMs = msSince(coordinatePrepStartedAt);
	const readyCoordinates = preparedCoordinates.filter((item) => item.status === 'ready');

	const batchPayload = {
		run_id: runId,
		trigger_source: controls.triggerSource,
		date_str: controls.inputDate,
		water_station_data: waterStationData,
		api_key: normalizedHfApiKey,
		coordinates: readyCoordinates.map((coordinate) => ({
			coordinate_id: coordinate.coordinate_id,
			location_name: coordinate.location_name,
			latitude: coordinate.lat,
			longitude: coordinate.lon,
			precomputed_static_params: coordinate.precomputed_static_params
		}))
	};

	const hfBatchStartedAt = Date.now();
	const batchPredictionResponse = await requestBatchPredictionWithRetry(batchPayload, runId);
	const hfBatchRequestMs = msSince(hfBatchStartedAt);

	if (!batchPredictionResponse.ok) {
		return json(
			{
				run_id: runId,
				status: 'error',
				message: 'Batch prediction request failed.',
				details: batchPredictionResponse.error?.message || 'Unknown batch prediction error.'
			},
			{ status: 502 }
		);
	}

	const hfSummary = batchPredictionResponse.result?.summary ?? {};
	const hfFailures = Array.isArray(batchPredictionResponse.result?.failures)
		? batchPredictionResponse.result.failures
		: [];
	const allFailures = [...hfFailures];
	const totalMs = msSince(requestStartedAt);

	const summary = {
		run_id: batchPredictionResponse.result?.run_id ?? runId,
		triggered_at: triggeredAt,
		trigger_source: controls.triggerSource,
		request_date: controls.inputDate,
		water_stations_source: waterStationsMeta.source,
		water_stations_cache_age_ms: waterStationsMeta.cache_age_ms,
		water_stations_cache_stale: waterStationsMeta.cache_stale,
		concurrency: MAX_CONCURRENCY,
		total_available: availableCoordinates.length,
		selected_count: selectedCoordinates.length,
		succeeded_count: Number(hfSummary.success ?? 0),
		failed_count: allFailures.length,
		inserted_or_updated_rows: Number(hfSummary.rows_upserted ?? 0),
		static_params_persist_attempted: Number(hfSummary.success ?? 0),
		static_params_persisted: Number(hfSummary.static_params_persisted ?? 0),
		static_params_persist_error: null,
		persistence_mode: 'huggingface-direct',
		timing_ms: {
			total: totalMs,
			coordinates_load: coordinatesLoadMs,
			water_stations_fetch: waterStationsFetchMs,
			coordinate_prep: coordinatePrepMs,
			hf_batch_request: hfBatchRequestMs,
			hf_internal_batch: toNumberOrNull(hfSummary.total_timing_ms),
			hf_db_write: toNumberOrNull(hfSummary.db_timing_ms)
		}
	};

	const httpStatus = allFailures.length > 0 ? 207 : 200;
	return json(
		{
			message:
				allFailures.length > 0
					? 'Automated flood detection run completed with partial failures (HF direct persist).'
					: 'Automated flood detection run completed successfully (HF direct persist).',
			summary,
			failures: allFailures
		},
		{ status: httpStatus }
	);
}
