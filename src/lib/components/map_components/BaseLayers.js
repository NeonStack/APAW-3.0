/**
 * Base map layer configuration and setup
 */

import { baseMaps, mapAttributions } from './MapConfig.js';

export function setupBaseLayers(L) {
  if (!L) return {};
  
  const baseLayersObject = {
    'Standard': L.tileLayer(baseMaps.standard, {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }),
    
    'Topographic': L.tileLayer(baseMaps.topographic, {
      attribution: 'Map data © OpenTopoMap contributors',
      maxZoom: 19
    }),
    
    'Satellite': L.tileLayer(baseMaps.satellite, {
      attribution: 'Imagery © Esri',
      maxZoom: 19
    }),
    
    'Humanitarian': L.tileLayer(baseMaps.osmHot, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">Humanitarian OpenStreetMap Team</a> hosted by <a href="https://openstreetmap.fr/" target="_blank">OpenStreetMap France</a>',
      maxZoom: 19
    }),
    
    'Positron (Light)': L.tileLayer(baseMaps.positron, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }),
    
    'Dark Matter': L.tileLayer(baseMaps.darkMatter, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }),
    
    'Esri Street': L.tileLayer(baseMaps.esriStreet, {
      attribution: 'Tiles &copy; Esri',
      maxZoom: 19
    }),
    
    'Topographic (Esri)': L.tileLayer(baseMaps.esriTopo, {
      attribution: mapAttributions.esriTopo,
      maxZoom: 19
    })
  };
  
  return baseLayersObject;
}
