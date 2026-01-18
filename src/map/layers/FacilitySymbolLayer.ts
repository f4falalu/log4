/**
 * FacilitySymbolLayer.ts
 *
 * MapLibre symbol layer for healthcare facilities
 * Renders facilities with type-based color encoding and semantic icons
 */

import type { Map as MapLibreMap, SymbolLayerSpecification } from 'maplibre-gl';
import type { FeatureCollection, Point } from 'geojson';
import { MapLayer, type LayerHandlers } from '@/map/core/LayerInterface';
import { facilitiesToGeoJSON } from '@/map/telemetry/GeoJSONTransformer';
import { STATE_COLORS, ZOOM_BREAKPOINTS, MAPLIBRE_CONFIG } from '@/lib/mapDesignSystem';
import type { Facility } from '@/types';

/**
 * Facility Symbol Layer Configuration
 */
export interface FacilitySymbolLayerConfig {
  /** Layer ID (default: 'facilities-layer') */
  id?: string;

  /** Show facility labels at high zoom */
  showLabels?: boolean;

  /** Minimum zoom to show icons (default: Z1 = 6) */
  minZoom?: number;

  /** Minimum zoom to show labels (default: Z2 = 12) */
  labelMinZoom?: number;

  /** Allow icon overlap (default: false) */
  allowOverlap?: boolean;

  /** Icon size (default: 0.75) */
  iconSize?: number;

  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Facility Symbol Layer for MapLibre
 *
 * Renders facilities as symbols with:
 * - Entity-semantic icons (Hospital icon from sprite)
 * - Type-based color encoding (marker container color)
 * - Labels at high zoom (Z2+)
 * - Click/hover handlers
 */
export class FacilitySymbolLayer extends MapLayer<Facility, Point> {
  private facilityConfig: Required<FacilitySymbolLayerConfig>;
  private readonly symbolLayerId: string;
  private readonly labelLayerId: string;

  constructor(
    map: MapLibreMap,
    facilities: Facility[],
    handlers: LayerHandlers<Point> = {},
    config: FacilitySymbolLayerConfig = {}
  ) {
    super(map, facilities, handlers, {
      id: config.id || 'facilities-layer',
      minZoom: config.minZoom || ZOOM_BREAKPOINTS.Z1,
    });

    this.facilityConfig = {
      id: config.id || 'facilities-layer',
      showLabels: config.showLabels ?? true,
      minZoom: config.minZoom || ZOOM_BREAKPOINTS.Z1,
      labelMinZoom: config.labelMinZoom || ZOOM_BREAKPOINTS.Z2,
      allowOverlap: config.allowOverlap ?? false,
      iconSize: config.iconSize ?? 0.75,
      debug: config.debug ?? false,
    };

    this.symbolLayerId = `${this.config.id}-symbols`;
    this.labelLayerId = `${this.config.id}-labels`;
  }

  /**
   * Transform facilities to GeoJSON
   */
  protected dataToGeoJSON(facilities: Facility[]): FeatureCollection<Point> {
    return facilitiesToGeoJSON(facilities, { includeOptional: true });
  }

  /**
   * Create symbol layer configuration
   */
  protected createLayerConfig(): SymbolLayerSpecification {
    return {
      id: this.symbolLayerId,
      type: 'symbol',
      source: this.geoJsonSourceId,
      minzoom: this.facilityConfig.minZoom,
      layout: {
        'icon-image': 'entity.facility', // Phosphor sprite name (operational sprites)
        'icon-size': this.facilityConfig.iconSize,
        'icon-allow-overlap': this.facilityConfig.allowOverlap,
        'icon-ignore-placement': false,
        'icon-anchor': 'center',
        // Symbol sort key (facilities with higher priority first)
        'symbol-sort-key': ['get', 'priority'],
      },
      paint: {
        // Icon color based on facility type (from STATE_COLORS.facility - already hex colors)
        'icon-color': [
          'match',
          ['get', 'facilityType'],
          'hospital',
          STATE_COLORS.facility.hospital,
          'clinic',
          STATE_COLORS.facility.clinic,
          'pharmacy',
          STATE_COLORS.facility.pharmacy,
          'health_center',
          STATE_COLORS.facility.health_center,
          'lab',
          STATE_COLORS.facility.lab,
          STATE_COLORS.facility.other, // default
        ],
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
      minzoom: this.facilityConfig.labelMinZoom,
      layout: {
        'text-field': ['get', 'name'],
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
      console.warn(`[FacilitySymbolLayer] Source ${this.geoJsonSourceId} already exists, skipping add`);
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
    if (this.facilityConfig.showLabels) {
      this.map.addLayer(this.createLabelLayerConfig());
    }

    // Setup event handlers
    this.setupEventHandlers();

    if (this.facilityConfig.debug) {
      console.log(
        `[FacilitySymbolLayer] Added ${geoJson.features.length} facilities`
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
  update(facilities: Facility[]): void {
    this.data = facilities;
    const geoJson = this.dataToGeoJSON(facilities);

    const source = this.map.getSource(this.geoJsonSourceId);
    if (source && source.type === 'geojson') {
      source.setData(geoJson);

      if (this.facilityConfig.debug) {
        console.log(
          `[FacilitySymbolLayer] Updated ${geoJson.features.length} facilities`
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

    if (this.facilityConfig.showLabels && this.map.getLayer(this.labelLayerId)) {
      this.map.removeLayer(this.labelLayerId);
    }

    if (this.map.getSource(this.geoJsonSourceId)) {
      this.map.removeSource(this.geoJsonSourceId);
    }

    if (this.facilityConfig.debug) {
      console.log('[FacilitySymbolLayer] Removed');
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

    if (this.facilityConfig.showLabels && this.map.getLayer(this.labelLayerId)) {
      this.map.setLayoutProperty(this.labelLayerId, 'visibility', visibility);
    }

    if (this.facilityConfig.debug) {
      console.log(`[FacilitySymbolLayer] Visibility: ${visibility}`);
    }
  }

  /**
   * Highlight a specific facility
   */
  highlight(facilityId: string): void {
    // Set filter to only show highlighted facility with different styling
    this.map.setFilter(this.symbolLayerId, [
      'any',
      ['==', ['get', 'id'], facilityId],
      ['!=', ['get', 'id'], facilityId], // Show all facilities
    ]);

    // Could use feature state for highlighting in future
    // this.map.setFeatureState(
    //   { source: this.geoJsonSourceId, id: facilityId },
    //   { highlighted: true }
    // );
  }

  /**
   * Clear highlight
   */
  clearHighlight(): void {
    this.map.setFilter(this.symbolLayerId, null);
  }

  /**
   * Get facilities within viewport
   */
  getFacilitiesInView(): Facility[] {
    const features = this.map.queryRenderedFeatures(undefined, {
      layers: [this.symbolLayerId],
    });

    return features.map((f) => f.properties as unknown as Facility);
  }
}
