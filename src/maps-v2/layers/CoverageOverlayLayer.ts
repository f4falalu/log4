/**
 * CoverageOverlayLayer.ts — MapLibre layer for facility coverage visualization.
 *
 * Renders concentric ring isochrones from facilities (5km, 10km, 15km)
 * with color-coded fills and strokes.
 *
 * Extends LayerAdapter pattern.
 */

import type { Map as MapLibreMap } from 'maplibre-gl';
import { LayerAdapter } from './LayerAdapter';

/** Ring color palette: [fill, stroke] by ring index (inner→outer) */
const RING_COLORS: [string, string][] = [
  ['rgba(34, 197, 94, 0.15)', 'rgba(34, 197, 94, 0.6)'],   // 5km - green
  ['rgba(234, 179, 8, 0.12)', 'rgba(234, 179, 8, 0.5)'],   // 10km - yellow
  ['rgba(239, 68, 68, 0.08)', 'rgba(239, 68, 68, 0.4)'],    // 15km - red
];

export interface CoverageLayerData {
  geojson: GeoJSON.FeatureCollection;
}

export class CoverageOverlayLayer extends LayerAdapter<CoverageLayerData> {
  constructor() {
    super('coverage-rings');
  }

  protected onAttach(map: MapLibreMap): void {
    // Add empty GeoJSON source
    map.addSource(this.sourceId, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    // Add fill layers per ring index (back to front for correct stacking)
    for (let i = RING_COLORS.length - 1; i >= 0; i--) {
      const fillId = `${this.sourceId}-fill-${i}`;
      const strokeId = `${this.sourceId}-stroke-${i}`;

      map.addLayer({
        id: fillId,
        type: 'fill',
        source: this.sourceId,
        filter: ['==', ['get', 'ringIndex'], i],
        paint: {
          'fill-color': RING_COLORS[i][0],
        },
      });

      map.addLayer({
        id: strokeId,
        type: 'line',
        source: this.sourceId,
        filter: ['==', ['get', 'ringIndex'], i],
        paint: {
          'line-color': RING_COLORS[i][1],
          'line-width': 1.5,
          'line-dasharray': [4, 2],
        },
      });

      this.layerIds.push(fillId, strokeId);
    }
  }

  update(data: CoverageLayerData): void {
    if (!this.map) return;

    const source = this.map.getSource(this.sourceId);
    if (source && 'setData' in source) {
      (source as maplibregl.GeoJSONSource).setData(data.geojson);
    }
  }
}
