import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';

const HF_API_URL = 'https://hunterexist2-apaw-hourly-docker-2.hf.space/predict_flood_with_data';
const WATER_STATIONS_API_URL =
	'https://pasig-marikina-tullahanffws.pagasa.dost.gov.ph/water/main_list.do';
const TARGET_TABLE = 'automated_flood_detection';
const MAX_CONCURRENCY = 2;
const MAX_RETRIES = 2;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const JOB_TRIGGER_SECRET = process.env.JOB_TRIGGER_SECRET;
const APAW_HF_API_KEY = process.env.APAW_HF_API_KEY;
const VITE_HF_TOKEN = process.env.VITE_HF_TOKEN;

let supabaseClient = null;

function getSupabaseClient() {
	if (!supabaseClient) {
		supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
	}
	return supabaseClient;
}

const PRECONFIGURED_COORDINATES = [
	{ coordinate_id: 'manila', location_name: 'Manila', lat: 14.604595, lon: 120.982569 },
	{ coordinate_id: 'mandaluyong', location_name: 'Mandaluyong', lat: 14.582112, lon: 121.039043 },
	{ coordinate_id: 'marikina', location_name: 'Marikina', lat: 14.64806, lon: 121.104192 },
	{ coordinate_id: 'pasig', location_name: 'Pasig', lat: 14.572916, lon: 121.081955 },
	{ coordinate_id: 'quezon-city', location_name: 'Quezon City', lat: 14.649734, lon: 121.039224 },
	{ coordinate_id: 'san-juan', location_name: 'San Juan', lat: 14.602108, lon: 121.035626 },
	{
		coordinate_id: 'caloocan-north',
		location_name: 'Caloocan (North)',
		lat: 14.761262,
		lon: 121.045706
	},
	{
		coordinate_id: 'caloocan-south',
		location_name: 'Caloocan (South)',
		lat: 14.651013,
		lon: 120.980904
	},
	{ coordinate_id: 'malabon', location_name: 'Malabon', lat: 14.67242, lon: 120.957245 },
	{ coordinate_id: 'navotas', location_name: 'Navotas', lat: 14.666291, lon: 120.941 },
	{ coordinate_id: 'valenzuela', location_name: 'Valenzuela', lat: 14.707549, lon: 120.982046 },
	{ coordinate_id: 'las-pinas', location_name: 'Las Piñas', lat: 14.443451, lon: 120.994801 },
	{ coordinate_id: 'makati', location_name: 'Makati', lat: 14.551987, lon: 121.024302 },
	{ coordinate_id: 'muntinlupa', location_name: 'Muntinlupa', lat: 14.402166, lon: 121.030928 },
	{ coordinate_id: 'paranaque', location_name: 'Parañaque', lat: 14.473714, lon: 121.020472 },
	{ coordinate_id: 'pasay', location_name: 'Pasay', lat: 14.534401, lon: 121.001278 },
	{ coordinate_id: 'pateros', location_name: 'Pateros', lat: 14.54508, lon: 121.069831 },
	{ coordinate_id: 'taguig', location_name: 'Taguig', lat: 14.517084, lon: 121.0572 }
];

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

async function requestPredictionWithRetry(payload) {
	let lastError = null;

	for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
		try {
			const response = await fetch(HF_API_URL, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${VITE_HF_TOKEN}`,
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

function pickCoordinates(controls) {
	let selected = [...PRECONFIGURED_COORDINATES];
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

	return forecastByDay.map((day, index) => ({
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
		risk_level: day.risk_level || day.flood_risk_level || null,
		flood_probability: toNumberOrNull(
			day.flood_probability ?? day.probability ?? day.chance_of_flood
		),
		forecast_payload: day,
		model_payload: prediction
	}));
}

export async function POST({ request, url }) {
	const authHeader = request.headers.get('Authorization');
	if (authHeader !== `Bearer ${JOB_TRIGGER_SECRET}`) {
		return json({ error: 'Unauthorized: Invalid or missing secret token.' }, { status: 401 });
	}

	if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !APAW_HF_API_KEY || !VITE_HF_TOKEN) {
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

	const selectedCoordinates = pickCoordinates(controls);
	if (selectedCoordinates.length === 0) {
		return json(
			{
				message: 'No coordinates selected after applying filters.',
				controls,
				total_available: PRECONFIGURED_COORDINATES.length
			},
			{ status: 400 }
		);
	}

	if (controls.dryRun) {
		return json({
			message: 'Dry run completed.',
			controls,
			total_available: PRECONFIGURED_COORDINATES.length,
			selected_count: selectedCoordinates.length,
			selected_coordinates: selectedCoordinates
		});
	}

	const runId = crypto.randomUUID();
	const triggeredAt = new Date().toISOString();
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
				api_key: APAW_HF_API_KEY
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

			const normalizedPrediction = normalizePredictionResponse(predictionResponse.result);
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

	if (rowsToUpsert.length > 0) {
		const supabase = getSupabaseClient();
		const { error: upsertError } = await supabase
			.from(TARGET_TABLE)
			.upsert(rowsToUpsert, { onConflict: 'coordinate_id,forecast_date,request_date' });
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
		total_available: PRECONFIGURED_COORDINATES.length,
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
