/**
 * H3HexagonLayer.ts
 *
 * MapLibre fill layer for H3 hexagonal grid visualization.
 * Used in Planning mode for demand/capacity/SLA analysis.
 *
 * Pattern: Extends MapLayer abstract class (same as FacilitySymbolLayer)
 *
 * Features:
 * - Proper H3 cell enumeration via polygonToCells
 * - Three visualization modes: demand, capacity, SLA
 * - Data-driven color interpolation
 * - Click handlers for cell details
 * - Viewport-aware geometry caching
 */

import type {
  Map as MapLibreMap,
  FillLayerSpecification,
  LineLayerSpecification,
  ExpressionSpecification,
} from 'maplibre-gl';
import type { FeatureCollection, Polygon, Feature } from 'geojson';
import { MapLayer, type LayerHandlers } from '@/map/core/LayerInterface';
import { cellToPolygon } from '@/services/h3Planner';
import type { H3CellMetrics } from '@/integrations/supabase/h3Analytics';
import type { PlanningMetric } from '@/components/map/ui/MetricsTogglePanel';

// ============================================================================
// TYPES
// ============================================================================

/**
 * H3 cell data with optional metrics.
 */
export interface H3CellData {
  h3Index: string;
  metrics: H3CellMetrics | null;
}

/**
 * Layer configuration options.
 */
export interface H3HexagonLayerConfig {
  /** Layer ID (default: 'h3-hexagon-layer') */
  id?: string;
  /** Initial metric to visualize */
  metric?: PlanningMetric;
  /** Minimum zoom to show layer */
  minZoom?: number;
  /** Maximum zoom to show layer */
  maxZoom?: number;
  /** Fill opacity (0-1) */
  fillOpacity?: number;
  /** Stroke width in pixels */
  strokeWidth?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Cell click event data.
 */
export interface H3CellClickData {
  h3Index: string;
  metric: PlanningMetric;
  value: number;
  hasData: boolean;
  deliveries: number;
  demandForecast: number;
  utilizationPct: number;
  slaBreachPct: number;
  activeFacilities: number;
}

// ============================================================================
// COLOR SCALES
// ============================================================================

/**
 * Color scales for each metric type.
 * Uses interpolation stops for smooth gradients.
 */
const METRIC_COLOR_SCALES: Record<
  PlanningMetric,
  { stops: [number, string][]; default: string; noData: string }
> = {
  demand: {
    // Orange scale: low demand (light) to high demand (dark)
    stops: [
      [0, '#fff7ed'],     // orange-50
      [25, '#fed7aa'],    // orange-200
      [50, '#fb923c'],    // orange-400
      [75, '#ea580c'],    // orange-600
      [100, '#9a3412'],   // orange-800
    ],
    default: '#ffedd5',   // orange-100
    noData: '#fdba74',    // orange-300 - visible placeholder until data loads
  },
  capacity: {
    // Blue scale with warning colors for high utilization
    stops: [
      [0, '#eff6ff'],     // blue-50 (underutilized)
      [50, '#60a5fa'],    // blue-400 (healthy)
      [75, '#f59e0b'],    // amber-500 (warning)
      [90, '#ef4444'],    // red-500 (critical)
      [100, '#991b1b'],   // red-800 (over-capacity)
    ],
    default: '#dbeafe',   // blue-100
    noData: '#93c5fd',    // blue-300 - visible placeholder until data loads
  },
  sla: {
    // Green to Red scale: healthy (green) to at-risk (red)
    stops: [
      [0, '#dcfce7'],     // green-100 (healthy)
      [10, '#86efac'],    // green-300
      [25, '#fef08a'],    // yellow-200 (minor risk)
      [50, '#fbbf24'],    // amber-400 (moderate risk)
      [75, '#f87171'],    // red-400 (high risk)
      [100, '#dc2626'],   // red-600 (critical)
    ],
    default: '#f0fdf4',   // green-50
    noData: '#86efac',    // green-300 - visible placeholder until data loads
  },
};

// ============================================================================
// LAYER IMPLEMENTATION
// ============================================================================

/**
 * H3 Hexagon Layer for Planning Map
 *
 * Renders H3 hexagonal cells with data-driven coloring based on
 * demand, capacity, or SLA metrics.
 */
export class H3HexagonLayer extends MapLayer<H3CellData, Polygon> {
  private layerConfig: Required<H3HexagonLayerConfig>;
  private readonly fillLayerId: string;
  private readonly strokeLayerId: string;
  private currentMetric: PlanningMetric;
  private geometryCache: Map<string, GeoJSON.Polygon> = new Map();

  constructor(
    map: MapLibreMap,
    cells: H3CellData[],
    handlers: LayerHandlers<H3CellClickData> = {},
    config: H3HexagonLayerConfig = {}
  ) {
    super(map, cells, handlers as LayerHandlers<Polygon>, {
      id: config.id || 'h3-hexagon-layer',
      minZoom: config.minZoom || 4,
      maxZoom: config.maxZoom || 16,
    });

    this.layerConfig = {
      id: config.id || 'h3-hexagon-layer',
      metric: config.metric || 'demand',
      minZoom: config.minZoom || 4,
      maxZoom: config.maxZoom || 16,
      fillOpacity: config.fillOpacity ?? 0.7,  // Slightly higher for better visibility
      strokeWidth: config.strokeWidth ?? 1.5,  // Slightly thicker stroke
      debug: config.debug ?? false,
    };

    this.currentMetric = this.layerConfig.metric;
    this.fillLayerId = `${this.config.id}-fill`;
    this.strokeLayerId = `${this.config.id}-stroke`;
  }

  /**
   * Transform H3 cells to GeoJSON FeatureCollection.
   */
  protected dataToGeoJSON(cells: H3CellData[]): FeatureCollection<Polygon> {
    const features: Feature<Polygon>[] = [];

    for (const cell of cells) {
      // Get geometry from cache or generate
      let geometry = this.geometryCache.get(cell.h3Index);
      if (!geometry) {
        geometry = cellToPolygon(cell.h3Index);
        this.geometryCache.set(cell.h3Index, geometry);
      }

      // Compute the metric value for coloring
      const metricValue = this.getMetricValue(cell.metrics);

      features.push({
        type: 'Feature',
        geometry,
        properties: {
          h3Index: cell.h3Index,
          metric: this.currentMetric,
          value: metricValue,
          hasData: cell.metrics !== null,
          // Store all metrics for click/hover details
          deliveries: cell.metrics?.deliveries ?? 0,
          demandForecast: cell.metrics?.demand_forecast ?? 0,
          utilizationPct: cell.metrics?.utilization_pct ?? 0,
          slaBreachPct: cell.metrics?.sla_breach_pct ?? 0,
          activeFacilities: cell.metrics?.active_facilities ?? 0,
          activeWarehouses: cell.metrics?.active_warehouses ?? 0,
        },
        id: cell.h3Index,
      });
    }

    return {
      type: 'FeatureCollection',
      features,
    };
  }

  /**
   * Get the metric value for coloring based on current metric type.
   */
  private getMetricValue(metrics: H3CellMetrics | null): number {
    if (!metrics) return 0;

    switch (this.currentMetric) {
      case 'demand':
        // Normalize deliveries to 0-100 scale (assuming max ~50 deliveries per cell)
        return Math.min(100, metrics.deliveries * 2);
      case 'capacity':
        return metrics.utilization_pct;
      case 'sla':
        return metrics.sla_breach_pct;
      default:
        return 0;
    }
  }

  /**
   * Build MapLibre color expression for current metric.
   */
  private buildColorExpression(): ExpressionSpecification {
    const scale = METRIC_COLOR_SCALES[this.currentMetric];

    // Build interpolation stops
    const interpolateStops: (number | string)[] = [];
    for (const [value, color] of scale.stops) {
      interpolateStops.push(value, color);
    }

    return [
      'case',
      // No data case
      ['==', ['get', 'hasData'], false],
      scale.noData,
      // Data case with interpolation
      [
        'interpolate',
        ['linear'],
        ['get', 'value'],
        ...interpolateStops,
      ],
    ] as ExpressionSpecification;
  }

  /**
   * Create fill layer configuration.
   */
  protected createLayerConfig(): FillLayerSpecification {
    return {
      id: this.fillLayerId,
      type: 'fill',
      source: this.geoJsonSourceId,
      minzoom: this.layerConfig.minZoom,
      maxzoom: this.layerConfig.maxZoom,
      paint: {
        'fill-color': this.buildColorExpression(),
        'fill-opacity': [
          'case',
          ['==', ['get', 'hasData'], false],
          0.6, // Semi-transparent for no-data cells
          this.layerConfig.fillOpacity,
        ] as ExpressionSpecification,
      },
    };
  }

  /**
   * Create stroke layer configuration.
   */
  private createStrokeLayerConfig(): LineLayerSpecification {
    return {
      id: this.strokeLayerId,
      type: 'line',
      source: this.geoJsonSourceId,
      minzoom: this.layerConfig.minZoom,
      maxzoom: this.layerConfig.maxZoom,
      paint: {
        'line-color': '#64748b', // slate-500 - visible on both light and dark maps
        'line-width': this.layerConfig.strokeWidth,
        'line-opacity': 0.7,  // Increased for better visibility
      },
    };
  }

  /**
   * Add layer to map.
   */
  add(): void {
    if (this.isAdded) {
      if (this.layerConfig.debug) {
        console.warn('[H3HexagonLayer] Layer already added');
      }
      return;
    }

    const geoJson = this.dataToGeoJSON(this.data);

    // Remove existing source/layers if they exist (cleanup from failed adds)
    if (this.map.getLayer(this.strokeLayerId)) {
      this.map.removeLayer(this.strokeLayerId);
    }
    if (this.map.getLayer(this.fillLayerId)) {
      this.map.removeLayer(this.fillLayerId);
    }
    if (this.map.getSource(this.geoJsonSourceId)) {
      this.map.removeSource(this.geoJsonSourceId);
    }

    // Add GeoJSON source
    this.map.addSource(this.geoJsonSourceId, {
      type: 'geojson',
      data: geoJson,
    });

    // Find first symbol layer (labels) to insert hexagons below
    const layers = this.map.getStyle()?.layers || [];
    let beforeLayerId: string | undefined;
    for (const layer of layers) {
      if (layer.type === 'symbol') {
        beforeLayerId = layer.id;
        break;
      }
    }

    if (this.layerConfig.debug) {
      console.log(`[H3HexagonLayer] Inserting before layer: ${beforeLayerId || 'top of stack'}`);
    }

    // Add fill layer (below labels)
    this.map.addLayer(this.createLayerConfig(), beforeLayerId);

    // Add stroke layer on top of fill (still below labels)
    this.map.addLayer(this.createStrokeLayerConfig(), beforeLayerId);

    // Setup event handlers
    this.setupEventHandlers();

    this.isAdded = true;

    if (this.layerConfig.debug) {
      console.log(`[H3HexagonLayer] Added ${geoJson.features.length} cells`);
    }
  }

  /**
   * Setup click and hover handlers.
   */
  protected setupEventHandlers(): void {
    // Click handler
    if (this.handlers.onClick) {
      this.map.on('click', this.fillLayerId, (e) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          const props = feature.properties as H3CellClickData;
          (this.handlers.onClick as (data: H3CellClickData, event: maplibregl.MapMouseEvent) => void)(
            props,
            e
          );
        }
      });
    }

    // Hover handlers
    if (this.handlers.onHover) {
      this.map.on('mouseenter', this.fillLayerId, (e) => {
        this.map.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          const props = feature.properties as H3CellClickData;
          (this.handlers.onHover as (data: H3CellClickData | null, event: maplibregl.MapMouseEvent) => void)(
            props,
            e
          );
        }
      });

      this.map.on('mouseleave', this.fillLayerId, (e) => {
        this.map.getCanvas().style.cursor = '';
        (this.handlers.onHover as (data: H3CellClickData | null, event: maplibregl.MapMouseEvent) => void)(
          null,
          e
        );
      });
    }
  }

  /**
   * Update layer data.
   */
  update(cells: H3CellData[]): void {
    this.data = cells;

    if (this.layerConfig.debug) {
      console.log(`[H3HexagonLayer] update() called with ${cells.length} cells, isAdded: ${this.isAdded}`);
    }

    if (!this.isAdded) {
      if (this.layerConfig.debug) {
        console.log('[H3HexagonLayer] Layer not yet added, skipping update');
      }
      return;
    }

    const geoJson = this.dataToGeoJSON(cells);
    const source = this.map.getSource(this.geoJsonSourceId);

    if (this.layerConfig.debug) {
      console.log(`[H3HexagonLayer] GeoJSON created with ${geoJson.features.length} features`);
      if (geoJson.features.length > 0) {
        console.log('[H3HexagonLayer] First feature:', JSON.stringify(geoJson.features[0]).slice(0, 300));
      }
    }

    if (source && source.type === 'geojson') {
      source.setData(geoJson);

      if (this.layerConfig.debug) {
        console.log(`[H3HexagonLayer] Updated ${geoJson.features.length} cells on map`);
      }
    } else {
      // Source was lost (possibly due to style change), re-add the layer
      if (this.layerConfig.debug) {
        console.warn('[H3HexagonLayer] Source not found, re-adding layer...');
      }
      this.isAdded = false;
      this.add();
      // Now update with the data
      const newSource = this.map.getSource(this.geoJsonSourceId);
      if (newSource && newSource.type === 'geojson') {
        newSource.setData(geoJson);
        if (this.layerConfig.debug) {
          console.log(`[H3HexagonLayer] Re-added and updated ${geoJson.features.length} cells on map`);
        }
      }
    }
  }

  /**
   * Change the active metric (recolors without refetching geometry).
   */
  changeMetric(metric: PlanningMetric): void {
    if (this.currentMetric === metric) return;

    this.currentMetric = metric;

    if (!this.isAdded) return;

    // Update fill color expression
    this.map.setPaintProperty(
      this.fillLayerId,
      'fill-color',
      this.buildColorExpression()
    );

    // Re-render features with new metric values
    this.update(this.data);

    if (this.layerConfig.debug) {
      console.log(`[H3HexagonLayer] Changed metric to: ${metric}`);
    }
  }

  /**
   * Get current metric.
   */
  getMetric(): PlanningMetric {
    return this.currentMetric;
  }

  /**
   * Remove layer from map.
   */
  remove(): void {
    if (!this.isAdded) return;

    // Remove layers
    if (this.map.getLayer(this.strokeLayerId)) {
      this.map.removeLayer(this.strokeLayerId);
    }

    if (this.map.getLayer(this.fillLayerId)) {
      this.map.removeLayer(this.fillLayerId);
    }

    // Remove source
    if (this.map.getSource(this.geoJsonSourceId)) {
      this.map.removeSource(this.geoJsonSourceId);
    }

    this.isAdded = false;

    if (this.layerConfig.debug) {
      console.log('[H3HexagonLayer] Removed');
    }
  }

  /**
   * Toggle layer visibility.
   */
  toggle(visible: boolean): void {
    const visibility = visible ? 'visible' : 'none';

    if (this.map.getLayer(this.fillLayerId)) {
      this.map.setLayoutProperty(this.fillLayerId, 'visibility', visibility);
    }

    if (this.map.getLayer(this.strokeLayerId)) {
      this.map.setLayoutProperty(this.strokeLayerId, 'visibility', visibility);
    }

    if (this.layerConfig.debug) {
      console.log(`[H3HexagonLayer] Visibility: ${visibility}`);
    }
  }

  /**
   * Clear geometry cache (call on resolution change).
   */
  clearCache(): void {
    this.geometryCache.clear();

    if (this.layerConfig.debug) {
      console.log('[H3HexagonLayer] Cache cleared');
    }
  }

  /**
   * Get cells currently visible in viewport.
   */
  getCellsInView(): H3CellClickData[] {
    if (!this.isAdded) return [];

    const features = this.map.queryRenderedFeatures(undefined, {
      layers: [this.fillLayerId],
    });

    return features.map((f) => f.properties as H3CellClickData);
  }

  /**
   * Set fill opacity.
   */
  setOpacity(opacity: number): void {
    this.layerConfig.fillOpacity = Math.max(0, Math.min(1, opacity));

    if (this.isAdded && this.map.getLayer(this.fillLayerId)) {
      this.map.setPaintProperty(
        this.fillLayerId,
        'fill-opacity',
        [
          'case',
          ['==', ['get', 'hasData'], false],
          opacity * 0.5,
          opacity,
        ] as ExpressionSpecification
      );
    }
  }
}
