/**
 * H3WarehouseCoverageLayer.ts
 *
 * Visualizes warehouse service coverage using H3 gridDisk (k-ring).
 * Shows catchment areas for warehouses on the Planning map.
 *
 * Each warehouse gets a colored coverage ring indicating its service area.
 */

import type {
  Map as MapLibreMap,
  FillLayerSpecification,
  LineLayerSpecification,
} from 'maplibre-gl';
import type { FeatureCollection, Polygon, Feature } from 'geojson';
import { MapLayer, type LayerHandlers } from '@/map/core/LayerInterface';
import { kRingCoverage, cellToPolygon } from '@/services/h3Planner';
import type { Warehouse } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Warehouse coverage data for a single warehouse.
 */
export interface WarehouseCoverageData {
  warehouse: Warehouse;
  /** K-ring radius (number of hexagon rings outward) */
  radius: number;
  /** H3 resolution level */
  resolution: number;
  /** Pre-computed coverage cells (optional, computed if not provided) */
  coverageCells?: string[];
  /** Custom color for this warehouse's coverage */
  color?: string;
}

/**
 * Layer configuration options.
 */
export interface H3WarehouseCoverageLayerConfig {
  /** Layer ID (default: 'warehouse-coverage-layer') */
  id?: string;
  /** Default k-ring radius if not specified per warehouse */
  defaultRadius?: number;
  /** Default H3 resolution if not specified per warehouse */
  defaultResolution?: number;
  /** Fill opacity (0-1) */
  fillOpacity?: number;
  /** Show border around coverage area */
  showBorder?: boolean;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Coverage cell click event data.
 */
export interface CoverageCellClickData {
  warehouseId: string;
  warehouseName: string;
  h3Index: string;
  ringDistance: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default colors for warehouse coverage areas.
 * Uses teal/cyan palette to complement facility markers.
 */
const WAREHOUSE_COVERAGE_COLORS = [
  '#14b8a6', // teal-500
  '#06b6d4', // cyan-500
  '#0891b2', // cyan-600
  '#0d9488', // teal-600
  '#2dd4bf', // teal-400
  '#22d3ee', // cyan-400
];

// ============================================================================
// LAYER IMPLEMENTATION
// ============================================================================

/**
 * H3 Warehouse Coverage Layer
 *
 * Renders hexagonal coverage areas around warehouses using h3.gridDisk.
 * Each warehouse's coverage is shown as a translucent fill.
 */
export class H3WarehouseCoverageLayer extends MapLayer<WarehouseCoverageData, Polygon> {
  private layerConfig: Required<H3WarehouseCoverageLayerConfig>;
  private readonly fillLayerId: string;
  private readonly borderLayerId: string;
  private geometryCache: Map<string, GeoJSON.Polygon> = new Map();

  constructor(
    map: MapLibreMap,
    coverages: WarehouseCoverageData[],
    handlers: LayerHandlers<CoverageCellClickData> = {},
    config: H3WarehouseCoverageLayerConfig = {}
  ) {
    super(map, coverages, handlers as LayerHandlers<Polygon>, {
      id: config.id || 'warehouse-coverage-layer',
    });

    this.layerConfig = {
      id: config.id || 'warehouse-coverage-layer',
      defaultRadius: config.defaultRadius ?? 3,
      defaultResolution: config.defaultResolution ?? 8,
      fillOpacity: config.fillOpacity ?? 0.2,
      showBorder: config.showBorder ?? true,
      debug: config.debug ?? false,
    };

    this.fillLayerId = `${this.config.id}-fill`;
    this.borderLayerId = `${this.config.id}-border`;
  }

  /**
   * Transform warehouse coverage data to GeoJSON FeatureCollection.
   */
  protected dataToGeoJSON(coverages: WarehouseCoverageData[]): FeatureCollection<Polygon> {
    const features: Feature<Polygon>[] = [];

    coverages.forEach((coverage, warehouseIndex) => {
      const { warehouse, radius, resolution, coverageCells, color } = coverage;

      // Skip if warehouse doesn't have coordinates
      if (!warehouse.lat || !warehouse.lng) {
        if (this.layerConfig.debug) {
          console.warn(`[H3WarehouseCoverageLayer] Skipping warehouse ${warehouse.id} - no coordinates`);
        }
        return;
      }

      // Get coverage cells (use provided or compute)
      const cells = coverageCells || kRingCoverage(
        { lat: warehouse.lat, lng: warehouse.lng },
        resolution || this.layerConfig.defaultResolution,
        radius || this.layerConfig.defaultRadius
      );

      // Assign color (use provided or pick from palette)
      const coverageColor = color || WAREHOUSE_COVERAGE_COLORS[warehouseIndex % WAREHOUSE_COVERAGE_COLORS.length];

      // Create a feature for each coverage cell
      cells.forEach((cellIndex, cellIdx) => {
        // Get geometry from cache or generate
        let geometry = this.geometryCache.get(cellIndex);
        if (!geometry) {
          geometry = cellToPolygon(cellIndex);
          this.geometryCache.set(cellIndex, geometry);
        }

        features.push({
          type: 'Feature',
          geometry,
          properties: {
            warehouseId: warehouse.id,
            warehouseName: warehouse.name,
            h3Index: cellIndex,
            ringDistance: cellIdx, // Approximate ring distance
            color: coverageColor,
          },
          id: `${warehouse.id}-${cellIndex}`,
        });
      });

      if (this.layerConfig.debug) {
        console.log(`[H3WarehouseCoverageLayer] Generated ${cells.length} cells for warehouse ${warehouse.name}`);
      }
    });

    return {
      type: 'FeatureCollection',
      features,
    };
  }

  /**
   * Create fill layer configuration.
   */
  protected createLayerConfig(): FillLayerSpecification {
    return {
      id: this.fillLayerId,
      type: 'fill',
      source: this.geoJsonSourceId,
      paint: {
        'fill-color': ['get', 'color'],
        'fill-opacity': this.layerConfig.fillOpacity,
      },
    };
  }

  /**
   * Create border layer configuration.
   */
  private createBorderLayerConfig(): LineLayerSpecification {
    return {
      id: this.borderLayerId,
      type: 'line',
      source: this.geoJsonSourceId,
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 1.5,
        'line-opacity': 0.6,
      },
    };
  }

  /**
   * Add layer to map.
   */
  add(): void {
    if (this.isAdded) {
      if (this.layerConfig.debug) {
        console.warn('[H3WarehouseCoverageLayer] Layer already added');
      }
      return;
    }

    const geoJson = this.dataToGeoJSON(this.data);

    // Add GeoJSON source
    this.map.addSource(this.geoJsonSourceId, {
      type: 'geojson',
      data: geoJson,
    });

    // Add fill layer (should be below H3 hexagon layer)
    // Try to insert below h3-hexagon-layer-fill if it exists
    const beforeLayer = this.map.getLayer('h3-hexagon-layer-fill') ? 'h3-hexagon-layer-fill' : undefined;
    this.map.addLayer(this.createLayerConfig(), beforeLayer);

    // Add border layer if enabled
    if (this.layerConfig.showBorder) {
      this.map.addLayer(this.createBorderLayerConfig());
    }

    // Setup event handlers
    this.setupEventHandlers();

    this.isAdded = true;

    if (this.layerConfig.debug) {
      console.log(`[H3WarehouseCoverageLayer] Added coverage for ${this.data.length} warehouses`);
    }
  }

  /**
   * Setup click and hover handlers.
   */
  protected setupEventHandlers(): void {
    if (this.handlers.onClick) {
      this.map.on('click', this.fillLayerId, (e) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          const props = feature.properties as CoverageCellClickData;
          (this.handlers.onClick as (data: CoverageCellClickData, event: maplibregl.MapMouseEvent) => void)(
            props,
            e
          );
        }
      });
    }

    if (this.handlers.onHover) {
      this.map.on('mouseenter', this.fillLayerId, (e) => {
        this.map.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          const props = feature.properties as CoverageCellClickData;
          (this.handlers.onHover as (data: CoverageCellClickData | null, event: maplibregl.MapMouseEvent) => void)(
            props,
            e
          );
        }
      });

      this.map.on('mouseleave', this.fillLayerId, (e) => {
        this.map.getCanvas().style.cursor = '';
        (this.handlers.onHover as (data: CoverageCellClickData | null, event: maplibregl.MapMouseEvent) => void)(
          null,
          e
        );
      });
    }
  }

  /**
   * Update layer data.
   */
  update(coverages: WarehouseCoverageData[]): void {
    this.data = coverages;

    if (!this.isAdded) {
      return;
    }

    const geoJson = this.dataToGeoJSON(coverages);
    const source = this.map.getSource(this.geoJsonSourceId);

    if (source && source.type === 'geojson') {
      source.setData(geoJson);

      if (this.layerConfig.debug) {
        console.log(`[H3WarehouseCoverageLayer] Updated coverage for ${coverages.length} warehouses`);
      }
    }
  }

  /**
   * Remove layer from map.
   */
  remove(): void {
    if (!this.isAdded) return;

    // Remove layers
    if (this.layerConfig.showBorder && this.map.getLayer(this.borderLayerId)) {
      this.map.removeLayer(this.borderLayerId);
    }

    if (this.map.getLayer(this.fillLayerId)) {
      this.map.removeLayer(this.fillLayerId);
    }

    // Remove source
    if (this.map.getSource(this.geoJsonSourceId)) {
      this.map.removeSource(this.geoJsonSourceId);
    }

    this.isAdded = false;

    if (this.layerConfig.debug) {
      console.log('[H3WarehouseCoverageLayer] Removed');
    }
  }

  /**
   * Toggle layer visibility.
   */
  toggle(visible: boolean): void {
    const visibility = visible ? 'visible' : 'none';

    if (this.map.getLayer(this.fillLayerId)) {
      this.map.setLayoutProperty(this.fillLayerId, 'visibility', visibility);
    }

    if (this.layerConfig.showBorder && this.map.getLayer(this.borderLayerId)) {
      this.map.setLayoutProperty(this.borderLayerId, 'visibility', visibility);
    }

    if (this.layerConfig.debug) {
      console.log(`[H3WarehouseCoverageLayer] Visibility: ${visibility}`);
    }
  }

  /**
   * Clear geometry cache.
   */
  clearCache(): void {
    this.geometryCache.clear();

    if (this.layerConfig.debug) {
      console.log('[H3WarehouseCoverageLayer] Cache cleared');
    }
  }

  /**
   * Set fill opacity.
   */
  setOpacity(opacity: number): void {
    this.layerConfig.fillOpacity = Math.max(0, Math.min(1, opacity));

    if (this.isAdded && this.map.getLayer(this.fillLayerId)) {
      this.map.setPaintProperty(this.fillLayerId, 'fill-opacity', opacity);
    }
  }

  /**
   * Update coverage for a specific warehouse.
   */
  updateWarehouseCoverage(warehouseId: string, newRadius: number): void {
    const coverageIndex = this.data.findIndex((c) => c.warehouse.id === warehouseId);
    if (coverageIndex === -1) return;

    const updatedData = [...this.data];
    updatedData[coverageIndex] = {
      ...updatedData[coverageIndex],
      radius: newRadius,
      coverageCells: undefined, // Force recomputation
    };

    this.update(updatedData);
  }
}
