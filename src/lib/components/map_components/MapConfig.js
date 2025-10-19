export const NEARBY_RADIUS_METERS = 1000;

// Helper function to determine facility icon and color
export function getFacilityIconAndColor(properties) {
    // Default values
    let icon = 'mdi:help-circle';
    let color = '#7e7e7e';

    // Check for specific facility types and assign appropriate icons
    if (properties.amenity === 'fire_station') {
        icon = 'mdi:fire-station';
        color = '#FF6347'; // Tomato Red
    } else if (properties.amenity === 'police') {
        icon = 'mdi:police-station';
        color = '#1E90FF'; // Dodger Blue
    } else if (
        properties.amenity === 'hospital' ||
        properties.amenity === 'clinic' ||
        properties.amenity === 'doctors'
    ) {
        icon = 'mdi:hospital-building';
        color = '#228B22'; // Darker Lime Green
    } else if (
        properties.amenity === 'school' ||
        properties.amenity === 'university' ||
        properties.amenity === 'college'
    ) {
        icon = 'mdi:school';
        color = '#BFA100'; // Darker Gold
    } else if (properties.amenity === 'place_of_worship') {
        icon = 'mdi:church';
        color = '#7B5FCB'; // Slightly darker Medium Purple
    } else if (properties.leisure === 'sports_centre' || properties.leisure === 'sports_hall') {
        icon = 'mdi:basketball';
        color = '#FF8C00'; // Dark Orange
    } else if (properties.emergency === 'evacuation_centre') {
        icon = 'mdi:home-group';
        color = '#388E3C'; // Darker Green
    } else if (properties.amenity === 'community_centre') {
        icon = 'mdi:account-group';
        color = '#7B1FA2'; // Darker Purple
    }

    return { icon, color };
}

// Helper function to format facility type strings (e.g., "fire_station" -> "Fire Station")
export function formatFacilityType(typeString) {
    if (!typeString) return '';

    return typeString
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Get a friendly name for display in popups and InfoTab
export function getFacilityFriendlyName(properties) {
    // Use the provided name as primary
    if (properties.name) {
        return properties.name;
    }

    // If no name, try to determine a descriptive type
    let facilityType = null;

    if (properties.amenity) {
        facilityType = formatFacilityType(properties.amenity);
    } else if (properties.emergency) {
        facilityType = formatFacilityType(properties.emergency);
    } else if (properties.leisure) {
        facilityType = formatFacilityType(properties.leisure);
    } else if (properties.building && properties.building !== 'yes') {
        facilityType = formatFacilityType(properties.building);
    }

    return facilityType || 'Facility';
}

// Get a more detailed facility type description for the InfoTab
export function getFacilityType(properties) {
    if (properties.amenity) {
        return formatFacilityType(properties.amenity);
    } else if (properties.emergency) {
        return formatFacilityType(properties.emergency);
    } else if (properties.leisure) {
        return formatFacilityType(properties.leisure);
    } else if (properties.building && properties.building !== 'yes') {
        return formatFacilityType(properties.building);
    }
    return 'Other';
}

/**
 * Creates a smaller, more subtle facility icon.
 * @param {object} L - The Leaflet library object.
 * @param {object} properties - The GeoJSON properties of the facility.
 * @returns {L.DivIcon} A Leaflet DivIcon object.
 */
export function createFacilityIcon(L, properties) {
    const { icon, color } = getFacilityIconAndColor(properties);

    // A smaller 28x28px design to be less distracting.
    const iconHtml = `
        <div style="
            width: 28px;
            height: 28px;
            filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
            opacity: 0.8;
        ">
            <svg viewBox="0 0 28 28" style="width: 100%; height: 100%;">
                <rect 
                    width="28" 
                    height="28" 
                    rx="5" 
                    ry="5" 
                    fill="${color}" 
                />
            </svg>
            <span 
                class="iconify" 
                data-icon="${icon}" 
                style="
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    font-size: 18px; 
                    color: white;
                ">
            </span>
        </div>
    `;

    return L.divIcon({
        html: iconHtml,
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14]
    });
}

/**
 * Creates a dynamic HTML popup that only displays available facility details.
 * @param {object} properties - The GeoJSON properties of the facility.
 * @returns {string} The HTML content for the popup.
 */
export function createFacilityPopup(properties) {
    const { icon, color } = getFacilityIconAndColor(properties);
    const friendlyName = getFacilityFriendlyName(properties);
    const facilityType = getFacilityType(properties);

    // Define which properties to look for and their display names.
    const detailsToShow = {
        'addr:street': 'Street',
        'addr:city': 'City',
        'capacity:persons': 'Capacity',
        'operator:type': 'Operator'
    };

    let detailsHtml = '';
    for (const key in detailsToShow) {
        if (properties[key]) {
            detailsHtml += `<div style="font-size: 0.9em; margin-bottom: 4px;"><strong>${detailsToShow[key]}:</strong> ${properties[key]}</div>`;
        }
    }

    // Header with matching color and icon.
    let content = `
        <div style="font-family: sans-serif; width: 230px;">
            <div style="background-color: ${color}; color: white; padding: 8px 12px; border-radius: 8px 8px 0 0; display: flex; align-items: center; gap: 8px;">
                <span class="iconify" data-icon="${icon}" style="font-size: 20px; flex-shrink: 0;"></span>
                <h4 style="margin: 0; font-size: 1.1em; font-weight: bold; word-break: break-word;">${friendlyName}</h4>
            </div>
            <div style="padding: 10px 12px; color: #333;">
    `;

    // Display the facility type if it's different from the name.
    if (friendlyName.toLowerCase() !== facilityType.toLowerCase()) {
        content += `<div style="font-size: 0.9em; color: #555; margin-bottom: 8px;"><strong>Type:</strong> ${facilityType}</div>`;
    }

    // If we found any details, add them with a separator.
    if (detailsHtml) {
        content += `<hr style="border: none; border-top: 1px solid #eee; margin: 8px 0;">${detailsHtml}`;
    }

    content += `</div></div>`;
    return content;
}