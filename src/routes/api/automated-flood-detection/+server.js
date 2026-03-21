import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';

const HF_API_URL = 'https://hunterexist2-apaw-hourly-docker-2.hf.space/predict_flood_with_data';
const WATER_STATIONS_API_URL =
	'https://pasig-marikina-tullahanffws.pagasa.dost.gov.ph/water/main_list.do';
const TARGET_TABLE = 'automated_flood_detection';
const COORDINATES_TABLE = 'automated_detection_locations';
const MAX_CONCURRENCY = 2;
const MAX_RETRIES = 2;
const UPSERT_BATCH_SIZE = 10;

import {
	SUPABASE_URL,
	SUPABASE_SERVICE_KEY,
	JOB_TRIGGER_SECRET,
	APAW_HF_API_KEY,
	VITE_HF_TOKEN
} from '$env/static/private';

let supabaseClient = null;

function getSupabaseClient() {
	if (!supabaseClient) {
		supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
	}
	return supabaseClient;
}

const PRECONFIGURED_COORDINATES = [];

function cleanWaterLevel(wl) {
	if (typeof wl !== 'string') return wl;
	return wl.replace(/\(\*\)|\(\)|\*/g, '').trim();
}

function isStationFunctioning(station) {
	const readings = [station.wl, station.wl10m, station.wl30m, station.wl1h, station.wl2h];
	return readings.some((wl) => parseFloat(wl || 0) !== 0);
}

function getPhilippineDate() {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Asia/Manila'
	}).format(new Date());
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

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeSecret(value) {
	if (typeof value !== 'string') return '';
	const trimmed = value.trim();
	if (
		(trimmed.startsWith('\"') && trimmed.endsWith('\"')) ||
		(trimmed.startsWith("'") && trimmed.endsWith("'"))
	) {
		return trimmed.slice(1, -1).trim();
	}
	return trimmed;
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

async function fetchElevation(lat, lng) {
	try {
		const response = await fetch(
			`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`
		);
		if (!response.ok) {
			throw new Error(`Open-Meteo API failed with status: ${response.status}`);
		}
		const data = await response.json();
		if (data.elevation && Array.isArray(data.elevation) && data.elevation[0] !== null) {
			return { elevation: data.elevation[0] };
		}
		throw new Error('Invalid data format from Open-Meteo.');
	} catch (error) {
		console.warn(`Could not fetch elevation from Open-Meteo: ${error.message}. Falling back...`);

		try {
			const fallbackResponse = await fetch(
				`https://api.opentopodata.org/v1/srtm30m?locations=${lat},${lng}`
			);
			if (!fallbackResponse.ok) {
				return {
					error: 'Failed to fetch elevation data from fallback API.',
					status: fallbackResponse.status
				};
			}
			const fallbackData = await fallbackResponse.json();
			if (
				fallbackData.results &&
				fallbackData.results.length > 0 &&
				fallbackData.results[0].elevation !== null
			) {
				return { elevation: fallbackData.results[0].elevation };
			}
			return {
				error: fallbackData.error || 'Elevation data not found for the selected coordinates.',
				status: 404
			};
		} catch (fallbackError) {
			console.error('Internal error fetching elevation from fallback:', fallbackError);
			return {
				error: 'Internal server error while fetching elevation from all sources.',
				status: 500
			};
		}
	}
}

async function fetchWaterStations() {
	const response = await fetch(WATER_STATIONS_API_URL);
	if (!response.ok) {
		throw new Error(`Water stations API failed with status ${response.status}`);
	}
	const data = await response.json();
	return data
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

async function fetchConfiguredCoordinates() {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(COORDINATES_TABLE)
		.select('coordinate_id, location_name, latitude, longitude, is_active')
		.order('location_name', { ascending: true });

	if (error) {
		console.warn(
			`[automated-flood-detection] Could not load coordinates from ${COORDINATES_TABLE}. Using fallback list. Error: ${error.message}`
		);
		return PRECONFIGURED_COORDINATES;
	}

	const configured = (data ?? [])
		.filter((row) => row.is_active !== false)
		.map((row) => ({
			coordinate_id: String(row.coordinate_id ?? '').trim(),
			location_name: String(row.location_name ?? '').trim(),
			lat: Number(row.latitude),
			lon: Number(row.longitude)
		}))
		.filter(
			(row) =>
				row.coordinate_id &&
				row.location_name &&
				Number.isFinite(row.lat) &&
				Number.isFinite(row.lon)
		);

	if (configured.length === 0) {
		console.warn(
			`[/automated-flood-detection] ${COORDINATES_TABLE} has no valid active rows. Using fallback list.`
		);
		return PRECONFIGURED_COORDINATES;
	}

	return configured;
}

async function requestPredictionWithRetry(payload) {
	let lastError = null;

	for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
		try {
			const hfToken = normalizeSecret(VITE_HF_TOKEN);

			const response = await fetch(HF_API_URL, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${hfToken}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payload)
			});

			let result;
			try {
				result = await response.json();
			} catch {
				result = { message: 'Invalid JSON response from prediction service.' };
			}

			const isInvalidResponse =
				!response.ok || result.status === 'error' || result.status === 'invalid';
			if (!isInvalidResponse) {
				return { ok: true, result };
			}

			const retryable = response.status >= 500 || response.status === 429;
			lastError = {
				message: result.message || 'Prediction service returned an error.',
				status: response.status,
				result
			};

			if (!retryable || attempt === MAX_RETRIES) {
				return { ok: false, error: lastError };
			}
		} catch (error) {
			lastError = {
				message: error.message || 'Network error while requesting prediction service.'
			};
			if (attempt === MAX_RETRIES) {
				return { ok: false, error: lastError };
			}
		}

		const backoffMs = 1000 * 2 ** attempt;
		await sleep(backoffMs);
	}

	return {
		ok: false,
		error: lastError || { message: 'Unknown prediction error.' }
	};
}

function pickCoordinates(controls, sourceCoordinates = PRECONFIGURED_COORDINATES) {
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

function normalizePredictionResponse(result) {
	if (Array.isArray(result) && result.length > 0) {
		return result[0];
	}
	return result;
}

function deriveRiskLevelFromProbability(probability) {
	if (probability === null) return null;
	const percentage = probability * 100;
	if (percentage <= 50) return 'Low Flood Risk';
	if (percentage <= 60) return 'Moderate Flood Risk';
	if (percentage <= 80) return 'High Flood Risk';
	return 'Very High Flood Risk';
}

function deriveDailyMetrics(day) {
	const hourlyForecast = Array.isArray(day?.hourly_forecast) ? day.hourly_forecast : [];
	const probabilities = hourlyForecast
		.map((hour) => toNumberOrNull(hour?.final_prediction?.flood_probability))
		.filter((value) => value !== null);

	const derivedProbability =
		probabilities.length > 0
			? Math.max(...probabilities)
			: toNumberOrNull(day?.flood_probability ?? day?.probability ?? day?.chance_of_flood);

	const derivedRiskLevel =
		day?.risk_level ?? day?.flood_risk_level ?? deriveRiskLevelFromProbability(derivedProbability);

	const floodedHours = hourlyForecast.filter(
		(hour) => Number(hour?.final_prediction?.is_flooded) === 1
	).length;

	return {
		riskLevel: derivedRiskLevel,
		floodProbability: derivedProbability,
		floodedHours,
		hourlyCount: hourlyForecast.length
	};
}

function summarizeForecastDay(day) {
	const metrics = deriveDailyMetrics(day);
	const hourlyForecast = Array.isArray(day?.hourly_forecast) ? day.hourly_forecast : [];
	let maxPredictedHeightCm = null;
	for (const hour of hourlyForecast) {
		const value = toNumberOrNull(hour?.final_prediction?.predicted_height_cm);
		if (value === null) continue;
		if (maxPredictedHeightCm === null || value > maxPredictedHeightCm) {
			maxPredictedHeightCm = value;
		}
	}

	return {
		date: day?.date ?? day?.datetime ?? null,
		risk_level: metrics.riskLevel,
		flood_probability: metrics.floodProbability,
		flooded_hours: metrics.floodedHours,
		hourly_count: metrics.hourlyCount,
		max_predicted_height_cm: maxPredictedHeightCm
	};
}

function summarizeModelPayload(prediction) {
	return {
		status: prediction?.status ?? null,
		model_version: prediction?.model_version ?? null,
		warnings: Array.isArray(prediction?.warnings) ? prediction.warnings : []
	};
}

async function upsertRowsInBatches(supabase, rows, runId) {
	const totalBatches = Math.ceil(rows.length / UPSERT_BATCH_SIZE);
	for (let index = 0; index < rows.length; index += UPSERT_BATCH_SIZE) {
		const batchNumber = Math.floor(index / UPSERT_BATCH_SIZE) + 1;
		const batch = rows.slice(index, index + UPSERT_BATCH_SIZE);
		const { error } = await supabase
			.from(TARGET_TABLE)
			.upsert(batch, { onConflict: 'coordinate_id,forecast_date,request_date' });

		console.log(
			`[automated-flood-detection] run_id=${runId} upsert batch ${batchNumber}/${totalBatches} size=${batch.length} error=${error ? error.message : 'none'}`
		);

		if (error) return error;
	}

	return null;
}

function flattenForecastRows({
	coordinate,
	runId,
	triggeredAt,
	triggerSource,
	inputDate,
	prediction
}) {
	const forecastByDay = Array.isArray(prediction?.forecast_by_day)
		? prediction.forecast_by_day
		: [];

	return forecastByDay.map((day, index) => {
		const metrics = deriveDailyMetrics(day);
		return {
			run_id: runId,
			triggered_at: triggeredAt,
			trigger_source: triggerSource,
			coordinate_id: coordinate.coordinate_id,
			location_name: coordinate.location_name,
			latitude: coordinate.lat,
			longitude: coordinate.lon,
			request_date: inputDate,
			forecast_date: day.date || day.datetime || null,
			forecast_index: index,
			risk_level: metrics.riskLevel,
			flood_probability: metrics.floodProbability,
			forecast_payload: summarizeForecastDay(day),
			model_payload: summarizeModelPayload(prediction)
		};
	});
}

export async function POST({ request, url }) {
	const authHeader = request.headers.get('Authorization') ?? request.headers.get('authorization');
	const receivedToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
	const expectedToken = JOB_TRIGGER_SECRET?.trim();

	console.log('[automated-flood-detection] Received authHeader:', authHeader);
	console.log('[automated-flood-detection] Expected token:', `Bearer ${expectedToken}`);
	console.log('[automated-flood-detection] Auth debug:', {
		receivedLen: receivedToken?.length ?? 0,
		expectedLen: expectedToken?.length ?? 0,
		startsWithBearer: Boolean(authHeader?.startsWith('Bearer ')),
		isMatch: receivedToken === expectedToken
	});

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

	const availableCoordinates = await fetchConfiguredCoordinates();
	const selectedCoordinates = pickCoordinates(controls, availableCoordinates);
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
	console.log('[automated-flood-detection] HF credential debug:', {
		apiKeyLen: normalizedHfApiKey.length,
		apiKeyPrefix: normalizedHfApiKey.slice(0, 4),
		apiKeySuffix: normalizedHfApiKey.slice(-4),
		hfTokenLen: normalizedHfToken.length,
		hfTokenPrefix: normalizedHfToken.slice(0, 4),
		hfTokenSuffix: normalizedHfToken.slice(-4)
	});
	console.log(
		`[automated-flood-detection] run_id=${runId} starting with ${selectedCoordinates.length} coordinates`
	);

	let waterStationData = [];
	try {
		waterStationData = await fetchWaterStations();
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

	const perCoordinateResults = await runWithConcurrency(
		selectedCoordinates,
		MAX_CONCURRENCY,
		async (coordinate) => {
			const base = {
				coordinate_id: coordinate.coordinate_id,
				location_name: coordinate.location_name,
				lat: coordinate.lat,
				lon: coordinate.lon
			};

			const elevationResult = await fetchElevation(coordinate.lat, coordinate.lon);
			if (elevationResult.error) {
				return {
					...base,
					status: 'failed',
					error: elevationResult.error
				};
			}

			const payload = {
				latitude: coordinate.lat,
				longitude: coordinate.lon,
				date_str: controls.inputDate,
				elevation_m: elevationResult.elevation,
				water_station_data: waterStationData,
				api_key: normalizedHfApiKey
			};

			const predictionResponse = await requestPredictionWithRetry(payload);
			if (!predictionResponse.ok) {
				return {
					...base,
					status: 'failed',
					error: predictionResponse.error?.message || 'Prediction request failed.',
					error_payload: predictionResponse.error?.result || null
				};
			}

			console.log(`[automated-flood-detection] run_id=  prediction successful`);
			const normalizedPrediction = normalizePredictionResponse(predictionResponse.result);
			const firstForecastDay = normalizedPrediction?.forecast_by_day?.[0];
			console.log('[automated-flood-detection] HF response sample:', {
				coordinate_id: coordinate.coordinate_id,
				status: normalizedPrediction?.status ?? null,
				firstDayKeys: firstForecastDay ? Object.keys(firstForecastDay) : [],
				firstHourFinalPrediction: firstForecastDay?.hourly_forecast?.[0]?.final_prediction ?? null
			});
			const rows = flattenForecastRows({
				coordinate,
				runId,
				triggeredAt,
				triggerSource: controls.triggerSource,
				inputDate: controls.inputDate,
				prediction: normalizedPrediction
			});

			if (rows.length === 0) {
				return {
					...base,
					status: 'failed',
					error: 'Prediction completed but forecast_by_day was empty.'
				};
			}

			return {
				...base,
				status: 'success',
				rows
			};
		}
	);

	const rowsToUpsert = perCoordinateResults
		.filter((item) => item.status === 'success')
		.flatMap((item) => item.rows);

	console.log(
		`[automated-flood-detection] run_id=${runId} preparing to upsert ${rowsToUpsert.length} rows`
	);

	if (rowsToUpsert.length > 0) {
		const supabase = getSupabaseClient();
		const upsertError = await upsertRowsInBatches(supabase, rowsToUpsert, runId);
		if (upsertError) {
			return json(
				{
					run_id: runId,
					status: 'error',
					message: 'Failed to upsert automated flood detection rows.',
					details: upsertError.message
				},
				{ status: 500 }
			);
		}
	}

	const failedItems = perCoordinateResults.filter((item) => item.status === 'failed');
	const summary = {
		run_id: runId,
		triggered_at: triggeredAt,
		trigger_source: controls.triggerSource,
		request_date: controls.inputDate,
		concurrency: MAX_CONCURRENCY,
		total_available: availableCoordinates.length,
		selected_count: selectedCoordinates.length,
		succeeded_count: perCoordinateResults.length - failedItems.length,
		failed_count: failedItems.length,
		inserted_or_updated_rows: rowsToUpsert.length
	};

	const httpStatus = failedItems.length > 0 ? 207 : 200;
	return json(
		{
			message:
				failedItems.length > 0
					? 'Automated flood detection run completed with partial failures.'
					: 'Automated flood detection run completed successfully.',
			summary,
			failures: failedItems
		},
		{ status: httpStatus }
	);
}
