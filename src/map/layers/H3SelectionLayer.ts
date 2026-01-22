/**
 * H3SelectionLayer.ts
 *
 * Visual selection feedback layer.
 *
 * GOVERNANCE:
 * - Selection feedback MUST NOT contaminate base rendering
 * - Highlights selected/hovered hex
 * - Sits ABOVE H3HexagonLayer
 * - No domain logic
 * - No data derivation
 * - Transient visual state only
 */

import type maplibregl from 'maplibre-gl';
import type { MapLayer, RenderContext } from '@/map/core/LayerRegistry';
import { cellToPolygon } from '@/map/core/spatial';
import { SELECTION_COLORS } from './H3Layer.types';

/**
 * Layer IDs
 */
const LAYER_IDS = {
  selected: 'h3-selection-selected',
  hovered: 'h3-selection-hovered',
  sourceSelected: 'h3-selection-source-selected',
  sourceHovered: 'h3-selection-source-hovered',
} as const;

/**
 * H3SelectionLayer - Visual selection state
 *
 * Responsibilities:
 * - Draw outline/glow for selected hex
 * - Draw outline for hovered hex
 * - No fill (transparent)
 * - Transient visual only
 */
export class H3SelectionLayer implements MapLayer {
  readonly id = 'h3-selection';
  readonly type = 'h3-selection';

  private map: maplibregl.Map | null = null;
  private selectedH3Index: string | null = null;
  private hoveredH3Index: string | null = null;
  private mounted = false;

  /**
   * Add layer to map
   */
  add(ctx: RenderContext): void {
    if (this.mounted) {
      console.warn('[H3SelectionLayer] Already mounted');
      return;
    }

    this.map = ctx.map;

    // Add sources
    this.map.addSource(LAYER_IDS.sourceSelected, {
      type: 'geojson',
      data: this.createEmptyFeatureCollection(),
    });

    this.map.addSource(LAYER_IDS.sourceHovered, {
      type: 'geojson',
      data: this.createEmptyFeatureCollection(),
    });

    // Add hovered layer (below selected)
    this.map.addLayer(
      {
        id: LAYER_IDS.hovered,
        type: 'line',
        source: LAYER_IDS.sourceHovered,
        paint: {
          'line-color': SELECTION_COLORS.hovered.stroke,
          'line-width': SELECTION_COLORS.hovered.strokeWidth,
          'line-opacity': 0.8,
        },
      },
      ctx.beforeLayerId
    );

    // Add selected layer (on top)
    this.map.addLayer(
      {
        id: LAYER_IDS.selected,
        type: 'line',
        source: LAYER_IDS.sourceSelected,
        paint: {
          'line-color': SELECTION_COLORS.selected.stroke,
          'line-width': SELECTION_COLORS.selected.strokeWidth,
          'line-opacity': 1,
        },
      },
      ctx.beforeLayerId
    );

    this.mounted = true;
    console.log('[H3SelectionLayer] Mounted');
  }

  /**
   * Update is no-op for selection layer
   * Use setSelected/setHovered instead
   */
  update(_data: unknown[]): void {
    // Selection layer doesn't use bulk updates
  }

  /**
   * Remove layer from map
   */
  remove(): void {
    if (!this.map) return;

    // Remove layers
    if (this.map.getLayer(LAYER_IDS.selected)) {
      this.map.removeLayer(LAYER_IDS.selected);
    }
    if (this.map.getLayer(LAYER_IDS.hovered)) {
      this.map.removeLayer(LAYER_IDS.hovered);
    }

    // Remove sources
    if (this.map.getSource(LAYER_IDS.sourceSelected)) {
      this.map.removeSource(LAYER_IDS.sourceSelected);
    }
    if (this.map.getSource(LAYER_IDS.sourceHovered)) {
      this.map.removeSource(LAYER_IDS.sourceHovered);
    }

    this.mounted = false;
    this.map = null;
    this.selectedH3Index = null;
    this.hoveredH3Index = null;

    console.log('[H3SelectionLayer] Removed');
  }

  /**
   * Show layer
   */
  show(): void {
    if (!this.map) return;
    this.map.setLayoutProperty(LAYER_IDS.selected, 'visibility', 'visible');
    this.map.setLayoutProperty(LAYER_IDS.hovered, 'visibility', 'visible');
  }

  /**
   * Hide layer
   */
  hide(): void {
    if (!this.map) return;
    this.map.setLayoutProperty(LAYER_IDS.selected, 'visibility', 'none');
    this.map.setLayoutProperty(LAYER_IDS.hovered, 'visibility', 'none');
  }

  /**
   * Set selected cell
   */
  setSelected(h3Index: string | null): void {
    if (!this.map || !this.mounted) return;

    this.selectedH3Index = h3Index;

    const source = this.map.getSource(LAYER_IDS.sourceSelected) as maplibregl.GeoJSONSource;
    if (!source) return;

    if (h3Index) {
      const geometry = cellToPolygon(h3Index);
      source.setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry,
            properties: { h3Index },
          },
        ],
      });
    } else {
      source.setData(this.createEmptyFeatureCollection());
    }
  }

  /**
   * Set hovered cell
   */
  setHovered(h3Index: string | null): void {
    if (!this.map || !this.mounted) return;

    // Don't show hover on selected cell
    if (h3Index === this.selectedH3Index) {
      h3Index = null;
    }

    this.hoveredH3Index = h3Index;

    const source = this.map.getSource(LAYER_IDS.sourceHovered) as maplibregl.GeoJSONSource;
    if (!source) return;

    if (h3Index) {
      const geometry = cellToPolygon(h3Index);
      source.setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry,
            properties: { h3Index },
          },
        ],
      });
    } else {
      source.setData(this.createEmptyFeatureCollection());
    }
  }

  /**
   * Get current selection
   */
  getSelected(): string | null {
    return this.selectedH3Index;
  }

  /**
   * Get current hover
   */
  getHovered(): string | null {
    return this.hoveredH3Index;
  }

  /**
   * Clear all selection state
   */
  clear(): void {
    this.setSelected(null);
    this.setHovered(null);
  }

  /**
   * Create empty FeatureCollection
   */
  private createEmptyFeatureCollection(): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
    return {
      type: 'FeatureCollection',
      features: [],
    };
  }
}
