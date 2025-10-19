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
        color = '#32CD32'; // Lime Green
    } else if (
        properties.amenity === 'school' ||
        properties.amenity === 'university' ||
        properties.amenity === 'college'
    ) {
        icon = 'mdi:school';
        color = '#FFCC00'; // Gold
    } else if (properties.amenity === 'place_of_worship') {
        icon = 'mdi:church';
        color = '#9370DB'; // Medium Purple
    } else if (properties.leisure === 'sports_centre' || properties.leisure === 'sports_hall') {
        icon = 'mdi:basketball';
        color = '#FF8C00'; // Dark Orange
    } else if (properties.emergency === 'evacuation_centre') {
        icon = 'mdi:home-group';
        color = '#4CAF50'; // Green
    } else if (properties.amenity === 'community_centre') {
        icon = 'mdi:account-group';
        color = '#9C27B0'; // Purple
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