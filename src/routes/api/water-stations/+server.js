import { json } from '@sveltejs/kit';
import moment from 'moment';

// Helper function to clean water level string
function cleanWaterLevel(wl) {
  if (typeof wl !== 'string') return wl;
  return wl.replace(/\(\*\)|\(\)|\*/g, '').trim();
}

// Helper function to check if a station is functioning (not all zeros)
function isStationFunctioning(station) {
  // Convert water level readings to numbers (or 0 if undefined/null)
  const wl = parseFloat(station.wl || 0);
  const wl10m = parseFloat(station.wl10m || 0);
  const wl30m = parseFloat(station.wl30m || 0);
  const wl1h = parseFloat(station.wl1h || 0);
  const wl2h = parseFloat(station.wl1h || 0);
  
  // Check if all readings are 0 (likely broken)
  const allZeros = wl === 0 && wl10m === 0 && wl30m === 0 && wl1h === 0 && wl2h === 0;
  
  // Return true if station is not all zeros (is functioning)
  return !allZeros;
}

// Add server-side protection
export async function GET({ request }) {
  // Basic security check - verify request is from our own site
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');
  
  // Only allow requests from our own website
  if (!referer || !referer.includes(host)) {
    console.warn('Potential unauthorized API access attempt');
    return json({ error: 'Unauthorized access' }, { status: 403 });
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
      .map(station => ({
        obsnm: station.obsnm,
        lon: station.lon,
        lat: station.lat,
        timestr: moment(station.timestr, 'YYYY-MM-DD HH:mm').format('MMMM D, YYYY [at] h:mm A'),
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