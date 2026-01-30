/**
 * LiveEntityLayer.ts
 *
 * Renders live entities as points on the map.
 *
 * GOVERNANCE:
 * - Implements MapLayer interface
 * - Receives NormalizedEntity[], renders as GeoJSON points
 * - Data-driven styling by entity type
 * - Updates never recreate layers
 * - Click handler via config callback
 */

import type maplibregl from 'maplibre-gl';
import type { MapLayer, RenderContext } from '@/map/core/LayerRegistry';
import type { NormalizedEntity } from '@/map/modes/operational/LiveEntityAdapter';

/**
 * Layer IDs
 */
const LAYER_IDS = {
  source: 'live-entities-source',
  circle: 'live-entities-circle',
  label: 'live-entities-label',
} as const;

/**
 * Entity type colors
 */
const ENTITY_COLORS: Record<string, string> = {
  vehicle: '#3b82f6',  // blue
  driver: '#22c55e',   // green
  asset: '#f97316',    // orange
};

/**
 * LiveEntityLayer configuration
 */
export interface LiveEntityLayerConfig {
  /** Click handler */
  onClick?: (entity: NormalizedEntity) => void;

  /** Show labels at high zoom */
  showLabels?: boolean;

  /** Label zoom threshold */
  labelMinZoom?: number;
}

/**
 * LiveEntityLayer - Renders live entities as circles
 *
 * RESPONSIBILITIES:
 * - Convert NormalizedEntity[] → GeoJSON FeatureCollection
 * - Render circles with data-driven fill by entity type
 * - Attach click handler
 * - Optional labels at high zoom
 */
export class LiveEntityLayer implements MapLayer<NormalizedEntity> {
  readonly id = 'live-entities';
  readonly type = 'live-entities';

  private map: maplibregl.Map | null = null;
  private config: LiveEntityLayerConfig;
  private currentData: NormalizedEntity[] = [];
  private mounted = false;
  private clickHandler: ((e: maplibregl.MapMouseEvent) => void) | null = null;

  constructor(config: LiveEntityLayerConfig = {}) {
    this.config = {
      showLabels: config.showLabels ?? true,
      labelMinZoom: config.labelMinZoom ?? 12,
      onClick: config.onClick,
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

    // Add circle layer with data-driven color
    ctx.map.addLayer(
      {
        id: LAYER_IDS.circle,
        type: 'circle',
        source: LAYER_IDS.source,
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            6, 4,
            12, 8,
            16, 12,
          ],
          'circle-color': [
            'match',
            ['get', 'entityType'],
            'vehicle', ENTITY_COLORS.vehicle,
            'driver', ENTITY_COLORS.driver,
            'asset', ENTITY_COLORS.asset,
            '#6b7280', // fallback gray
          ],
          'circle-opacity': 0.9,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-opacity': 0.8,
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
            'text-size': 11,
            'text-offset': [0, 1.5],
            'text-anchor': 'top',
            'text-allow-overlap': false,
          },
          paint: {
            'text-color': ctx.isDarkMode ? '#e5e7eb' : '#374151',
            'text-halo-color': ctx.isDarkMode ? '#1f2937' : '#ffffff',
            'text-halo-width': 1,
          },
        },
        ctx.beforeLayerId
      );
    }

    // Click handler
    if (this.config.onClick) {
      this.clickHandler = (e: maplibregl.MapMouseEvent) => {
        const features = this.map?.queryRenderedFeatures(e.point, {
          layers: [LAYER_IDS.circle],
        });

        if (features && features.length > 0) {
          const props = features[0].properties;
          if (props) {
            const entity = this.findEntityById(props.id as string);
            if (entity) {
              this.config.onClick!(entity);
            }
          }
        }
      };
      ctx.map.on('click', LAYER_IDS.circle, this.clickHandler);

      // Cursor
      ctx.map.on('mouseenter', LAYER_IDS.circle, () => {
        if (this.map) this.map.getCanvas().style.cursor = 'pointer';
      });
      ctx.map.on('mouseleave', LAYER_IDS.circle, () => {
        if (this.map) this.map.getCanvas().style.cursor = '';
      });
    }

    this.mounted = true;
  }

  /**
   * Update layer data - no recreation
   */
  update(entities: NormalizedEntity[]): void {
    if (!this.map || !this.mounted) return;

    this.currentData = entities;
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

    if (this.clickHandler) {
      this.map.off('click', LAYER_IDS.circle, this.clickHandler);
    }

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
   * Convert entities to GeoJSON
   */
  private toGeoJSON(entities: NormalizedEntity[]): GeoJSON.FeatureCollection {
    return {
      type: 'FeatureCollection',
      features: entities.map((entity) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [entity.lng, entity.lat],
        },
        properties: {
          id: entity.id,
          entityType: entity.type,
          h3Index: entity.h3Index,
          timestamp: entity.timestamp,
          label: this.getLabel(entity),
          ...entity.metadata,
        },
      })),
    };
  }

  /**
   * Get display label for entity
   */
  private getLabel(entity: NormalizedEntity): string {
    if (entity.metadata?.plate) return entity.metadata.plate as string;
    if (entity.metadata?.name) return entity.metadata.name as string;
    return entity.id.slice(0, 8);
  }

  /**
   * Find entity by ID in current data
   */
  private findEntityById(id: string): NormalizedEntity | undefined {
    return this.currentData.find((e) => e.id === id);
  }
}
