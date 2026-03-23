import moment from 'moment';

const CYCLONE_CATEGORY_META = {
	LPA: {
		label: 'Low Pressure Area',
		color: '#9ca3af',
		short: 'LPA',
		defaultWind: 30,
		spinFactor: 1.2
	},
	TD: {
		label: 'Tropical Depression',
		color: '#16a34a',
		short: 'TD',
		defaultWind: 50,
		spinFactor: 1.08
	},
	TS: { label: 'Tropical Storm', color: '#eab308', short: 'TS', defaultWind: 75, spinFactor: 1.0 },
	STS: {
		label: 'Severe Tropical Storm',
		color: '#f97316',
		short: 'STS',
		defaultWind: 95,
		spinFactor: 0.92
	},
	TY: { label: 'Typhoon', color: '#dc2626', short: 'TY', defaultWind: 135, spinFactor: 0.84 },
	STY: {
		label: 'Super Typhoon',
		color: '#7c3aed',
		short: 'STY',
		defaultWind: 190,
		spinFactor: 0.76
	},
	UNKNOWN: {
		label: 'Tropical Cyclone',
		color: '#6b7280',
		short: 'TC',
		defaultWind: 70,
		spinFactor: 1.0
	}
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

function clamp(value, min, max) {
	return Math.max(min, Math.min(max, value));
}

function getSpinSeconds(mswKmh, categoryMeta) {
	const wind = clamp(Number(mswKmh) || categoryMeta.defaultWind || 70, 20, 220);
	const normalized = (wind - 20) / 200;
	const baseSpin = 4.2 - normalized * 3.2;
	const factored = baseSpin * (categoryMeta.spinFactor || 1);
	return clamp(Number(factored.toFixed(2)), 0.72, 4.8);
}

function getNoEyeGlyphSvg(code) {
	const armWidth = code === 'STS' ? 11 : code === 'TS' ? 9 : 7;
	const upperPath =
		code === 'STS'
			? 'M56 14 C78 15 90 35 82 51 C75 63 63 69 50 67'
			: code === 'TS'
				? 'M58 14 C82 17 92 40 80 56 C70 68 56 72 44 67'
				: 'M60 16 C80 19 88 36 80 51 C73 62 61 67 50 65';
	const lowerPath =
		code === 'STS'
			? 'M44 86 C22 85 10 65 18 49 C25 37 37 31 50 33'
			: code === 'TS'
				? 'M42 86 C18 83 8 60 20 44 C30 32 44 28 56 33'
				: 'M40 84 C20 81 12 64 20 49 C27 38 39 33 50 35';

	return `
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="cyclone-glyph-svg cyclone-glyph-svg-no-eye" style="--arm-width:${armWidth};" aria-hidden="true">
			<path d="${upperPath}" />
			<path d="${lowerPath}" />
		</svg>
	`;
}

function getEyeGlyphSvg(code) {
	const eyeRadius = code === 'STY' ? 4.2 : 5.6;
	const eyeStroke = code === 'STY' ? 2.8 : 2.2;

	return `
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="cyclone-glyph-svg cyclone-glyph-svg-eye" aria-hidden="true">
			<path class="arm" d="M54 10 C78 10 92 31 92 50 C92 67 80 81 63 84 C75 72 77 57 73 47 C69 37 60 31 50 31 C51 24 53 17 54 10" />
			<path class="arm" d="M46 90 C22 90 8 69 8 50 C8 33 20 19 37 16 C25 28 23 43 27 53 C31 63 40 69 50 69 C49 76 47 83 46 90" />
			<circle class="eye" cx="50" cy="50" r="${eyeRadius}" style="stroke-width:${eyeStroke};" />
		</svg>
	`;
}

function buildCycloneInnerByCategory(code) {
	if (code === 'LPA') {
		return `
			<div class="cyclone-ring cyclone-ring-lpa"></div>
			<div class="cyclone-lpa-core">LPA</div>
		`;
	}

	if (code === 'TD') {
		return `
			<div class="cyclone-glyph cyclone-glyph-td">${getNoEyeGlyphSvg('TD')}</div>
		`;
	}

	if (code === 'TS') {
		return `
			<div class="cyclone-glyph cyclone-glyph-ts">${getNoEyeGlyphSvg('TS')}</div>
		`;
	}

	if (code === 'STS') {
		return `
			<div class="cyclone-glyph cyclone-glyph-sts">${getNoEyeGlyphSvg('STS')}</div>
		`;
	}

	if (code === 'TY') {
		return `
			<div class="cyclone-ring cyclone-ring-strong"></div>
			<div class="cyclone-glyph cyclone-glyph-ty">${getEyeGlyphSvg('TY')}</div>
		`;
	}

	if (code === 'STY') {
		return `
			<div class="cyclone-glyph cyclone-glyph-sty">${getEyeGlyphSvg('STY')}</div>
		`;
	}

	return `
		<div class="cyclone-ring cyclone-ring-thin"></div>
		<div class="cyclone-glyph cyclone-glyph-ts">${getNoEyeGlyphSvg('TS')}</div>
	`;
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

function createCurrentCycloneIconHtml(category, mswKmh) {
	const normalizedCode = normalizeCycloneCategory(category);
	const meta = getCycloneCategoryMeta(normalizedCode);
	const spinSeconds = getSpinSeconds(mswKmh, meta);
	const iconInner = buildCycloneInnerByCategory(normalizedCode);

	return `
		<div
			class="cyclone-icon-badge"
			style="--cyclone-color:${meta.color};--cyclone-spin-seconds:${spinSeconds}s;"
			data-category="${meta.short}"
			data-style="${normalizedCode}"
		>
			${iconInner}
			<span class="cyclone-icon-label">${meta.short}</span>
        </div>
    `;
}

export function createCycloneLegendIconHtml(category) {
	const normalizedCode = normalizeCycloneCategory(category);
	const meta = getCycloneCategoryMeta(normalizedCode);
	const spinSeconds = getSpinSeconds(meta.defaultWind, meta);
	const iconInner = buildCycloneInnerByCategory(normalizedCode);

	return `
		<span
			class="legend-cyclone-icon cyclone-icon-badge cyclone-icon-mini"
			style="--cyclone-color:${meta.color};--cyclone-spin-seconds:${spinSeconds}s;"
			data-style="${normalizedCode}"
			data-category="${meta.short}"
		>
			${iconInner}
		</span>
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
			html: createCurrentCycloneIconHtml(currentPosition.category, currentPosition.msw_kmh),
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
