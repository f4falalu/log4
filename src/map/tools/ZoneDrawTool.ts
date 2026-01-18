/**
 * ZoneDrawTool.ts
 *
 * Zone drawing and editing tool for MapLibre
 * Uses @mapbox/mapbox-gl-draw for polygon creation and editing
 */

import type { Map as MapLibreMap } from 'maplibre-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import type { Feature, Polygon } from 'geojson';

/**
 * Zone Draw Tool Configuration
 */
export interface ZoneDrawToolConfig {
  /** Default polygon color */
  polygonColor?: string;

  /** Polygon fill opacity */
  fillOpacity?: number;

  /** Polygon stroke width */
  strokeWidth?: number;

  /** Enable snap to features */
  snap?: boolean;

  /** Minimum polygon area (square meters) */
  minArea?: number;

  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Zone draw events
 */
export interface ZoneDrawEvents {
  /** Called when zone is created */
  onCreate?: (zone: Feature<Polygon>) => void;

  /** Called when zone is updated */
  onUpdate?: (zone: Feature<Polygon>) => void;

  /** Called when zone is deleted */
  onDelete?: (zoneId: string) => void;

  /** Called when mode changes */
  onModeChange?: (mode: string) => void;
}

/**
 * Zone Draw Tool for MapLibre
 *
 * Features:
 * - Draw polygons for service zones
 * - Edit existing zones
 * - Delete zones
 * - Snap to grid/features
 * - Area validation
 */
export class ZoneDrawTool {
  private map: MapLibreMap;
  private draw: MapboxDraw;
  private config: Required<ZoneDrawToolConfig>;
  private events: ZoneDrawEvents;
  private active: boolean = false;

  constructor(
    map: MapLibreMap,
    events: ZoneDrawEvents = {},
    config: ZoneDrawToolConfig = {}
  ) {
    this.map = map;
    this.events = events;

    this.config = {
      polygonColor: config.polygonColor || '#3b82f6', // blue-500
      fillOpacity: config.fillOpacity ?? 0.2,
      strokeWidth: config.strokeWidth ?? 2,
      snap: config.snap ?? false,
      minArea: config.minArea ?? 1000, // 1000 square meters minimum
      debug: config.debug ?? false,
    };

    // Initialize MapboxDraw
    this.draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
      styles: this.getDrawStyles(),
    });
  }

  /**
   * Get custom MapboxDraw styles
   */
  private getDrawStyles(): any[] {
    return [
      // Polygon fill
      {
        id: 'gl-draw-polygon-fill',
        type: 'fill',
        filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
        paint: {
          'fill-color': this.config.polygonColor,
          'fill-opacity': this.config.fillOpacity,
        },
      },
      // Polygon outline (normal)
      {
        id: 'gl-draw-polygon-stroke-normal',
        type: 'line',
        filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
        paint: {
          'line-color': this.config.polygonColor,
          'line-width': this.config.strokeWidth,
        },
      },
      // Polygon outline (active)
      {
        id: 'gl-draw-polygon-stroke-active',
        type: 'line',
        filter: ['all', ['==', '$type', 'Polygon'], ['==', 'active', 'true']],
        paint: {
          'line-color': '#fbbf24', // amber-400
          'line-width': this.config.strokeWidth + 1,
        },
      },
      // Polygon vertices
      {
        id: 'gl-draw-polygon-and-line-vertex-active',
        type: 'circle',
        filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point']],
        paint: {
          'circle-radius': 5,
          'circle-color': '#ffffff',
          'circle-stroke-color': this.config.polygonColor,
          'circle-stroke-width': 2,
        },
      },
      // Midpoints (for adding vertices)
      {
        id: 'gl-draw-polygon-midpoint',
        type: 'circle',
        filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint']],
        paint: {
          'circle-radius': 3,
          'circle-color': '#fbbf24', // amber-400
        },
      },
    ];
  }

  /**
   * Add draw control to map
   */
  enable(): void {
    if (this.active) return;

    // Add draw control
    this.map.addControl(this.draw as any, 'top-right');

    // Setup event listeners
    this.setupEventListeners();

    this.active = true;

    if (this.config.debug) {
      console.log('[ZoneDrawTool] Enabled');
    }
  }

  /**
   * Remove draw control from map
   */
  disable(): void {
    if (!this.active) return;

    // Remove draw control
    this.map.removeControl(this.draw as any);

    // Remove event listeners
    this.removeEventListeners();

    this.active = false;

    if (this.config.debug) {
      console.log('[ZoneDrawTool] Disabled');
    }
  }

  /**
   * Setup MapboxDraw event listeners
   */
  private setupEventListeners(): void {
    this.map.on('draw.create', this.handleCreate.bind(this));
    this.map.on('draw.update', this.handleUpdate.bind(this));
    this.map.on('draw.delete', this.handleDelete.bind(this));
    this.map.on('draw.modechange', this.handleModeChange.bind(this));
  }

  /**
   * Remove MapboxDraw event listeners
   */
  private removeEventListeners(): void {
    this.map.off('draw.create', this.handleCreate.bind(this));
    this.map.off('draw.update', this.handleUpdate.bind(this));
    this.map.off('draw.delete', this.handleDelete.bind(this));
    this.map.off('draw.modechange', this.handleModeChange.bind(this));
  }

  /**
   * Handle zone creation
   */
  private handleCreate(e: any): void {
    const features = e.features as Feature<Polygon>[];

    if (features.length > 0) {
      const zone = features[0];

      // Validate zone
      if (!this.validateZone(zone)) {
        this.draw.delete(zone.id as string);
        return;
      }

      if (this.events.onCreate) {
        this.events.onCreate(zone);
      }

      if (this.config.debug) {
        console.log('[ZoneDrawTool] Zone created:', zone.id);
      }
    }
  }

  /**
   * Handle zone update
   */
  private handleUpdate(e: any): void {
    const features = e.features as Feature<Polygon>[];

    if (features.length > 0) {
      const zone = features[0];

      // Validate zone
      if (!this.validateZone(zone)) {
        // Revert to previous state (complex - for now just allow it)
        console.warn('[ZoneDrawTool] Zone validation failed after edit');
      }

      if (this.events.onUpdate) {
        this.events.onUpdate(zone);
      }

      if (this.config.debug) {
        console.log('[ZoneDrawTool] Zone updated:', zone.id);
      }
    }
  }

  /**
   * Handle zone deletion
   */
  private handleDelete(e: any): void {
    const features = e.features as Feature<Polygon>[];

    features.forEach((zone) => {
      if (this.events.onDelete) {
        this.events.onDelete(zone.id as string);
      }

      if (this.config.debug) {
        console.log('[ZoneDrawTool] Zone deleted:', zone.id);
      }
    });
  }

  /**
   * Handle mode change
   */
  private handleModeChange(e: any): void {
    if (this.events.onModeChange) {
      this.events.onModeChange(e.mode);
    }

    if (this.config.debug) {
      console.log('[ZoneDrawTool] Mode changed:', e.mode);
    }
  }

  /**
   * Validate zone polygon
   */
  private validateZone(zone: Feature<Polygon>): boolean {
    if (!zone.geometry || !zone.geometry.coordinates || !zone.geometry.coordinates[0]) {
      console.warn('[ZoneDrawTool] Invalid zone geometry');
      return false;
    }

    // Calculate area (simple bbox estimation)
    const coords = zone.geometry.coordinates[0];
    if (coords.length < 4) {
      console.warn('[ZoneDrawTool] Polygon must have at least 3 vertices');
      return false;
    }

    // Check minimum area (rough approximation)
    const bbox = this.getBoundingBox(coords);
    const area = this.calculateBBoxArea(bbox);

    if (area < this.config.minArea) {
      console.warn(`[ZoneDrawTool] Zone too small (${area.toFixed(0)}m² < ${this.config.minArea}m²)`);
      return false;
    }

    return true;
  }

  /**
   * Get bounding box of coordinates
   */
  private getBoundingBox(coords: number[][]): [number, number, number, number] {
    const lngs = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);

    return [
      Math.min(...lngs), // west
      Math.min(...lats), // south
      Math.max(...lngs), // east
      Math.max(...lats), // north
    ];
  }

  /**
   * Calculate bounding box area (approximate in square meters)
   */
  private calculateBBoxArea(bbox: [number, number, number, number]): number {
    const [west, south, east, north] = bbox;

    // Rough approximation: 1 degree ≈ 111km at equator
    const width = (east - west) * 111000;
    const height = (north - south) * 111000;

    return width * height;
  }

  /**
   * Start drawing a new zone
   */
  startDrawing(): void {
    this.draw.changeMode('draw_polygon');

    if (this.config.debug) {
      console.log('[ZoneDrawTool] Started drawing');
    }
  }

  /**
   * Cancel current drawing
   */
  cancelDrawing(): void {
    this.draw.changeMode('simple_select');

    if (this.config.debug) {
      console.log('[ZoneDrawTool] Cancelled drawing');
    }
  }

  /**
   * Load existing zones
   */
  loadZones(zones: Feature<Polygon>[]): void {
    this.draw.set({
      type: 'FeatureCollection',
      features: zones,
    });

    if (this.config.debug) {
      console.log(`[ZoneDrawTool] Loaded ${zones.length} zones`);
    }
  }

  /**
   * Get all zones
   */
  getZones(): Feature<Polygon>[] {
    const featureCollection = this.draw.getAll();
    return featureCollection.features as Feature<Polygon>[];
  }

  /**
   * Get specific zone by ID
   */
  getZone(zoneId: string): Feature<Polygon> | undefined {
    return this.draw.get(zoneId) as Feature<Polygon> | undefined;
  }

  /**
   * Update a zone
   */
  updateZone(zoneId: string, zone: Feature<Polygon>): void {
    this.draw.delete(zoneId);
    this.draw.add(zone);

    if (this.config.debug) {
      console.log('[ZoneDrawTool] Zone updated:', zoneId);
    }
  }

  /**
   * Delete a zone
   */
  deleteZone(zoneId: string): void {
    this.draw.delete(zoneId);

    if (this.config.debug) {
      console.log('[ZoneDrawTool] Zone deleted:', zoneId);
    }
  }

  /**
   * Delete all zones
   */
  deleteAllZones(): void {
    this.draw.deleteAll();

    if (this.config.debug) {
      console.log('[ZoneDrawTool] All zones deleted');
    }
  }

  /**
   * Select a zone for editing
   */
  selectZone(zoneId: string): void {
    this.draw.changeMode('direct_select', { featureId: zoneId });

    if (this.config.debug) {
      console.log('[ZoneDrawTool] Zone selected:', zoneId);
    }
  }

  /**
   * Deselect current zone
   */
  deselectZone(): void {
    this.draw.changeMode('simple_select');

    if (this.config.debug) {
      console.log('[ZoneDrawTool] Zone deselected');
    }
  }

  /**
   * Check if tool is active
   */
  isActive(): boolean {
    return this.active;
  }

  /**
   * Get current mode
   */
  getMode(): string {
    return this.draw.getMode();
  }
}
