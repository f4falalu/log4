/**
 * WarehouseSymbolLayer.ts
 *
 * MapLibre symbol layer for warehouses
 * Renders warehouses with consistent teal color and warehouse icon
 */

import type { Map as MapLibreMap, SymbolLayerSpecification } from 'maplibre-gl';
import type { FeatureCollection, Point } from 'geojson';
import { MapLayer, type LayerHandlers } from '@/map/core/LayerInterface';
import { warehousesToGeoJSON } from '@/map/telemetry/GeoJSONTransformer';
import { ZOOM_BREAKPOINTS, MAPLIBRE_CONFIG } from '@/lib/mapDesignSystem';
import type { Warehouse } from '@/types';

/**
 * Warehouse Symbol Layer Configuration
 */
export interface WarehouseSymbolLayerConfig {
  /** Layer ID (default: 'warehouses-layer') */
  id?: string;

  /** Show warehouse labels at high zoom */
  showLabels?: boolean;

  /** Minimum zoom to show icons (default: Z1 = 6) */
  minZoom?: number;

  /** Minimum zoom to show labels (default: Z2 = 12) */
  labelMinZoom?: number;

  /** Allow icon overlap (default: false) */
  allowOverlap?: boolean;

  /** Icon size (default: 0.85 - slightly larger than facilities) */
  iconSize?: number;

  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Warehouse Symbol Layer for MapLibre
 *
 * Renders warehouses as symbols with:
 * - Warehouse icon from sprite
 * - Consistent teal color (#14b8a6)
 * - Labels at high zoom (Z2+)
 * - Click/hover handlers
 */
export class WarehouseSymbolLayer extends MapLayer<Warehouse, Point> {
  private warehouseConfig: Required<WarehouseSymbolLayerConfig>;
  private readonly symbolLayerId: string;
  private readonly labelLayerId: string;

  constructor(
    map: MapLibreMap,
    warehouses: Warehouse[],
    handlers: LayerHandlers<Point> = {},
    config: WarehouseSymbolLayerConfig = {}
  ) {
    super(map, warehouses, handlers, {
      id: config.id || 'warehouses-layer',
      minZoom: config.minZoom || ZOOM_BREAKPOINTS.Z1,
    });

    this.warehouseConfig = {
      id: config.id || 'warehouses-layer',
      showLabels: config.showLabels ?? true,
      minZoom: config.minZoom || ZOOM_BREAKPOINTS.Z1,
      labelMinZoom: config.labelMinZoom || ZOOM_BREAKPOINTS.Z2,
      allowOverlap: config.allowOverlap ?? false,
      iconSize: config.iconSize ?? 0.85, // Slightly larger than facilities
      debug: config.debug ?? false,
    };

    this.symbolLayerId = `${this.config.id}-symbols`;
    this.labelLayerId = `${this.config.id}-labels`;
  }

  /**
   * Transform warehouses to GeoJSON
   */
  protected dataToGeoJSON(warehouses: Warehouse[]): FeatureCollection<Point> {
    return warehousesToGeoJSON(warehouses, { includeOptional: true });
  }

  /**
   * Create symbol layer configuration
   */
  protected createLayerConfig(): SymbolLayerSpecification {
    return {
      id: this.symbolLayerId,
      type: 'symbol',
      source: this.geoJsonSourceId,
      minzoom: this.warehouseConfig.minZoom,
      layout: {
        'icon-image': 'entity.warehouse', // Phosphor sprite name (operational sprites)
        'icon-size': this.warehouseConfig.iconSize,
        'icon-allow-overlap': this.warehouseConfig.allowOverlap,
        'icon-ignore-placement': false,
        'icon-anchor': 'center',
      },
      paint: {
        // Warehouses use consistent teal color
        'icon-color': '#14b8a6', // teal-500
        'icon-opacity': 1,
      },
    };
  }

  /**
   * Create label layer configuration
   */
  private createLabelLayerConfig(): SymbolLayerSpecification {
    return {
      id: this.labelLayerId,
      type: 'symbol',
      source: this.geoJsonSourceId,
      minzoom: this.warehouseConfig.labelMinZoom,
      layout: {
        'text-field': [
          'format',
          ['get', 'name'],
          {},
          '\n',
          {},
          ['concat', 'Capacity: ', ['get', 'capacity']],
          { 'font-scale': 0.8 },
        ],
        'text-font': MAPLIBRE_CONFIG.symbolLayer.textFont,
        'text-size': MAPLIBRE_CONFIG.symbolLayer.textSize,
        'text-offset': MAPLIBRE_CONFIG.symbolLayer.textOffset,
        'text-anchor': MAPLIBRE_CONFIG.symbolLayer.textAnchor,
        'text-optional': true,
        'text-allow-overlap': false,
      },
      paint: {
        'text-color': '#1f2937', // gray-800
        'text-halo-color': '#ffffff',
        'text-halo-width': 2,
        'text-halo-blur': 1,
      },
    };
  }

  /**
   * Add layer to map
   */
  add(): void {
    // Check if already added
    if (this.map.getSource(this.geoJsonSourceId)) {
      console.warn(`[WarehouseSymbolLayer] Source ${this.geoJsonSourceId} already exists, skipping add`);
      return;
    }

    const geoJson = this.dataToGeoJSON(this.data);

    // Add GeoJSON source
    this.map.addSource(this.geoJsonSourceId, {
      type: 'geojson',
      data: geoJson,
    });

    // Add symbol layer
    this.map.addLayer(this.createLayerConfig());

    // Add label layer if enabled
    if (this.warehouseConfig.showLabels) {
      this.map.addLayer(this.createLabelLayerConfig());
    }

    // Setup event handlers
    this.setupEventHandlers();

    if (this.warehouseConfig.debug) {
      console.log(
        `[WarehouseSymbolLayer] Added ${geoJson.features.length} warehouses`
      );
    }
  }

  /**
   * Setup click and hover event handlers
   */
  protected setupEventHandlers(): void {
    if (this.handlers.onClick) {
      this.map.on('click', this.symbolLayerId, (e) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          this.handlers.onClick!(feature as any, e.lngLat);
        }
      });
    }

    if (this.handlers.onHover) {
      this.map.on('mouseenter', this.symbolLayerId, (e) => {
        this.map.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          this.handlers.onHover!(feature as any, e.lngLat);
        }
      });

      this.map.on('mouseleave', this.symbolLayerId, () => {
        this.map.getCanvas().style.cursor = '';
      });
    }
  }

  /**
   * Update layer data
   */
  update(warehouses: Warehouse[]): void {
    this.data = warehouses;
    const geoJson = this.dataToGeoJSON(warehouses);

    const source = this.map.getSource(this.geoJsonSourceId);
    if (source && source.type === 'geojson') {
      source.setData(geoJson);

      if (this.warehouseConfig.debug) {
        console.log(
          `[WarehouseSymbolLayer] Updated ${geoJson.features.length} warehouses`
        );
      }
    }
  }

  /**
   * Remove layer from map
   */
  remove(): void {
    if (this.map.getLayer(this.symbolLayerId)) {
      this.map.removeLayer(this.symbolLayerId);
    }

    if (this.warehouseConfig.showLabels && this.map.getLayer(this.labelLayerId)) {
      this.map.removeLayer(this.labelLayerId);
    }

    if (this.map.getSource(this.geoJsonSourceId)) {
      this.map.removeSource(this.geoJsonSourceId);
    }

    if (this.warehouseConfig.debug) {
      console.log('[WarehouseSymbolLayer] Removed');
    }
  }

  /**
   * Toggle layer visibility
   */
  toggle(visible: boolean): void {
    const visibility = visible ? 'visible' : 'none';

    if (this.map.getLayer(this.symbolLayerId)) {
      this.map.setLayoutProperty(this.symbolLayerId, 'visibility', visibility);
    }

    if (this.warehouseConfig.showLabels && this.map.getLayer(this.labelLayerId)) {
      this.map.setLayoutProperty(this.labelLayerId, 'visibility', visibility);
    }

    if (this.warehouseConfig.debug) {
      console.log(`[WarehouseSymbolLayer] Visibility: ${visibility}`);
    }
  }

  /**
   * Highlight a specific warehouse
   */
  highlight(warehouseId: string): void {
    this.map.setFilter(this.symbolLayerId, [
      'any',
      ['==', ['get', 'id'], warehouseId],
      ['!=', ['get', 'id'], warehouseId], // Show all warehouses
    ]);
  }

  /**
   * Clear highlight
   */
  clearHighlight(): void {
    this.map.setFilter(this.symbolLayerId, null);
  }

  /**
   * Get warehouses within viewport
   */
  getWarehousesInView(): Warehouse[] {
    const features = this.map.queryRenderedFeatures(undefined, {
      layers: [this.symbolLayerId],
    });

    return features.map((f) => f.properties as unknown as Warehouse);
  }
}
