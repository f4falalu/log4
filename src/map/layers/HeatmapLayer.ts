/**
 * HeatmapLayer.ts
 *
 * MapLibre heatmap layer for performance visualization
 * Phase 6: Forensic Map component
 */

import type { Map as MapLibreMap, HeatmapLayerSpecification } from 'maplibre-gl';
import type { FeatureCollection, Point } from 'geojson';
import { MapLayer, type LayerHandlers } from '@/map/core/LayerInterface';
import { ZOOM_BREAKPOINTS } from '@/lib/mapDesignSystem';

/**
 * Heatmap metrics
 */
export type HeatmapMetric =
  | 'on_time'
  | 'delays'
  | 'exceptions'
  | 'trade_offs'
  | 'sla_violations'
  | 'bottlenecks';

/**
 * Performance data point
 */
export interface PerformanceDataPoint {
  id: string;
  lat: number;
  lng: number;
  metric: HeatmapMetric;
  value: number; // Intensity value (0-100)
  timestamp: string;
  entity_type?: string;
  entity_id?: string;
  metadata?: Record<string, any>;
}

/**
 * Heatmap Layer Configuration
 */
export interface HeatmapLayerConfig {
  /** Heatmap metric to visualize (default: 'delays') */
  metric?: HeatmapMetric;

  /** Heatmap radius in pixels (default: 30) */
  radius?: number;

  /** Heatmap intensity multiplier (default: 1.0) */
  intensity?: number;

  /** Minimum zoom to show heatmap (default: Z1 = 6) */
  minZoom?: number;

  /** Maximum zoom to show heatmap (default: 14) */
  maxZoom?: number;

  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Heatmap Layer for MapLibre
 *
 * Features:
 * - Performance density visualization
 * - Configurable metrics (on-time, delays, exceptions, trade-offs, SLA violations, bottlenecks)
 * - Color gradients for intensity
 * - Zoom-based visibility
 * - Real-time updates
 */
export class HeatmapLayer extends MapLayer<PerformanceDataPoint, Point> {
  private config: Required<HeatmapLayerConfig>;
  private readonly heatmapLayerId: string;

  constructor(
    map: MapLibreMap,
    dataPoints: PerformanceDataPoint[],
    handlers: LayerHandlers<Point> = {},
    config: HeatmapLayerConfig = {}
  ) {
    super(map, dataPoints, handlers, {
      id: 'heatmap-layer',
      minZoom: config.minZoom || ZOOM_BREAKPOINTS.Z1,
    });

    this.config = {
      metric: config.metric || 'delays',
      radius: config.radius ?? 30,
      intensity: config.intensity ?? 1.0,
      minZoom: config.minZoom || ZOOM_BREAKPOINTS.Z1,
      maxZoom: config.maxZoom ?? 14,
      debug: config.debug ?? false,
    };

    this.heatmapLayerId = `${this.config.id}-heatmap`;
  }

  /**
   * Transform performance data points to GeoJSON
   */
  protected dataToGeoJSON(dataPoints: PerformanceDataPoint[]): FeatureCollection<Point> {
    const features = dataPoints
      .filter((point) => {
        // Filter by metric
        if (point.metric !== this.config.metric) {
          return false;
        }

        // Filter out points without valid coordinates
        return (
          point.lat !== null &&
          point.lng !== null &&
          !isNaN(point.lat) &&
          !isNaN(point.lng)
        );
      })
      .map((point) => {
        return {
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [point.lng, point.lat],
          },
          properties: {
            id: point.id,
            type: 'heatmap-point',
            metric: point.metric,
            value: point.value,
            timestamp: point.timestamp,
            entity_type: point.entity_type,
            entity_id: point.entity_id,
            metadata: point.metadata,
          },
          id: point.id,
        };
      });

    return {
      type: 'FeatureCollection',
      features,
    };
  }

  /**
   * Get color gradient for metric
   */
  private getColorGradient(metric: HeatmapMetric): [number, string][] {
    const gradients: Record<HeatmapMetric, [number, string][]> = {
      on_time: [
        [0, 'rgba(16, 185, 129, 0)'], // transparent green
        [0.2, 'rgba(16, 185, 129, 0.2)'],
        [0.4, 'rgba(16, 185, 129, 0.4)'],
        [0.6, 'rgba(16, 185, 129, 0.6)'],
        [0.8, 'rgba(16, 185, 129, 0.8)'],
        [1, 'rgba(16, 185, 129, 1)'], // solid green
      ],
      delays: [
        [0, 'rgba(245, 158, 11, 0)'], // transparent amber
        [0.2, 'rgba(245, 158, 11, 0.3)'],
        [0.4, 'rgba(245, 158, 11, 0.5)'],
        [0.6, 'rgba(239, 68, 68, 0.6)'],
        [0.8, 'rgba(239, 68, 68, 0.8)'],
        [1, 'rgba(239, 68, 68, 1)'], // solid red
      ],
      exceptions: [
        [0, 'rgba(239, 68, 68, 0)'], // transparent red
        [0.2, 'rgba(239, 68, 68, 0.3)'],
        [0.4, 'rgba(239, 68, 68, 0.5)'],
        [0.6, 'rgba(220, 38, 38, 0.7)'],
        [0.8, 'rgba(220, 38, 38, 0.85)'],
        [1, 'rgba(220, 38, 38, 1)'], // solid dark red
      ],
      trade_offs: [
        [0, 'rgba(59, 130, 246, 0)'], // transparent blue
        [0.2, 'rgba(59, 130, 246, 0.3)'],
        [0.4, 'rgba(59, 130, 246, 0.5)'],
        [0.6, 'rgba(37, 99, 235, 0.7)'],
        [0.8, 'rgba(37, 99, 235, 0.85)'],
        [1, 'rgba(37, 99, 235, 1)'], // solid dark blue
      ],
      sla_violations: [
        [0, 'rgba(220, 38, 38, 0)'], // transparent red
        [0.2, 'rgba(220, 38, 38, 0.4)'],
        [0.4, 'rgba(220, 38, 38, 0.6)'],
        [0.6, 'rgba(185, 28, 28, 0.75)'],
        [0.8, 'rgba(185, 28, 28, 0.9)'],
        [1, 'rgba(185, 28, 28, 1)'], // solid dark red
      ],
      bottlenecks: [
        [0, 'rgba(168, 85, 247, 0)'], // transparent purple
        [0.2, 'rgba(168, 85, 247, 0.3)'],
        [0.4, 'rgba(168, 85, 247, 0.5)'],
        [0.6, 'rgba(147, 51, 234, 0.7)'],
        [0.8, 'rgba(147, 51, 234, 0.85)'],
        [1, 'rgba(147, 51, 234, 1)'], // solid dark purple
      ],
    };

    return gradients[metric];
  }

  /**
   * Create heatmap layer
   */
  private createHeatmapLayerConfig(): HeatmapLayerSpecification {
    const gradient = this.getColorGradient(this.config.metric);

    return {
      id: this.heatmapLayerId,
      type: 'heatmap',
      source: this.geoJsonSourceId,
      minzoom: this.config.minZoom,
      maxzoom: this.config.maxZoom,
      paint: {
        // Heatmap weight (0-1)
        'heatmap-weight': [
          'interpolate',
          ['linear'],
          ['get', 'value'],
          0, 0,
          100, 1,
        ],
        // Heatmap intensity
        'heatmap-intensity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          this.config.minZoom, this.config.intensity,
          this.config.maxZoom, this.config.intensity * 2,
        ],
        // Heatmap color gradient
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          ...gradient.flat(),
        ],
        // Heatmap radius
        'heatmap-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          this.config.minZoom, this.config.radius,
          this.config.maxZoom, this.config.radius * 2,
        ],
        // Heatmap opacity
        'heatmap-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          this.config.minZoom, 0.8,
          this.config.maxZoom, 0.5,
        ],
      },
    };
  }

  /**
   * Create layer configuration
   */
  protected createLayerConfig(): HeatmapLayerSpecification {
    return this.createHeatmapLayerConfig();
  }

  /**
   * Add layer to map
   */
  add(): void {
    const geoJson = this.dataToGeoJSON(this.data);

    // Add GeoJSON source
    this.map.addSource(this.geoJsonSourceId, {
      type: 'geojson',
      data: geoJson,
    });

    // Add heatmap layer
    this.map.addLayer(this.createHeatmapLayerConfig());

    // No event handlers needed for heatmap (non-interactive)

    if (this.config.debug) {
      console.log(
        `[HeatmapLayer] Added ${geoJson.features.length} data points (metric: ${this.config.metric})`
      );
    }
  }

  /**
   * Setup event handlers (not applicable for heatmap)
   */
  protected setupEventHandlers(): void {
    // Heatmap layers are non-interactive
    // No click or hover handlers needed
  }

  /**
   * Update layer data
   */
  update(dataPoints: PerformanceDataPoint[]): void {
    this.data = dataPoints;
    const geoJson = this.dataToGeoJSON(dataPoints);

    const source = this.map.getSource(this.geoJsonSourceId);
    if (source && source.type === 'geojson') {
      source.setData(geoJson);

      if (this.config.debug) {
        console.log(
          `[HeatmapLayer] Updated ${geoJson.features.length} data points (metric: ${this.config.metric})`
        );
      }
    }
  }

  /**
   * Remove layer from map
   */
  remove(): void {
    if (this.map.getLayer(this.heatmapLayerId)) {
      this.map.removeLayer(this.heatmapLayerId);
    }

    if (this.map.getSource(this.geoJsonSourceId)) {
      this.map.removeSource(this.geoJsonSourceId);
    }

    if (this.config.debug) {
      console.log('[HeatmapLayer] Removed');
    }
  }

  /**
   * Toggle layer visibility
   */
  toggle(visible: boolean): void {
    const visibility = visible ? 'visible' : 'none';

    if (this.map.getLayer(this.heatmapLayerId)) {
      this.map.setLayoutProperty(this.heatmapLayerId, 'visibility', visibility);
    }

    if (this.config.debug) {
      console.log(`[HeatmapLayer] Visibility: ${visibility}`);
    }
  }

  /**
   * Change heatmap metric
   */
  changeMetric(metric: HeatmapMetric): void {
    this.config.metric = metric;

    // Remove existing layer
    if (this.map.getLayer(this.heatmapLayerId)) {
      this.map.removeLayer(this.heatmapLayerId);
    }

    // Re-add with new gradient
    this.map.addLayer(this.createHeatmapLayerConfig());

    // Update data (re-filter by new metric)
    this.update(this.data);

    if (this.config.debug) {
      console.log(`[HeatmapLayer] Changed metric to: ${metric}`);
    }
  }

  /**
   * Set heatmap intensity
   */
  setIntensity(intensity: number): void {
    this.config.intensity = intensity;

    this.map.setPaintProperty(this.heatmapLayerId, 'heatmap-intensity', [
      'interpolate',
      ['linear'],
      ['zoom'],
      this.config.minZoom, intensity,
      this.config.maxZoom, intensity * 2,
    ]);

    if (this.config.debug) {
      console.log(`[HeatmapLayer] Set intensity to: ${intensity}`);
    }
  }

  /**
   * Set heatmap radius
   */
  setRadius(radius: number): void {
    this.config.radius = radius;

    this.map.setPaintProperty(this.heatmapLayerId, 'heatmap-radius', [
      'interpolate',
      ['linear'],
      ['zoom'],
      this.config.minZoom, radius,
      this.config.maxZoom, radius * 2,
    ]);

    if (this.config.debug) {
      console.log(`[HeatmapLayer] Set radius to: ${radius}`);
    }
  }

  /**
   * Get data points by metric
   */
  getDataPointsByMetric(metric: HeatmapMetric): PerformanceDataPoint[] {
    return this.data.filter((point) => point.metric === metric);
  }

  /**
   * Get data points in time range
   */
  getDataPointsInTimeRange(startTime: string, endTime: string): PerformanceDataPoint[] {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();

    return this.data.filter((point) => {
      const timestamp = new Date(point.timestamp).getTime();
      return timestamp >= start && timestamp <= end;
    });
  }

  /**
   * Get metric summary statistics
   */
  getMetricSummary(metric: HeatmapMetric): {
    count: number;
    total: number;
    average: number;
    min: number;
    max: number;
  } {
    const points = this.getDataPointsByMetric(metric);

    if (points.length === 0) {
      return {
        count: 0,
        total: 0,
        average: 0,
        min: 0,
        max: 0,
      };
    }

    const values = points.map((p) => p.value);
    const total = values.reduce((sum, val) => sum + val, 0);

    return {
      count: points.length,
      total,
      average: total / points.length,
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }
}
