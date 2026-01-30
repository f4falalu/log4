/**
 * VehicleLayer.ts — Real-time vehicle symbol layer.
 *
 * Renders vehicles as directional icons with:
 * - Rotation from bearing
 * - Status-based color
 * - Type-based icon
 */

import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl';
import { LayerAdapter } from './LayerAdapter';
import { mapTokens } from '../tokens/mapTokens';

export interface VehicleData {
  id: string;
  lat: number;
  lng: number;
  bearing: number;
  speed: number;
  status: 'active' | 'idle' | 'delayed' | 'offline';
  label: string;
  type: 'van' | 'truck' | 'motorcycle';
}

const STATUS_COLORS: Record<VehicleData['status'], string> = {
  active: mapTokens.vehicleActive,
  idle: mapTokens.vehicleIdle,
  delayed: mapTokens.vehicleDelayed,
  offline: mapTokens.vehicleOffline,
};

export class VehicleLayer extends LayerAdapter<VehicleData[]> {
  private symbolLayerId: string;

  constructor() {
    super('vehicle-source');
    this.symbolLayerId = 'vehicle-symbols';
  }

  protected onAttach(map: MapLibreMap): void {
    map.addSource(this.sourceId, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    // Create triangle image for directional indicator
    if (!map.hasImage('triangle')) {
      const size = 24;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(size / 2, 2);
      ctx.lineTo(size - 4, size - 4);
      ctx.lineTo(4, size - 4);
      ctx.closePath();
      ctx.fill();
      const imageData = ctx.getImageData(0, 0, size, size);
      map.addImage('triangle', imageData, { pixelRatio: 2 });
    }

    // Use circle layer as vehicle representation
    map.addLayer({
      id: this.symbolLayerId,
      type: 'circle',
      source: this.sourceId,
      paint: {
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          8, 4,
          12, 7,
          16, 10,
        ],
        'circle-color': [
          'match', ['get', 'status'],
          'active', STATUS_COLORS.active,
          'idle', STATUS_COLORS.idle,
          'delayed', STATUS_COLORS.delayed,
          'offline', STATUS_COLORS.offline,
          STATUS_COLORS.offline,
        ],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1.5,
        'circle-opacity': [
          'match', ['get', 'status'],
          'offline', 0.4,
          1,
        ],
      },
    });

    // Add a directional indicator layer (triangle showing heading)
    map.addLayer({
      id: `${this.symbolLayerId}-direction`,
      type: 'symbol',
      source: this.sourceId,
      layout: {
        'icon-image': 'triangle',
        'icon-size': 0.5,
        'icon-rotate': ['get', 'bearing'],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
      },
      paint: {
        'icon-opacity': [
          'case',
          ['>', ['get', 'speed'], 0], 0.9,
          0,
        ],
      },
    });

    this.layerIds = [this.symbolLayerId, `${this.symbolLayerId}-direction`];
  }

  update(vehicles: VehicleData[]): void {
    if (!this.map || !this.attached) return;

    const source = this.map.getSource(this.sourceId) as GeoJSONSource;
    if (!source) return;

    const features: GeoJSON.Feature[] = vehicles.map((v) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [v.lng, v.lat],
      },
      properties: {
        id: v.id,
        bearing: v.bearing,
        speed: v.speed,
        status: v.status,
        label: v.label,
        type: v.type,
      },
    }));

    source.setData({ type: 'FeatureCollection', features });
  }
}
