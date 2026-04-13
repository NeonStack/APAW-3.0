import { json } from '@sveltejs/kit';
import moment from 'moment';
import { getSupabaseServiceClient } from '$lib/server/supabaseClient.js';
import { consumeRequestRateLimit } from '$lib/utils/api/requestRateLimiter.js';
import { createRateLimitResponse } from '$lib/utils/api/rateLimitResponse.js';

const PAGASA_API_URL = 'https://pasig-marikina-tullahanffws.pagasa.dost.gov.ph/water/main_list.do';
const WATER_STATIONS_CACHE_TABLE = 'pagasa_water_stations_cache';
const WATER_STATIONS_CACHE_KEY = 'ACTIVE_PAGASA_WATER_STATIONS';
const SUCCESS_CACHE_MINS = 10;
const ERROR_RETRY_MINS = 5;

let refreshInFlight = null;

// Helper function to clean water level string
function cleanWaterLevel(wl) {
	if (typeof wl !== 'string') return wl;
	return wl.replace(/\(\*\)|\(\)|\*/g, '').trim();
}

// Helper function to check if a station is functioning (not all zeros)
function isStationFunctioning(station) {
	const readings = [station.wl, station.wl10m, station.wl30m, station.wl1h, station.wl2h];
	// A station is considered non-functional if all its recent water level readings are zero.
	// We use `some` to check if at least one reading is non-zero, which is more efficient.
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
			timestr: moment(station.timestr, 'YYYY-MM-DD HH:mm').format('MMM D • h:mm A'),
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
	return Array.isArray(cacheRow?.stations_data) ? cacheRow.stations_data : [];
}

async function readCacheRow(supabase) {
	const { data, error } = await supabase
		.from(WATER_STATIONS_CACHE_TABLE)
		.select('stations_data, cache_expiry_time')
		.eq('cache_key', WATER_STATIONS_CACHE_KEY)
		.maybeSingle();

	if (error) {
		console.error('Water stations cache read failed:', error);
		return null;
	}

	return data || null;
}

async function writeSuccessCache(supabase, stations, now = new Date()) {
	const cacheExpiryTime = new Date(now.getTime() + SUCCESS_CACHE_MINS * 60 * 1000).toISOString();

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

async function writeErrorSnooze(supabase, now = new Date()) {
	const retryAt = new Date(now.getTime() + ERROR_RETRY_MINS * 60 * 1000).toISOString();
	const { error } = await supabase.from(WATER_STATIONS_CACHE_TABLE).upsert(
		{
			cache_key: WATER_STATIONS_CACHE_KEY,
			cache_expiry_time: retryAt,
			last_attempt_at: now.toISOString(),
			source: 'pagasa_error_snooze'
		},
		{ onConflict: 'cache_key' }
	);

	if (error) {
		console.error('Water stations cache snooze update failed:', error);
	}
}

async function fetchLiveStationsFromPagasa() {
	const response = await fetch(PAGASA_API_URL);
	if (!response.ok) {
		throw new Error(`PAGASA request failed with status ${response.status}`);
	}

	const payload = await response.json();
	return normalizeStations(payload);
}

async function refreshCacheFromPagasa(supabase) {
	const stations = await fetchLiveStationsFromPagasa();
	await writeSuccessCache(supabase, stations, new Date());
	return stations;
}

async function refreshCacheSingleFlight(supabase) {
	if (!refreshInFlight) {
		refreshInFlight = (async () => {
			try {
				return await refreshCacheFromPagasa(supabase);
			} finally {
				refreshInFlight = null;
			}
		})();
	}

	return refreshInFlight;
}

function getSupabaseClientSafe() {
	try {
		return getSupabaseServiceClient();
	} catch (error) {
		console.error('Failed to initialize Supabase client for water stations:', error);
		return null;
	}
}

export async function GET({ request, getClientAddress }) {
	const rateLimitVerdict = consumeRequestRateLimit({
		request,
		getClientAddress,
		scope: 'api:water-stations',
		maxRequests: 10,
		windowMs: 60 * 1000
	});

	if (!rateLimitVerdict.allowed) {
		return createRateLimitResponse(rateLimitVerdict);
	}

	const supabase = getSupabaseClientSafe();
	if (!supabase) {
		try {
			const liveStations = await fetchLiveStationsFromPagasa();
			return json(liveStations);
		} catch (error) {
			console.error('Water stations live fetch failed without Supabase fallback:', error);
			return json({ error: 'Service temporarily unavailable' }, { status: 500 });
		}
	}

	const now = new Date();
	const cacheRow = await readCacheRow(supabase);
	const cachedStations = extractCachedStations(cacheRow);

	if (cachedStations.length > 0 && isCacheFresh(cacheRow, now)) {
		return json(cachedStations);
	}

	try {
		const freshStations = await refreshCacheSingleFlight(supabase);
		return json(Array.isArray(freshStations) ? freshStations : []);
	} catch (error) {
		console.error('Water stations refresh failed:', error);
		await writeErrorSnooze(supabase, now);

		if (cachedStations.length > 0) {
			console.warn('Serving stale water stations cache due to PAGASA failure.');
			return json(cachedStations);
		}

		return json({ error: 'Service temporarily unavailable' }, { status: 500 });
	}
}
