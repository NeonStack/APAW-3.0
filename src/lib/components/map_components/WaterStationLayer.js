// Configuration for different alert levels, their names, and colors.

const ALERT_LEVELS = {
	critical: { name: 'Critical', color: '#dc2626' },
	alarm: { name: 'Alarm', color: '#f97316' },
	alert: { name: 'Alert', color: '#eab308' },
	normal: { name: 'Normal', color: '#22c55e' }
};

export function getWaterIconHtml(alertStatus = 'normal', size = 40) {
	const level = ALERT_LEVELS[alertStatus] || ALERT_LEVELS.normal;
	const color = level.color;
	const waterColor = '#F5FBFF';

	return `
		<div style="width: ${size}px; height: ${size}px; font-size: 0;">
			<svg
				width="${size}"
				height="${size}"
				viewBox="0 0 24 24"
				style="drop-shadow: 0 0 4px rgba(0, 0, 0, 0.9);"
			>
				<defs>
					<linearGradient id="waterGrad-${alertStatus}" x1="0%" y1="0%" x2="0%" y2="100%">
						<stop offset="0%" style="stop-color:#3b82f6;stop-opacity:0.3" />
						<stop offset="100%" style="stop-color:#1e40af;stop-opacity:0.5" />
					</linearGradient>
				</defs>

				<path
					d="M12 2c-5.33 5.33-8 9.33-8 13.33a8 8 0 1 0 16 0c0-4-2.67-8-8-13.33z"
					fill="${color}"
					stroke="${waterColor}"
					stroke-width="1.5"
				/>

				<path
					d="M12 2c-5.33 5.33-8 9.33-8 13.33a8 8 0 1 0 16 0c0-4-2.67-8-8-13.33z"
					fill="url(#waterGrad-${alertStatus})"
					opacity="0.6"
				/>

				<path
					d="M9 14c0 0 1-0.8 3-0.8s3 0.8 3 0.8"
					stroke="${waterColor}"
					stroke-width="1.3"
					stroke-linecap="round"
					fill="none"
				/>
				<path
					d="M8.5 16.5c0 0 1-0.6 3.5-0.6s3.5 0.6 3.5 0.6"
					stroke="${waterColor}"
					stroke-width="1.1"
					stroke-linecap="round"
					fill="none"
					opacity="0.85"
				/>
				<path
					d="M9 19c0 0 1-0.5 3-0.5s3 0.5 3 0.5"
					stroke="${waterColor}"
					stroke-width="0.9"
					stroke-linecap="round"
					fill="none"
					opacity="0.7"
				/>
			</svg>
		</div>`;
}

/**
 * Determines the alert status of a water station based on its water level.
 * @param {object} station - The station data object.
 * @returns {string} The status key ('critical', 'alarm', 'alert', or 'normal').
 */
export function getStationAlertInfo(station) {
	const currentWL = parseFloat(station.wl);
	const alertWL = parseFloat(station.alertwl);
	const alarmWL = parseFloat(station.alarmwl);
	const criticalWL = parseFloat(station.criticalwl);

	if (!isNaN(currentWL)) {
		if (!isNaN(criticalWL) && currentWL >= criticalWL) {
			return 'critical';
		}
		if (!isNaN(alarmWL) && currentWL >= alarmWL) {
			return 'alarm';
		}
		if (!isNaN(alertWL) && currentWL >= alertWL) {
			return 'alert';
		}
	}
	return 'normal';
}

/**
 * Creates a custom water station icon for Leaflet maps.
 * @param {object} L - The Leaflet library object.
 * @param {string} alertStatus - The current alert status of the station.
 * @returns {L.DivIcon} A Leaflet DivIcon object.
 */
export function createWaterIcon(L, alertStatus = 'normal') {
	const svgIcon = getWaterIconHtml(alertStatus, 40);

	return L.divIcon({
		html: svgIcon,
		className: 'water-station-marker',
		iconSize: [40, 40],
		iconAnchor: [20, 40],
		popupAnchor: [0, -40]
	});
}

/**
 * Creates the HTML content for a water station's popup.
 * @param {object} station - The station data object.
 * @returns {string} The HTML content for the popup.
 */
export function createWaterStationPopup(station) {
	let content = '';

	// Add station name at the top of popup
	if (station.obsnm) {
		content += `<h3 style="font-weight: bold; font-size: 1.1em; margin-bottom: 5px; color: #0c3143; text-align: center;">${station.obsnm} Station</h3>`;
	}

	// Display Current Water Level prominently
	const currentWLValue = station.wl ? `${station.wl} m` : 'N/A';
	content += `<div style="font-size: 1.6em; font-weight: bold; text-align: center; margin: 10px 0 2px 0; color: #0055aa;">${currentWLValue}</div>`;
	content += `<div style="text-align: center; font-size: 0.9em; color: #555; margin-bottom: 10px;">Current Water Level</div>`;

	// Water level change calculated from wl and wl10m
	const currentWL = parseFloat(station.wl);
	const previousWL = parseFloat(station.wl10m);

	if (!isNaN(currentWL) && !isNaN(previousWL)) {
		const change = currentWL - previousWL;
		// Only show change if it's not zero
		if (change !== 0) {
			const changeStyle = change > 0 ? 'color: #ff4757;' : 'color: #2ed573;'; // Red for rising, green for falling
			const sign = change > 0 ? '+' : '';
			content += `<b>Change (10m):</b> <span style="${changeStyle}">${sign}${change.toFixed(2)} m</span><br>`;
		}
	}

	// Last update time
	if (station.timestr) {
		content += `<b>Updated At:</b> ${station.timestr}<br>`;
	}

	// Alert thresholds with inline styles
	content += '<div style="margin-top: 8px;">';
	if (station.criticalwl) {
		content += `<div><b>Critical:</b> <span style="color: ${ALERT_LEVELS.critical.color}; font-weight: bold;">${station.criticalwl} m</span></div>`;
	}
	if (station.alarmwl) {
		content += `<div><b>Alarm:</b> <span style="color: ${ALERT_LEVELS.alarm.color}; font-weight: bold;">${station.alarmwl} m</span></div>`;
	}
	if (station.alertwl) {
		content += `<div><b>Alert:</b> <span style="color: ${ALERT_LEVELS.alert.color}; font-weight: bold;">${station.alertwl} m</span></div>`;
	}
	content += '</div>';

	// Status indicator with inline styles
	const statusKey = getStationAlertInfo(station);
	const level = ALERT_LEVELS[statusKey];
	if (level) {
		content += `<div style="margin-top: 10px; padding: 4px 8px; background-color: ${level.color}; color: white; border-radius: 4px; text-align: center; font-weight: bold;">${level.name}</div>`;
	}

	return content;
}
