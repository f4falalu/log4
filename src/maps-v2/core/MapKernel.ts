/**
 * MapKernel.ts — Single owner of the MapLibre runtime.
 *
 * Axioms:
 * - Owns exactly ONE MapLibre instance per lifecycle
 * - React NEVER calls MapLibre directly
 * - Style loads ONCE per mode (no setStyle after init)
 * - setMode() destroys and recreates the map
 * - Layers are deterministic: data-in → render-out
 */

import maplibregl from 'maplibre-gl';
import type { MapMode, InteractionState } from './types';
import { InteractionController } from './InteractionController';
import { getModePolicy } from './ModePolicy';
import { getStyleForMode } from '../styles/operational.style';
import type { Zone, ZoneTag } from '../contracts';
import type { LayerAdapter } from '../layers/LayerAdapter';

export interface MapKernelEvents {
  onReady?: () => void;
  onModeChange?: (mode: MapMode) => void;
  onInteractionChange?: (state: InteractionState) => void;
  onCellClick?: (h3Index: string) => void;
  onCellHover?: (h3Index: string | null) => void;
  onZoneClick?: (zoneId: string) => void;
  onError?: (error: Error) => void;
}

export class MapKernel {
  private map: maplibregl.Map | null = null;
  private container: HTMLElement | null = null;
  private currentMode: MapMode = 'operational';
  private interactionController: InteractionController;
  private layers = new Map<string, LayerAdapter>();
  private events: MapKernelEvents;
  private destroyed = false;
  private styleLoaded = false;

  constructor(events?: MapKernelEvents) {
    this.events = events ?? {};
    this.interactionController = new InteractionController();

    this.interactionController.subscribe((event) => {
      this.events.onInteractionChange?.(event.to);
    });
  }

  /**
   * Initialize the map in the given container.
   * Loads the basemap style for the current mode.
   */
  init(container: HTMLElement): void {
    if (this.destroyed) return;
    this.container = container;
    this.createMap();
  }

  /**
   * Destroy the kernel and release all resources.
   */
  destroy(): void {
    this.destroyed = true;
    this.detachAllLayers();
    this.interactionController.destroy();
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.container = null;
  }

  /**
   * Switch map mode. Destroys and recreates the map with new style.
   */
  setMode(mode: MapMode): void {
    if (this.destroyed) return;
    if (mode === this.currentMode && this.map) return;

    this.currentMode = mode;
    this.interactionController.setMode(mode);

    // Destroy current map and recreate with new style
    this.styleLoaded = false;
    this.detachAllLayers();
    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    this.createMap();
    this.events.onModeChange?.(mode);
  }

  /**
   * Push zone data to all layers that consume it.
   */
  updateZones(zones: Zone[]): void {
    if (!this.map) return;
    // Layers that need zone data will be updated via their update() method
    // The H3HexagonLayer and ZoneLayer consume this data
    this.layers.forEach((layer) => {
      if ('updateZones' in layer && typeof (layer as any).updateZones === 'function') {
        (layer as any).updateZones(zones);
      }
    });
  }

  /**
   * Push zone tag data to layers.
   */
  updateZoneTags(tags: ZoneTag[]): void {
    if (!this.map) return;
    this.layers.forEach((layer) => {
      if ('updateZoneTags' in layer && typeof (layer as any).updateZoneTags === 'function') {
        (layer as any).updateZoneTags(tags);
      }
    });
  }

  /**
   * Set the interaction state.
   */
  setInteractionState(state: InteractionState): void {
    this.interactionController.transition(state);
  }

  /**
   * Focus the map on a set of H3 cells.
   */
  focusOnH3(h3Indexes: string[]): void {
    if (!this.map || h3Indexes.length === 0) return;
    // Import h3Utils dynamically to avoid circular deps
    import('../layers/h3Utils').then(({ getCellBounds }) => {
      const bounds = getCellBounds(h3Indexes);
      if (bounds) {
        this.map!.fitBounds(bounds, { padding: 50, maxZoom: 14 });
      }
    });
  }

  /**
   * Get the raw MapLibre instance (for layer attachment only).
   */
  getMap(): maplibregl.Map | null {
    return this.map;
  }

  /**
   * Get the interaction controller.
   */
  getInteractionController(): InteractionController {
    return this.interactionController;
  }

  /**
   * Get current mode.
   */
  getMode(): MapMode {
    return this.currentMode;
  }

  /**
   * Check if the map style is fully loaded and ready for layers.
   */
  isReady(): boolean {
    return this.styleLoaded && this.map !== null;
  }

  /**
   * Register a layer. Will be attached when map is ready.
   */
  registerLayer(id: string, layer: LayerAdapter): void {
    this.layers.set(id, layer);
    if (this.map && this.styleLoaded) {
      const policy = getModePolicy(this.currentMode);
      if (policy.layerIds.includes(id)) {
        layer.attach(this.map);
      }
    }
  }

  /**
   * Remove a layer.
   */
  removeLayer(id: string): void {
    const layer = this.layers.get(id);
    if (layer) {
      layer.detach();
      this.layers.delete(id);
    }
  }

  /**
   * Fly to a location.
   */
  flyTo(center: [number, number], zoom?: number): void {
    if (!this.map) return;
    this.map.flyTo({ center, zoom: zoom ?? this.map.getZoom() });
  }

  private createMap(): void {
    if (!this.container || this.destroyed) return;

    const style = getStyleForMode(this.currentMode);

    this.map = new maplibregl.Map({
      container: this.container,
      style,
      center: [8.5167, 12.0], // Kano, Nigeria
      zoom: 11,
      minZoom: 3,
      maxZoom: 18,
      dragRotate: false,
      pitchWithRotate: false,
      attributionControl: false,
    });

    this.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    this.map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right');

    this.map.on('load', () => {
      this.styleLoaded = true;
      this.attachAllLayers();
      this.events.onReady?.();
    });

    this.map.on('error', (e) => {
      this.events.onError?.(new Error(e.error?.message ?? 'Map error'));
    });
  }

  private attachAllLayers(): void {
    if (!this.map) return;
    const policy = getModePolicy(this.currentMode);

    this.layers.forEach((layer, id) => {
      if (policy.layerIds.includes(id)) {
        layer.attach(this.map!);
      }
    });
  }

  private detachAllLayers(): void {
    this.layers.forEach((layer) => {
      layer.detach();
    });
  }
}
