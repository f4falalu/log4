/**
 * Basemap style configuration for Live Map
 * Uses OpenStreetMap tiles with custom styling
 */

import type { StyleSpecification } from 'maplibre-gl';

export function getBasemapStyle(): StyleSpecification {
  return {
    version: 8,
    name: 'BIKO Live Map',
    metadata: {
      'mapbox:autocomposite': false,
      'mapbox:type': 'template',
    },
    sources: {
      'osm-tiles': {
        type: 'raster',
        tiles: [
          'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
          'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
          'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
        ],
        tileSize: 256,
        attribution: '&copy; OpenStreetMap contributors',
        maxzoom: 19,
      },
    },
    sprite: 'https://demotiles.maplibre.org/styles/osm-bright-gl-style/sprite',
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    layers: [
      {
        id: 'osm-tiles-layer',
        type: 'raster',
        source: 'osm-tiles',
        minzoom: 0,
        maxzoom: 22,
        paint: {
          'raster-opacity': 1,
        },
      },
    ],
  };
}
