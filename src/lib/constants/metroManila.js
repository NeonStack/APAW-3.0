export const METRO_MANILA_COORDINATES = [
	{ name: 'Manila', lat: 14.604595, lon: 120.982569 },
	{ name: 'Mandaluyong', lat: 14.582112, lon: 121.039043 },
	{ name: 'Marikina', lat: 14.64806, lon: 121.104192 },
	{ name: 'Pasig', lat: 14.572916, lon: 121.081955 },
	{ name: 'Quezon City', lat: 14.649734, lon: 121.039224 },
	{ name: 'San Juan', lat: 14.602108, lon: 121.035626 },
	{ name: 'Caloocan (North)', lat: 14.761262, lon: 121.045706 },
	{ name: 'Caloocan (South)', lat: 14.651013, lon: 120.980904 },
	{ name: 'Malabon', lat: 14.67242, lon: 120.957245 },
	{ name: 'Navotas', lat: 14.666291, lon: 120.941 },
	{ name: 'Valenzuela', lat: 14.707549, lon: 120.982046 },
	{ name: 'Las Piñas', lat: 14.443451, lon: 120.994801 },
	{ name: 'Makati', lat: 14.551987, lon: 121.024302 },
	{ name: 'Muntinlupa', lat: 14.402166, lon: 121.030928 },
	{ name: 'Parañaque', lat: 14.473714, lon: 121.020472 },
	{ name: 'Pasay', lat: 14.534401, lon: 121.001278 },
	{ name: 'Pateros', lat: 14.54508, lon: 121.069831 },
	{ name: 'Taguig', lat: 14.517084, lon: 121.0572 }
];

export const METRO_MANILA_LOCATION_NAMES = METRO_MANILA_COORDINATES.map(
	(location) => location.name
);

export const METRO_MANILA_DISTRICTS = {
	'1st District': ['Manila'],
	'2nd District': ['Mandaluyong', 'Marikina', 'Pasig', 'Quezon City', 'San Juan'],
	'3rd District': ['Caloocan (North)', 'Caloocan (South)', 'Malabon', 'Navotas', 'Valenzuela'],
	'4th District': ['Las Piñas', 'Makati', 'Muntinlupa', 'Parañaque', 'Pasay', 'Pateros', 'Taguig']
};
