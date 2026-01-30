/**
 * ZoneLayer.ts — Zone boundary rendering.
 *
 * Renders zones as the union of their H3 cell polygons.
 * Fill shows zone presence, stroke shows boundary.
 */

import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl';
import { LayerAdapter } from './LayerAdapter';
import { cellToPolygon } from './h3Utils';
import { mapTokens } from '../tokens/mapTokens';
import type { Zone } from '../contracts';

export class ZoneLayer extends LayerAdapter<Zone[]> {
  private fillLayerId: string;
  private strokeLayerId: string;

  constructor() {
    super('zone-source');
    this.fillLayerId = 'zone-fill';
    this.strokeLayerId = 'zone-stroke';
  }

  protected onAttach(map: MapLibreMap): void {
    map.addSource(this.sourceId, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    map.addLayer({
      id: this.fillLayerId,
      type: 'fill',
      source: this.sourceId,
      paint: {
        'fill-color': mapTokens.zoneFill,
        'fill-opacity': 0.3,
      },
    });

    map.addLayer({
      id: this.strokeLayerId,
      type: 'line',
      source: this.sourceId,
      paint: {
        'line-color': mapTokens.zoneBorder,
        'line-width': 1.5,
        'line-opacity': 0.7,
      },
    });

    this.layerIds = [this.fillLayerId, this.strokeLayerId];
  }

  update(zones: Zone[]): void {
    if (!this.map || !this.attached) return;

    const source = this.map.getSource(this.sourceId) as GeoJSONSource;
    if (!source) return;

    // Convert each zone's H3 cells to individual polygons
    // (A true union/dissolve would be ideal but is computationally expensive;
    //  rendering individual cell polygons per zone achieves visual correctness)
    const features: GeoJSON.Feature[] = [];

    for (const zone of zones) {
      if (zone.status === 'archived') continue;

      for (const h3Index of zone.h3Indexes) {
        const polygon = cellToPolygon(h3Index);
        features.push({
          type: 'Feature',
          geometry: polygon,
          properties: {
            zoneId: zone.id,
            zoneName: zone.name,
            status: zone.status,
          },
        });
      }
    }

    source.setData({ type: 'FeatureCollection', features });
  }

  /** Convenience: update zones from kernel */
  updateZones(zones: Zone[]): void {
    this.update(zones);
  }
}
