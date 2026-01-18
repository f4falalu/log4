/**
 * HistoricalRouteLayer.ts
 *
 * MapLibre layer for historical route replay with timeline
 * Phase 6: Forensic Map component
 */

import type { Map as MapLibreMap, LineLayerSpecification, CircleLayerSpecification, SymbolLayerSpecification } from 'maplibre-gl';
import type { FeatureCollection, LineString, Point } from 'geojson';
import { MapLayer, type LayerHandlers } from '@/map/core/LayerInterface';
import { STATE_COLORS, ZOOM_BREAKPOINTS } from '@/lib/mapDesignSystem';

/**
 * Historical route data
 */
export interface HistoricalRoute {
  id: string;
  batch_id: string;
  vehicle_id: string;
  driver_id: string;
  status: string;
  waypoints: Array<{
    lat: number;
    lng: number;
    timestamp: string;
    completed: boolean;
    eta?: string | null;
    actual_arrival?: string | null;
    delay_minutes?: number;
  }>;
  totalDistance?: number;
  totalDuration?: number;
  completedDistance?: number;
  avgSpeed?: number;
}

/**
 * Historical Route Layer Configuration
 */
export interface HistoricalRouteLayerConfig {
  /** Current playback timestamp (for filtering) */
  currentTimestamp?: string | null;

  /** Show completed portion only (default: false - show all) */
  showCompletedOnly?: boolean;

  /** Show waypoint markers (default: true) */
  showWaypoints?: boolean;

  /** Show delay indicators (default: true) */
  showDelayIndicators?: boolean;

  /** Minimum zoom to show routes (default: Z1 = 6) */
  minZoom?: number;

  /** Line width (default: 3) */
  lineWidth?: number;

  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Historical Route Layer for MapLibre
 *
 * Features:
 * - Historical route polylines
 * - Timeline-based filtering (show routes up to current timestamp)
 * - Waypoint markers with completion status
 * - Delay indicators at waypoints
 * - Status-based color encoding
 * - Click and hover handlers
 */
export class HistoricalRouteLayer extends MapLayer<HistoricalRoute, LineString> {
  private config: Required<HistoricalRouteLayerConfig>;
  private readonly lineLayerId: string;
  private readonly completedLineLayerId: string;
  private readonly waypointsLayerId: string;
  private readonly delayMarkersLayerId: string;
  private waypointsSourceId: string;

  constructor(
    map: MapLibreMap,
    routes: HistoricalRoute[],
    handlers: LayerHandlers<LineString> = {},
    config: HistoricalRouteLayerConfig = {}
  ) {
    super(map, routes, handlers, {
      id: 'historical-routes-layer',
      minZoom: config.minZoom || ZOOM_BREAKPOINTS.Z1,
    });

    this.config = {
      currentTimestamp: config.currentTimestamp || null,
      showCompletedOnly: config.showCompletedOnly ?? false,
      showWaypoints: config.showWaypoints ?? true,
      showDelayIndicators: config.showDelayIndicators ?? true,
      minZoom: config.minZoom || ZOOM_BREAKPOINTS.Z1,
      lineWidth: config.lineWidth ?? 3,
      debug: config.debug ?? false,
    };

    this.lineLayerId = `${this.config.id}-line`;
    this.completedLineLayerId = `${this.config.id}-completed`;
    this.waypointsLayerId = `${this.config.id}-waypoints`;
    this.delayMarkersLayerId = `${this.config.id}-delays`;
    this.waypointsSourceId = `${this.geoJsonSourceId}-waypoints`;
  }

  /**
   * Filter routes by current timestamp
   */
  private filterRoutesByTimestamp(routes: HistoricalRoute[]): HistoricalRoute[] {
    if (!this.config.currentTimestamp) {
      return routes; // Show all if no timestamp filter
    }

    const currentTime = new Date(this.config.currentTimestamp).getTime();

    return routes.map((route) => {
      // Filter waypoints to only include those before current timestamp
      const filteredWaypoints = route.waypoints.filter((wp) => {
        const wpTime = new Date(wp.timestamp).getTime();
        return wpTime <= currentTime;
      });

      // If less than 2 waypoints, don't show route
      if (filteredWaypoints.length < 2) {
        return { ...route, waypoints: [] }; // Empty waypoints = filtered out later
      }

      return {
        ...route,
        waypoints: filteredWaypoints,
      };
    });
  }

  /**
   * Transform routes to GeoJSON LineStrings
   */
  protected dataToGeoJSON(routes: HistoricalRoute[]): FeatureCollection<LineString> {
    const filteredRoutes = this.filterRoutesByTimestamp(routes);

    const features = filteredRoutes
      .filter((route) => {
        // Filter out routes without valid waypoints
        return route.waypoints && route.waypoints.length >= 2;
      })
      .map((route) => {
        const coordinates = route.waypoints.map((wp) => [wp.lng, wp.lat]);

        // Calculate completed waypoints
        const completedWaypoints = route.waypoints.filter((wp) => wp.completed).length;
        const completedPercentage = Math.round(
          (completedWaypoints / route.waypoints.length) * 100
        );

        return {
          type: 'Feature' as const,
          geometry: {
            type: 'LineString' as const,
            coordinates,
          },
          properties: {
            id: route.id,
            type: 'historical-route',
            batch_id: route.batch_id,
            vehicle_id: route.vehicle_id,
            driver_id: route.driver_id,
            status: route.status,
            totalDistance: route.totalDistance,
            totalDuration: route.totalDuration,
            completedDistance: route.completedDistance,
            avgSpeed: route.avgSpeed,
            completedPercentage,
            // State encoding (line color)
            lineColor: this.getRouteLineColor(route.status),
          },
          id: route.id,
        };
      });

    return {
      type: 'FeatureCollection',
      features,
    };
  }

  /**
   * Transform routes to waypoint markers
   */
  private routesToWaypoints(routes: HistoricalRoute[]): FeatureCollection<Point> {
    const filteredRoutes = this.filterRoutesByTimestamp(routes);
    const features: any[] = [];

    filteredRoutes.forEach((route) => {
      if (!route.waypoints || route.waypoints.length === 0) return;

      route.waypoints.forEach((waypoint, index) => {
        const delay = waypoint.delay_minutes || 0;
        const hasDelay = delay > 0;

        features.push({
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [waypoint.lng, waypoint.lat],
          },
          properties: {
            id: `${route.id}-waypoint-${index}`,
            type: 'waypoint',
            route_id: route.id,
            index,
            timestamp: waypoint.timestamp,
            completed: waypoint.completed,
            eta: waypoint.eta,
            actual_arrival: waypoint.actual_arrival,
            delay_minutes: delay,
            has_delay: hasDelay,
            // Marker color
            markerColor: waypoint.completed ? '#10b981' : '#9ca3af', // green if completed, gray if not
            delayColor: this.getDelayColor(delay),
          },
          id: `${route.id}-waypoint-${index}`,
        });
      });
    });

    return {
      type: 'FeatureCollection',
      features,
    };
  }

  /**
   * Get route line color based on status
   */
  private getRouteLineColor(status: string): string {
    const statusColors: Record<string, string> = {
      planned: STATE_COLORS.batch.planned.replace('bg-', '#'), // gray
      assigned: STATE_COLORS.batch.assigned.replace('bg-', '#'), // blue
      in_progress: STATE_COLORS.batch.in_progress.replace('bg-', '#'), // amber
      completed: STATE_COLORS.batch.completed.replace('bg-', '#'), // green
      cancelled: STATE_COLORS.batch.cancelled.replace('bg-', '#'), // red
    };

    return statusColors[status] || '#6b7280';
  }

  /**
   * Get delay color based on delay minutes
   */
  private getDelayColor(delayMinutes: number): string {
    if (delayMinutes <= 0) return '#10b981'; // green - on time
    if (delayMinutes <= 15) return '#f59e0b'; // amber - minor delay
    if (delayMinutes <= 30) return '#f97316'; // orange - moderate delay
    return '#ef4444'; // red - major delay
  }

  /**
   * Create route line layer (full route)
   */
  private createLineLayerConfig(): LineLayerSpecification {
    return {
      id: this.lineLayerId,
      type: 'line',
      source: this.geoJsonSourceId,
      minzoom: this.config.minZoom,
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        // Status-based color
        'line-color': ['get', 'lineColor'],
        'line-width': this.config.lineWidth,
        'line-opacity': 0.4,
        // Dashed line for incomplete routes
        'line-dasharray': [2, 2],
      },
    };
  }

  /**
   * Create completed line layer (solid)
   */
  private createCompletedLineLayerConfig(): LineLayerSpecification {
    return {
      id: this.completedLineLayerId,
      type: 'line',
      source: this.geoJsonSourceId,
      minzoom: this.config.minZoom,
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        // Status-based color (same as line)
        'line-color': ['get', 'lineColor'],
        'line-width': this.config.lineWidth + 1,
        'line-opacity': 0.8,
        // Solid line for completed portion
      },
    };
  }

  /**
   * Create waypoint markers layer
   */
  private createWaypointsLayerConfig(): CircleLayerSpecification {
    return {
      id: this.waypointsLayerId,
      type: 'circle',
      source: this.waypointsSourceId,
      minzoom: this.config.minZoom,
      paint: {
        'circle-radius': 6,
        'circle-color': ['get', 'markerColor'],
        'circle-opacity': 0.8,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    };
  }

  /**
   * Create delay markers layer
   */
  private createDelayMarkersLayerConfig(): SymbolLayerSpecification {
    return {
      id: this.delayMarkersLayerId,
      type: 'symbol',
      source: this.waypointsSourceId,
      filter: ['==', ['get', 'has_delay'], true],
      minzoom: this.config.minZoom,
      layout: {
        'text-field': ['concat', '+', ['get', 'delay_minutes'], 'm'],
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': 10,
        'text-offset': [0, -1.5],
        'text-anchor': 'bottom',
      },
      paint: {
        'text-color': ['get', 'delayColor'],
        'text-halo-color': '#ffffff',
        'text-halo-width': 2,
      },
    };
  }

  /**
   * Create layer configuration
   */
  protected createLayerConfig(): LineLayerSpecification {
    return this.createLineLayerConfig();
  }

  /**
   * Add layer to map
   */
  add(): void {
    const routesGeoJson = this.dataToGeoJSON(this.data);
    const waypointsGeoJson = this.routesToWaypoints(this.data);

    // Add routes source
    this.map.addSource(this.geoJsonSourceId, {
      type: 'geojson',
      data: routesGeoJson,
    });

    // Add waypoints source
    if (this.config.showWaypoints) {
      this.map.addSource(this.waypointsSourceId, {
        type: 'geojson',
        data: waypointsGeoJson,
      });
    }

    // Add route line layer (background - dashed)
    this.map.addLayer(this.createLineLayerConfig());

    // Add completed line layer (foreground - solid)
    if (!this.config.showCompletedOnly) {
      this.map.addLayer(this.completedLineLayerConfig());
    }

    // Add waypoint markers
    if (this.config.showWaypoints) {
      this.map.addLayer(this.createWaypointsLayerConfig());
    }

    // Add delay markers
    if (this.config.showDelayIndicators && this.config.showWaypoints) {
      this.map.addLayer(this.createDelayMarkersLayerConfig());
    }

    // Setup event handlers
    this.setupEventHandlers();

    if (this.config.debug) {
      console.log(
        `[HistoricalRouteLayer] Added ${routesGeoJson.features.length} routes with ${waypointsGeoJson.features.length} waypoints`
      );
    }
  }

  /**
   * Setup click and hover event handlers
   */
  protected setupEventHandlers(): void {
    // Click handler for routes
    if (this.handlers.onClick) {
      this.map.on('click', this.lineLayerId, (e) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          this.handlers.onClick!(feature as any, e.lngLat);
        }
      });
    }

    // Hover handlers for routes
    if (this.handlers.onHover) {
      this.map.on('mouseenter', this.lineLayerId, (e) => {
        this.map.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          this.handlers.onHover!(feature as any, e.lngLat);
        }
      });

      this.map.on('mouseleave', this.lineLayerId, () => {
        this.map.getCanvas().style.cursor = '';
      });
    }
  }

  /**
   * Update layer data
   */
  update(routes: HistoricalRoute[]): void {
    this.data = routes;
    const routesGeoJson = this.dataToGeoJSON(routes);
    const waypointsGeoJson = this.routesToWaypoints(routes);

    // Update routes source
    const routesSource = this.map.getSource(this.geoJsonSourceId);
    if (routesSource && routesSource.type === 'geojson') {
      routesSource.setData(routesGeoJson);
    }

    // Update waypoints source
    if (this.config.showWaypoints) {
      const waypointsSource = this.map.getSource(this.waypointsSourceId);
      if (waypointsSource && waypointsSource.type === 'geojson') {
        waypointsSource.setData(waypointsGeoJson);
      }
    }

    if (this.config.debug) {
      console.log(
        `[HistoricalRouteLayer] Updated ${routesGeoJson.features.length} routes`
      );
    }
  }

  /**
   * Remove layer from map
   */
  remove(): void {
    const layersToRemove = [
      this.lineLayerId,
      this.completedLineLayerId,
      this.waypointsLayerId,
      this.delayMarkersLayerId,
    ];

    layersToRemove.forEach((layerId) => {
      if (this.map.getLayer(layerId)) {
        this.map.removeLayer(layerId);
      }
    });

    if (this.map.getSource(this.geoJsonSourceId)) {
      this.map.removeSource(this.geoJsonSourceId);
    }

    if (this.map.getSource(this.waypointsSourceId)) {
      this.map.removeSource(this.waypointsSourceId);
    }

    if (this.config.debug) {
      console.log('[HistoricalRouteLayer] Removed');
    }
  }

  /**
   * Toggle layer visibility
   */
  toggle(visible: boolean): void {
    const visibility = visible ? 'visible' : 'none';

    const layersToToggle = [
      this.lineLayerId,
      this.completedLineLayerId,
      this.waypointsLayerId,
      this.delayMarkersLayerId,
    ];

    layersToToggle.forEach((layerId) => {
      if (this.map.getLayer(layerId)) {
        this.map.setLayoutProperty(layerId, 'visibility', visibility);
      }
    });

    if (this.config.debug) {
      console.log(`[HistoricalRouteLayer] Visibility: ${visibility}`);
    }
  }

  /**
   * Set playback timestamp (filters routes and waypoints)
   */
  setTimestamp(timestamp: string | null): void {
    this.config.currentTimestamp = timestamp;
    this.update(this.data); // Re-render with new timestamp filter

    if (this.config.debug) {
      console.log(`[HistoricalRouteLayer] Set timestamp to: ${timestamp}`);
    }
  }

  /**
   * Get routes within viewport
   */
  getRoutesInView(): HistoricalRoute[] {
    const features = this.map.queryRenderedFeatures(undefined, {
      layers: [this.lineLayerId],
    });

    return features.map((f) => f.properties as unknown as HistoricalRoute);
  }

  /**
   * Get total delay statistics
   */
  getDelayStatistics(): {
    totalWaypoints: number;
    delayedWaypoints: number;
    totalDelayMinutes: number;
    avgDelayMinutes: number;
    maxDelayMinutes: number;
  } {
    let totalWaypoints = 0;
    let delayedWaypoints = 0;
    let totalDelayMinutes = 0;
    let maxDelayMinutes = 0;

    this.data.forEach((route) => {
      route.waypoints.forEach((wp) => {
        totalWaypoints++;
        const delay = wp.delay_minutes || 0;
        if (delay > 0) {
          delayedWaypoints++;
          totalDelayMinutes += delay;
          maxDelayMinutes = Math.max(maxDelayMinutes, delay);
        }
      });
    });

    return {
      totalWaypoints,
      delayedWaypoints,
      totalDelayMinutes,
      avgDelayMinutes: delayedWaypoints > 0 ? totalDelayMinutes / delayedWaypoints : 0,
      maxDelayMinutes,
    };
  }
}
