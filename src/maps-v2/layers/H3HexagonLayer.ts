/**
 * H3HexagonLayer.ts — H3 resolution-7 grid rendering.
 *
 * Rendering rules:
 * - Fill-color: risk score (green → yellow → red)
 * - Fill-opacity: confidence (0.2 → 0.8)
 * - Stroke: selection highlighting (selectionStroke token)
 * - No zoom-driven resolution changes EVER
 */

import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl';
import { LayerAdapter } from './LayerAdapter';
import { cellStatesToFeatureCollection } from './h3Utils';
import { mapTokens } from '../tokens/mapTokens';
import type { H3CellState } from '../contracts';

export interface H3HexagonLayerData {
  cells: H3CellState[];
  selectedIndexes?: Set<string>;
  hoveredIndex?: string | null;
}

export class H3HexagonLayer extends LayerAdapter<H3HexagonLayerData> {
  private fillLayerId: string;
  private strokeLayerId: string;
  private selectionStrokeLayerId: string;

  constructor() {
    super('h3-hexagon-source');
    this.fillLayerId = 'h3-hexagon-fill';
    this.strokeLayerId = 'h3-hexagon-stroke';
    this.selectionStrokeLayerId = 'h3-hexagon-selection';
  }

  protected onAttach(map: MapLibreMap): void {
    // Add empty GeoJSON source
    map.addSource(this.sourceId, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    // Fill layer — risk-colored, confidence-based opacity
    map.addLayer({
      id: this.fillLayerId,
      type: 'fill',
      source: this.sourceId,
      paint: {
        'fill-color': [
          'interpolate',
          ['linear'],
          ['get', 'riskScore'],
          0, mapTokens.riskNone,
          20, mapTokens.riskLow,
          50, mapTokens.riskMedium,
          75, mapTokens.riskHigh,
          100, mapTokens.riskCritical,
        ],
        'fill-opacity': [
          'interpolate',
          ['linear'],
          ['get', 'confidence'],
          0, 0.15,
          0.5, 0.3,
          1, 0.6,
        ],
      },
    });

    // Default stroke — subtle grid lines
    map.addLayer({
      id: this.strokeLayerId,
      type: 'line',
      source: this.sourceId,
      paint: {
        'line-color': 'rgba(88,166,255,0.15)',
        'line-width': 0.5,
      },
    });

    // Selection stroke — bright on selected cells
    map.addLayer({
      id: this.selectionStrokeLayerId,
      type: 'line',
      source: this.sourceId,
      paint: {
        'line-color': [
          'case',
          ['get', 'isSelected'], mapTokens.selectionStroke,
          ['get', 'isHovered'], mapTokens.hoverStroke,
          'transparent',
        ],
        'line-width': [
          'case',
          ['get', 'isSelected'], 2,
          ['get', 'isHovered'], 1.5,
          0,
        ],
      },
    });

    this.layerIds = [this.fillLayerId, this.strokeLayerId, this.selectionStrokeLayerId];
  }

  update(data: H3HexagonLayerData): void {
    if (!this.map || !this.attached) return;

    const source = this.map.getSource(this.sourceId) as GeoJSONSource;
    if (!source) return;

    const geojson = cellStatesToFeatureCollection(
      data.cells,
      data.selectedIndexes,
      data.hoveredIndex
    );

    source.setData(geojson);
  }
}
