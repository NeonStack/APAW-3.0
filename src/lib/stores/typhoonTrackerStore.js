import { writable } from 'svelte/store';

export const typhoonTrackerStore = writable({
	data: [],
	loading: false,
	error: null
});

export async function fetchTyphoonTracker() {
	typhoonTrackerStore.update((state) => ({ ...state, loading: true, error: null }));

	try {
		const response = await fetch('/api/typhoon-tracker');
		if (!response.ok) throw new Error('Failed to fetch data');

		const data = await response.json();
		typhoonTrackerStore.update((state) => ({ ...state, data }));
	} catch (error) {
		typhoonTrackerStore.update((state) => ({ ...state, error: error.message }));
	} finally {
		typhoonTrackerStore.update((state) => ({ ...state, loading: false }));
	}
}

// {
// 			storm_name: 'Tropical Storm RAMIL (FENGSHEN)',
// 			issued_at: '2025-10-18T17:00:00',
// 			valid_until: '2025-10-18T20:00:00',
// 			forecast_track: [
// 				{
// 					date_time: '2:00 AM 19 October 2025',
// 					location: 'Over the coastal waters of Jomalig, Quezon',
// 					lat: 14.7,
// 					lon: 122.5,
// 					msw_kmh: 75,
// 					category: 'TS',
// 					movement: 'NW 25'
// 				},
// 				{
// 					date_time: '2:00 PM 19 October 2025',
// 					location: 'Over the coastal waters of Aringay, La Union',
// 					lat: 16.4,
// 					lon: 120.3,
// 					msw_kmh: 75,
// 					category: 'TS',
// 					movement: 'NW 25'
// 				},
// 				{
// 					date_time: '2:00 AM 20 October 2025',
// 					location: '285 km West of Sinait, Ilocos Sur',
// 					lat: 17.7,
// 					lon: 117.8,
// 					msw_kmh: 75,
// 					category: 'TS',
// 					movement: 'WNW 25'
// 				},
// 				{
// 					date_time: '2:00 PM 20 October 2025',
// 					location: '450 km West of Batac, Ilocos Norte (OUTSIDE PAR)',
// 					lat: 18.3,
// 					lon: 116.3,
// 					msw_kmh: 95,
// 					category: 'STS',
// 					movement: 'WNW 15'
// 				},
// 				{
// 					date_time: '2:00 AM 21 October 2025',
// 					location: '585 km West of Laoag City, Ilocos Norte (OUTSIDE PAR)',
// 					lat: 18.6,
// 					lon: 115.0,
// 					msw_kmh: 100,
// 					category: 'STS',
// 					movement: 'WNW 10'
// 				},
// 				{
// 					date_time: '2:00 PM 21 October 2025',
// 					location: '670 km West of Laoag City, Ilocos Norte (OUTSIDE PAR)',
// 					lat: 18.5,
// 					lon: 114.2,
// 					msw_kmh: 110,
// 					category: 'STS',
// 					movement: 'W Slowly'
// 				},
// 				{
// 					date_time: '2:00 PM 22 October 2025',
// 					location: '830 km West of Northern Luzon (OUTSIDE PAR)',
// 					lat: 17.3,
// 					lon: 112.6,
// 					msw_kmh: 110,
// 					category: 'STS',
// 					movement: 'SW 10'
// 				},
// 				{
// 					date_time: '2:00 PM 23 October 2025',
// 					location: '1,105 km West of Central Luzon (OUTSIDE PAR)',
// 					lat: 15.0,
// 					lon: 110.0,
// 					msw_kmh: 95,
// 					category: 'STS',
// 					movement: 'SW 15'
// 				}
// 			]
// 		}
