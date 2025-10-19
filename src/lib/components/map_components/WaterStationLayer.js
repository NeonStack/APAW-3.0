// Configuration for different alert levels, their names, and colors.

const ALERT_LEVELS = {
	critical: { name: 'Critical', color: '#dc2626' },
	alarm: { name: 'Alarm', color: '#f97316' },
	alert: { name: 'Alert', color: '#eab308' },
	normal: { name: 'Normal', color: '#22c55e' }
};

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
	const level = ALERT_LEVELS[alertStatus] || ALERT_LEVELS.normal;
	const color = level.color;
	const waterColor = '#3b82f6'; // A consistent blue to represent water

	// New design: Blue fill for water, status color for the outline.
	const svgIcon = `
    <div style="width: 32px; height: 32px; font-size: 0;">
      <svg 
        width="32" 
        height="32" 
        viewBox="0 0 24 24" 
        style="filter: drop-shadow(0px 1px 2px rgba(0,0,0,0.5));"
      >
        <!-- Main water drop shape with a blue fill and a status-colored outline -->
        <path 
          d="M12 2c-5.33 5.33-8 9.33-8 13.33a8 8 0 1 0 16 0c0-4-2.67-8-8-13.33z" 
          fill="${waterColor}" 
          stroke="${color}" 
          stroke-width="2.5" 
        />
        <!-- Inner wave icon, now in white for better contrast and clarity -->
        <path 
          d="M12 17.5c-3 0-4.5-1.5-4.5-1.5s1.5-1.5 4.5-1.5 4.5 1.5 4.5 1.5-1.5 1.5-4.5 1.5zm0-3c-3 0-4.5-1.5-4.5-1.5s1.5-1.5 4.5-1.5 4.5 1.5 4.5 1.5-1.5 1.5-4.5 1.5z"
          fill="white"
          opacity="0.8"
        />
      </svg>
    </div>`;

	return L.divIcon({
		html: svgIcon,
		className: 'water-station-marker', // This Leaflet class helps remove default icon styling.
		iconSize: [32, 32],
		iconAnchor: [16, 32], // Anchor point at the bottom center of the icon
		popupAnchor: [0, -32]
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
