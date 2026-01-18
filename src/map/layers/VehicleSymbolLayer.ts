/**
 * VehicleSymbolLayer.ts
 *
 * MapLibre symbol layer for vehicles with bearing rotation and payload depletion
 * Phase 5: Operational Map component
 */

import type { Map as MapLibreMap, SymbolLayerSpecification, CircleLayerSpecification } from 'maplibre-gl';
import type { FeatureCollection, Point } from 'geojson';
import { MapLayer, type LayerHandlers } from '@/map/core/LayerInterface';
import { STATE_COLORS, ZOOM_BREAKPOINTS } from '@/lib/mapDesignSystem';
import type { Vehicle } from '@/types';
import type { RepresentationMode } from '@/components/map/RepresentationToggle';

/**
 * Vehicle Type Icon Mapping
 * Maps vehicle types to Phosphor sprite names
 */
const VEHICLE_TYPE_ICONS: Record<string, string> = {
  bike: 'entity.vehicle.bike',
  motorcycle: 'entity.vehicle.bike',
  van: 'entity.vehicle.van',
  truck: 'entity.vehicle.truck',
  lorry: 'entity.vehicle.truck',
  car: 'entity.vehicle.van',
  default: 'entity.vehicle.truck',
};

/**
 * Vehicle Type Size Hierarchy
 * Larger vehicles = larger icons (in pixels at base zoom)
 *
 * GOVERNANCE RULE:
 * - Vehicles are the PRIMARY operational object
 * - Icon size establishes visual hierarchy
 * - Trucks > Vans > Bikes
 */
const VEHICLE_TYPE_SIZES: Record<string, number> = {
  bike: 0.7,       // 14-16px equivalent
  motorcycle: 0.7,
  van: 0.9,        // 18-20px equivalent
  car: 0.9,
  truck: 1.1,      // 22-24px equivalent
  lorry: 1.1,
  default: 1.0,
};

/**
 * Vehicle Symbol Layer Configuration
 */
export interface VehicleSymbolLayerConfig {
  /** Show vehicle labels (default: true) */
  showLabels?: boolean;

  /** Minimum zoom to show vehicles (default: Z1 = 6) */
  minZoom?: number;

  /** Minimum zoom for labels (default: Z2 = 12) */
  labelMinZoom?: number;

  /** Base icon size multiplier (default: 1.0) */
  iconSize?: number;

  /** Show payload depletion ring (default: true) */
  showPayloadRing?: boolean;

  /** Enable bearing rotation (default: true) */
  enableBearingRotation?: boolean;

  /** Enable vehicle-type-based sizing (default: true) */
  enableTypeBasedSizing?: boolean;

  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Vehicle Symbol Layer for MapLibre
 *
 * Features:
 * - Vehicle icon with bearing rotation (points in direction of travel)
 * - Payload depletion ring (shows remaining capacity)
 * - Real-time position updates
 * - Status-based color encoding
 * - Click and hover handlers
 */
export class VehicleSymbolLayer extends MapLayer<Vehicle, Point> {
  private config: Required<VehicleSymbolLayerConfig>;
  private readonly symbolLayerId: string;
  private readonly labelLayerId: string;
  private readonly payloadRingLayerId: string;
  private currentMode: RepresentationMode = 'entity-rich';

  constructor(
    map: MapLibreMap,
    vehicles: Vehicle[],
    handlers: LayerHandlers<Point> = {},
    config: VehicleSymbolLayerConfig = {}
  ) {
    super(map, vehicles, handlers, {
      id: 'vehicles-layer',
      minZoom: config.minZoom || ZOOM_BREAKPOINTS.Z1,
    });

    this.config = {
      showLabels: config.showLabels ?? true,
      minZoom: config.minZoom || ZOOM_BREAKPOINTS.Z1,
      labelMinZoom: config.labelMinZoom || ZOOM_BREAKPOINTS.Z2,
      iconSize: config.iconSize ?? 1.0,
      showPayloadRing: config.showPayloadRing ?? true,
      enableBearingRotation: config.enableBearingRotation ?? true,
      enableTypeBasedSizing: config.enableTypeBasedSizing ?? true,
      debug: config.debug ?? false,
    };

    this.symbolLayerId = `${this.config.id}-symbol`;
    this.labelLayerId = `${this.config.id}-label`;
    this.payloadRingLayerId = `${this.config.id}-payload-ring`;
  }

  /**
   * Transform vehicles to GeoJSON
   */
  protected dataToGeoJSON(vehicles: Vehicle[]): FeatureCollection<Point> {
    const features = vehicles
      .filter((vehicle) => {
        // Filter out vehicles without valid coordinates
        // Support both lat/lng (demo) and current_lat/current_lng (database)
        const lat = (vehicle as any).lat ?? (vehicle as any).current_lat;
        const lng = (vehicle as any).lng ?? (vehicle as any).current_lng;
        return (
          lat !== null &&
          lng !== null &&
          lat !== undefined &&
          lng !== undefined &&
          !isNaN(lat) &&
          !isNaN(lng)
        );
      })
      .map((vehicle) => {
        // Calculate payload depletion percentage
        const payloadPercentage = this.calculatePayloadPercentage(vehicle);

        // Support both lat/lng (demo) and current_lat/current_lng (database)
        const lat = (vehicle as any).lat ?? (vehicle as any).current_lat;
        const lng = (vehicle as any).lng ?? (vehicle as any).current_lng;

        // Normalize vehicle type for icon/size lookup
        const vehicleType = (vehicle.type || 'truck').toLowerCase();

        // Get icon name based on vehicle type
        const iconName = VEHICLE_TYPE_ICONS[vehicleType] || VEHICLE_TYPE_ICONS.default;

        // Get size multiplier based on vehicle type (hierarchy: truck > van > bike)
        const sizeMultiplier = this.config.enableTypeBasedSizing
          ? (VEHICLE_TYPE_SIZES[vehicleType] || VEHICLE_TYPE_SIZES.default) * this.config.iconSize
          : this.config.iconSize;

        // Normalize bearing and speed (defensive against null/undefined)
        const bearing = Number((vehicle as any).bearing) || 0;
        const speed = Number((vehicle as any).speed) || 0;

        return {
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [lng, lat],
          },
          properties: {
            id: vehicle.id,
            type: 'vehicle',
            name: (vehicle as any).name || (vehicle as any).label || vehicle.id,
            vehicleType: vehicleType,
            status: vehicle.status || 'available',
            bearing: bearing,
            speed: speed,
            payloadPercentage: payloadPercentage ?? 0,
            // Icon name for type-specific rendering
            iconName: iconName,
            // Size multiplier for type-based hierarchy
            iconSize: sizeMultiplier,
            // State encoding (marker color)
            markerColor: this.getVehicleMarkerColor(vehicle),
            // Label text
            labelText: this.getVehicleLabelText(vehicle),
          },
          id: vehicle.id,
        };
      });

    return {
      type: 'FeatureCollection',
      features,
    };
  }

  /**
   * Normalize capacity object to handle partial or missing data
   * Production-safe: handles demo data, partial telemetry, and GPS gaps
   */
  private normalizeCapacity(vehicle: any) {
    // Handle nested capacity object (production schema)
    if (vehicle?.capacity && typeof vehicle.capacity === 'object') {
      const total = vehicle.capacity.total ?? 100;
      const used = vehicle.capacity.used ?? 0;

      return {
        total,
        used,
        available: vehicle.capacity.available ?? total - used,
        utilization: vehicle.capacity.utilization ?? (total > 0 ? used / total : 0),
      };
    }

    // Handle flat capacity properties (legacy/alternative schema)
    const total = vehicle?.capacity ?? 100;
    const used = vehicle?.current_load ?? 0;

    return {
      total,
      used,
      available: total - used,
      utilization: total > 0 ? used / total : 0,
    };
  }

  /**
   * Calculate payload depletion percentage
   */
  private calculatePayloadPercentage(vehicle: Vehicle): number {
    const capacity = this.normalizeCapacity(vehicle);
    return Math.round(capacity.utilization * 100);
  }

  /**
   * Get vehicle marker color based on status
   */
  private getVehicleMarkerColor(vehicle: Vehicle): string {
    // Map vehicle status to color
    const statusColorMap: Record<string, string> = {
      available: '#10b981',    // green-500
      active: '#10b981',       // green-500 (demo uses 'active')
      in_use: '#f59e0b',       // amber-500
      busy: '#f59e0b',         // amber-500
      delayed: '#ef4444',      // red-500
      maintenance: '#6b7280',  // gray-500
      offline: '#6b7280',      // gray-500
      idle: '#6b7280',         // gray-500
    };

    return statusColorMap[vehicle.status] || '#6b7280'; // gray-500 default
  }

  /**
   * Get vehicle label text
   */
  private getVehicleLabelText(vehicle: Vehicle): string {
    // Support both name (database) and label (demo)
    const name = (vehicle as any).name || (vehicle as any).label || vehicle.id;
    const parts: string[] = [name];

    const licensePlate = (vehicle as any).license_plate || (vehicle as any).plate_number;
    if (licensePlate) {
      parts.push(licensePlate);
    }

    const speed = (vehicle as any).speed;
    if (speed && speed > 0) {
      parts.push(`${Math.round(speed)} km/h`);
    }

    return parts.join('\n');
  }

  /**
   * Create vehicle symbol layer (icon with rotation)
   *
   * GOVERNANCE:
   * - Icon image is data-driven based on vehicle type (bike/van/truck)
   * - Icon size is data-driven based on vehicle class hierarchy
   * - Bearing rotation points vehicle in direction of travel
   */
  private createSymbolLayerConfig(): SymbolLayerSpecification {
    return {
      id: this.symbolLayerId,
      type: 'symbol',
      source: this.geoJsonSourceId,
      minzoom: this.config.minZoom,
      layout: {
        // Data-driven icon based on vehicle type (bike/van/truck)
        'icon-image': this.config.enableTypeBasedSizing
          ? ['coalesce', ['get', 'iconName'], 'entity.vehicle.truck']
          : 'entity.vehicle.truck',
        // Data-driven size based on vehicle class (truck > van > bike)
        'icon-size': this.config.enableTypeBasedSizing
          ? ['coalesce', ['get', 'iconSize'], this.config.iconSize]
          : this.config.iconSize,
        'icon-allow-overlap': true,
        'icon-anchor': 'center',
        // Bearing rotation - points vehicle in direction of travel
        'icon-rotate': this.config.enableBearingRotation
          ? ['coalesce', ['get', 'bearing'], 0]
          : 0,
        'icon-rotation-alignment': 'map',
        'icon-pitch-alignment': 'map',
        // Priority sorting (larger vehicles on top, then by speed)
        'symbol-sort-key': [
          '+',
          ['*', ['coalesce', ['get', 'iconSize'], 1], 100],
          ['coalesce', ['get', 'speed'], 0],
        ],
      },
      paint: {
        // Status-based color
        'icon-color': ['get', 'markerColor'],
        'icon-opacity': 1,
        'icon-halo-color': '#ffffff',
        'icon-halo-width': 2,
      },
    };
  }

  /**
   * Create payload depletion ring layer
   */
  private createPayloadRingLayerConfig(): CircleLayerSpecification {
    return {
      id: this.payloadRingLayerId,
      type: 'circle',
      source: this.geoJsonSourceId,
      minzoom: this.config.minZoom,
      paint: {
        // Ring radius (larger than icon)
        'circle-radius': 20,
        // Ring color based on payload level
        'circle-color': [
          'interpolate',
          ['linear'],
          ['get', 'payloadPercentage'],
          0, '#10b981', // Green at 0% (empty)
          50, '#f59e0b', // Amber at 50%
          100, '#ef4444', // Red at 100% (full)
        ],
        // Ring opacity based on payload level
        'circle-opacity': [
          'interpolate',
          ['linear'],
          ['get', 'payloadPercentage'],
          0, 0.1, // Nearly transparent when empty
          100, 0.4, // More visible when full
        ],
        // Stroke to create ring effect
        'circle-stroke-width': 2,
        'circle-stroke-color': [
          'interpolate',
          ['linear'],
          ['get', 'payloadPercentage'],
          0, '#10b981',
          50, '#f59e0b',
          100, '#ef4444',
        ],
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
        'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
        'text-size': 11,
        'text-offset': [0, 2],
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
      console.warn(`[VehicleSymbolLayer] Layer already added`);
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

    // Add payload ring layer first (so it renders behind the icon)
    if (this.config.showPayloadRing && !this.map.getLayer(this.payloadRingLayerId)) {
      this.map.addLayer(this.createPayloadRingLayerConfig());
    }

    // Add vehicle symbol layer
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
        `[VehicleSymbolLayer] Added ${geoJson.features.length} vehicles (bearing rotation: ${this.config.enableBearingRotation}, payload ring: ${this.config.showPayloadRing})`
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
  update(vehicles: Vehicle[]): void {
    this.data = vehicles;
    const geoJson = this.dataToGeoJSON(vehicles);

    const source = this.map.getSource(this.geoJsonSourceId);
    if (source && source.type === 'geojson') {
      source.setData(geoJson);

      if (this.config.debug) {
        console.log(
          `[VehicleSymbolLayer] Updated ${geoJson.features.length} vehicles`
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
      this.payloadRingLayerId,
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
      console.log('[VehicleSymbolLayer] Removed');
    }
  }

  /**
   * Toggle layer visibility
   */
  toggle(visible: boolean): void {
    const visibility = visible ? 'visible' : 'none';

    const layersToToggle = [
      this.payloadRingLayerId,
      this.symbolLayerId,
      this.labelLayerId,
    ];

    layersToToggle.forEach((layerId) => {
      if (this.map.getLayer(layerId)) {
        this.map.setLayoutProperty(layerId, 'visibility', visibility);
      }
    });

    if (this.config.debug) {
      console.log(`[VehicleSymbolLayer] Visibility: ${visibility}`);
    }
  }

  /**
   * Highlight a vehicle
   */
  highlight(vehicleId: string): void {
    // Use feature state for dynamic highlighting
    this.map.setFeatureState(
      { source: this.geoJsonSourceId, id: vehicleId },
      { highlighted: true }
    );

    if (this.config.debug) {
      console.log(`[VehicleSymbolLayer] Highlighted vehicle: ${vehicleId}`);
    }
  }

  /**
   * Clear all highlights
   */
  clearHighlight(): void {
    // Remove feature state for all features
    this.data.forEach((vehicle) => {
      this.map.removeFeatureState({
        source: this.geoJsonSourceId,
        id: vehicle.id,
      });
    });

    if (this.config.debug) {
      console.log('[VehicleSymbolLayer] Cleared all highlights');
    }
  }

  /**
   * Get vehicles within viewport
   */
  getVehiclesInView(): Vehicle[] {
    const features = this.map.queryRenderedFeatures(undefined, {
      layers: [this.symbolLayerId],
    });

    return features.map((f) => f.properties as unknown as Vehicle);
  }

  /**
   * Apply mode configuration without recreating layer
   * Used by MapRuntime for instant mode switching
   */
  applyModeConfig(mode: RepresentationMode): void {
    this.currentMode = mode;

    if (!this.isAdded) return;

    if (mode === 'minimal') {
      // Minimal mode: simple geometric markers, no rotation, no labels
      this.map.setLayoutProperty(this.symbolLayerId, 'icon-image', 'entity.vehicle');
      this.map.setLayoutProperty(this.symbolLayerId, 'icon-size', 0.4);
      this.map.setLayoutProperty(this.symbolLayerId, 'icon-rotate', 0);

      // Hide labels in minimal mode
      if (this.map.getLayer(this.labelLayerId)) {
        this.map.setLayoutProperty(this.labelLayerId, 'visibility', 'none');
      }

      // Hide payload ring in minimal mode
      if (this.map.getLayer(this.payloadRingLayerId)) {
        this.map.setLayoutProperty(this.payloadRingLayerId, 'visibility', 'none');
      }
    } else {
      // Entity-rich mode: semantic icons with rotation, labels, payload ring
      this.map.setLayoutProperty(this.symbolLayerId, 'icon-image', 'entity.vehicle');
      this.map.setLayoutProperty(this.symbolLayerId, 'icon-size', this.config.iconSize);

      // Enable bearing rotation
      if (this.config.enableBearingRotation) {
        this.map.setLayoutProperty(this.symbolLayerId, 'icon-rotate', ['get', 'bearing']);
      }

      // Show labels if enabled
      if (this.config.showLabels && this.map.getLayer(this.labelLayerId)) {
        this.map.setLayoutProperty(this.labelLayerId, 'visibility', 'visible');
      }

      // Show payload ring if enabled
      if (this.config.showPayloadRing && this.map.getLayer(this.payloadRingLayerId)) {
        this.map.setLayoutProperty(this.payloadRingLayerId, 'visibility', 'visible');
      }
    }

    if (this.config.debug) {
      console.log(`[VehicleSymbolLayer] Mode applied: ${mode}`);
    }
  }
}
