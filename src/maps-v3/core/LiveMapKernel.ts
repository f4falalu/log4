/**
 * LiveMapKernel - Single owner of the MapLibre instance
 *
 * Design Principles:
 * 1. Single Owner: One MapLibre instance per kernel lifecycle
 * 2. No setStyle: Load style once at initialization
 * 3. Layer Isolation: Layers don't know about each other
 * 4. Deterministic Updates: Same data always produces same render
 * 5. Proper Cleanup: All layers detach on kernel destroy
 */

import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { BaseLayer } from '../layers/BaseLayer';
import { getBasemapStyle } from '../styles/basemap';
import type { MapKernelEvents, MapOptions } from './types';

export class LiveMapKernel {
  private map: maplibregl.Map | null = null;
  private layers = new Map<string, BaseLayer>();
  private events: MapKernelEvents;
  private destroyed = false;
  private styleLoaded = false;

  constructor(events?: MapKernelEvents) {
    this.events = events ?? {};
  }

  /**
   * Initialize the map in the given container
   */
  init(options: MapOptions): void {
    if (this.destroyed) {
      console.error('Cannot initialize a destroyed kernel');
      return;
    }

    if (this.map) {
      console.warn('Kernel already initialized');
      return;
    }

    const {
      container,
      center = [8.5167, 12.0], // Kano, Nigeria
      zoom = 11,
      minZoom = 3,
      maxZoom = 18,
    } = options;

    this.map = new maplibregl.Map({
      container,
      style: getBasemapStyle(),
      center,
      zoom,
      minZoom,
      maxZoom,
      dragRotate: false,
      pitchWithRotate: false,
      attributionControl: false,
    });

    // Add controls
    this.map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      'top-right'
    );
    this.map.addControl(
      new maplibregl.ScaleControl({ unit: 'metric' }),
      'bottom-right'
    );

    // Handle map load event
    this.map.on('load', () => {
      this.styleLoaded = true;
      this.attachAllLayers();
      this.events.onReady?.();
    });

    // Handle errors
    this.map.on('error', (e) => {
      const error = new Error(e.error?.message ?? 'Map error');
      console.error('Map error:', error);
      this.events.onError?.(error);
    });
  }

  /**
   * Register a layer with the kernel
   * Will be attached when map is ready
   */
  registerLayer(id: string, layer: BaseLayer): void {
    if (this.layers.has(id)) {
      console.warn(`Layer ${id} is already registered`);
      return;
    }

    this.layers.set(id, layer);

    // Attach immediately if map is already loaded
    if (this.map && this.styleLoaded) {
      layer.attach(this.map);
    }
  }

  /**
   * Remove a layer from the kernel
   */
  removeLayer(id: string): void {
    const layer = this.layers.get(id);
    if (layer) {
      layer.detach();
      this.layers.delete(id);
    }
  }

  /**
   * Get a registered layer by ID
   */
  getLayer(id: string): BaseLayer | undefined {
    return this.layers.get(id);
  }

  /**
   * Fly to a location
   */
  flyTo(center: [number, number], zoom?: number): void {
    if (!this.map) {
      console.warn('Cannot fly to location: map not initialized');
      return;
    }

    this.map.flyTo({
      center,
      zoom: zoom ?? this.map.getZoom(),
      duration: 1500,
    });
  }

  /**
   * Fit bounds to show all features
   */
  fitBounds(
    bounds: [[number, number], [number, number]],
    options?: { padding?: number; maxZoom?: number }
  ): void {
    if (!this.map) {
      console.warn('Cannot fit bounds: map not initialized');
      return;
    }

    this.map.fitBounds(bounds, {
      padding: options?.padding ?? 50,
      maxZoom: options?.maxZoom ?? 15,
      duration: 1500,
    });
  }

  /**
   * Get the raw MapLibre instance
   * Use with caution - prefer using kernel methods
   */
  getMap(): maplibregl.Map | null {
    return this.map;
  }

  /**
   * Check if the map is ready
   */
  isReady(): boolean {
    return this.styleLoaded && this.map !== null;
  }

  /**
   * Destroy the kernel and release all resources
   */
  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.detachAllLayers();

    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    this.layers.clear();
    this.styleLoaded = false;
  }

  /**
   * Attach all registered layers to the map
   */
  private attachAllLayers(): void {
    if (!this.map) return;

    this.layers.forEach((layer) => {
      try {
        layer.attach(this.map!);
      } catch (error) {
        console.error(`Failed to attach layer ${layer.layerId}:`, error);
      }
    });
  }

  /**
   * Detach all layers from the map
   */
  private detachAllLayers(): void {
    this.layers.forEach((layer) => {
      try {
        layer.detach();
      } catch (error) {
        console.error(`Failed to detach layer ${layer.layerId}:`, error);
      }
    });
  }
}
