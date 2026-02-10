/**
 * WarehouseMarkerLayer - Renders warehouse markers on the live map
 * Shows warehouses as distinct square-ish markers
 */

import type maplibregl from 'maplibre-gl';
import { BaseLayer } from './BaseLayer';
import type { MapFeatureCollection } from '@/types/live-map';

export interface WarehouseMarkerProperties {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

const LAYER_ID = 'warehouse-markers';
const SOURCE_ID = 'warehouse-markers-source';

export class WarehouseMarkerLayer extends BaseLayer<MapFeatureCollection<WarehouseMarkerProperties>> {
  get layerId(): string {
    return LAYER_ID;
  }

  protected createLayers(): void {
    if (!this.map) return;

    this.map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    // Outer ring (larger, square-like feel via larger radius)
    this.map.addLayer({
      id: `${LAYER_ID}-ring`,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 6, 12, 10, 16, 14],
        'circle-color': '#8b5cf6', // violet-500
        'circle-stroke-color': '#7c3aed', // violet-600
        'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 8, 2, 12, 3, 16, 4],
        'circle-opacity': 0.85,
        'circle-stroke-opacity': 0.9,
      },
    });

    // Inner fill
    this.map.addLayer({
      id: LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 4, 12, 7, 16, 10],
        'circle-color': '#8b5cf6',
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1.5,
      },
    });

    // Name labels
    this.map.addLayer({
      id: `${LAYER_ID}-labels`,
      type: 'symbol',
      source: SOURCE_ID,
      minzoom: 10,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Open Sans Bold'],
        'text-size': 11,
        'text-offset': [0, 1.6],
        'text-anchor': 'top',
        'text-max-width': 12,
      },
      paint: {
        'text-color': '#5b21b6',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1,
      },
    });

    // Click handler
    this.map.on('click', LAYER_ID, this.handleClick.bind(this));
    this.map.on('mouseenter', LAYER_ID, () => {
      if (this.map) this.map.getCanvas().style.cursor = 'pointer';
    });
    this.map.on('mouseleave', LAYER_ID, () => {
      if (this.map) this.map.getCanvas().style.cursor = '';
    });
  }

  protected updateData(data: MapFeatureCollection<WarehouseMarkerProperties>): void {
    if (!this.map) return;
    const source = this.map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(data);
    }
  }

  protected removeLayers(): void {
    if (!this.map) return;

    this.map.off('click', LAYER_ID, this.handleClick.bind(this));

    for (const id of [`${LAYER_ID}-labels`, LAYER_ID, `${LAYER_ID}-ring`]) {
      if (this.map.getLayer(id)) this.map.removeLayer(id);
    }
    if (this.map.getSource(SOURCE_ID)) this.map.removeSource(SOURCE_ID);
  }

  protected updateVisibility(visible: boolean): void {
    if (!this.map) return;
    const v = visible ? 'visible' : 'none';
    for (const id of [`${LAYER_ID}-ring`, LAYER_ID, `${LAYER_ID}-labels`]) {
      if (this.map.getLayer(id)) this.map.setLayoutProperty(id, 'visibility', v);
    }
  }

  private handleClick(e: maplibregl.MapMouseEvent): void {
    if (!e.features || e.features.length === 0) return;
    const feature = e.features[0];
    if (feature.properties?.id) {
      window.dispatchEvent(
        new CustomEvent('warehouse-marker-click', {
          detail: { warehouseId: feature.properties.id, properties: feature.properties },
        })
      );
    }
  }
}
