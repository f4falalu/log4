/**
 * LayerAdapter.ts — Abstract base for all map layers.
 *
 * Contract:
 * - attach() once when map is ready
 * - update(data) on every data change (deterministic, stateless)
 * - detach() on cleanup
 *
 * Layers are pure: data-in → render-out.
 * No layer knows about UI state.
 */

import type { Map as MapLibreMap } from 'maplibre-gl';

export abstract class LayerAdapter<TData = unknown> {
  protected map: MapLibreMap | null = null;
  protected sourceId: string;
  protected layerIds: string[] = [];
  protected attached = false;

  constructor(sourceId: string) {
    this.sourceId = sourceId;
  }

  /**
   * Mount source and layers to map. Called once.
   */
  attach(map: MapLibreMap): void {
    if (this.attached) return;
    this.map = map;
    this.attached = true;
    this.onAttach(map);
  }

  /**
   * Update layer data without removing/re-adding layers.
   */
  abstract update(data: TData): void;

  /**
   * Remove from map and clean up.
   */
  detach(): void {
    if (!this.attached || !this.map) return;

    // Remove layers first
    for (const layerId of this.layerIds) {
      if (this.map.getLayer(layerId)) {
        this.map.removeLayer(layerId);
      }
    }

    // Remove source
    if (this.map.getSource(this.sourceId)) {
      this.map.removeSource(this.sourceId);
    }

    this.attached = false;
    this.map = null;
    this.layerIds = [];
  }

  /**
   * Show/hide the layer.
   */
  setVisible(visible: boolean): void {
    if (!this.map) return;
    const visibility = visible ? 'visible' : 'none';
    for (const layerId of this.layerIds) {
      if (this.map.getLayer(layerId)) {
        this.map.setLayoutProperty(layerId, 'visibility', visibility);
      }
    }
  }

  /**
   * Check if layer is currently attached.
   */
  isAttached(): boolean {
    return this.attached;
  }

  /**
   * Subclass implements actual MapLibre source/layer creation.
   */
  protected abstract onAttach(map: MapLibreMap): void;
}
