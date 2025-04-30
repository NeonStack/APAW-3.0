import { json } from '@sveltejs/kit';
import moment from 'moment'; // Import moment

// Helper function to clean water level string
function cleanWaterLevel(wl) {
  if (typeof wl !== 'string') return wl; // Return as is if not a string
  return wl.replace(/\(\*\)|\(\)|\*/g, '').trim(); // Remove (*), (), *
}

export async function GET() {
  const apiUrl = 'https://pasig-marikina-tullahanffws.pagasa.dost.gov.ph/water/main_list.do';

  try {
    const response = await fetch(apiUrl);

    if (!response.ok) {
      console.error(`PAGASA API error! status: ${response.status}`);
      return json({ error: 'Failed to fetch water station data from external API' }, { status: response.status });
    }

    const data = await response.json();

    // Process the data
    const processedData = data.map(station => ({
      obsnm: station.obsnm,
      lon: station.lon,
      lat: station.lat,
      // Format date using moment
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
      // Exclude obscd, agctype, ymdhm, icon
    }));

    return json(processedData);

  } catch (error) {
    console.error('Error fetching or processing water station data:', error);
    return json({ error: 'Internal server error while fetching water station data' }, { status: 500 });
  }
}