/**
 * DeliveryMarkerLayer - Renders delivery stop markers on the map
 * Shows facility locations with progress indicators
 */

import type maplibregl from 'maplibre-gl';
import { BaseLayer } from './BaseLayer';
import type { MapFeatureCollection, DeliveryMarkerProperties, DriverStatus } from '@/types/live-map';

const LAYER_ID = 'delivery-markers';
const SOURCE_ID = 'delivery-markers-source';

// Status colors
const STATUS_COLORS: Record<DriverStatus | 'pending' | 'completed', string> = {
  INACTIVE: '#9ca3af',
  ACTIVE: '#3b82f6',
  EN_ROUTE: '#3b82f6',
  AT_STOP: '#22c55e',
  DELAYED: '#ef4444',
  COMPLETED: '#10b981',
  SUSPENDED: '#f59e0b',
  pending: '#9ca3af',
  completed: '#10b981',
};

export class DeliveryMarkerLayer extends BaseLayer<MapFeatureCollection<DeliveryMarkerProperties>> {
  private currentData: MapFeatureCollection<DeliveryMarkerProperties> | null = null;

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

    // Add outer ring (progress indicator)
    this.map.addLayer({
      id: `${LAYER_ID}-ring`,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          8, 5,
          12, 8,
          16, 12,
        ],
        'circle-color': 'transparent',
        'circle-stroke-color': [
          'match',
          ['get', 'status'],
          'INACTIVE', STATUS_COLORS.INACTIVE,
          'ACTIVE', STATUS_COLORS.ACTIVE,
          'EN_ROUTE', STATUS_COLORS.EN_ROUTE,
          'AT_STOP', STATUS_COLORS.AT_STOP,
          'DELAYED', STATUS_COLORS.DELAYED,
          'COMPLETED', STATUS_COLORS.COMPLETED,
          'SUSPENDED', STATUS_COLORS.SUSPENDED,
          STATUS_COLORS.pending,
        ],
        'circle-stroke-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          8, 2,
          12, 3,
          16, 4,
        ],
        'circle-opacity': 0.9,
      },
    });

    // Add inner circle (package icon placeholder)
    this.map.addLayer({
      id: LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          8, 3,
          12, 5,
          16, 8,
        ],
        'circle-color': '#ffffff',
        'circle-stroke-color': [
          'match',
          ['get', 'status'],
          'COMPLETED', STATUS_COLORS.COMPLETED,
          'AT_STOP', STATUS_COLORS.AT_STOP,
          '#6b7280',
        ],
        'circle-stroke-width': 1,
      },
    });

    // Add stop index labels
    this.map.addLayer({
      id: `${LAYER_ID}-index`,
      type: 'symbol',
      source: SOURCE_ID,
      minzoom: 10,
      layout: {
        'text-field': ['to-string', ['+', ['coalesce', ['get', 'currentStopIndex'], 0], 1]],
        'text-font': ['Open Sans Bold'],
        'text-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          10, 8,
          14, 10,
        ],
        'text-anchor': 'center',
      },
      paint: {
        'text-color': '#374151',
      },
    });

    // Add facility name labels
    this.map.addLayer({
      id: `${LAYER_ID}-labels`,
      type: 'symbol',
      source: SOURCE_ID,
      minzoom: 13,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Open Sans Regular'],
        'text-size': 11,
        'text-offset': [0, 1.5],
        'text-anchor': 'top',
        'text-max-width': 12,
      },
      paint: {
        'text-color': '#374151',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1,
      },
    });

    // Click handler
    this.map.on('click', LAYER_ID, this.handleClick.bind(this));
    this.map.on('click', `${LAYER_ID}-ring`, this.handleClick.bind(this));

    // Hover
    this.map.on('mouseenter', LAYER_ID, () => {
      if (this.map) this.map.getCanvas().style.cursor = 'pointer';
    });
    this.map.on('mouseleave', LAYER_ID, () => {
      if (this.map) this.map.getCanvas().style.cursor = '';
    });
  }

  protected updateData(data: MapFeatureCollection<DeliveryMarkerProperties>): void {
    if (!this.map) return;

    const source = this.map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(data);
      this.currentData = data;
    }
  }

  protected removeLayers(): void {
    if (!this.map) return;

    this.map.off('click', LAYER_ID, this.handleClick.bind(this));
    this.map.off('click', `${LAYER_ID}-ring`, this.handleClick.bind(this));

    const layers = [`${LAYER_ID}-labels`, `${LAYER_ID}-index`, LAYER_ID, `${LAYER_ID}-ring`];
    for (const layerId of layers) {
      if (this.map.getLayer(layerId)) {
        this.map.removeLayer(layerId);
      }
    }

    if (this.map.getSource(SOURCE_ID)) {
      this.map.removeSource(SOURCE_ID);
    }
  }

  protected updateVisibility(visible: boolean): void {
    if (!this.map) return;

    const visibility = visible ? 'visible' : 'none';
    const layers = [`${LAYER_ID}-ring`, LAYER_ID, `${LAYER_ID}-index`, `${LAYER_ID}-labels`];

    for (const layerId of layers) {
      if (this.map.getLayer(layerId)) {
        this.map.setLayoutProperty(layerId, 'visibility', visibility);
      }
    }
  }

  private handleClick(e: maplibregl.MapMouseEvent): void {
    if (!e.features || e.features.length === 0) return;

    const feature = e.features[0];
    const facilityId = feature.properties?.id;

    if (facilityId) {
      window.dispatchEvent(
        new CustomEvent('delivery-marker-click', {
          detail: { facilityId, properties: feature.properties },
        })
      );
    }
  }
}
