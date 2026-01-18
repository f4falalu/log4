/**
 * Anomaly Detection Layer
 *
 * Real-time anomaly visualization on map
 * Phase 7: Intelligence & Knowledge Graph
 *
 * Features:
 * - Route deviation detection
 * - Unexpected delays
 * - Capacity anomalies
 * - Behavioral outliers
 * - Real-time alerting
 */

import type { Map as MapLibreMap, CircleLayerSpecification, SymbolLayerSpecification } from 'maplibre-gl';
import { MapLayer } from '@/map/core/LayerInterface';

/**
 * Anomaly types
 */
export type AnomalyType =
  | 'route_deviation'
  | 'unexpected_delay'
  | 'capacity_breach'
  | 'speed_anomaly'
  | 'location_anomaly'
  | 'behavioral_outlier';

/**
 * Anomaly severity
 */
export type AnomalySeverity = 'info' | 'warning' | 'critical';

/**
 * Anomaly detection data point
 */
export interface AnomalyDataPoint {
  id: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  timestamp: string;
  location: {
    lat: number;
    lng: number;
  };
  entityId: string;
  entityType: 'vehicle' | 'driver' | 'batch';
  entityName: string;
  description: string;
  expectedValue?: number;
  actualValue?: number;
  deviation?: number; // percentage or absolute
  confidence: number; // 0-100
  metadata?: Record<string, any>;
}

/**
 * Layer configuration
 */
export interface AnomalyDetectionLayerConfig {
  minZoom?: number;
  maxZoom?: number;
  showLabels?: boolean;
  showPulse?: boolean; // Pulse animation for critical anomalies
  filterTypes?: AnomalyType[]; // Show only specific types
  filterSeverity?: AnomalySeverity[]; // Show only specific severities
}

/**
 * Anomaly Detection Layer
 *
 * Visualizes detected anomalies on the map with severity-based styling
 */
export class AnomalyDetectionLayer extends MapLayer<AnomalyDataPoint, GeoJSON.Point> {
  private readonly config: Required<AnomalyDetectionLayerConfig>;
  private readonly pulseLayerId: string;
  private readonly labelLayerId: string;
  private animationFrameId: number | null = null;
  private pulsePhase: number = 0;

  constructor(
    map: MapLibreMap,
    config: AnomalyDetectionLayerConfig = {},
    handlers?: {
      onClick?: (anomaly: AnomalyDataPoint) => void;
      onHover?: (anomaly: AnomalyDataPoint | null) => void;
    }
  ) {
    const layerId = 'anomaly-detection';
    super(map, layerId, handlers);

    this.config = {
      minZoom: config.minZoom ?? 6,
      maxZoom: config.maxZoom ?? 22,
      showLabels: config.showLabels ?? true,
      showPulse: config.showPulse ?? true,
      filterTypes: config.filterTypes ?? [],
      filterSeverity: config.filterSeverity ?? [],
    };

    this.pulseLayerId = `${layerId}-pulse`;
    this.labelLayerId = `${layerId}-labels`;
  }

  /**
   * Transform data to GeoJSON
   */
  protected transformToGeoJSON(anomalies: AnomalyDataPoint[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
    // Apply filters
    let filtered = anomalies;

    if (this.config.filterTypes.length > 0) {
      filtered = filtered.filter((a) => this.config.filterTypes.includes(a.type));
    }

    if (this.config.filterSeverity.length > 0) {
      filtered = filtered.filter((a) => this.config.filterSeverity.includes(a.severity));
    }

    const features: GeoJSON.Feature<GeoJSON.Point>[] = filtered.map((anomaly) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [anomaly.location.lng, anomaly.location.lat],
      },
      properties: {
        id: anomaly.id,
        type: anomaly.type,
        severity: anomaly.severity,
        timestamp: anomaly.timestamp,
        entityId: anomaly.entityId,
        entityType: anomaly.entityType,
        entityName: anomaly.entityName,
        description: anomaly.description,
        expectedValue: anomaly.expectedValue,
        actualValue: anomaly.actualValue,
        deviation: anomaly.deviation,
        confidence: anomaly.confidence,
      },
    }));

    return {
      type: 'FeatureCollection',
      features,
    };
  }

  /**
   * Create layer configuration
   */
  protected createLayerConfig(): CircleLayerSpecification {
    return {
      id: this.config.id,
      type: 'circle',
      source: this.geoJsonSourceId,
      minzoom: this.config.minZoom,
      maxzoom: this.config.maxZoom,
      paint: {
        'circle-radius': [
          'match',
          ['get', 'severity'],
          'critical', 12,
          'warning', 10,
          'info', 8,
          8,
        ],
        'circle-color': [
          'match',
          ['get', 'severity'],
          'critical', '#dc2626', // Red
          'warning', '#f59e0b', // Amber
          'info', '#3b82f6', // Blue
          '#6b7280', // Gray default
        ],
        'circle-opacity': 0.8,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-opacity': 1,
      },
    };
  }

  /**
   * Create additional layers (pulse + labels)
   */
  protected createAdditionalLayers(): void {
    // Pulse layer for critical anomalies
    if (this.config.showPulse) {
      const pulseLayer: CircleLayerSpecification = {
        id: this.pulseLayerId,
        type: 'circle',
        source: this.geoJsonSourceId,
        minzoom: this.config.minZoom,
        maxzoom: this.config.maxZoom,
        filter: ['==', ['get', 'severity'], 'critical'],
        paint: {
          'circle-radius': 20, // Will be animated
          'circle-color': '#dc2626',
          'circle-opacity': 0, // Will be animated
          'circle-stroke-width': 0,
        },
      };

      this.map.addLayer(pulseLayer);
      this.startPulseAnimation();
    }

    // Label layer
    if (this.config.showLabels) {
      const labelLayer: SymbolLayerSpecification = {
        id: this.labelLayerId,
        type: 'symbol',
        source: this.geoJsonSourceId,
        minzoom: 10, // Only show labels at higher zoom
        maxzoom: this.config.maxZoom,
        layout: {
          'text-field': ['get', 'description'],
          'text-font': ['Open Sans Regular'],
          'text-size': 11,
          'text-offset': [0, 1.5],
          'text-anchor': 'top',
          'text-max-width': 15,
        },
        paint: {
          'text-color': '#1f2937',
          'text-halo-color': '#ffffff',
          'text-halo-width': 2,
          'text-halo-blur': 1,
        },
      };

      this.map.addLayer(labelLayer);
    }
  }

  /**
   * Start pulse animation for critical anomalies
   */
  private startPulseAnimation(): void {
    const animate = () => {
      this.pulsePhase += 0.02;
      if (this.pulsePhase > 1) this.pulsePhase = 0;

      // Sine wave for smooth pulsing
      const opacity = Math.sin(this.pulsePhase * Math.PI) * 0.3;
      const radius = 20 + Math.sin(this.pulsePhase * Math.PI) * 10;

      if (this.map.getLayer(this.pulseLayerId)) {
        this.map.setPaintProperty(this.pulseLayerId, 'circle-opacity', opacity);
        this.map.setPaintProperty(this.pulseLayerId, 'circle-radius', radius);
      }

      this.animationFrameId = requestAnimationFrame(animate);
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  /**
   * Stop pulse animation
   */
  private stopPulseAnimation(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Update filter types
   */
  setFilterTypes(types: AnomalyType[]): void {
    this.config.filterTypes = types;
    this.update(this.data);
  }

  /**
   * Update filter severity
   */
  setFilterSeverity(severities: AnomalySeverity[]): void {
    this.config.filterSeverity = severities;
    this.update(this.data);
  }

  /**
   * Remove layer and cleanup
   */
  remove(): void {
    this.stopPulseAnimation();

    if (this.map.getLayer(this.labelLayerId)) {
      this.map.removeLayer(this.labelLayerId);
    }

    if (this.map.getLayer(this.pulseLayerId)) {
      this.map.removeLayer(this.pulseLayerId);
    }

    super.remove();
  }
}
