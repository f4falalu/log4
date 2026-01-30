/**
 * DriverMarkerLayer - Renders driver position markers on the map
 * Status-based styling: EN_ROUTE=blue, AT_STOP=green, DELAYED=red, etc.
 */

import type maplibregl from 'maplibre-gl';
import { BaseLayer } from './BaseLayer';
import type { MapFeatureCollection, DriverMarkerProperties, DriverStatus } from '@/types/live-map';

const LAYER_ID = 'driver-markers';
const SOURCE_ID = 'driver-markers-source';

// Status colors
const STATUS_COLORS: Record<DriverStatus, string> = {
  INACTIVE: '#6b7280', // gray
  ACTIVE: '#3b82f6', // blue
  EN_ROUTE: '#3b82f6', // blue
  AT_STOP: '#22c55e', // green
  DELAYED: '#ef4444', // red
  COMPLETED: '#10b981', // emerald
  SUSPENDED: '#f59e0b', // amber
};

export class DriverMarkerLayer extends BaseLayer<MapFeatureCollection<DriverMarkerProperties>> {
  private currentData: MapFeatureCollection<DriverMarkerProperties> | null = null;

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

    // Add circle layer for driver markers
    this.map.addLayer({
      id: LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          8, 6,
          12, 10,
          16, 14,
        ],
        'circle-color': [
          'match',
          ['get', 'status'],
          'INACTIVE', STATUS_COLORS.INACTIVE,
          'ACTIVE', STATUS_COLORS.ACTIVE,
          'EN_ROUTE', STATUS_COLORS.EN_ROUTE,
          'AT_STOP', STATUS_COLORS.AT_STOP,
          'DELAYED', STATUS_COLORS.DELAYED,
          'COMPLETED', STATUS_COLORS.COMPLETED,
          'SUSPENDED', STATUS_COLORS.SUSPENDED,
          STATUS_COLORS.INACTIVE, // default
        ],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2,
        'circle-opacity': [
          'case',
          ['get', 'isOnline'],
          1,
          0.6,
        ],
      },
    });

    // Add label layer for driver names
    this.map.addLayer({
      id: `${LAYER_ID}-labels`,
      type: 'symbol',
      source: SOURCE_ID,
      minzoom: 12,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Open Sans Regular'],
        'text-size': 11,
        'text-offset': [0, 1.5],
        'text-anchor': 'top',
        'text-max-width': 10,
      },
      paint: {
        'text-color': '#1f2937',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1,
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

  protected updateData(data: MapFeatureCollection<DriverMarkerProperties>): void {
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

    // Remove layers
    if (this.map.getLayer(`${LAYER_ID}-labels`)) {
      this.map.removeLayer(`${LAYER_ID}-labels`);
    }
    if (this.map.getLayer(LAYER_ID)) {
      this.map.removeLayer(LAYER_ID);
    }

    // Remove source
    if (this.map.getSource(SOURCE_ID)) {
      this.map.removeSource(SOURCE_ID);
    }
  }

  protected updateVisibility(visible: boolean): void {
    if (!this.map) return;

    const visibility = visible ? 'visible' : 'none';

    if (this.map.getLayer(LAYER_ID)) {
      this.map.setLayoutProperty(LAYER_ID, 'visibility', visibility);
    }
    if (this.map.getLayer(`${LAYER_ID}-labels`)) {
      this.map.setLayoutProperty(`${LAYER_ID}-labels`, 'visibility', visibility);
    }
  }

  private handleClick(e: maplibregl.MapMouseEvent): void {
    if (!e.features || e.features.length === 0) return;

    const feature = e.features[0];
    const driverId = feature.properties?.id;

    if (driverId) {
      // Dispatch custom event for parent to handle
      window.dispatchEvent(
        new CustomEvent('driver-marker-click', {
          detail: { driverId, properties: feature.properties },
        })
      );
    }
  }

  // Get all driver IDs currently visible
  getVisibleDriverIds(): string[] {
    if (!this.currentData) return [];
    return this.currentData.features.map((f) => f.properties.id);
  }
}
