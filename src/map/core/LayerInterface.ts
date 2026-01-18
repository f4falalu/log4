/**
 * LayerInterface.ts
 *
 * Abstract layer interface for MapLibre layers
 * Matches existing Leaflet pattern: (map, data, handlers)
 *
 * This interface ensures consistency across all map layers
 * and makes it easier to migrate from Leaflet to MapLibre
 */

import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl';
import type { FeatureCollection, Feature, Geometry } from 'geojson';

/**
 * Base Layer Configuration
 * Common configuration for all layers
 */
export interface BaseLayerConfig {
  /** Layer ID (must be unique within map) */
  id: string;

  /** Layer visibility */
  visible?: boolean;

  /** Minimum zoom level to show layer */
  minZoom?: number;

  /** Maximum zoom level to show layer */
  maxZoom?: number;

  /** Layer opacity (0-1) */
  opacity?: number;
}

/**
 * Layer Event Handlers
 * Callbacks for layer interactions
 */
export interface LayerHandlers<T = any> {
  /** Called when a feature is clicked */
  onClick?: (feature: T, event: maplibregl.MapMouseEvent) => void;

  /** Called when mouse enters a feature */
  onHover?: (feature: T | null, event: maplibregl.MapMouseEvent) => void;

  /** Called when a feature is double-clicked */
  onDoubleClick?: (feature: T, event: maplibregl.MapMouseEvent) => void;

  /** Called when layer is added to map */
  onAdd?: () => void;

  /** Called when layer is removed from map */
  onRemove?: () => void;
}

/**
 * Abstract Map Layer
 * Base class for all MapLibre layers
 *
 * Pattern matches Leaflet: new Layer(map, data, handlers)
 */
export abstract class MapLayer<TData = any, TFeature = any> {
  protected map: MapLibreMap;
  protected data: TData[];
  protected handlers: LayerHandlers<TFeature>;
  protected config: BaseLayerConfig;
  protected geoJsonSourceId: string;
  protected isAdded: boolean = false;

  /**
   * Constructor
   * @param map - MapLibre map instance
   * @param data - Layer data
   * @param handlers - Event handlers
   * @param config - Layer configuration
   */
  constructor(
    map: MapLibreMap,
    data: TData[],
    handlers: LayerHandlers<TFeature> = {},
    config: Partial<BaseLayerConfig> = {}
  ) {
    this.map = map;
    this.data = data;
    this.handlers = handlers;
    this.config = {
      id: this.generateLayerId(),
      visible: true,
      minZoom: 0,
      maxZoom: 24,
      opacity: 1,
      ...config,
    };
    this.geoJsonSourceId = `${this.config.id}-source`;
  }

  /**
   * Generate a unique layer ID
   * Override this to customize layer naming
   */
  protected generateLayerId(): string {
    return `layer-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Transform data to GeoJSON
   * MUST be implemented by subclasses
   */
  protected abstract dataToGeoJSON(data: TData[]): FeatureCollection;

  /**
   * Create MapLibre layer configuration
   * MUST be implemented by subclasses
   */
  protected abstract createLayerConfig(): any;

  /**
   * Add layer to map
   */
  add(): void {
    if (this.isAdded) {
      console.warn(`[MapLayer] Layer ${this.config.id} already added`);
      return;
    }

    // Transform data to GeoJSON
    const geoJson = this.dataToGeoJSON(this.data);

    // Add source
    this.map.addSource(this.geoJsonSourceId, {
      type: 'geojson',
      data: geoJson,
    });

    // Add layer
    const layerConfig = this.createLayerConfig();
    this.map.addLayer({
      ...layerConfig,
      id: this.config.id,
      source: this.geoJsonSourceId,
      layout: {
        ...layerConfig.layout,
        visibility: this.config.visible ? 'visible' : 'none',
      },
      minzoom: this.config.minZoom,
      maxzoom: this.config.maxZoom,
    });

    // Setup event handlers
    this.setupEventHandlers();

    this.isAdded = true;

    if (this.handlers.onAdd) {
      this.handlers.onAdd();
    }
  }

  /**
   * Update layer data
   */
  update(data: TData[]): void {
    this.data = data;

    if (!this.isAdded) {
      return;
    }

    const geoJson = this.dataToGeoJSON(data);
    const source = this.map.getSource(this.geoJsonSourceId) as GeoJSONSource;

    if (source) {
      source.setData(geoJson);
    }
  }

  /**
   * Remove layer from map
   */
  remove(): void {
    if (!this.isAdded) {
      return;
    }

    // Remove event handlers
    this.teardownEventHandlers();

    // Remove layer
    if (this.map.getLayer(this.config.id)) {
      this.map.removeLayer(this.config.id);
    }

    // Remove source
    if (this.map.getSource(this.geoJsonSourceId)) {
      this.map.removeSource(this.geoJsonSourceId);
    }

    this.isAdded = false;

    if (this.handlers.onRemove) {
      this.handlers.onRemove();
    }
  }

  /**
   * Show layer
   */
  show(): void {
    this.config.visible = true;
    if (this.isAdded) {
      this.map.setLayoutProperty(this.config.id, 'visibility', 'visible');
    }
  }

  /**
   * Hide layer
   */
  hide(): void {
    this.config.visible = false;
    if (this.isAdded) {
      this.map.setLayoutProperty(this.config.id, 'visibility', 'none');
    }
  }

  /**
   * Toggle layer visibility
   */
  toggle(): void {
    if (this.config.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Set layer opacity
   */
  setOpacity(opacity: number): void {
    this.config.opacity = Math.max(0, Math.min(1, opacity));
    // Opacity implementation depends on layer type
    // Override in subclasses if needed
  }

  /**
   * Setup event handlers
   */
  protected setupEventHandlers(): void {
    if (this.handlers.onClick) {
      this.map.on('click', this.config.id, this.handleClick.bind(this));
    }

    if (this.handlers.onHover) {
      this.map.on('mousemove', this.config.id, this.handleHover.bind(this));
      this.map.on('mouseleave', this.config.id, this.handleHoverEnd.bind(this));
    }

    if (this.handlers.onDoubleClick) {
      this.map.on('dblclick', this.config.id, this.handleDoubleClick.bind(this));
    }
  }

  /**
   * Teardown event handlers
   */
  protected teardownEventHandlers(): void {
    if (this.handlers.onClick) {
      this.map.off('click', this.config.id, this.handleClick.bind(this));
    }

    if (this.handlers.onHover) {
      this.map.off('mousemove', this.config.id, this.handleHover.bind(this));
      this.map.off('mouseleave', this.config.id, this.handleHoverEnd.bind(this));
    }

    if (this.handlers.onDoubleClick) {
      this.map.off('dblclick', this.config.id, this.handleDoubleClick.bind(this));
    }
  }

  /**
   * Handle click event
   */
  protected handleClick(e: maplibregl.MapMouseEvent): void {
    const features = this.map.queryRenderedFeatures(e.point, {
      layers: [this.config.id],
    });

    if (features.length > 0 && this.handlers.onClick) {
      const feature = this.featureToData(features[0]);
      this.handlers.onClick(feature, e);
    }
  }

  /**
   * Handle hover event
   */
  protected handleHover(e: maplibregl.MapMouseEvent): void {
    const features = this.map.queryRenderedFeatures(e.point, {
      layers: [this.config.id],
    });

    if (features.length > 0 && this.handlers.onHover) {
      const feature = this.featureToData(features[0]);
      this.map.getCanvas().style.cursor = 'pointer';
      this.handlers.onHover(feature, e);
    }
  }

  /**
   * Handle hover end event
   */
  protected handleHoverEnd(e: maplibregl.MapMouseEvent): void {
    this.map.getCanvas().style.cursor = '';
    if (this.handlers.onHover) {
      this.handlers.onHover(null, e);
    }
  }

  /**
   * Handle double click event
   */
  protected handleDoubleClick(e: maplibregl.MapMouseEvent): void {
    const features = this.map.queryRenderedFeatures(e.point, {
      layers: [this.config.id],
    });

    if (features.length > 0 && this.handlers.onDoubleClick) {
      const feature = this.featureToData(features[0]);
      this.handlers.onDoubleClick(feature, e);
    }
  }

  /**
   * Convert GeoJSON feature back to original data format
   * Override in subclasses if needed
   */
  protected featureToData(feature: Feature<Geometry>): TFeature {
    return feature.properties as TFeature;
  }

  /**
   * Get layer ID
   */
  getId(): string {
    return this.config.id;
  }

  /**
   * Get layer visibility
   */
  isVisible(): boolean {
    return this.config.visible;
  }

  /**
   * Get layer data
   */
  getData(): TData[] {
    return this.data;
  }
}

/**
 * Helper function to create GeoJSON point feature
 */
export function createPointFeature(
  coordinates: [number, number],
  properties: Record<string, any>
): Feature {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates,
    },
    properties,
  };
}

/**
 * Helper function to create GeoJSON FeatureCollection
 */
export function createFeatureCollection(features: Feature[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features,
  };
}
