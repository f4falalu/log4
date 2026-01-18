/**
 * RouteLineLayer.ts
 *
 * MapLibre line layer for routes with ETA indicators
 * Phase 5: Operational Map component
 */

import type { Map as MapLibreMap, LineLayerSpecification, SymbolLayerSpecification } from 'maplibre-gl';
import type { FeatureCollection, LineString, Point } from 'geojson';
import { MapLayer, type LayerHandlers } from '@/map/core/LayerInterface';
import { STATE_COLORS, ZOOM_BREAKPOINTS } from '@/lib/mapDesignSystem';
import type { Route } from '@/types';
import type { RepresentationMode } from '@/components/map/RepresentationToggle';

/**
 * Route Line Layer Configuration
 */
export interface RouteLineLayerConfig {
  /** Show ETA markers (default: true) */
  showETAMarkers?: boolean;

  /** Minimum zoom to show routes (default: Z1 = 6) */
  minZoom?: number;

  /** Minimum zoom for ETA markers (default: Z2 = 12) */
  etaMinZoom?: number;

  /** Line width (default: 3) */
  lineWidth?: number;

  /** Show route direction arrows (default: true) */
  showDirectionArrows?: boolean;

  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Route Line Layer for MapLibre
 *
 * Features:
 * - Route polylines with status-based colors
 * - ETA markers at waypoints
 * - Direction arrows along route
 * - Progress indicator (completed vs remaining)
 * - Click and hover handlers
 */
export class RouteLineLayer extends MapLayer<Route, LineString> {
  private config: Required<RouteLineLayerConfig>;
  private readonly lineLayerId: string;
  private readonly progressLayerId: string;
  private readonly arrowsLayerId: string;
  private readonly etaMarkersLayerId: string;
  private etaSourceId: string;
  private currentMode: RepresentationMode = 'entity-rich';

  constructor(
    map: MapLibreMap,
    routes: Route[],
    handlers: LayerHandlers<LineString> = {},
    config: RouteLineLayerConfig = {}
  ) {
    super(map, routes, handlers, {
      id: 'routes-layer',
      minZoom: config.minZoom || ZOOM_BREAKPOINTS.Z1,
    });

    this.config = {
      showETAMarkers: config.showETAMarkers ?? true,
      minZoom: config.minZoom || ZOOM_BREAKPOINTS.Z1,
      etaMinZoom: config.etaMinZoom || ZOOM_BREAKPOINTS.Z2,
      lineWidth: config.lineWidth ?? 3,
      showDirectionArrows: config.showDirectionArrows ?? true,
      debug: config.debug ?? false,
    };

    this.lineLayerId = `${this.config.id}-line`;
    this.progressLayerId = `${this.config.id}-progress`;
    this.arrowsLayerId = `${this.config.id}-arrows`;
    this.etaMarkersLayerId = `${this.config.id}-eta-markers`;
    this.etaSourceId = `${this.geoJsonSourceId}-eta`;
  }

  /**
   * Transform routes to GeoJSON LineStrings
   */
  protected dataToGeoJSON(routes: Route[]): FeatureCollection<LineString> {
    const features = routes
      .filter((route) => {
        // Filter out routes without valid waypoints
        return route.waypoints && route.waypoints.length >= 2;
      })
      .map((route) => {
        const coordinates = route.waypoints!.map((wp) => [wp.lng, wp.lat]);

        // Normalize status for consistent lookups
        const normalizedStatus = (route.status || 'planned').toLowerCase();

        return {
          type: 'Feature' as const,
          geometry: {
            type: 'LineString' as const,
            coordinates,
          },
          properties: {
            id: route.id,
            type: 'route',
            name: route.name || `Route ${route.id}`,
            status: normalizedStatus,
            vehicleId: route.vehicleId || null,
            driverId: route.driverId || null,
            totalDistance: route.totalDistance ?? 0,
            estimatedDuration: route.estimatedDuration ?? 0,
            completedDistance: route.completedDistance ?? 0,
            // State encoding (line styling)
            lineColor: this.getRouteLineColor(route),
            lineWidth: this.getRouteLineWidth(route),
            lineOpacity: this.getRouteLineOpacity(route),
            // Dashed for planned routes
            isDashed: normalizedStatus === 'planned' ? 1 : 0,
            progressPercentage: this.calculateProgressPercentage(route),
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
   * Transform routes to ETA marker points
   */
  private routesToETAMarkers(routes: Route[]): FeatureCollection<Point> {
    const features: any[] = [];

    routes.forEach((route) => {
      if (!route.waypoints || route.waypoints.length === 0) return;

      // Create ETA marker for each waypoint
      route.waypoints.forEach((waypoint, index) => {
        // Skip first waypoint (origin - no ETA needed)
        if (index === 0) return;

        features.push({
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [waypoint.lng, waypoint.lat],
          },
          properties: {
            id: `${route.id}-eta-${index}`,
            type: 'eta-marker',
            routeId: route.id,
            waypointIndex: index,
            waypointName: waypoint.name || `Stop ${index}`,
            eta: waypoint.eta || null,
            completed: waypoint.completed || false,
            // ETA text
            etaText: this.formatETA(waypoint.eta),
            // Status color
            markerColor: waypoint.completed ? '#10b981' : '#3b82f6', // green if completed, blue if pending
          },
          id: `${route.id}-eta-${index}`,
        });
      });
    });

    return {
      type: 'FeatureCollection',
      features,
    };
  }

  /**
   * Calculate route progress percentage
   */
  private calculateProgressPercentage(route: Route): number {
    if (!route.totalDistance || route.totalDistance === 0) {
      return 0;
    }

    const completed = route.completedDistance || 0;
    return Math.round((completed / route.totalDistance) * 100);
  }

  /**
   * Get route line color based on status
   *
   * VISUAL HIERARCHY:
   * - Active/In-progress: Pumpkin accent (primary visual weight)
   * - Planned: Muted gray (background visual weight)
   * - Completed: Faded green (completed state)
   */
  private getRouteLineColor(route: Route): string {
    const statusColors: Record<string, string> = {
      planned: '#9ca3af',     // gray-400 - muted, background
      assigned: '#3b82f6',    // blue-500 - assigned, waiting
      in_progress: '#fe7f2d', // Pumpkin - active, primary visual
      active: '#fe7f2d',      // Pumpkin - alias for in_progress
      completed: '#10b981',   // green-500 - completed
      cancelled: '#f87171',   // red-400 - cancelled
    };

    return statusColors[route.status] || '#6b7280';
  }

  /**
   * Get route line width based on status
   *
   * VISUAL HIERARCHY:
   * - Active routes are thicker (more prominent)
   * - Planned routes are thinner (subtle)
   * - Completed routes are thin (de-emphasized)
   */
  private getRouteLineWidth(route: Route): number {
    const statusWidths: Record<string, number> = {
      planned: 2,        // Thin, dashed in createLineLayerConfig
      assigned: 3,       // Medium
      in_progress: 4,    // Thick, prominent
      active: 4,         // Alias for in_progress
      completed: 2,      // Thin, faded
      cancelled: 1,      // Very thin
    };

    return statusWidths[route.status] || this.config.lineWidth;
  }

  /**
   * Get route line opacity based on status
   */
  private getRouteLineOpacity(route: Route): number {
    const statusOpacities: Record<string, number> = {
      planned: 0.5,      // Subtle
      assigned: 0.7,     // Moderate
      in_progress: 0.9,  // Prominent
      active: 0.9,       // Alias
      completed: 0.3,    // Faded
      cancelled: 0.2,    // Very faded
    };

    return statusOpacities[route.status] || 0.6;
  }

  /**
   * Check if route should be dashed (planned routes)
   */
  private getRouteDashArray(route: Route): number[] | null {
    if (route.status === 'planned') {
      return [4, 4]; // Dashed line for planned routes
    }
    return null; // Solid line for all other statuses
  }

  /**
   * Format ETA timestamp to relative time
   */
  private formatETA(eta: string | null): string {
    if (!eta) return 'ETA: --';

    const etaDate = new Date(eta);
    const now = new Date();
    const diffMs = etaDate.getTime() - now.getTime();

    if (diffMs < 0) {
      return 'Delayed';
    }

    const diffMins = Math.round(diffMs / 60000);

    if (diffMins < 60) {
      return `${diffMins}m`;
    }

    const diffHours = Math.floor(diffMins / 60);
    const remainMins = diffMins % 60;
    return `${diffHours}h ${remainMins}m`;
  }

  /**
   * Create route line layer (full route)
   *
   * VISUAL SEMANTICS:
   * - Planned: thin, dashed, muted gray
   * - Active: solid, thick, Pumpkin accent
   * - Completed: thin, faded green
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
        // Data-driven color based on status
        'line-color': ['coalesce', ['get', 'lineColor'], '#6b7280'],
        // Data-driven width based on status (active=4, planned=2, etc.)
        'line-width': ['coalesce', ['get', 'lineWidth'], this.config.lineWidth],
        // Data-driven opacity based on status
        'line-opacity': ['coalesce', ['get', 'lineOpacity'], 0.6],
        // Dashed line for planned routes
        'line-dasharray': [
          'case',
          ['==', ['get', 'isDashed'], 1],
          ['literal', [4, 4]], // Dashed for planned
          ['literal', [1, 0]], // Solid for others (no gaps)
        ],
      },
    };
  }

  /**
   * Create progress line layer (completed portion)
   */
  private createProgressLayerConfig(): LineLayerSpecification {
    return {
      id: this.progressLayerId,
      type: 'line',
      source: this.geoJsonSourceId,
      minzoom: this.config.minZoom,
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        // Brighter color for completed portion
        'line-color': ['get', 'lineColor'],
        'line-width': this.config.lineWidth + 2,
        'line-opacity': 0.8,
        // Note: line-gradient requires lineMetrics: true on source
        // and literal values, not computed expressions
        // Progress indication will be handled differently
      },
    };
  }

  /**
   * Create direction arrows layer
   */
  private createArrowsLayerConfig(): SymbolLayerSpecification {
    return {
      id: this.arrowsLayerId,
      type: 'symbol',
      source: this.geoJsonSourceId,
      minzoom: this.config.minZoom,
      layout: {
        'symbol-placement': 'line',
        'symbol-spacing': 100, // Arrow every 100 pixels
        'icon-image': 'arrow.direction', // Sprite name
        'icon-size': 0.5,
        'icon-rotation-alignment': 'map',
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
      },
      paint: {
        'icon-color': ['get', 'lineColor'],
        'icon-opacity': 0.7,
      },
    };
  }

  /**
   * Create ETA markers layer
   */
  private createETAMarkersLayerConfig(): SymbolLayerSpecification {
    return {
      id: this.etaMarkersLayerId,
      type: 'symbol',
      source: this.etaSourceId,
      minzoom: this.config.etaMinZoom,
      layout: {
        'text-field': ['get', 'etaText'],
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': 11,
        'text-anchor': 'top',
        'text-offset': [0, 1],
        'text-optional': true,
        'icon-image': 'marker.eta', // Small circle sprite
        'icon-size': 0.6,
        'icon-anchor': 'center',
      },
      paint: {
        'text-color': '#1f2937',
        'text-halo-color': '#ffffff',
        'text-halo-width': 2,
        'icon-color': ['get', 'markerColor'],
        'icon-opacity': 0.9,
      },
    };
  }

  /**
   * Create layer configuration
   */
  protected createLayerConfig(): LineLayerSpecification {
    // Return line layer config (main layer)
    return this.createLineLayerConfig();
  }

  /**
   * Add layer to map
   */
  add(): void {
    if (this.isAdded) {
      console.warn(`[RouteLineLayer] Layer already added`);
      return;
    }

    const routesGeoJson = this.dataToGeoJSON(this.data);
    const etaGeoJson = this.routesToETAMarkers(this.data);

    // Add routes source
    if (!this.map.getSource(this.geoJsonSourceId)) {
      this.map.addSource(this.geoJsonSourceId, {
        type: 'geojson',
        data: routesGeoJson,
        lineMetrics: true, // Required for line-gradient
      });
    }

    // Add ETA markers source
    if (this.config.showETAMarkers && !this.map.getSource(this.etaSourceId)) {
      this.map.addSource(this.etaSourceId, {
        type: 'geojson',
        data: etaGeoJson,
      });
    }

    // Add route line layer (background)
    if (!this.map.getLayer(this.lineLayerId)) {
      this.map.addLayer(this.createLineLayerConfig());
    }

    // Add progress line layer (foreground)
    if (!this.map.getLayer(this.progressLayerId)) {
      this.map.addLayer(this.createProgressLayerConfig());
    }

    // Add direction arrows
    if (this.config.showDirectionArrows && !this.map.getLayer(this.arrowsLayerId)) {
      this.map.addLayer(this.createArrowsLayerConfig());
    }

    // Add ETA markers
    if (this.config.showETAMarkers && !this.map.getLayer(this.etaMarkersLayerId)) {
      this.map.addLayer(this.createETAMarkersLayerConfig());
    }

    // Setup event handlers
    this.setupEventHandlers();

    this.isAdded = true;

    if (this.config.debug) {
      console.log(
        `[RouteLineLayer] Added ${routesGeoJson.features.length} routes (ETA markers: ${this.config.showETAMarkers}, direction arrows: ${this.config.showDirectionArrows})`
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
  update(routes: Route[]): void {
    this.data = routes;
    const routesGeoJson = this.dataToGeoJSON(routes);
    const etaGeoJson = this.routesToETAMarkers(routes);

    // Update routes source
    const routesSource = this.map.getSource(this.geoJsonSourceId);
    if (routesSource && routesSource.type === 'geojson') {
      routesSource.setData(routesGeoJson);
    }

    // Update ETA markers source
    if (this.config.showETAMarkers) {
      const etaSource = this.map.getSource(this.etaSourceId);
      if (etaSource && etaSource.type === 'geojson') {
        etaSource.setData(etaGeoJson);
      }
    }

    if (this.config.debug) {
      console.log(
        `[RouteLineLayer] Updated ${routesGeoJson.features.length} routes`
      );
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
      this.lineLayerId,
      this.progressLayerId,
      this.arrowsLayerId,
      this.etaMarkersLayerId,
    ];

    layersToRemove.forEach((layerId) => {
      if (this.map.getLayer(layerId)) {
        this.map.removeLayer(layerId);
      }
    });

    if (this.map.getSource(this.geoJsonSourceId)) {
      this.map.removeSource(this.geoJsonSourceId);
    }

    if (this.map.getSource(this.etaSourceId)) {
      this.map.removeSource(this.etaSourceId);
    }

    this.isAdded = false;

    if (this.config.debug) {
      console.log('[RouteLineLayer] Removed');
    }
  }

  /**
   * Toggle layer visibility
   */
  toggle(visible: boolean): void {
    const visibility = visible ? 'visible' : 'none';

    const layersToToggle = [
      this.lineLayerId,
      this.progressLayerId,
      this.arrowsLayerId,
      this.etaMarkersLayerId,
    ];

    layersToToggle.forEach((layerId) => {
      if (this.map.getLayer(layerId)) {
        this.map.setLayoutProperty(layerId, 'visibility', visibility);
      }
    });

    if (this.config.debug) {
      console.log(`[RouteLineLayer] Visibility: ${visibility}`);
    }
  }

  /**
   * Highlight a route
   */
  highlight(routeId: string): void {
    // Use feature state for dynamic highlighting
    this.map.setFeatureState(
      { source: this.geoJsonSourceId, id: routeId },
      { highlighted: true }
    );

    if (this.config.debug) {
      console.log(`[RouteLineLayer] Highlighted route: ${routeId}`);
    }
  }

  /**
   * Clear all highlights
   */
  clearHighlight(): void {
    // Remove feature state for all features
    this.data.forEach((route) => {
      this.map.removeFeatureState({
        source: this.geoJsonSourceId,
        id: route.id,
      });
    });

    if (this.config.debug) {
      console.log('[RouteLineLayer] Cleared all highlights');
    }
  }

  /**
   * Get routes within viewport
   */
  getRoutesInView(): Route[] {
    const features = this.map.queryRenderedFeatures(undefined, {
      layers: [this.lineLayerId],
    });

    return features.map((f) => f.properties as unknown as Route);
  }

  /**
   * Apply mode configuration without recreating layer
   * Used by MapRuntime for instant mode switching
   */
  applyModeConfig(mode: RepresentationMode): void {
    this.currentMode = mode;

    if (!this.isAdded) return;

    if (mode === 'minimal') {
      // Minimal mode: simple lines, no arrows, no ETA markers
      this.map.setPaintProperty(this.lineLayerId, 'line-width', 2);

      // Hide arrows in minimal mode
      if (this.map.getLayer(this.arrowsLayerId)) {
        this.map.setLayoutProperty(this.arrowsLayerId, 'visibility', 'none');
      }

      // Hide ETA markers in minimal mode
      if (this.map.getLayer(this.etaMarkersLayerId)) {
        this.map.setLayoutProperty(this.etaMarkersLayerId, 'visibility', 'none');
      }

      // Hide progress layer in minimal mode
      if (this.map.getLayer(this.progressLayerId)) {
        this.map.setLayoutProperty(this.progressLayerId, 'visibility', 'none');
      }
    } else {
      // Entity-rich mode: full routes with arrows, ETA markers, progress
      this.map.setPaintProperty(this.lineLayerId, 'line-width', this.config.lineWidth);

      // Show arrows if enabled
      if (this.config.showDirectionArrows && this.map.getLayer(this.arrowsLayerId)) {
        this.map.setLayoutProperty(this.arrowsLayerId, 'visibility', 'visible');
      }

      // Show ETA markers if enabled
      if (this.config.showETAMarkers && this.map.getLayer(this.etaMarkersLayerId)) {
        this.map.setLayoutProperty(this.etaMarkersLayerId, 'visibility', 'visible');
      }

      // Show progress layer if it exists
      if (this.progressLayerId && this.map.getLayer(this.progressLayerId)) {
        this.map.setLayoutProperty(this.progressLayerId, 'visibility', 'visible');
      }
    }

    if (this.config.debug) {
      console.log(`[RouteLineLayer] Mode applied: ${mode}`);
    }
  }
}
