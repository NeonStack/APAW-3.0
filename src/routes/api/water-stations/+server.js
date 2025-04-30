import { json } from '@sveltejs/kit';
import moment from 'moment';
import { PAGASA_API_URL } from '$env/static/private'; // Import from .env

// Helper function to clean water level string
function cleanWaterLevel(wl) {
  if (typeof wl !== 'string') return wl;
  return wl.replace(/\(\*\)|\(\)|\*/g, '').trim();
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

  // Use environment variable instead of hardcoded URL
  const apiUrl = PAGASA_API_URL || 'https://pasig-marikina-tullahanffws.pagasa.dost.gov.ph/water/main_list.do';

  try {
    // Add custom headers to disguise the origin of the request
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://pagasa.dost.gov.ph/'
      }
    });

    if (!response.ok) {
      console.error(`API error! status: ${response.status}`);
      return json({ error: 'Unable to retrieve data' }, { status: 500 });
    }

    const data = await response.json();

    // Process and sanitize the data
    const processedData = data.map(station => ({
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
    }));

    return json(processedData);
  } catch (error) {
    console.error('Error fetching data:', error);
    return json({ error: 'Service temporarily unavailable' }, { status: 500 });
  }
}