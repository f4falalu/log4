/**
 * VehicleTrailLayer.ts
 *
 * Renders historical breadcrumb trails for vehicles
 * Shows where vehicles have been with fading opacity
 */

import type { Map as MapLibreMap, LineLayerSpecification } from 'maplibre-gl';
import type { FeatureCollection, LineString } from 'geojson';
import { MapLayer, type LayerHandlers } from '@/map/core/LayerInterface';
import type { RepresentationMode } from '@/components/map/RepresentationToggle';

/**
 * Vehicle Trail data structure
 */
export interface VehicleTrail {
  vehicle_id: string;
  points: { lat: number; lng: number; ts: string }[];
  status?: string; // Optional: for color matching
}

/**
 * Vehicle Trail Layer Configuration
 */
export interface VehicleTrailLayerConfig {
  /** Show trails (default: true) */
  showTrails?: boolean;

  /** Minimum zoom to show trails (default: Z1 = 6) */
  minZoom?: number;

  /** Line width in pixels (default: 3) */
  lineWidth?: number;

  /** Maximum points per trail (default: 50) */
  maxPoints?: number;

  /** Maximum trail age in minutes (default: 30) */
  maxAgeMinutes?: number;

  /** Enable gradient fade (recent=strong, old=faded) */
  enableGradientFade?: boolean;

  /** Enable debug logging */
  debug?: boolean;

  /** Layer ID */
  id?: string;
}

/**
 * Vehicle Trail Layer
 *
 * Features:
 * - Historical breadcrumb trail per vehicle
 * - Fading opacity (recent → old)
 * - Color matches vehicle status
 * - Automatic point limit enforcement
 */
export class VehicleTrailLayer extends MapLayer<VehicleTrail, LineString> {
  private config: Required<VehicleTrailLayerConfig>;
  private readonly trailLayerId: string;
  private currentMode: RepresentationMode = 'entity-rich';

  constructor(
    map: MapLibreMap,
    trails: VehicleTrail[],
    handlers: LayerHandlers<LineString> = {},
    config: VehicleTrailLayerConfig = {}
  ) {
    super(map, trails, handlers, {
      id: config.id || 'trails-layer',
      minZoom: config.minZoom || 6,
    });

    this.config = {
      showTrails: config.showTrails ?? true,
      minZoom: config.minZoom || 6,
      lineWidth: config.lineWidth ?? 3,
      maxPoints: config.maxPoints ?? 50,
      maxAgeMinutes: config.maxAgeMinutes ?? 30,
      enableGradientFade: config.enableGradientFade ?? true,
      debug: config.debug ?? false,
      id: config.id || 'trails-layer',
    };

    this.trailLayerId = `${this.config.id}-line`;
  }

  /**
   * Transform trails to GeoJSON LineStrings
   *
   * TRAIL SEMANTICS:
   * - Trail shows where vehicle has been (historical movement)
   * - Fade direction: strong (recent/head) → faded (old/tail)
   * - Trail head = current vehicle position
   * - Trail tail = oldest recorded position
   * - Limited to maxAgeMinutes to keep trails relevant
   */
  protected dataToGeoJSON(trails: VehicleTrail[]): FeatureCollection<LineString> {
    const now = Date.now();
    const maxAgeMs = this.config.maxAgeMinutes * 60 * 1000;

    const features = trails
      .filter((trail) => trail.points.length >= 2) // Need at least 2 points for line
      .map((trail) => {
        // Filter out points older than maxAgeMinutes
        const recentPoints = trail.points.filter((p) => {
          const pointAge = now - new Date(p.ts).getTime();
          return pointAge <= maxAgeMs;
        });

        // Need at least 2 points after filtering
        if (recentPoints.length < 2) {
          return null;
        }

        // Enforce max points limit, keeping most recent
        const points = recentPoints.slice(-this.config.maxPoints);

        // Convert to LineString coordinates [lng, lat]
        // Order: oldest → newest (so line draws from past to present)
        const coordinates: [number, number][] = points.map((p) => [p.lng, p.lat]);

        // Calculate timestamps for opacity calculation
        const timestamps = points.map((p) => new Date(p.ts).getTime());
        const newestTimestamp = Math.max(...timestamps);
        const oldestTimestamp = Math.min(...timestamps);

        // Calculate overall trail age (how old is the newest point)
        const trailRecency = now - newestTimestamp;
        const maxRecencyMs = 5 * 60 * 1000; // 5 minutes = fully opaque

        // Trail opacity: decreases as the most recent point gets older
        // Fully visible if vehicle moved in last 5 mins, fades if stale
        const baseOpacity = Math.max(0.2, 0.9 - (trailRecency / maxRecencyMs) * 0.7);

        // Calculate span (for line-gradient if supported)
        const trailSpanMinutes = (newestTimestamp - oldestTimestamp) / 60000;

        // Determine color based on status
        const color = this.getTrailColor(trail.status);

        return {
          type: 'Feature' as const,
          geometry: {
            type: 'LineString' as const,
            coordinates,
          },
          properties: {
            vehicle_id: trail.vehicle_id,
            pointCount: points.length,
            // Base opacity for entire trail (fades when stale)
            opacity: baseOpacity,
            color,
            status: trail.status || 'active',
            // Metadata for debugging/tooltips
            trailSpanMinutes: Math.round(trailSpanMinutes),
            newestPointAge: Math.round((now - newestTimestamp) / 1000), // seconds
            oldestPointAge: Math.round((now - oldestTimestamp) / 1000), // seconds
          },
          id: trail.vehicle_id,
        };
      })
      .filter((f): f is NonNullable<typeof f> => f !== null);

    return {
      type: 'FeatureCollection',
      features,
    };
  }

  /**
   * Get trail color based on vehicle status
   */
  private getTrailColor(status?: string): string {
    const statusColorMap: Record<string, string> = {
      available: '#10b981', // green-500
      active: '#10b981',    // green-500
      in_use: '#f59e0b',    // amber-500
      busy: '#f59e0b',      // amber-500
      delayed: '#ef4444',   // red-500
      maintenance: '#6b7280', // gray-500
      offline: '#6b7280',   // gray-500
      idle: '#6b7280',      // gray-500
    };

    return statusColorMap[status || 'active'] || '#10b981';
  }

  /**
   * Create trail line layer
   */
  private createTrailLayerConfig(): LineLayerSpecification {
    return {
      id: this.trailLayerId,
      type: 'line',
      source: this.geoJsonSourceId,
      minzoom: this.config.minZoom,
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': ['get', 'color'],
        'line-width': this.config.lineWidth,
        'line-opacity': ['get', 'opacity'],
        'line-blur': 1, // Slight blur for softer appearance
      },
    };
  }

  /**
   * Create layer configuration
   */
  protected createLayerConfig(): LineLayerSpecification {
    return this.createTrailLayerConfig();
  }

  /**
   * Add layer to map
   */
  add(): void {
    if (this.isAdded) {
      console.warn(`[VehicleTrailLayer] Layer already added`);
      return;
    }

    const geoJson = this.dataToGeoJSON(this.data);

    // Add GeoJSON source
    if (!this.map.getSource(this.geoJsonSourceId)) {
      this.map.addSource(this.geoJsonSourceId, {
        type: 'geojson',
        data: geoJson,
        lineMetrics: true, // Enable line gradient if needed
      });
    }

    // Add trail line layer
    if (!this.map.getLayer(this.trailLayerId)) {
      this.map.addLayer(this.createTrailLayerConfig());
    }

    this.isAdded = true;

    if (this.config.debug) {
      console.log(
        `[VehicleTrailLayer] Added ${geoJson.features.length} trails`
      );
    }
  }

  /**
   * Update layer data
   */
  update(trails: VehicleTrail[]): void {
    this.data = trails;
    const geoJson = this.dataToGeoJSON(trails);

    const source = this.map.getSource(this.geoJsonSourceId);
    if (source && source.type === 'geojson') {
      source.setData(geoJson);

      if (this.config.debug) {
        console.log(
          `[VehicleTrailLayer] Updated ${geoJson.features.length} trails`
        );
      }
    }
  }

  /**
   * Remove layer from map
   */
  remove(): void {
    if (!this.isAdded) return;

    if (this.map.getLayer(this.trailLayerId)) {
      this.map.removeLayer(this.trailLayerId);
    }

    if (this.map.getSource(this.geoJsonSourceId)) {
      this.map.removeSource(this.geoJsonSourceId);
    }

    this.isAdded = false;

    if (this.config.debug) {
      console.log('[VehicleTrailLayer] Removed');
    }
  }

  /**
   * Toggle layer visibility
   */
  toggle(visible: boolean): void {
    const visibility = visible ? 'visible' : 'none';

    if (this.map.getLayer(this.trailLayerId)) {
      this.map.setLayoutProperty(this.trailLayerId, 'visibility', visibility);
    }

    if (this.config.debug) {
      console.log(`[VehicleTrailLayer] Visibility: ${visibility}`);
    }
  }

  /**
   * Apply mode configuration
   */
  applyModeConfig(mode: RepresentationMode): void {
    this.currentMode = mode;

    if (!this.isAdded) return;

    if (mode === 'minimal') {
      // Minimal mode: thinner, less visible trails
      this.map.setPaintProperty(this.trailLayerId, 'line-width', 1);
      this.map.setPaintProperty(this.trailLayerId, 'line-opacity', [
        '*',
        ['get', 'opacity'],
        0.5,
      ]);
    } else {
      // Entity-rich mode: full trails
      this.map.setPaintProperty(this.trailLayerId, 'line-width', this.config.lineWidth);
      this.map.setPaintProperty(this.trailLayerId, 'line-opacity', ['get', 'opacity']);
    }

    if (this.config.debug) {
      console.log(`[VehicleTrailLayer] Mode applied: ${mode}`);
    }
  }
}
