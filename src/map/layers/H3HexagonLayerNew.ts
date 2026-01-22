/**
 * H3HexagonLayerNew.ts
 *
 * Pure projection layer for H3 hexagons.
 *
 * GOVERNANCE:
 * - Renders H3CellState[] → GeoJSON
 * - Colors by RISK LEVEL, not metrics
 * - NO H3 computation here
 * - NO zoom awareness
 * - NO viewport awareness
 * - NO domain imports (except types)
 * - Updates never recreate layers
 *
 * RESPONSIBILITIES:
 * - Convert H3CellState[] → GeoJSON
 * - Render fill + stroke
 * - Color by riskLevel semantically
 * - Attach click/hover hooks (no logic)
 */

import type maplibregl from 'maplibre-gl';
import type { MapLayer, RenderContext } from '@/map/core/LayerRegistry';
import {
  type H3CellState,
  type H3CellClickHandler,
  type H3CellHoverHandler,
  cellStateToFeatureProperties,
  RISK_LEVEL_COLORS,
  RISK_LEVEL_OPACITY,
  RISK_LEVEL_STROKE,
} from './H3Layer.types';
import { cellToPolygon } from '@/map/core/spatial';

/**
 * Layer IDs
 */
const LAYER_IDS = {
  fill: 'h3-hexagon-fill',
  stroke: 'h3-hexagon-stroke',
  source: 'h3-hexagon-source',
} as const;

/**
 * H3 Hexagon Layer Configuration
 */
export interface H3HexagonLayerConfig {
  /** Click handler */
  onSelect?: H3CellClickHandler;

  /** Hover handler */
  onHover?: H3CellHoverHandler;

  /** Show only cells in zones (filter out none risk) */
  showOnlyZoned?: boolean;

  /** Minimum risk level to show */
  minRiskLevel?: 'none' | 'low' | 'medium' | 'high';
}

/**
 * H3HexagonLayer - Pure projection layer
 *
 * CRITICAL: This layer does NOT compute H3.
 * It receives pre-computed H3CellState[] and renders them.
 */
export class H3HexagonLayerNew implements MapLayer<H3CellState> {
  readonly id = 'h3-hexagon';
  readonly type = 'h3-hexagon';

  private map: maplibregl.Map | null = null;
  private config: H3HexagonLayerConfig;
  private currentData: H3CellState[] = [];
  private geometryCache = new Map<string, GeoJSON.Polygon>();
  private mounted = false;

  constructor(config: H3HexagonLayerConfig = {}) {
    this.config = config;
  }

  /**
   * Add layer to map
   * Called ONCE by LayerRegistry
   */
  add(ctx: RenderContext): void {
    if (this.mounted) {
      console.warn('[H3HexagonLayer] Already mounted');
      return;
    }

    this.map = ctx.map;

    // Add GeoJSON source (empty initially)
    this.map.addSource(LAYER_IDS.source, {
      type: 'geojson',
      data: this.createEmptyFeatureCollection(),
    });

    // Add fill layer
    this.map.addLayer(
      {
        id: LAYER_IDS.fill,
        type: 'fill',
        source: LAYER_IDS.source,
        paint: {
          // Data-driven fill color from properties
          'fill-color': ['get', 'fillColor'],
          'fill-opacity': ['get', 'fillOpacity'],
        },
      },
      ctx.beforeLayerId
    );

    // Add stroke layer
    this.map.addLayer(
      {
        id: LAYER_IDS.stroke,
        type: 'line',
        source: LAYER_IDS.source,
        paint: {
          'line-color': ['get', 'strokeColor'],
          'line-width': 1,
          'line-opacity': 0.8,
        },
      },
      ctx.beforeLayerId
    );

    // Attach event handlers
    this.attachEventHandlers();

    this.mounted = true;
    console.log('[H3HexagonLayer] Mounted');
  }

  /**
   * Update layer data
   * NO recreation - only updates GeoJSON source
   */
  update(data: H3CellState[]): void {
    if (!this.map || !this.mounted) {
      console.warn('[H3HexagonLayer] Cannot update - not mounted');
      return;
    }

    this.currentData = data;

    // Filter data if configured
    let filteredData = data;

    if (this.config.showOnlyZoned) {
      filteredData = filteredData.filter((cell) => cell.inZone);
    }

    if (this.config.minRiskLevel && this.config.minRiskLevel !== 'none') {
      const riskOrder = { none: 0, low: 1, medium: 2, high: 3 };
      const minLevel = riskOrder[this.config.minRiskLevel];
      filteredData = filteredData.filter(
        (cell) => riskOrder[cell.riskLevel] >= minLevel
      );
    }

    // Convert to GeoJSON
    const geojson = this.cellStatesToGeoJSON(filteredData);

    // Update source
    const source = this.map.getSource(LAYER_IDS.source) as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(geojson);
    }
  }

  /**
   * Remove layer from map
   */
  remove(): void {
    if (!this.map) return;

    // Remove event handlers
    this.detachEventHandlers();

    // Remove layers
    if (this.map.getLayer(LAYER_IDS.stroke)) {
      this.map.removeLayer(LAYER_IDS.stroke);
    }
    if (this.map.getLayer(LAYER_IDS.fill)) {
      this.map.removeLayer(LAYER_IDS.fill);
    }

    // Remove source
    if (this.map.getSource(LAYER_IDS.source)) {
      this.map.removeSource(LAYER_IDS.source);
    }

    this.mounted = false;
    this.map = null;
    this.currentData = [];

    console.log('[H3HexagonLayer] Removed');
  }

  /**
   * Show layer
   */
  show(): void {
    if (!this.map) return;

    this.map.setLayoutProperty(LAYER_IDS.fill, 'visibility', 'visible');
    this.map.setLayoutProperty(LAYER_IDS.stroke, 'visibility', 'visible');
  }

  /**
   * Hide layer
   */
  hide(): void {
    if (!this.map) return;

    this.map.setLayoutProperty(LAYER_IDS.fill, 'visibility', 'none');
    this.map.setLayoutProperty(LAYER_IDS.stroke, 'visibility', 'none');
  }

  /**
   * Check if visible
   */
  isVisible(): boolean {
    if (!this.map) return false;

    const visibility = this.map.getLayoutProperty(LAYER_IDS.fill, 'visibility');
    return visibility !== 'none';
  }

  /**
   * Get current data
   */
  getData(): H3CellState[] {
    return this.currentData;
  }

  /**
   * Get cell state by H3 index
   */
  getCellState(h3Index: string): H3CellState | undefined {
    return this.currentData.find((cell) => cell.h3Index === h3Index);
  }

  /**
   * Convert H3CellState[] to GeoJSON FeatureCollection
   */
  private cellStatesToGeoJSON(
    cells: H3CellState[]
  ): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
    const features: GeoJSON.Feature<GeoJSON.Polygon>[] = cells.map((cell) => {
      // Get geometry from cache or compute
      let geometry = this.geometryCache.get(cell.h3Index);
      if (!geometry) {
        geometry = cellToPolygon(cell.h3Index);
        this.geometryCache.set(cell.h3Index, geometry);
      }

      return {
        type: 'Feature',
        geometry,
        properties: cellStateToFeatureProperties(cell),
      };
    });

    return {
      type: 'FeatureCollection',
      features,
    };
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

  /**
   * Attach click and hover handlers
   */
  private attachEventHandlers(): void {
    if (!this.map) return;

    // Click handler
    this.map.on('click', LAYER_IDS.fill, this.handleClick);

    // Hover handlers
    this.map.on('mouseenter', LAYER_IDS.fill, this.handleMouseEnter);
    this.map.on('mouseleave', LAYER_IDS.fill, this.handleMouseLeave);
    this.map.on('mousemove', LAYER_IDS.fill, this.handleMouseMove);
  }

  /**
   * Detach event handlers
   */
  private detachEventHandlers(): void {
    if (!this.map) return;

    this.map.off('click', LAYER_IDS.fill, this.handleClick);
    this.map.off('mouseenter', LAYER_IDS.fill, this.handleMouseEnter);
    this.map.off('mouseleave', LAYER_IDS.fill, this.handleMouseLeave);
    this.map.off('mousemove', LAYER_IDS.fill, this.handleMouseMove);
  }

  /**
   * Handle click on hexagon
   */
  private handleClick = (e: maplibregl.MapMouseEvent): void => {
    if (!this.config.onSelect) return;

    const features = e.features;
    if (!features || features.length === 0) return;

    const feature = features[0];
    const h3Index = feature.properties?.h3Index;
    if (!h3Index) return;

    const cellState = this.getCellState(h3Index);
    if (cellState) {
      this.config.onSelect(h3Index, cellState);
    }
  };

  /**
   * Handle mouse enter
   */
  private handleMouseEnter = (): void => {
    if (!this.map) return;
    this.map.getCanvas().style.cursor = 'pointer';
  };

  /**
   * Handle mouse leave
   */
  private handleMouseLeave = (): void => {
    if (!this.map) return;
    this.map.getCanvas().style.cursor = '';

    if (this.config.onHover) {
      this.config.onHover(null);
    }
  };

  /**
   * Handle mouse move (for hover detection)
   */
  private handleMouseMove = (e: maplibregl.MapMouseEvent): void => {
    if (!this.config.onHover) return;

    const features = e.features;
    if (!features || features.length === 0) {
      this.config.onHover(null);
      return;
    }

    const h3Index = features[0].properties?.h3Index;
    this.config.onHover(h3Index ?? null);
  };

  /**
   * Clear geometry cache
   * Call when resolution changes (should be rare)
   */
  clearGeometryCache(): void {
    this.geometryCache.clear();
  }
}
