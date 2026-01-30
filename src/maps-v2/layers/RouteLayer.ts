/**
 * RouteLayer.ts — Route line rendering.
 *
 * Renders routes as:
 * - Dashed line for planned/remaining portion
 * - Solid line for completed portion
 * - Color indicates route status
 */

import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl';
import { LayerAdapter } from './LayerAdapter';
import { mapTokens } from '../tokens/mapTokens';

export interface RouteData {
  id: string;
  coordinates: [number, number][]; // [lng, lat][]
  vehicleId: string;
  progress: number; // 0–1 (fraction completed)
  status: 'planned' | 'active' | 'completed';
}

export class RouteLayer extends LayerAdapter<RouteData[]> {
  private plannedLayerId: string;
  private completedLayerId: string;

  constructor() {
    super('route-source');
    this.plannedLayerId = 'route-planned';
    this.completedLayerId = 'route-completed';
  }

  protected onAttach(map: MapLibreMap): void {
    map.addSource(this.sourceId, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    // Planned/remaining portion — dashed
    map.addLayer({
      id: this.plannedLayerId,
      type: 'line',
      source: this.sourceId,
      filter: ['==', ['get', 'portion'], 'remaining'],
      paint: {
        'line-color': mapTokens.routePlanned,
        'line-width': 2,
        'line-dasharray': [2, 2],
        'line-opacity': 0.7,
      },
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
    });

    // Completed portion — solid
    map.addLayer({
      id: this.completedLayerId,
      type: 'line',
      source: this.sourceId,
      filter: ['==', ['get', 'portion'], 'completed'],
      paint: {
        'line-color': [
          'match', ['get', 'status'],
          'active', mapTokens.routeActive,
          'completed', mapTokens.routeCompleted,
          mapTokens.routePlanned,
        ],
        'line-width': 3,
        'line-opacity': 0.9,
      },
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
    });

    this.layerIds = [this.plannedLayerId, this.completedLayerId];
  }

  update(routes: RouteData[]): void {
    if (!this.map || !this.attached) return;

    const source = this.map.getSource(this.sourceId) as GeoJSONSource;
    if (!source) return;

    const features: GeoJSON.Feature[] = [];

    for (const route of routes) {
      if (route.coordinates.length < 2) continue;

      const splitIndex = Math.max(1, Math.floor(route.coordinates.length * route.progress));

      // Completed portion
      if (splitIndex > 1) {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: route.coordinates.slice(0, splitIndex),
          },
          properties: {
            id: route.id,
            vehicleId: route.vehicleId,
            portion: 'completed',
            status: route.status,
          },
        });
      }

      // Remaining portion
      if (splitIndex < route.coordinates.length) {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: route.coordinates.slice(Math.max(0, splitIndex - 1)),
          },
          properties: {
            id: route.id,
            vehicleId: route.vehicleId,
            portion: 'remaining',
            status: route.status,
          },
        });
      }
    }

    source.setData({ type: 'FeatureCollection', features });
  }
}
