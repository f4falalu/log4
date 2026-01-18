/**
 * AlertSymbolLayer.ts
 *
 * MapLibre symbol layer for alerts with severity encoding
 * Phase 5: Operational Map component
 */

import type { Map as MapLibreMap, SymbolLayerSpecification, CircleLayerSpecification } from 'maplibre-gl';
import type { FeatureCollection, Point } from 'geojson';
import { MapLayer, type LayerHandlers } from '@/map/core/LayerInterface';
import { ZOOM_BREAKPOINTS } from '@/lib/mapDesignSystem';
import type { RepresentationMode } from '@/components/map/RepresentationToggle';

/**
 * Alert types (from schema)
 */
export type AlertType =
  | 'vehicle_breakdown'
  | 'driver_issue'
  | 'route_blocked'
  | 'capacity_breach'
  | 'eta_violation'
  | 'facility_closure'
  | 'weather_warning'
  | 'security_incident';

/**
 * Alert severity levels
 */
export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';

/**
 * Alert entity (from schema)
 */
export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  lat: number;
  lng: number;
  status: 'active' | 'acknowledged' | 'resolved';
  created_at: string;
  acknowledged_at?: string | null;
  resolved_at?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
}

/**
 * Alert Symbol Layer Configuration
 */
export interface AlertSymbolLayerConfig {
  /** Show alert labels (default: true) */
  showLabels?: boolean;

  /** Minimum zoom to show alerts (default: Z1 = 6) */
  minZoom?: number;

  /** Minimum zoom for labels (default: Z2 = 12) */
  labelMinZoom?: number;

  /** Icon size (default: 1.0) */
  iconSize?: number;

  /** Show pulse animation for active alerts (default: true) */
  showPulse?: boolean;

  /** Filter by severity (default: show all) */
  severityFilter?: AlertSeverity[];

  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Alert Symbol Layer for MapLibre
 *
 * Features:
 * - Alert icon with severity-based colors
 * - Pulse animation for active alerts
 * - Type-specific icons (vehicle, driver, route, etc.)
 * - Click and hover handlers
 */
export class AlertSymbolLayer extends MapLayer<Alert, Point> {
  private config: Required<AlertSymbolLayerConfig>;
  private readonly symbolLayerId: string;
  private readonly labelLayerId: string;
  private readonly pulseLayerId: string;
  private currentMode: RepresentationMode = 'entity-rich';

  constructor(
    map: MapLibreMap,
    alerts: Alert[],
    handlers: LayerHandlers<Point> = {},
    config: AlertSymbolLayerConfig = {}
  ) {
    super(map, alerts, handlers, {
      id: 'alerts-layer',
      minZoom: config.minZoom || ZOOM_BREAKPOINTS.Z1,
    });

    this.config = {
      showLabels: config.showLabels ?? true,
      minZoom: config.minZoom || ZOOM_BREAKPOINTS.Z1,
      labelMinZoom: config.labelMinZoom || ZOOM_BREAKPOINTS.Z2,
      iconSize: config.iconSize ?? 1.0,
      showPulse: config.showPulse ?? true,
      severityFilter: config.severityFilter || ['critical', 'high', 'medium', 'low'],
      debug: config.debug ?? false,
    };

    this.symbolLayerId = `${this.config.id}-symbol`;
    this.labelLayerId = `${this.config.id}-label`;
    this.pulseLayerId = `${this.config.id}-pulse`;
  }

  /**
   * Transform alerts to GeoJSON
   */
  protected dataToGeoJSON(alerts: Alert[]): FeatureCollection<Point> {
    const features = alerts
      .filter((alert) => {
        // Filter by severity
        if (!this.config.severityFilter.includes(alert.severity)) {
          return false;
        }

        // Filter out alerts without valid coordinates
        return (
          alert.lat !== null &&
          alert.lng !== null &&
          !isNaN(alert.lat) &&
          !isNaN(alert.lng)
        );
      })
      .map((alert) => {
        return {
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [alert.lng, alert.lat],
          },
          properties: {
            id: alert.id,
            type: 'alert',
            alertType: alert.type,
            severity: alert.severity,
            title: alert.title,
            description: alert.description,
            status: alert.status,
            createdAt: alert.created_at,
            // Icon selection
            iconName: this.getAlertIcon(alert),
            // Severity color
            severityColor: this.getSeverityColor(alert.severity),
            // Label text
            labelText: this.getAlertLabelText(alert),
            // Pulse indicator
            shouldPulse: alert.status === 'active',
          },
          id: alert.id,
        };
      });

    return {
      type: 'FeatureCollection',
      features,
    };
  }

  /**
   * Get alert icon based on type
   */
  private getAlertIcon(alert: Alert): string {
    const iconMap: Record<AlertType, string> = {
      vehicle_breakdown: 'alert.vehicle',
      driver_issue: 'alert.driver',
      route_blocked: 'alert.route',
      capacity_breach: 'alert.capacity',
      eta_violation: 'alert.eta',
      facility_closure: 'alert.facility',
      weather_warning: 'alert.weather',
      security_incident: 'alert.security',
    };

    return iconMap[alert.type] || 'alert.generic';
  }

  /**
   * Get severity color
   */
  private getSeverityColor(severity: AlertSeverity): string {
    const colors: Record<AlertSeverity, string> = {
      critical: '#ef4444', // red-500
      high: '#f97316', // orange-500
      medium: '#f59e0b', // amber-500
      low: '#3b82f6', // blue-500
    };

    return colors[severity] || '#6b7280';
  }

  /**
   * Get alert label text
   */
  private getAlertLabelText(alert: Alert): string {
    const parts: string[] = [alert.title];

    // Add severity badge
    parts.push(`[${alert.severity.toUpperCase()}]`);

    // Add time since creation
    const timeSince = this.getTimeSince(alert.created_at);
    parts.push(timeSince);

    return parts.join('\n');
  }

  /**
   * Get time since alert creation
   */
  private getTimeSince(timestamp: string): string {
    const created = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.round(diffMs / 60000);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffMins < 1440) {
      const hours = Math.floor(diffMins / 60);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffMins / 1440);
      return `${days}d ago`;
    }
  }

  /**
   * Create alert symbol layer
   */
  private createSymbolLayerConfig(): SymbolLayerSpecification {
    return {
      id: this.symbolLayerId,
      type: 'symbol',
      source: this.geoJsonSourceId,
      minzoom: this.config.minZoom,
      layout: {
        'icon-image': ['get', 'iconName'],
        'icon-size': this.config.iconSize,
        'icon-allow-overlap': true,
        'icon-anchor': 'center',
        // Higher priority for critical alerts
        'symbol-sort-key': [
          'match',
          ['get', 'severity'],
          'critical', 0,
          'high', 1,
          'medium', 2,
          'low', 3,
          4,
        ],
      },
      paint: {
        // Severity-based color
        'icon-color': ['get', 'severityColor'],
        'icon-opacity': [
          'case',
          ['==', ['get', 'status'], 'resolved'], 0.4,
          1,
        ],
        'icon-halo-color': '#ffffff',
        'icon-halo-width': 2,
      },
    };
  }

  /**
   * Create pulse layer (for active alerts)
   */
  private createPulseLayerConfig(): CircleLayerSpecification {
    return {
      id: this.pulseLayerId,
      type: 'circle',
      source: this.geoJsonSourceId,
      minzoom: this.config.minZoom,
      filter: ['==', ['get', 'shouldPulse'], true],
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          6, 15,
          12, 25,
          19, 40,
        ],
        'circle-color': ['get', 'severityColor'],
        'circle-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          6, 0.2,
          12, 0.3,
          19, 0.4,
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': ['get', 'severityColor'],
        'circle-stroke-opacity': 0.6,
      },
    };
  }

  /**
   * Create label layer
   */
  private createLabelLayerConfig(): SymbolLayerSpecification {
    return {
      id: this.labelLayerId,
      type: 'symbol',
      source: this.geoJsonSourceId,
      minzoom: this.config.labelMinZoom,
      layout: {
        'text-field': ['get', 'labelText'],
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': 11,
        'text-offset': [0, 2],
        'text-anchor': 'top',
        'text-optional': true,
        'text-allow-overlap': false,
      },
      paint: {
        'text-color': ['get', 'severityColor'],
        'text-halo-color': '#ffffff',
        'text-halo-width': 2,
        'text-opacity': [
          'case',
          ['==', ['get', 'status'], 'resolved'], 0.5,
          1,
        ],
      },
    };
  }

  /**
   * Create layer configuration
   */
  protected createLayerConfig(): SymbolLayerSpecification {
    // Return symbol layer config (main layer)
    return this.createSymbolLayerConfig();
  }

  /**
   * Add layer to map
   */
  add(): void {
    if (this.isAdded) {
      console.warn(`[AlertSymbolLayer] Layer already added`);
      return;
    }

    const geoJson = this.dataToGeoJSON(this.data);

    // Add GeoJSON source
    if (!this.map.getSource(this.geoJsonSourceId)) {
      this.map.addSource(this.geoJsonSourceId, {
        type: 'geojson',
        data: geoJson,
      });
    }

    // Add pulse layer first (renders behind icon)
    if (this.config.showPulse && !this.map.getLayer(this.pulseLayerId)) {
      this.map.addLayer(this.createPulseLayerConfig());
    }

    // Add alert symbol layer
    if (!this.map.getLayer(this.symbolLayerId)) {
      this.map.addLayer(this.createSymbolLayerConfig());
    }

    // Add label layer
    if (this.config.showLabels && !this.map.getLayer(this.labelLayerId)) {
      this.map.addLayer(this.createLabelLayerConfig());
    }

    // Setup event handlers
    this.setupEventHandlers();

    this.isAdded = true;

    if (this.config.debug) {
      console.log(
        `[AlertSymbolLayer] Added ${geoJson.features.length} alerts (pulse: ${this.config.showPulse})`
      );
    }
  }

  /**
   * Setup click and hover event handlers
   */
  protected setupEventHandlers(): void {
    // Click handler
    if (this.handlers.onClick) {
      this.map.on('click', this.symbolLayerId, (e) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          this.handlers.onClick!(feature as any, e.lngLat);
        }
      });
    }

    // Hover handlers
    if (this.handlers.onHover) {
      this.map.on('mouseenter', this.symbolLayerId, (e) => {
        this.map.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          this.handlers.onHover!(feature as any, e.lngLat);
        }
      });

      this.map.on('mouseleave', this.symbolLayerId, () => {
        this.map.getCanvas().style.cursor = '';
      });
    }
  }

  /**
   * Update layer data
   */
  update(alerts: Alert[]): void {
    this.data = alerts;
    const geoJson = this.dataToGeoJSON(alerts);

    const source = this.map.getSource(this.geoJsonSourceId);
    if (source && source.type === 'geojson') {
      source.setData(geoJson);

      if (this.config.debug) {
        console.log(
          `[AlertSymbolLayer] Updated ${geoJson.features.length} alerts`
        );
      }
    }
  }

  /**
   * Remove layer from map
   */
  remove(): void {
    if (!this.isAdded) {
      return;
    }

    const layersToRemove = [
      this.pulseLayerId,
      this.symbolLayerId,
      this.labelLayerId,
    ];

    layersToRemove.forEach((layerId) => {
      if (this.map.getLayer(layerId)) {
        this.map.removeLayer(layerId);
      }
    });

    if (this.map.getSource(this.geoJsonSourceId)) {
      this.map.removeSource(this.geoJsonSourceId);
    }

    this.isAdded = false;

    if (this.config.debug) {
      console.log('[AlertSymbolLayer] Removed');
    }
  }

  /**
   * Toggle layer visibility
   */
  toggle(visible: boolean): void {
    const visibility = visible ? 'visible' : 'none';

    const layersToToggle = [
      this.pulseLayerId,
      this.symbolLayerId,
      this.labelLayerId,
    ];

    layersToToggle.forEach((layerId) => {
      if (this.map.getLayer(layerId)) {
        this.map.setLayoutProperty(layerId, 'visibility', visibility);
      }
    });

    if (this.config.debug) {
      console.log(`[AlertSymbolLayer] Visibility: ${visibility}`);
    }
  }

  /**
   * Highlight an alert
   */
  highlight(alertId: string): void {
    // Use feature state for dynamic highlighting
    this.map.setFeatureState(
      { source: this.geoJsonSourceId, id: alertId },
      { highlighted: true }
    );

    if (this.config.debug) {
      console.log(`[AlertSymbolLayer] Highlighted alert: ${alertId}`);
    }
  }

  /**
   * Clear all highlights
   */
  clearHighlight(): void {
    // Remove feature state for all features
    this.data.forEach((alert) => {
      this.map.removeFeatureState({
        source: this.geoJsonSourceId,
        id: alert.id,
      });
    });

    if (this.config.debug) {
      console.log('[AlertSymbolLayer] Cleared all highlights');
    }
  }

  /**
   * Get alerts within viewport
   */
  getAlertsInView(): Alert[] {
    const features = this.map.queryRenderedFeatures(undefined, {
      layers: [this.symbolLayerId],
    });

    return features.map((f) => f.properties as unknown as Alert);
  }

  /**
   * Filter alerts by severity
   */
  filterBySeverity(severities: AlertSeverity[]): void {
    this.config.severityFilter = severities;
    this.update(this.data); // Re-render with new filter

    if (this.config.debug) {
      console.log(
        `[AlertSymbolLayer] Filtered by severity: ${severities.join(', ')}`
      );
    }
  }

  /**
   * Get alert count by severity
   */
  getCountBySeverity(): Record<AlertSeverity, number> {
    const counts: Record<AlertSeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    this.data.forEach((alert) => {
      if (alert.status === 'active') {
        counts[alert.severity]++;
      }
    });

    return counts;
  }

  /**
   * Apply mode configuration without recreating layer
   * Used by MapRuntime for instant mode switching
   */
  applyModeConfig(mode: RepresentationMode): void {
    this.currentMode = mode;

    if (!this.isAdded) return;

    if (mode === 'minimal') {
      // Minimal mode: simple warning icons, no pulse, no labels
      this.map.setLayoutProperty(this.symbolLayerId, 'icon-size', 0.4);

      // Hide labels in minimal mode
      if (this.map.getLayer(this.labelLayerId)) {
        this.map.setLayoutProperty(this.labelLayerId, 'visibility', 'none');
      }

      // Hide pulse layer in minimal mode
      if (this.map.getLayer(this.pulseLayerId)) {
        this.map.setLayoutProperty(this.pulseLayerId, 'visibility', 'none');
      }
    } else {
      // Entity-rich mode: full alert icons with pulse and labels
      this.map.setLayoutProperty(this.symbolLayerId, 'icon-size', this.config.iconSize);

      // Show labels if enabled
      if (this.config.showLabels && this.map.getLayer(this.labelLayerId)) {
        this.map.setLayoutProperty(this.labelLayerId, 'visibility', 'visible');
      }

      // Show pulse animation if enabled
      if (this.config.showPulse && this.map.getLayer(this.pulseLayerId)) {
        this.map.setLayoutProperty(this.pulseLayerId, 'visibility', 'visible');
      }
    }

    if (this.config.debug) {
      console.log(`[AlertSymbolLayer] Mode applied: ${mode}`);
    }
  }
}
