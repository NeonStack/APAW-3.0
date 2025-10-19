/**
 * Implementation of grouped layer control for better layer organization
 */

import { baseLayers, allOverlayLayers } from './LayerRegistry.js';

export function setupGroupedLayerControl(L, map, instantiatedLayers) {
    if (!L || !map) {
        console.error('Cannot setup grouped layer control: missing required parameters');
        return null;
    }

    if (!L.control.groupedLayers) {
        console.error(
            'Leaflet.groupedlayercontrol plugin is not loaded. Falling back to standard layer control.'
        );
        const fallbackControl = L.control.layers(baseLayers, {}, { collapsed: true });
        fallbackControl.addTo(map);
        return fallbackControl;
    }

    // Prepare base layers for the control
    const baseLayersForControl = {};
    baseLayers.forEach((layer) => {
        if (instantiatedLayers[layer.id]) {
            baseLayersForControl[layer.name] = instantiatedLayers[layer.id];
        }
    });

    // Prepare grouped overlays from the registry
    const groupedOverlays = {};
    const exclusiveGroups = [];

    allOverlayLayers.forEach((layer) => {
        if (!layer.group) return;

        if (!groupedOverlays[layer.group]) {
            groupedOverlays[layer.group] = {};
        }

        if (instantiatedLayers[layer.id]) {
            groupedOverlays[layer.group][layer.name] = instantiatedLayers[layer.id];
        }

        if (layer.exclusive && !exclusiveGroups.includes(layer.group)) {
            exclusiveGroups.push(layer.group);
        }
    });

    const options = {
        exclusiveGroups,
        groupCheckboxes: false
    };

    const layerControl = L.control.groupedLayers(baseLayersForControl, groupedOverlays, options);
    layerControl.addTo(map);

    return layerControl;
}