/**
 * MapEngine.ts
 *
 * Engine-agnostic map wrapper for MapLibre GL JS
 * Provides state management, error handling, and lifecycle management
 */

import maplibregl, { Map as MapLibreMap, MapOptions } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapStateMachine, MapState, MapStateEvent } from './MapState';
import { MAPLIBRE_CONFIG } from '@/lib/mapDesignSystem';

/**
 * Map Engine Configuration
 */
export interface MapEngineConfig {
  container: HTMLElement | string;
  style?: string;
  center?: [number, number];
  zoom?: number;
  pitch?: number;
  bearing?: number;
  maxZoom?: number;
  minZoom?: number;
  antialias?: boolean;
  preserveDrawingBuffer?: boolean;
}

/**
 * Map Engine Options
 */
export interface MapEngineOptions extends MapEngineConfig {
  onStateChange?: (state: MapState) => void;
  onError?: (error: Error) => void;
}

/**
 * MapEngine Class
 * Wraps MapLibre GL JS with state management and error handling
 */
export class MapEngine {
  private map: MapLibreMap | null = null;
  private stateMachine: MapStateMachine;
  private config: MapEngineConfig;
  private errorHandler?: (error: Error) => void;
  private tileLoadTimeout?: NodeJS.Timeout;

  constructor(options: MapEngineOptions) {
    const { onStateChange, onError, ...config } = options;

    this.config = {
      style: MAPLIBRE_CONFIG.tiles.style,
      center: [8.5, 12.0], // Nigeria center
      zoom: 6,
      pitch: 0,
      bearing: 0,
      maxZoom: MAPLIBRE_CONFIG.tiles.maxZoom,
      minZoom: 3,
      antialias: MAPLIBRE_CONFIG.tiles.antialias,
      preserveDrawingBuffer: MAPLIBRE_CONFIG.tiles.preserveDrawingBuffer,
      ...config,
    };

    this.errorHandler = onError;
    this.stateMachine = new MapStateMachine();

    // Subscribe to state changes
    if (onStateChange) {
      this.stateMachine.onStateChange((transition) => {
        onStateChange(transition.to);
      });
    }

    // Start initialization
    this.initialize();
  }

  /**
   * Initialize the map
   */
  private async initialize(): Promise<void> {
    try {
      this.stateMachine.transition(MapStateEvent.INIT_START);

      // Create MapLibre instance
      const mapOptions: MapOptions = {
        container: this.config.container as string | HTMLElement,
        style: this.config.style!,
        center: this.config.center,
        zoom: this.config.zoom,
        pitch: this.config.pitch,
        bearing: this.config.bearing,
        maxZoom: this.config.maxZoom,
        minZoom: this.config.minZoom,
        antialias: this.config.antialias,
        preserveDrawingBuffer: this.config.preserveDrawingBuffer,
      };

      this.map = new maplibregl.Map(mapOptions);

      // Add map controls
      this.map.addControl(new maplibregl.NavigationControl(), 'top-right');
      this.map.addControl(new maplibregl.ScaleControl(), 'bottom-left');

      // Setup event handlers
      this.setupEventHandlers();

      // Wait for map to load
      await new Promise<void>((resolve, reject) => {
        this.map!.once('load', () => resolve());
        this.map!.once('error', (e) => reject(e.error));

        // Timeout after 10 seconds
        setTimeout(() => reject(new Error('Map load timeout')), 10000);
      });

      // Map loaded successfully
      this.stateMachine.transition(MapStateEvent.INIT_SUCCESS);
    } catch (error) {
      console.error('[MapEngine] Initialization failed:', error);
      this.stateMachine.transition(MapStateEvent.INIT_ERROR);

      if (this.errorHandler) {
        this.errorHandler(error as Error);
      }
    }
  }

  /**
   * Setup map event handlers
   */
  private setupEventHandlers(): void {
    if (!this.map) return;

    // Error handling
    this.map.on('error', (e) => {
      console.error('[MapEngine] Runtime error:', e.error);
      this.stateMachine.transition(MapStateEvent.RUNTIME_ERROR);

      if (this.errorHandler) {
        this.errorHandler(e.error);
      }
    });

    // Tile loading monitoring
    this.map.on('dataloading', () => {
      // Reset degradation timeout on new data loading
      if (this.tileLoadTimeout) {
        clearTimeout(this.tileLoadTimeout);
      }

      // Set timeout for tile loading (5 seconds)
      this.tileLoadTimeout = setTimeout(() => {
        if (this.stateMachine.getState() === MapState.READY) {
          this.stateMachine.transition(MapStateEvent.TILES_DEGRADED);
        }
      }, 5000);
    });

    this.map.on('data', (e) => {
      // Clear timeout on successful data load
      if (e.dataType === 'source' && e.isSourceLoaded) {
        if (this.tileLoadTimeout) {
          clearTimeout(this.tileLoadTimeout);
        }

        // Recover from degraded state if currently degraded
        if (this.stateMachine.getState() === MapState.DEGRADED) {
          this.stateMachine.transition(MapStateEvent.TILES_RECOVERED);
        }
      }
    });

    // Network monitoring
    window.addEventListener('online', () => {
      if (this.stateMachine.getState() === MapState.OFFLINE) {
        this.stateMachine.transition(MapStateEvent.NETWORK_ONLINE);
      }
    });

    window.addEventListener('offline', () => {
      this.stateMachine.transition(MapStateEvent.NETWORK_OFFLINE);
    });
  }

  /**
   * Get the underlying MapLibre instance
   * IMPORTANT: This should be used sparingly - prefer using MapEngine methods
   */
  getMap(): MapLibreMap | null {
    return this.map;
  }

  /**
   * Get current map state
   */
  getState(): MapState {
    return this.stateMachine.getState();
  }

  /**
   * Check if map is ready for operations
   */
  isReady(): boolean {
    return this.stateMachine.isOperational() && this.map !== null;
  }

  /**
   * Resize the map (call after container resize)
   */
  resize(): void {
    if (this.map) {
      this.map.resize();
    }
  }

  /**
   * Fly to a location
   */
  flyTo(options: {
    center: [number, number];
    zoom?: number;
    pitch?: number;
    bearing?: number;
    duration?: number;
  }): void {
    if (!this.isReady()) {
      console.warn('[MapEngine] Map not ready for flyTo operation');
      return;
    }

    this.map!.flyTo({
      center: options.center,
      zoom: options.zoom ?? this.map!.getZoom(),
      pitch: options.pitch ?? this.map!.getPitch(),
      bearing: options.bearing ?? this.map!.getBearing(),
      duration: options.duration ?? 1000,
      essential: true,
    });
  }

  /**
   * Fit bounds to show all features
   */
  fitBounds(
    bounds: [[number, number], [number, number]],
    options?: {
      padding?: number;
      maxZoom?: number;
      duration?: number;
    }
  ): void {
    if (!this.isReady()) {
      console.warn('[MapEngine] Map not ready for fitBounds operation');
      return;
    }

    this.map!.fitBounds(bounds, {
      padding: options?.padding ?? 50,
      maxZoom: options?.maxZoom ?? 15,
      duration: options?.duration ?? 1000,
    });
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(callback: (state: MapState) => void): () => void {
    return this.stateMachine.onStateChange((transition) => {
      callback(transition.to);
    });
  }

  /**
   * Reset the map
   */
  reset(): void {
    this.stateMachine.reset();
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.initialize();
  }

  /**
   * Destroy the map and cleanup
   */
  destroy(): void {
    if (this.tileLoadTimeout) {
      clearTimeout(this.tileLoadTimeout);
    }

    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    console.log('[MapEngine] Destroyed');
  }
}

/**
 * Export MapLibre types for convenience
 */
export type { Map as MapLibreMap } from 'maplibre-gl';
export { MapState, MapStateEvent };
