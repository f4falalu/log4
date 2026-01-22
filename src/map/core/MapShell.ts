/**
 * MapShell.ts
 *
 * Single owner of the MapLibre instance.
 *
 * GOVERNANCE:
 * - Owns exactly ONE MapLibre instance per page
 * - React NEVER calls MapLibre directly
 * - Style loads ONCE at initialization
 * - setStyle() is FORBIDDEN after construction
 * - Theme changes require RECREATING MapShell, not mutating
 *
 * This is the ONLY file that may create a maplibregl.Map instance.
 */

import maplibregl from 'maplibre-gl';

export interface MapShellOptions {
  style: string | maplibregl.StyleSpecification;
  center: [number, number];
  zoom: number;
  minZoom?: number;
  maxZoom?: number;
}

export type MapShellState = 'uninitialized' | 'initializing' | 'ready' | 'destroyed';

/**
 * MapShell - Single map owner
 *
 * Responsibilities:
 * - Create MapLibre instance
 * - Load base style once
 * - Expose controlled access to map instance
 *
 * Must NOT:
 * - Know about modes
 * - Know about H3
 * - Handle clicks
 * - Load layers
 */
export class MapShell {
  private map: maplibregl.Map | null = null;
  private state: MapShellState = 'uninitialized';
  private readyCallbacks: (() => void)[] = [];
  private container: HTMLElement | null = null;

  constructor(container: HTMLElement, options: MapShellOptions) {
    this.container = container;
    this.state = 'initializing';

    this.map = new maplibregl.Map({
      container,
      style: options.style,
      center: options.center,
      zoom: options.zoom,
      minZoom: options.minZoom ?? 0,
      maxZoom: options.maxZoom ?? 22,
      // Disable rotation for simplicity in planning/ops contexts
      dragRotate: false,
      pitchWithRotate: false,
    });

    this.map.on('load', () => {
      this.state = 'ready';
      this.flushReadyCallbacks();
    });

    this.map.on('error', (e) => {
      console.error('[MapShell] Map error:', e.error);
    });
  }

  /**
   * Get the map instance
   * Returns null if not ready or destroyed
   */
  getMap(): maplibregl.Map | null {
    if (this.state !== 'ready') {
      return null;
    }
    return this.map;
  }

  /**
   * Get current state
   */
  getState(): MapShellState {
    return this.state;
  }

  /**
   * Check if map is ready
   */
  isReady(): boolean {
    return this.state === 'ready';
  }

  /**
   * Register callback for when map is ready
   * If already ready, calls immediately
   */
  onReady(callback: () => void): void {
    if (this.state === 'ready') {
      callback();
    } else if (this.state !== 'destroyed') {
      this.readyCallbacks.push(callback);
    }
  }

  /**
   * Get label anchor layer ID for insertion order
   * All custom layers should be inserted BELOW labels
   */
  getLabelAnchor(): string | undefined {
    if (!this.map || this.state !== 'ready') {
      return undefined;
    }

    const style = this.map.getStyle();
    if (!style?.layers) {
      return undefined;
    }

    // Find first label layer (typically road labels, place labels, etc.)
    const labelLayer = style.layers.find(
      (layer) =>
        layer.type === 'symbol' &&
        (layer.id.includes('label') ||
          layer.id.includes('place') ||
          layer.id.includes('poi'))
    );

    return labelLayer?.id;
  }

  /**
   * Safely resize the map
   * Call when container dimensions change
   */
  resize(): void {
    if (this.map && this.state === 'ready') {
      this.map.resize();
    }
  }

  /**
   * Fly to a location
   */
  flyTo(options: maplibregl.FlyToOptions): void {
    if (this.map && this.state === 'ready') {
      this.map.flyTo(options);
    }
  }

  /**
   * Fit bounds
   */
  fitBounds(
    bounds: maplibregl.LngLatBoundsLike,
    options?: maplibregl.FitBoundsOptions
  ): void {
    if (this.map && this.state === 'ready') {
      this.map.fitBounds(bounds, options);
    }
  }

  /**
   * Destroy the map instance
   * Call when unmounting the component
   */
  destroy(): void {
    if (this.state === 'destroyed') {
      return;
    }

    this.state = 'destroyed';
    this.readyCallbacks = [];

    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    this.container = null;
    console.log('[MapShell] Destroyed');
  }

  /**
   * Flush pending ready callbacks
   */
  private flushReadyCallbacks(): void {
    const callbacks = [...this.readyCallbacks];
    this.readyCallbacks = [];

    callbacks.forEach((cb) => {
      try {
        cb();
      } catch (error) {
        console.error('[MapShell] Error in ready callback:', error);
      }
    });
  }
}
