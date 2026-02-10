/**
 * ZoneMarkerLayer - Renders operational zone center markers on the live map
 * Zones only have region_center (point), rendered as labeled markers
 */

import type maplibregl from 'maplibre-gl';
import { BaseLayer } from './BaseLayer';
import type { MapFeatureCollection } from '@/types/live-map';

export interface ZoneMarkerProperties {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
}

const LAYER_ID = 'zone-markers';
const SOURCE_ID = 'zone-markers-source';

export class ZoneMarkerLayer extends BaseLayer<MapFeatureCollection<ZoneMarkerProperties>> {
  get layerId(): string {
    return LAYER_ID;
  }

  protected createLayers(): void {
    if (!this.map) return;

    this.map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    // Large translucent circle to represent zone area
    this.map.addLayer({
      id: `${LAYER_ID}-area`,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 16, 12, 28, 16, 40],
        'circle-color': '#f59e0b', // amber-500
        'circle-opacity': 0.12,
        'circle-stroke-color': '#f59e0b',
        'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 8, 1, 12, 2, 16, 2.5],
        'circle-stroke-opacity': 0.5,
      },
    });

    // Center dot
    this.map.addLayer({
      id: LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 4, 12, 6, 16, 8],
        'circle-color': '#f59e0b',
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2,
      },
    });

    // Zone name labels
    this.map.addLayer({
      id: `${LAYER_ID}-labels`,
      type: 'symbol',
      source: SOURCE_ID,
      minzoom: 9,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Open Sans Bold'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 9, 11, 14, 14],
        'text-offset': [0, 2],
        'text-anchor': 'top',
        'text-max-width': 14,
      },
      paint: {
        'text-color': '#92400e',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.5,
      },
    });

    this.map.on('click', LAYER_ID, this.handleClick.bind(this));
    this.map.on('mouseenter', LAYER_ID, () => {
      if (this.map) this.map.getCanvas().style.cursor = 'pointer';
    });
    this.map.on('mouseleave', LAYER_ID, () => {
      if (this.map) this.map.getCanvas().style.cursor = '';
    });
  }

  protected updateData(data: MapFeatureCollection<ZoneMarkerProperties>): void {
    if (!this.map) return;
    const source = this.map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(data);
    }
  }

  protected removeLayers(): void {
    if (!this.map) return;

    this.map.off('click', LAYER_ID, this.handleClick.bind(this));

    for (const id of [`${LAYER_ID}-labels`, LAYER_ID, `${LAYER_ID}-area`]) {
      if (this.map.getLayer(id)) this.map.removeLayer(id);
    }
    if (this.map.getSource(SOURCE_ID)) this.map.removeSource(SOURCE_ID);
  }

  protected updateVisibility(visible: boolean): void {
    if (!this.map) return;
    const v = visible ? 'visible' : 'none';
    for (const id of [`${LAYER_ID}-area`, LAYER_ID, `${LAYER_ID}-labels`]) {
      if (this.map.getLayer(id)) this.map.setLayoutProperty(id, 'visibility', v);
    }
  }

  private handleClick(e: maplibregl.MapMouseEvent): void {
    if (!e.features || e.features.length === 0) return;
    const feature = e.features[0];
    if (feature.properties?.id) {
      window.dispatchEvent(
        new CustomEvent('zone-marker-click', {
          detail: { zoneId: feature.properties.id, properties: feature.properties },
        })
      );
    }
  }
}
