import moment from 'moment';

const CYCLONE_CATEGORY_META = {
	LPA: { label: 'Low Pressure Area', color: '#0891b2', short: 'LPA' },
	TD: { label: 'Tropical Depression', color: '#16a34a', short: 'TD' },
	TS: { label: 'Tropical Storm', color: '#eab308', short: 'TS' },
	STS: { label: 'Severe Tropical Storm', color: '#f97316', short: 'STS' },
	TY: { label: 'Typhoon', color: '#dc2626', short: 'TY' },
	STY: { label: 'Super Typhoon', color: '#7c3aed', short: 'STY' },
	UNKNOWN: { label: 'Tropical Cyclone', color: '#6b7280', short: 'TC' }
};

const CATEGORY_ORDER = ['LPA', 'TD', 'TS', 'STS', 'TY', 'STY', 'UNKNOWN'];

export function normalizeCycloneCategory(category) {
	const normalized = String(category || '')
		.trim()
		.toUpperCase();

	if (!normalized) return 'UNKNOWN';
	if (CYCLONE_CATEGORY_META[normalized]) return normalized;
	if (normalized.includes('LOW PRESSURE')) return 'LPA';
	if (normalized.includes('SUPER TYPHOON')) return 'STY';
	if (normalized.includes('SEVERE TROPICAL STORM')) return 'STS';
	if (normalized === 'TROPICAL DEPRESSION') return 'TD';
	if (normalized === 'TROPICAL STORM') return 'TS';
	if (normalized === 'TYPHOON') return 'TY';

	return 'UNKNOWN';
}

export function getCycloneLegendEntries(cycloneDataArray) {
	const source = Array.isArray(cycloneDataArray) ? cycloneDataArray : [];
	const categories = new Set();

	source.forEach((storm) => {
		const track = Array.isArray(storm?.forecast_track) ? storm.forecast_track : [];
		track.forEach((point) => {
			categories.add(normalizeCycloneCategory(point?.category));
		});
	});

	return CATEGORY_ORDER.filter((code) => categories.has(code)).map((code) => ({
		code,
		label: CYCLONE_CATEGORY_META[code].label,
		short: CYCLONE_CATEGORY_META[code].short,
		color: CYCLONE_CATEGORY_META[code].color
	}));
}

function getCycloneCategoryMeta(category) {
	return CYCLONE_CATEGORY_META[normalizeCycloneCategory(category)] || CYCLONE_CATEGORY_META.UNKNOWN;
}

// Helper to create the popup content for a forecast point
function createCyclonePopupContent(point) {
	const formattedDate = moment(point.date_time).format('MMM D, YYYY h:mm A');
	return `
        <b>${point.location}</b><br>
        Category: <strong>${point.category}</strong><br>
        Max Winds: ${point.msw_kmh} km/h<br>
        Movement: ${point.movement}<br>
        Time: ${formattedDate}
    `;
}

function getCategoryColor(category) {
	return getCycloneCategoryMeta(category).color;
}

function createCurrentCycloneIconHtml(category) {
	const meta = getCycloneCategoryMeta(category);

	return `
        <div class="cyclone-icon-badge" style="--cyclone-color:${meta.color};" data-category="${meta.short}">
            <div class="cyclone-icon-core">
                <span class="cyclone-icon-label">${meta.short}</span>
            </div>
        </div>
    `;
}

// Calculates the cyclone's current position by interpolating between two forecast points
function getCurrentCyclonePosition(forecastTrack) {
	const now = moment();
	for (let i = 0; i < forecastTrack.length - 1; i++) {
		const startPoint = forecastTrack[i];
		const endPoint = forecastTrack[i + 1];
		const startTime = moment(startPoint.date_time);
		const endTime = moment(endPoint.date_time);

		// Use '[)' for inclusive start and exclusive end
		if (now.isBetween(startTime, endTime, undefined, '[)')) {
			const totalDuration = endTime.diff(startTime);
			if (totalDuration <= 0) continue;

			const elapsedDuration = now.diff(startTime);
			const percentage = elapsedDuration / totalDuration;

			const lat = startPoint.lat + (endPoint.lat - startPoint.lat) * percentage;
			const lon = startPoint.lon + (endPoint.lon - startPoint.lon) * percentage;
			const msw_kmh = startPoint.msw_kmh + (endPoint.msw_kmh - startPoint.msw_kmh) * percentage;
			const category = normalizeCycloneCategory(startPoint.category || endPoint.category);

			return { lat, lon, msw_kmh, category };
		}
	}

	// Fallback if current time is before the first point or after the last
	if (forecastTrack.length > 0) {
		const firstPointTime = moment(forecastTrack[0].date_time);
		if (now.isBefore(firstPointTime)) {
			return {
				lat: forecastTrack[0].lat,
				lon: forecastTrack[0].lon,
				msw_kmh: forecastTrack[0].msw_kmh,
				category: normalizeCycloneCategory(forecastTrack[0].category)
			};
		}
		const lastPointTime = moment(forecastTrack[forecastTrack.length - 1].date_time);
		if (now.isAfter(lastPointTime)) {
			return {
				lat: forecastTrack[forecastTrack.length - 1].lat,
				lon: forecastTrack[forecastTrack.length - 1].lon,
				msw_kmh: forecastTrack[forecastTrack.length - 1].msw_kmh,
				category: normalizeCycloneCategory(forecastTrack[forecastTrack.length - 1].category)
			};
		}
	}

	return null;
}

// Main function to draw the entire track, points, and current position icon
export function drawCycloneTrack(L, layerGroup, cycloneData) {
	console.log('[drawCycloneTrack] Function called with data:', cycloneData);

	if (!cycloneData || !cycloneData.forecast_track || cycloneData.forecast_track.length === 0) {
		return;
	}

	const stormName = cycloneData.storm_name || 'Unknown';
	const forecastTrack = cycloneData.forecast_track;
	const latLngs = forecastTrack.map((p) => [p.lat, p.lon]);

	// Draw the forecast path line
	const pathLine = L.polyline(latLngs, { color: 'red', weight: 5, dashArray: '8, 12' });
	layerGroup.addLayer(pathLine);

	// Draw the forecast points
	forecastTrack.forEach((point) => {
		const circle = L.circleMarker([point.lat, point.lon], {
			radius: 10,
			fillColor: getCategoryColor(point.category),
			color: '#fff',
			weight: 2,
			opacity: 1,
			fillOpacity: 0.9
		}).bindPopup(`<b>${stormName}</b><br>${createCyclonePopupContent(point)}`);
		layerGroup.addLayer(circle);
	});

	// Draw the current position icon
	const currentPosition = getCurrentCyclonePosition(forecastTrack);

	if (currentPosition) {
		const cycloneIcon = L.divIcon({
			html: createCurrentCycloneIconHtml(currentPosition.category),
			className: 'cyclone-icon',
			iconSize: [40, 40],
			iconAnchor: [20, 20]
		});
		const currentCategoryMeta = getCycloneCategoryMeta(currentPosition.category);
		const currentPosMarker = L.marker([currentPosition.lat, currentPosition.lon], {
			icon: cycloneIcon
		}).bindPopup(
			`<b>${stormName}</b><br><b>Current Estimated Position</b><br>Category: <strong>${currentCategoryMeta.label}</strong><br>Max Winds: ~${Math.round(currentPosition.msw_kmh)} km/h`
		);
		currentPosMarker.options.isCurrentCyclone = true;
		currentPosMarker.options.stormName = stormName; // Unique identifier
		layerGroup.addLayer(currentPosMarker);
	}
}

export function updateCyclonePosition(L, layerGroup, cycloneData) {
	if (!cycloneData || !cycloneData.forecast_track || cycloneData.forecast_track.length === 0) {
		return;
	}

	const stormName = cycloneData.storm_name || 'Unknown';
	const currentPosition = getCurrentCyclonePosition(cycloneData.forecast_track);
	if (!currentPosition) return;

	let currentPosMarker = null;
	layerGroup.eachLayer((layer) => {
		if (layer.options.isCurrentCyclone && layer.options.stormName === stormName) {
			currentPosMarker = layer;
		}
	});

	if (currentPosMarker) {
		currentPosMarker.setLatLng([currentPosition.lat, currentPosition.lon]);
	}
}
