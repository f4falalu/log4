/**
 * BaseLayer - Abstract base class for all map layers
 *
 * Design principles:
 * - Simple attach/detach lifecycle
 * - Guards against updates when not attached
 * - Deterministic rendering (same data → same output)
 * - No layer interdependencies
 */

import type maplibregl from 'maplibre-gl';
import type { LayerOptions } from '../core/types';

export abstract class BaseLayer<TData = any> {
  protected map: maplibregl.Map | null = null;
  protected attached = false;
  protected options: LayerOptions;

  constructor(options: LayerOptions = {}) {
    this.options = {
      visible: true,
      interactive: true,
      ...options,
    };
  }

  /**
   * Unique layer ID - must be implemented by subclasses
   */
  abstract get layerId(): string;

  /**
   * Attach layer to the map
   */
  attach(map: maplibregl.Map): void {
    if (this.attached) {
      console.warn(`Layer ${this.layerId} is already attached`);
      return;
    }

    this.map = map;
    this.createLayers();
    this.attached = true;

    if (!this.options.visible) {
      this.setVisibility(false);
    }
  }

  /**
   * Detach layer from the map
   */
  detach(): void {
    if (!this.attached || !this.map) {
      return;
    }

    this.removeLayers();
    this.map = null;
    this.attached = false;
  }

  /**
   * Update layer data
   * Guards against updates when not attached
   */
  update(data: TData): void {
    if (!this.attached || !this.map) {
      console.warn(`Cannot update layer ${this.layerId}: not attached`);
      return;
    }

    this.updateData(data);
  }

  /**
   * Set layer visibility
   */
  setVisibility(visible: boolean): void {
    this.options.visible = visible;
    if (this.attached && this.map) {
      this.updateVisibility(visible);
    }
  }

  /**
   * Check if layer is visible
   */
  isVisible(): boolean {
    return this.options.visible ?? true;
  }

  /**
   * Check if layer is attached
   */
  isAttached(): boolean {
    return this.attached;
  }

  /**
   * Create MapLibre layers - implemented by subclasses
   */
  protected abstract createLayers(): void;

  /**
   * Update layer data - implemented by subclasses
   */
  protected abstract updateData(data: TData): void;

  /**
   * Remove MapLibre layers - implemented by subclasses
   */
  protected abstract removeLayers(): void;

  /**
   * Update layer visibility - implemented by subclasses
   */
  protected abstract updateVisibility(visible: boolean): void;
}
