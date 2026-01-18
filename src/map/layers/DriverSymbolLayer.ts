/**
 * DriverSymbolLayer.ts
 *
 * MapLibre symbol layer for drivers with status badges
 * Phase 5: Operational Map component
 */

import type { Map as MapLibreMap, SymbolLayerSpecification, CircleLayerSpecification } from 'maplibre-gl';
import type { FeatureCollection, Point } from 'geojson';
import { MapLayer, type LayerHandlers } from '@/map/core/LayerInterface';
import { STATE_COLORS, ZOOM_BREAKPOINTS } from '@/lib/mapDesignSystem';
import type { Driver } from '@/types';
import type { RepresentationMode } from '@/components/map/RepresentationToggle';

/**
 * Driver Symbol Layer Configuration
 */
export interface DriverSymbolLayerConfig {
  /** Show driver labels (default: true) */
  showLabels?: boolean;

  /** Minimum zoom to show drivers (default: Z1 = 6) */
  minZoom?: number;

  /** Minimum zoom for labels (default: Z2 = 12) */
  labelMinZoom?: number;

  /** Icon size (default: 0.8) */
  iconSize?: number;

  /** Show status badge (default: true) */
  showStatusBadge?: boolean;

  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Driver Symbol Layer for MapLibre
 *
 * Features:
 * - Driver icon with initials
 * - Status badge (available, on-duty, on-break, off-duty)
 * - Real-time position updates
 * - Status-based color encoding
 * - Click and hover handlers
 */
export class DriverSymbolLayer extends MapLayer<Driver, Point> {
  private config: Required<DriverSymbolLayerConfig>;
  private readonly symbolLayerId: string;
  private readonly labelLayerId: string;
  private readonly badgeLayerId: string;
  private currentMode: RepresentationMode = 'entity-rich';

  constructor(
    map: MapLibreMap,
    drivers: Driver[],
    handlers: LayerHandlers<Point> = {},
    config: DriverSymbolLayerConfig = {}
  ) {
    super(map, drivers, handlers, {
      id: 'drivers-layer',
      minZoom: config.minZoom || ZOOM_BREAKPOINTS.Z1,
    });

    this.config = {
      showLabels: config.showLabels ?? true,
      minZoom: config.minZoom || ZOOM_BREAKPOINTS.Z1,
      labelMinZoom: config.labelMinZoom || ZOOM_BREAKPOINTS.Z2,
      iconSize: config.iconSize ?? 0.8,
      showStatusBadge: config.showStatusBadge ?? true,
      debug: config.debug ?? false,
    };

    this.symbolLayerId = `${this.config.id}-symbol`;
    this.labelLayerId = `${this.config.id}-label`;
    this.badgeLayerId = `${this.config.id}-badge`;
  }

  /**
   * Transform drivers to GeoJSON
   */
  protected dataToGeoJSON(drivers: Driver[]): FeatureCollection<Point> {
    const features = drivers
      .filter((driver) => {
        // Filter out drivers without valid coordinates
        return (
          driver.current_lat !== null &&
          driver.current_lng !== null &&
          !isNaN(driver.current_lat) &&
          !isNaN(driver.current_lng)
        );
      })
      .map((driver) => {
        return {
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [driver.current_lng!, driver.current_lat!],
          },
          properties: {
            id: driver.id,
            type: 'driver',
            name: driver.name,
            initials: this.getDriverInitials(driver),
            status: driver.status,
            // State encoding (marker color)
            markerColor: this.getDriverMarkerColor(driver),
            badgeColor: this.getDriverBadgeColor(driver),
            // Label text
            labelText: this.getDriverLabelText(driver),
          },
          id: driver.id,
        };
      });

    return {
      type: 'FeatureCollection',
      features,
    };
  }

  /**
   * Get driver initials (first letter of first and last name)
   */
  private getDriverInitials(driver: Driver): string {
    const nameParts = driver.name.trim().split(/\s+/);
    if (nameParts.length === 1) {
      return nameParts[0].substring(0, 2).toUpperCase();
    }
    return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
  }

  /**
   * Get driver marker color based on status
   */
  private getDriverMarkerColor(driver: Driver): string {
    const statusColors: Record<string, string> = {
      available: STATE_COLORS.driver.available.replace('bg-', '#'),
      on_duty: STATE_COLORS.driver.on_duty.replace('bg-', '#'),
      on_break: STATE_COLORS.driver.on_break.replace('bg-', '#'),
      off_duty: STATE_COLORS.driver.off_duty.replace('bg-', '#'),
    };

    return statusColors[driver.status] || '#6b7280'; // gray-500 default
  }

  /**
   * Get driver badge color (small circle indicating status)
   */
  private getDriverBadgeColor(driver: Driver): string {
    const badgeColors: Record<string, string> = {
      available: '#10b981', // green-500
      on_duty: '#3b82f6', // blue-500
      on_break: '#f59e0b', // amber-500
      off_duty: '#6b7280', // gray-500
    };

    return badgeColors[driver.status] || '#6b7280';
  }

  /**
   * Get driver label text
   */
  private getDriverLabelText(driver: Driver): string {
    const parts: string[] = [driver.name];

    if (driver.phone) {
      parts.push(driver.phone);
    }

    // Add status in readable format
    const statusText = driver.status.replace('_', ' ');
    parts.push(statusText.charAt(0).toUpperCase() + statusText.slice(1));

    return parts.join('\n');
  }

  /**
   * Create driver symbol layer (icon with initials)
   */
  private createSymbolLayerConfig(): SymbolLayerSpecification {
    return {
      id: this.symbolLayerId,
      type: 'symbol',
      source: this.geoJsonSourceId,
      minzoom: this.config.minZoom,
      layout: {
        'icon-image': 'entity.driver', // Sprite name
        'icon-size': this.config.iconSize,
        'icon-allow-overlap': true,
        'icon-anchor': 'center',
        // Text overlay for initials
        'text-field': ['get', 'initials'],
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': 10,
        'text-allow-overlap': true,
        'text-ignore-placement': true,
      },
      paint: {
        // Status-based color
        'icon-color': ['get', 'markerColor'],
        'icon-opacity': 1,
        'icon-halo-color': '#ffffff',
        'icon-halo-width': 2,
        // Initials text
        'text-color': '#ffffff',
      },
    };
  }

  /**
   * Create status badge layer (small circle)
   */
  private createBadgeLayerConfig(): CircleLayerSpecification {
    return {
      id: this.badgeLayerId,
      type: 'circle',
      source: this.geoJsonSourceId,
      minzoom: this.config.minZoom,
      paint: {
        // Small badge circle
        'circle-radius': 6,
        // Status-based badge color
        'circle-color': ['get', 'badgeColor'],
        'circle-opacity': 1,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        // Position offset (top-right of icon)
        'circle-translate': [10, -10],
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
        'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
        'text-size': 11,
        'text-offset': [0, 1.8],
        'text-anchor': 'top',
        'text-optional': true,
        'text-allow-overlap': false,
      },
      paint: {
        'text-color': '#1f2937',
        'text-halo-color': '#ffffff',
        'text-halo-width': 2,
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
      console.warn(`[DriverSymbolLayer] Layer already added`);
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

    // Add driver symbol layer
    if (!this.map.getLayer(this.symbolLayerId)) {
      this.map.addLayer(this.createSymbolLayerConfig());
    }

    // Add status badge layer (renders on top)
    if (this.config.showStatusBadge && !this.map.getLayer(this.badgeLayerId)) {
      this.map.addLayer(this.createBadgeLayerConfig());
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
        `[DriverSymbolLayer] Added ${geoJson.features.length} drivers (status badges: ${this.config.showStatusBadge})`
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
  update(drivers: Driver[]): void {
    this.data = drivers;
    const geoJson = this.dataToGeoJSON(drivers);

    const source = this.map.getSource(this.geoJsonSourceId);
    if (source && source.type === 'geojson') {
      source.setData(geoJson);

      if (this.config.debug) {
        console.log(
          `[DriverSymbolLayer] Updated ${geoJson.features.length} drivers`
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
      this.symbolLayerId,
      this.badgeLayerId,
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
      console.log('[DriverSymbolLayer] Removed');
    }
  }

  /**
   * Toggle layer visibility
   */
  toggle(visible: boolean): void {
    const visibility = visible ? 'visible' : 'none';

    const layersToToggle = [
      this.symbolLayerId,
      this.badgeLayerId,
      this.labelLayerId,
    ];

    layersToToggle.forEach((layerId) => {
      if (this.map.getLayer(layerId)) {
        this.map.setLayoutProperty(layerId, 'visibility', visibility);
      }
    });

    if (this.config.debug) {
      console.log(`[DriverSymbolLayer] Visibility: ${visibility}`);
    }
  }

  /**
   * Highlight a driver
   */
  highlight(driverId: string): void {
    // Use feature state for dynamic highlighting
    this.map.setFeatureState(
      { source: this.geoJsonSourceId, id: driverId },
      { highlighted: true }
    );

    if (this.config.debug) {
      console.log(`[DriverSymbolLayer] Highlighted driver: ${driverId}`);
    }
  }

  /**
   * Clear all highlights
   */
  clearHighlight(): void {
    // Remove feature state for all features
    this.data.forEach((driver) => {
      this.map.removeFeatureState({
        source: this.geoJsonSourceId,
        id: driver.id,
      });
    });

    if (this.config.debug) {
      console.log('[DriverSymbolLayer] Cleared all highlights');
    }
  }

  /**
   * Get drivers within viewport
   */
  getDriversInView(): Driver[] {
    const features = this.map.queryRenderedFeatures(undefined, {
      layers: [this.symbolLayerId],
    });

    return features.map((f) => f.properties as unknown as Driver);
  }

  /**
   * Apply mode configuration without recreating layer
   * Used by MapRuntime for instant mode switching
   */
  applyModeConfig(mode: RepresentationMode): void {
    this.currentMode = mode;

    if (!this.isAdded) return;

    if (mode === 'minimal') {
      // Minimal mode: simple geometric markers, no badges, no labels
      this.map.setLayoutProperty(this.symbolLayerId, 'icon-image', 'entity.driver');
      this.map.setLayoutProperty(this.symbolLayerId, 'icon-size', 0.4);

      // Hide labels in minimal mode
      if (this.map.getLayer(this.labelLayerId)) {
        this.map.setLayoutProperty(this.labelLayerId, 'visibility', 'none');
      }

      // Hide badges in minimal mode
      if (this.map.getLayer(this.badgeLayerId)) {
        this.map.setLayoutProperty(this.badgeLayerId, 'visibility', 'none');
      }
    } else {
      // Entity-rich mode: semantic icons with status badges and labels
      this.map.setLayoutProperty(this.symbolLayerId, 'icon-image', 'entity.driver');
      this.map.setLayoutProperty(this.symbolLayerId, 'icon-size', this.config.iconSize);

      // Show labels if enabled
      if (this.config.showLabels && this.map.getLayer(this.labelLayerId)) {
        this.map.setLayoutProperty(this.labelLayerId, 'visibility', 'visible');
      }

      // Show status badge if enabled
      if (this.config.showStatusBadge && this.map.getLayer(this.badgeLayerId)) {
        this.map.setLayoutProperty(this.badgeLayerId, 'visibility', 'visible');
      }
    }

    if (this.config.debug) {
      console.log(`[DriverSymbolLayer] Mode applied: ${mode}`);
    }
  }
}
