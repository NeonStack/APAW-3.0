import moment from 'moment';

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
    switch (category) {
        case 'TD':
            return '#00bfff'; // Tropical Depression - Deep Sky Blue
        case 'TS':
            return '#008000'; // Tropical Storm - Green
        case 'STS':
            return '#ffa500'; // Severe Tropical Storm - Orange
        case 'TY':
            return '#ff4500'; // Typhoon - OrangeRed
        case 'STY':
            return '#ff0000'; // Super Typhoon - Red
        default:
            return '#808080'; // Default - Gray
    }
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
            const msw_kmh =
                startPoint.msw_kmh + (endPoint.msw_kmh - startPoint.msw_kmh) * percentage;

            return { lat, lon, msw_kmh };
        }
    }

	// Fallback if current time is before the first point or after the last
	if (forecastTrack.length > 0) {
		const firstPointTime = moment(forecastTrack[0].date_time);
        if (now.isBefore(firstPointTime)) {
            return {
                lat: forecastTrack[0].lat,
                lon: forecastTrack[0].lon,
                msw_kmh: forecastTrack[0].msw_kmh
            };
        }
        const lastPointTime = moment(forecastTrack[forecastTrack.length - 1].date_time);
        if (now.isAfter(lastPointTime)) {
            return {
                lat: forecastTrack[forecastTrack.length - 1].lat,
                lon: forecastTrack[forecastTrack.length - 1].lon,
                msw_kmh: forecastTrack[forecastTrack.length - 1].msw_kmh
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
        console.log('[drawCycloneTrack] Drawing on layerGroup:', layerGroup);


	layerGroup.clearLayers();
	const forecastTrack = cycloneData.forecast_track;
	const latLngs = forecastTrack.map((p) => [p.lat, p.lon]);
    console.log('[drawCycloneTrack] Mapped forecast path coordinates:', latLngs);

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
        }).bindPopup(createCyclonePopupContent(point));
        layerGroup.addLayer(circle);
    });

	// Draw the current position icon
	const currentPosition = getCurrentCyclonePosition(forecastTrack);
        console.log('[drawCycloneTrack] Calculated current position:', currentPosition);

	    if (currentPosition) {
        const cycloneIcon = L.divIcon({
            html: `<div class="cyclone-icon-inner"><svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"><path fill="currentColor" d="M15 6.79c1.86 1.07 3 3.06 3 5.21C18 22 6 22 6 22c1.25-.94 2.38-2.05 3.34-3.29a.99.99 0 0 0-.34-1.5C7.14 16.14 6 14.15 6 12C6 2 18 2 18 2c-1.25.94-2.38 2.05-3.34 3.29a.99.99 0 0 0 .34 1.5M12 14a2 2 0 0 0 2-2a2 2 0 0 0-2-2a2 2 0 0 0-2 2a2 2 0 0 0 2 2"/></svg></div>`,
            className: 'cyclone-icon', // This is the container Leaflet positions
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });
        const currentPosMarker = L.marker([currentPosition.lat, currentPosition.lon], {
            icon: cycloneIcon
        }).bindPopup(
            `<b>Current Estimated Position</b><br>Max Winds: ~${Math.round(currentPosition.msw_kmh)} km/h`
        );
        currentPosMarker.options.isCurrentCyclone = true; // Custom property to find it later
        layerGroup.addLayer(currentPosMarker);
	}
}

// Function to update only the current position marker
export function updateCyclonePosition(L, layerGroup, cycloneData) {
	if (!cycloneData || !cycloneData.forecast_track || cycloneData.forecast_track.length === 0) {
		return;
	}

	const currentPosition = getCurrentCyclonePosition(cycloneData.forecast_track);
	if (!currentPosition) return;

	let currentPosMarker = null;
	layerGroup.eachLayer((layer) => {
		if (layer.options.isCurrentCyclone) {
			currentPosMarker = layer;
		}
	});

	if (currentPosMarker) {
		currentPosMarker.setLatLng([currentPosition.lat, currentPosition.lon]);
	}
}
