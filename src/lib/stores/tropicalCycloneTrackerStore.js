import { writable } from 'svelte/store';

export const tropicalCycloneTrackerStore = writable({
	data: [],
	loading: false,
	error: null
});

export async function fetchTropicalCycloneTracker() {
	tropicalCycloneTrackerStore.update((state) => ({ ...state, loading: true, error: null }));

	try {
		const response = await fetch('/api/tropicalCyclone-tracker');
		if (!response.ok) throw new Error('Failed to fetch data');

		const data = await response.json();
		tropicalCycloneTrackerStore.update((state) => ({ ...state, data }));
	} catch (error) {
		tropicalCycloneTrackerStore.update((state) => ({ ...state, error: error.message }));
	} finally {
		tropicalCycloneTrackerStore.update((state) => ({ ...state, loading: false }));
	}
}

// {
//   "headline": "\"RAMIL\" MAINTAINS ITS STRENGTH AND IS ABOUT TO EXIT THE LUZON LANDMASS.",
//   "issued_at": "2025-10-19T14:00:00+08:00",
//   "storm_name": "RAMIL (FENGSHEN)",
//   "valid_until": "2025-10-19T17:00:00+08:00",
//   "forecast_track": [
//     {
//       "lat": 14.9,
//       "lon": 120.3,
//       "msw_kmh": 65,
//       "category": "TS",
//       "location": "vicinity of Olongapo City, Zambales",
//       "movement": "WNW 15",
//       "date_time": "2025-10-19T13:00:00+08:00"
//     },
//     ...
//     {
//       "lat": 15.3,
//       "lon": 108.5,
//       "msw_kmh": 85,
//       "category": "TS",
//       "location": "1,230 km West of Central Luzon (OUTSIDE PAR)",
//       "movement": "SW 10",
//       "date_time": "2025-10-23T11:00:00+08:00"
//     }
//   ]
// }