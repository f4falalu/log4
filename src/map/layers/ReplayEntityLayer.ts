/**
 * ReplayEntityLayer.ts
 *
 * Renders historical entity positions during forensic replay.
 *
 * GOVERNANCE:
 * - Implements MapLayer interface
 * - Receives HistoricalEntityPosition[], renders as GeoJSON points
 * - Muted color palette (historical feel)
 * - Updates never recreate layers
 * - Read-only (no click handlers)
 */

import type maplibregl from 'maplibre-gl';
import type { MapLayer, RenderContext } from '@/map/core/LayerRegistry';
import type { HistoricalEntityPosition } from '@/map/modes/forensic/ForensicReplayAdapter';

/**
 * Layer IDs
 */
const LAYER_IDS = {
  source: 'replay-entities-source',
  circle: 'replay-entities-circle',
  label: 'replay-entities-label',
} as const;

/**
 * Entity type colors (muted palette for historical feel)
 */
const REPLAY_ENTITY_COLORS: Record<string, string> = {
  vehicle: '#6366f1',  // indigo (muted)
  driver: '#14b8a6',   // teal (muted)
  asset: '#d97706',    // amber (muted)
};

/**
 * ReplayEntityLayer configuration
 */
export interface ReplayEntityLayerConfig {
  /** Show labels at high zoom */
  showLabels?: boolean;

  /** Label zoom threshold */
  labelMinZoom?: number;
}

/**
 * ReplayEntityLayer - Renders historical entities as circles
 *
 * RESPONSIBILITIES:
 * - Convert HistoricalEntityPosition[] → GeoJSON FeatureCollection
 * - Render circles with muted, data-driven fill by entity type
 * - Optional labels at high zoom
 * - No interaction (forensic mode is read-only)
 */
export class ReplayEntityLayer implements MapLayer<HistoricalEntityPosition> {
  readonly id = 'replay-entities';
  readonly type = 'replay-entities';

  private map: maplibregl.Map | null = null;
  private config: ReplayEntityLayerConfig;
  private mounted = false;

  constructor(config: ReplayEntityLayerConfig = {}) {
    this.config = {
      showLabels: config.showLabels ?? true,
      labelMinZoom: config.labelMinZoom ?? 12,
    };
  }

  /**
   * Add layer to map - called ONCE
   */
  add(ctx: RenderContext): void {
    this.map = ctx.map;

    // Add empty GeoJSON source
    ctx.map.addSource(LAYER_IDS.source, {
      type: 'geojson',
      data: this.toGeoJSON([]),
    });

    // Add circle layer with muted colors
    ctx.map.addLayer(
      {
        id: LAYER_IDS.circle,
        type: 'circle',
        source: LAYER_IDS.source,
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            6, 3,
            12, 7,
            16, 10,
          ],
          'circle-color': [
            'match',
            ['get', 'entityType'],
            'vehicle', REPLAY_ENTITY_COLORS.vehicle,
            'driver', REPLAY_ENTITY_COLORS.driver,
            'asset', REPLAY_ENTITY_COLORS.asset,
            '#9ca3af', // fallback gray
          ],
          'circle-opacity': 0.7,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': ctx.isDarkMode ? '#374151' : '#e5e7eb',
          'circle-stroke-opacity': 0.6,
        },
      },
      ctx.beforeLayerId
    );

    // Add label layer (visible at high zoom)
    if (this.config.showLabels) {
      ctx.map.addLayer(
        {
          id: LAYER_IDS.label,
          type: 'symbol',
          source: LAYER_IDS.source,
          minzoom: this.config.labelMinZoom!,
          layout: {
            'text-field': ['get', 'label'],
            'text-size': 10,
            'text-offset': [0, 1.5],
            'text-anchor': 'top',
            'text-allow-overlap': false,
          },
          paint: {
            'text-color': ctx.isDarkMode ? '#d1d5db' : '#6b7280',
            'text-halo-color': ctx.isDarkMode ? '#1f2937' : '#ffffff',
            'text-halo-width': 1,
          },
        },
        ctx.beforeLayerId
      );
    }

    this.mounted = true;
  }

  /**
   * Update layer data - no recreation
   */
  update(entities: HistoricalEntityPosition[]): void {
    if (!this.map || !this.mounted) return;

    const source = this.map.getSource(LAYER_IDS.source) as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(this.toGeoJSON(entities));
    }
  }

  /**
   * Remove layer from map
   */
  remove(): void {
    if (!this.map) return;

    if (this.map.getLayer(LAYER_IDS.label)) {
      this.map.removeLayer(LAYER_IDS.label);
    }
    if (this.map.getLayer(LAYER_IDS.circle)) {
      this.map.removeLayer(LAYER_IDS.circle);
    }
    if (this.map.getSource(LAYER_IDS.source)) {
      this.map.removeSource(LAYER_IDS.source);
    }

    this.map = null;
    this.mounted = false;
  }

  /**
   * Show layer
   */
  show(): void {
    if (!this.map) return;
    this.map.setLayoutProperty(LAYER_IDS.circle, 'visibility', 'visible');
    if (this.map.getLayer(LAYER_IDS.label)) {
      this.map.setLayoutProperty(LAYER_IDS.label, 'visibility', 'visible');
    }
  }

  /**
   * Hide layer
   */
  hide(): void {
    if (!this.map) return;
    this.map.setLayoutProperty(LAYER_IDS.circle, 'visibility', 'none');
    if (this.map.getLayer(LAYER_IDS.label)) {
      this.map.setLayoutProperty(LAYER_IDS.label, 'visibility', 'none');
    }
  }

  /**
   * Check visibility
   */
  isVisible(): boolean {
    if (!this.map || !this.map.getLayer(LAYER_IDS.circle)) return false;
    return this.map.getLayoutProperty(LAYER_IDS.circle, 'visibility') !== 'none';
  }

  /**
   * Convert historical positions to GeoJSON
   */
  private toGeoJSON(entities: HistoricalEntityPosition[]): GeoJSON.FeatureCollection {
    return {
      type: 'FeatureCollection',
      features: entities.map((entity) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [entity.lng, entity.lat],
        },
        properties: {
          id: entity.entityId,
          entityType: entity.entityType,
          h3Index: entity.h3Index,
          timestamp: entity.timestamp,
          label: entity.entityId.slice(0, 8),
          ...entity.metadata,
        },
      })),
    };
  }
}
