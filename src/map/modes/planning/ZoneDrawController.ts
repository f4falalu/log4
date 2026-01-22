/**
 * ZoneDrawController.ts
 *
 * Drawing logic for zone creation.
 *
 * GOVERNANCE:
 * - This is the ONLY place drawing logic exists
 * - Captures user-drawn geometry
 * - Converts geometry → H3 cells
 * - Hands off to spatial core
 * - Controller NEVER stores zones
 * - Controller NEVER updates map directly
 * - Controller NEVER applies tags
 */

import type maplibregl from 'maplibre-gl';
import { polygonToCells, createZone, type CreateZoneInput, type Zone } from '@/map/core/spatial';

/**
 * Drawing state
 */
export type DrawingState = 'idle' | 'drawing' | 'completing';

/**
 * Point in the drawing
 */
interface DrawPoint {
  lng: number;
  lat: number;
}

/**
 * Drawing event callbacks
 */
export interface ZoneDrawCallbacks {
  /** Called when drawing starts */
  onDrawStart?: () => void;

  /** Called when a point is added */
  onPointAdded?: (points: DrawPoint[]) => void;

  /** Called when drawing is cancelled */
  onDrawCancel?: () => void;

  /** Called when drawing completes with zone */
  onDrawComplete?: (zone: Zone) => void;

  /** Called on error */
  onError?: (error: string) => void;
}

/**
 * Drawing layer IDs
 */
const DRAW_LAYER_IDS = {
  points: 'zone-draw-points',
  line: 'zone-draw-line',
  polygon: 'zone-draw-polygon',
  source: 'zone-draw-source',
} as const;

/**
 * ZoneDrawController - Controlled zone drawing
 *
 * FLOW:
 * 1. User clicks "Draw Zone" → FSM enters draw_zone
 * 2. start() called → drawing begins
 * 3. User clicks to add points
 * 4. User double-clicks or clicks first point to close
 * 5. complete() called → polygon captured → polygonToCells() → createZone()
 * 6. Zone returned via callback
 *
 * RULES:
 * - Controller never stores zones
 * - Controller never updates map layers directly
 * - Controller never applies tags
 */
export class ZoneDrawController {
  private map: maplibregl.Map | null = null;
  private state: DrawingState = 'idle';
  private points: DrawPoint[] = [];
  private callbacks: ZoneDrawCallbacks;
  private createdBy: string;

  constructor(callbacks: ZoneDrawCallbacks = {}, createdBy: string = 'system') {
    this.callbacks = callbacks;
    this.createdBy = createdBy;
  }

  /**
   * Attach to map
   */
  attach(map: maplibregl.Map): void {
    this.map = map;
    this.setupDrawingLayers();
  }

  /**
   * Detach from map
   */
  detach(): void {
    this.cleanupDrawingLayers();
    this.map = null;
    this.state = 'idle';
    this.points = [];
  }

  /**
   * Get current state
   */
  getState(): DrawingState {
    return this.state;
  }

  /**
   * Get current points
   */
  getPoints(): DrawPoint[] {
    return [...this.points];
  }

  /**
   * Start drawing mode
   */
  start(): void {
    if (!this.map) {
      this.callbacks.onError?.('Map not attached');
      return;
    }

    if (this.state !== 'idle') {
      this.cancel();
    }

    this.state = 'drawing';
    this.points = [];

    // Enable click handler
    this.map.on('click', this.handleClick);
    this.map.on('dblclick', this.handleDoubleClick);
    this.map.on('mousemove', this.handleMouseMove);

    // Change cursor
    this.map.getCanvas().style.cursor = 'crosshair';

    this.callbacks.onDrawStart?.();
    console.log('[ZoneDrawController] Drawing started');
  }

  /**
   * Cancel drawing
   */
  cancel(): void {
    if (this.state === 'idle') return;

    this.cleanup();
    this.state = 'idle';

    this.callbacks.onDrawCancel?.();
    console.log('[ZoneDrawController] Drawing cancelled');
  }

  /**
   * Complete drawing with current points
   */
  complete(zoneName: string): Zone | null {
    if (this.state !== 'drawing' || this.points.length < 3) {
      this.callbacks.onError?.('Need at least 3 points to create a zone');
      return null;
    }

    this.state = 'completing';

    try {
      // Create polygon from points
      const polygon = this.pointsToPolygon();

      // Convert polygon to H3 cells
      const h3Cells = polygonToCells(polygon);

      if (h3Cells.length === 0) {
        this.callbacks.onError?.('Drawn area is too small for H3 cells');
        this.cleanup();
        this.state = 'idle';
        return null;
      }

      // Create zone
      const zoneInput: CreateZoneInput = {
        name: zoneName,
        h3Cells,
        tags: [],
        createdBy: this.createdBy,
      };

      const zone = createZone(zoneInput);

      // Cleanup drawing state
      this.cleanup();
      this.state = 'idle';

      this.callbacks.onDrawComplete?.(zone);
      console.log(`[ZoneDrawController] Zone created with ${h3Cells.length} cells`);

      return zone;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create zone';
      this.callbacks.onError?.(message);
      this.cleanup();
      this.state = 'idle';
      return null;
    }
  }

  /**
   * Add a point programmatically
   */
  addPoint(lng: number, lat: number): void {
    if (this.state !== 'drawing') return;

    this.points.push({ lng, lat });
    this.updateDrawingLayer();
    this.callbacks.onPointAdded?.(this.getPoints());
  }

  /**
   * Remove last point
   */
  undoLastPoint(): void {
    if (this.state !== 'drawing' || this.points.length === 0) return;

    this.points.pop();
    this.updateDrawingLayer();
    this.callbacks.onPointAdded?.(this.getPoints());
  }

  /**
   * Set createdBy user
   */
  setCreatedBy(userId: string): void {
    this.createdBy = userId;
  }

  /**
   * Handle map click
   */
  private handleClick = (e: maplibregl.MapMouseEvent): void => {
    if (this.state !== 'drawing') return;

    const { lng, lat } = e.lngLat;

    // Check if clicking near first point to close
    if (this.points.length >= 3) {
      const first = this.points[0];
      const distance = Math.sqrt(
        Math.pow(lng - first.lng, 2) + Math.pow(lat - first.lat, 2)
      );

      // Close threshold (in degrees, roughly 100m at equator)
      if (distance < 0.001) {
        // Don't add the point, just indicate completion is possible
        return;
      }
    }

    this.addPoint(lng, lat);
  };

  /**
   * Handle double click to complete
   */
  private handleDoubleClick = (e: maplibregl.MapMouseEvent): void => {
    if (this.state !== 'drawing') return;

    e.preventDefault();

    if (this.points.length >= 3) {
      // Prompt for name will be handled by UI
      // For now, generate a default name
      const defaultName = `Zone ${Date.now()}`;
      this.complete(defaultName);
    }
  };

  /**
   * Handle mouse move for preview
   */
  private handleMouseMove = (e: maplibregl.MapMouseEvent): void => {
    if (this.state !== 'drawing' || this.points.length === 0) return;

    // Update preview line to cursor
    this.updateDrawingLayer(e.lngLat);
  };

  /**
   * Setup drawing layers
   */
  private setupDrawingLayers(): void {
    if (!this.map) return;

    // Add source
    if (!this.map.getSource(DRAW_LAYER_IDS.source)) {
      this.map.addSource(DRAW_LAYER_IDS.source, {
        type: 'geojson',
        data: this.createEmptyFeatureCollection(),
      });
    }

    // Add polygon fill
    if (!this.map.getLayer(DRAW_LAYER_IDS.polygon)) {
      this.map.addLayer({
        id: DRAW_LAYER_IDS.polygon,
        type: 'fill',
        source: DRAW_LAYER_IDS.source,
        filter: ['==', '$type', 'Polygon'],
        paint: {
          'fill-color': '#3b82f6',
          'fill-opacity': 0.2,
        },
      });
    }

    // Add line
    if (!this.map.getLayer(DRAW_LAYER_IDS.line)) {
      this.map.addLayer({
        id: DRAW_LAYER_IDS.line,
        type: 'line',
        source: DRAW_LAYER_IDS.source,
        filter: ['==', '$type', 'LineString'],
        paint: {
          'line-color': '#3b82f6',
          'line-width': 2,
          'line-dasharray': [2, 2],
        },
      });
    }

    // Add points
    if (!this.map.getLayer(DRAW_LAYER_IDS.points)) {
      this.map.addLayer({
        id: DRAW_LAYER_IDS.points,
        type: 'circle',
        source: DRAW_LAYER_IDS.source,
        filter: ['==', '$type', 'Point'],
        paint: {
          'circle-radius': 6,
          'circle-color': '#3b82f6',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
        },
      });
    }
  }

  /**
   * Cleanup drawing layers
   */
  private cleanupDrawingLayers(): void {
    if (!this.map) return;

    if (this.map.getLayer(DRAW_LAYER_IDS.points)) {
      this.map.removeLayer(DRAW_LAYER_IDS.points);
    }
    if (this.map.getLayer(DRAW_LAYER_IDS.line)) {
      this.map.removeLayer(DRAW_LAYER_IDS.line);
    }
    if (this.map.getLayer(DRAW_LAYER_IDS.polygon)) {
      this.map.removeLayer(DRAW_LAYER_IDS.polygon);
    }
    if (this.map.getSource(DRAW_LAYER_IDS.source)) {
      this.map.removeSource(DRAW_LAYER_IDS.source);
    }
  }

  /**
   * Update drawing layer with current state
   */
  private updateDrawingLayer(cursorPos?: maplibregl.LngLat): void {
    if (!this.map) return;

    const source = this.map.getSource(DRAW_LAYER_IDS.source) as maplibregl.GeoJSONSource;
    if (!source) return;

    const features: GeoJSON.Feature[] = [];

    // Add points
    for (const point of this.points) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [point.lng, point.lat],
        },
        properties: {},
      });
    }

    // Add line from points
    if (this.points.length >= 1) {
      const lineCoords = this.points.map((p) => [p.lng, p.lat]);

      // Add cursor position for preview
      if (cursorPos) {
        lineCoords.push([cursorPos.lng, cursorPos.lat]);
      }

      // Close line if 3+ points
      if (this.points.length >= 3) {
        lineCoords.push([this.points[0].lng, this.points[0].lat]);
      }

      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: lineCoords,
        },
        properties: {},
      });
    }

    // Add polygon preview if 3+ points
    if (this.points.length >= 3) {
      const polygonCoords = this.points.map((p) => [p.lng, p.lat]);
      polygonCoords.push([this.points[0].lng, this.points[0].lat]); // Close

      features.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [polygonCoords],
        },
        properties: {},
      });
    }

    source.setData({
      type: 'FeatureCollection',
      features,
    });
  }

  /**
   * Cleanup event handlers and state
   */
  private cleanup(): void {
    if (!this.map) return;

    // Remove event handlers
    this.map.off('click', this.handleClick);
    this.map.off('dblclick', this.handleDoubleClick);
    this.map.off('mousemove', this.handleMouseMove);

    // Reset cursor
    this.map.getCanvas().style.cursor = '';

    // Clear drawing layer
    const source = this.map.getSource(DRAW_LAYER_IDS.source) as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(this.createEmptyFeatureCollection());
    }

    this.points = [];
  }

  /**
   * Convert points to GeoJSON polygon
   */
  private pointsToPolygon(): GeoJSON.Polygon {
    const coordinates = this.points.map((p) => [p.lng, p.lat]);
    // Close the polygon
    coordinates.push([this.points[0].lng, this.points[0].lat]);

    return {
      type: 'Polygon',
      coordinates: [coordinates],
    };
  }

  /**
   * Create empty feature collection
   */
  private createEmptyFeatureCollection(): GeoJSON.FeatureCollection {
    return {
      type: 'FeatureCollection',
      features: [],
    };
  }
}
