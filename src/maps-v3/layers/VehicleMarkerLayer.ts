/**
 * VehicleMarkerLayer - Renders vehicle markers on the map
 * Shows truck icons with capacity utilization badges
 */

import type maplibregl from 'maplibre-gl';
import { BaseLayer } from './BaseLayer';
import type { MapFeatureCollection, VehicleMarkerProperties } from '@/types/live-map';

const LAYER_ID = 'vehicle-markers';
const SOURCE_ID = 'vehicle-markers-source';

export class VehicleMarkerLayer extends BaseLayer<MapFeatureCollection<VehicleMarkerProperties>> {
  private currentData: MapFeatureCollection<VehicleMarkerProperties> | null = null;

  get layerId(): string {
    return LAYER_ID;
  }

  protected createLayers(): void {
    if (!this.map) return;

    // Add source
    this.map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    });

    // Add circle layer for vehicle markers (square-ish appearance)
    this.map.addLayer({
      id: LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          8, 8,
          12, 12,
          16, 16,
        ],
        'circle-color': [
          'case',
          ['get', 'isActive'],
          '#8b5cf6', // purple for active
          '#9ca3af', // gray for inactive
        ],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2,
        'circle-opacity': 0.9,
      },
    });

    // Add icon layer (truck symbol) - rendered on top
    this.map.addLayer({
      id: `${LAYER_ID}-icons`,
      type: 'symbol',
      source: SOURCE_ID,
      layout: {
        'icon-image': 'truck-icon', // Would need to load this
        'icon-size': 0.5,
        'icon-allow-overlap': true,
      },
    });

    // Add plate number labels
    this.map.addLayer({
      id: `${LAYER_ID}-labels`,
      type: 'symbol',
      source: SOURCE_ID,
      minzoom: 13,
      layout: {
        'text-field': ['get', 'plate'],
        'text-font': ['Open Sans Bold'],
        'text-size': 10,
        'text-offset': [0, 1.8],
        'text-anchor': 'top',
        'text-transform': 'uppercase',
      },
      paint: {
        'text-color': '#374151',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1,
      },
    });

    // Add utilization badge layer
    this.map.addLayer({
      id: `${LAYER_ID}-utilization`,
      type: 'symbol',
      source: SOURCE_ID,
      minzoom: 11,
      layout: {
        'text-field': ['concat', ['to-string', ['round', ['get', 'utilization']]], '%'],
        'text-font': ['Open Sans Bold'],
        'text-size': 9,
        'text-offset': [0.8, -0.8],
        'text-anchor': 'center',
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': [
          'case',
          ['>', ['get', 'utilization'], 80],
          '#ef4444', // red when high
          ['>', ['get', 'utilization'], 50],
          '#f59e0b', // amber when medium
          '#22c55e', // green when low
        ],
        'text-halo-width': 4,
      },
    });

    // Add click handler
    this.map.on('click', LAYER_ID, this.handleClick.bind(this));

    // Add hover cursor
    this.map.on('mouseenter', LAYER_ID, () => {
      if (this.map) this.map.getCanvas().style.cursor = 'pointer';
    });
    this.map.on('mouseleave', LAYER_ID, () => {
      if (this.map) this.map.getCanvas().style.cursor = '';
    });
  }

  protected updateData(data: MapFeatureCollection<VehicleMarkerProperties>): void {
    if (!this.map) return;

    const source = this.map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(data);
      this.currentData = data;
    }
  }

  protected removeLayers(): void {
    if (!this.map) return;

    // Remove click handler
    this.map.off('click', LAYER_ID, this.handleClick.bind(this));

    // Remove layers in reverse order
    const layers = [`${LAYER_ID}-utilization`, `${LAYER_ID}-labels`, `${LAYER_ID}-icons`, LAYER_ID];
    for (const layerId of layers) {
      if (this.map.getLayer(layerId)) {
        this.map.removeLayer(layerId);
      }
    }

    // Remove source
    if (this.map.getSource(SOURCE_ID)) {
      this.map.removeSource(SOURCE_ID);
    }
  }

  protected updateVisibility(visible: boolean): void {
    if (!this.map) return;

    const visibility = visible ? 'visible' : 'none';
    const layers = [LAYER_ID, `${LAYER_ID}-icons`, `${LAYER_ID}-labels`, `${LAYER_ID}-utilization`];

    for (const layerId of layers) {
      if (this.map.getLayer(layerId)) {
        this.map.setLayoutProperty(layerId, 'visibility', visibility);
      }
    }
  }

  private handleClick(e: maplibregl.MapMouseEvent): void {
    if (!e.features || e.features.length === 0) return;

    const feature = e.features[0];
    const vehicleId = feature.properties?.id;

    if (vehicleId) {
      window.dispatchEvent(
        new CustomEvent('vehicle-marker-click', {
          detail: { vehicleId, properties: feature.properties },
        })
      );
    }
  }

  getVisibleVehicleIds(): string[] {
    if (!this.currentData) return [];
    return this.currentData.features.map((f) => f.properties.id);
  }
}
