/**
 * WarehouseLayer.ts — Warehouse symbol layer.
 */

import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl';
import { LayerAdapter } from './LayerAdapter';
import { mapTokens } from '../tokens/mapTokens';

export interface WarehouseData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  capacity: number;
  utilization: number; // 0–1
}

export class WarehouseLayer extends LayerAdapter<WarehouseData[]> {
  private circleLayerId: string;
  private labelLayerId: string;

  constructor() {
    super('warehouse-source');
    this.circleLayerId = 'warehouse-circles';
    this.labelLayerId = 'warehouse-labels';
  }

  protected onAttach(map: MapLibreMap): void {
    map.addSource(this.sourceId, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    map.addLayer({
      id: this.circleLayerId,
      type: 'circle',
      source: this.sourceId,
      paint: {
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          8, 5,
          12, 9,
          16, 13,
        ],
        'circle-color': mapTokens.warehouse,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1.5,
        'circle-opacity': 0.85,
      },
    });

    map.addLayer({
      id: this.labelLayerId,
      type: 'symbol',
      source: this.sourceId,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Open Sans Regular'],
        'text-size': 12,
        'text-offset': [0, 1.8],
        'text-anchor': 'top',
        'text-allow-overlap': false,
      },
      paint: {
        'text-color': mapTokens.labelPrimary,
        'text-halo-color': mapTokens.background,
        'text-halo-width': 1,
      },
      minzoom: 10,
    });

    this.layerIds = [this.circleLayerId, this.labelLayerId];
  }

  update(warehouses: WarehouseData[]): void {
    if (!this.map || !this.attached) return;

    const source = this.map.getSource(this.sourceId) as GeoJSONSource;
    if (!source) return;

    const features: GeoJSON.Feature[] = warehouses.map((w) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [w.lng, w.lat] },
      properties: {
        id: w.id,
        name: w.name,
        capacity: w.capacity,
        utilization: w.utilization,
      },
    }));

    source.setData({ type: 'FeatureCollection', features });
  }
}
