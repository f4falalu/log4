/**
 * Basemap styles per mode.
 * Each style is a complete MapLibre StyleSpecification.
 * Loaded ONCE at mode init. Never mutated at runtime.
 *
 * Design: basemap is a canvas, not a feature.
 * Minimal geometry, muted labels, no POI clutter.
 */

import type { StyleSpecification } from 'maplibre-gl';
import type { MapMode } from '../core/types';
import { mapTokens } from '../tokens/mapTokens';

function baseStyle(overrides: Partial<{ background: string; land: string; roads: string; labels: string }>): StyleSpecification {
  const bg = overrides.background ?? mapTokens.background;

  return {
    version: 8,
    sources: {
      'carto-dark': {
        type: 'raster',
        tiles: [
          'https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png',
          'https://b.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png',
          'https://c.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png',
        ],
        tileSize: 256,
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      },
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: {
          'background-color': bg,
        },
      },
      {
        id: 'carto-tiles',
        type: 'raster',
        source: 'carto-dark',
        paint: {
          'raster-opacity': 0.6,
          'raster-saturation': -0.5,
        },
      },
    ],
    glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
  };
}

const operationalStyle: StyleSpecification = baseStyle({
  background: mapTokens.background,
  land: mapTokens.land,
});

const planningStyle: StyleSpecification = baseStyle({
  background: '#0a0e14',
  land: '#12161e',
  labels: mapTokens.labelMuted,
});

const forensicStyle: StyleSpecification = baseStyle({
  background: '#080b10',
  land: '#0f1318',
  labels: '#3d4450',
});

const STYLES: Record<MapMode, StyleSpecification> = {
  operational: operationalStyle,
  planning: planningStyle,
  forensic: forensicStyle,
};

export function getStyleForMode(mode: MapMode): StyleSpecification {
  return STYLES[mode];
}
