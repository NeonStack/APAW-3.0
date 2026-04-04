import { json } from '@sveltejs/kit';
import moment from 'moment';
import {
	consumeRequestRateLimit,
	formatRetryDelay
} from '$lib/utils/api/requestRateLimiter.js';

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
export async function GET({ request, getClientAddress }) {
	const rateLimitVerdict = consumeRequestRateLimit({
		request,
		getClientAddress,
		scope: 'api:water-stations',
		maxRequests: 10,
		windowMs: 60 * 1000
	});

	if (!rateLimitVerdict.allowed) {
		const retryAfterHuman = formatRetryDelay(rateLimitVerdict.retryAfterSeconds);
		const retryAfterMinutes = Math.max(1, Math.ceil(rateLimitVerdict.retryAfterSeconds / 60));

		return json(
			{
				error: `Too many requests. Please try again in ${retryAfterHuman}.`,
				retry_after_seconds: rateLimitVerdict.retryAfterSeconds,
				retry_after_minutes: retryAfterMinutes,
				retry_after_human: retryAfterHuman
			},
			{
				status: 429,
				headers: {
					'retry-after': String(rateLimitVerdict.retryAfterSeconds)
				}
			}
		);
	}

	const apiUrl = 'https://pasig-marikina-tullahanffws.pagasa.dost.gov.ph/water/main_list.do';

	try {
		// Add custom headers to disguise the origin of the request
		const response = await fetch(apiUrl);

		if (!response.ok) {
			console.error(`API error! status: ${response.status}`);
			return json({ error: 'Unable to retrieve data' }, { status: 500 });
		}

		const data = await response.json();

		// Process and sanitize the data
		const processedData = data
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
			// Filter out stations with all 0 readings (likely broken)
			.filter(isStationFunctioning);

		return json(processedData);
	} catch (error) {
		console.error('Error fetching data:', error);
		return json({ error: 'Service temporarily unavailable' }, { status: 500 });
	}
}
