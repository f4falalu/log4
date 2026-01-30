/**
 * FacilityLayer.ts — Static facility symbol layer.
 */

import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl';
import { LayerAdapter } from './LayerAdapter';
import { mapTokens } from '../tokens/mapTokens';

export interface FacilityData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'depot' | 'hub' | 'station' | 'clinic';
}

export class FacilityLayer extends LayerAdapter<FacilityData[]> {
  private circleLayerId: string;
  private labelLayerId: string;

  constructor() {
    super('facility-source');
    this.circleLayerId = 'facility-circles';
    this.labelLayerId = 'facility-labels';
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
          8, 3,
          12, 6,
          16, 9,
        ],
        'circle-color': mapTokens.facility,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1,
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
        'text-size': 11,
        'text-offset': [0, 1.5],
        'text-anchor': 'top',
        'text-allow-overlap': false,
      },
      paint: {
        'text-color': mapTokens.labelPrimary,
        'text-halo-color': mapTokens.background,
        'text-halo-width': 1,
      },
      minzoom: 11,
    });

    this.layerIds = [this.circleLayerId, this.labelLayerId];
  }

  update(facilities: FacilityData[]): void {
    if (!this.map || !this.attached) return;

    const source = this.map.getSource(this.sourceId) as GeoJSONSource;
    if (!source) return;

    const features: GeoJSON.Feature[] = facilities.map((f) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [f.lng, f.lat] },
      properties: { id: f.id, name: f.name, type: f.type },
    }));

    source.setData({ type: 'FeatureCollection', features });
  }
}
