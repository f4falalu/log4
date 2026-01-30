/**
 * AlertLayer.ts — Alert visualization layer.
 *
 * Renders alerts as pulsing circles at their location.
 * Active alerts have larger radius and higher opacity.
 */

import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl';
import { LayerAdapter } from './LayerAdapter';
import { mapTokens } from '../tokens/mapTokens';

export interface AlertData {
  id: string;
  lat: number;
  lng: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  active: boolean;
  timestamp: string;
}

export class AlertLayer extends LayerAdapter<AlertData[]> {
  private pulseLayerId: string;
  private coreLayerId: string;

  constructor() {
    super('alert-source');
    this.pulseLayerId = 'alert-pulse';
    this.coreLayerId = 'alert-core';
  }

  protected onAttach(map: MapLibreMap): void {
    map.addSource(this.sourceId, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    // Outer pulse ring
    map.addLayer({
      id: this.pulseLayerId,
      type: 'circle',
      source: this.sourceId,
      filter: ['==', ['get', 'active'], true],
      paint: {
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          8, 12,
          14, 20,
        ],
        'circle-color': 'transparent',
        'circle-stroke-color': [
          'match', ['get', 'severity'],
          'critical', mapTokens.riskCritical,
          'high', mapTokens.riskHigh,
          'medium', mapTokens.riskMedium,
          mapTokens.riskLow,
        ],
        'circle-stroke-width': 2,
        'circle-opacity': 0.6,
      },
    });

    // Core dot
    map.addLayer({
      id: this.coreLayerId,
      type: 'circle',
      source: this.sourceId,
      paint: {
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          8, 4,
          14, 8,
        ],
        'circle-color': [
          'match', ['get', 'severity'],
          'critical', mapTokens.riskCritical,
          'high', mapTokens.riskHigh,
          'medium', mapTokens.riskMedium,
          mapTokens.riskLow,
        ],
        'circle-opacity': [
          'case',
          ['get', 'active'], 0.9,
          0.4,
        ],
      },
    });

    this.layerIds = [this.pulseLayerId, this.coreLayerId];
  }

  update(alerts: AlertData[]): void {
    if (!this.map || !this.attached) return;

    const source = this.map.getSource(this.sourceId) as GeoJSONSource;
    if (!source) return;

    const features: GeoJSON.Feature[] = alerts.map((a) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [a.lng, a.lat] },
      properties: {
        id: a.id,
        severity: a.severity,
        message: a.message,
        active: a.active,
        timestamp: a.timestamp,
      },
    }));

    source.setData({ type: 'FeatureCollection', features });
  }
}
