/**
 * BatchClusterLayer.ts
 *
 * MapLibre cluster layer for delivery batches
 * Renders batches with clustering at low zoom, individual markers at high zoom
 */

import type { Map as MapLibreMap, CircleLayerSpecification, SymbolLayerSpecification } from 'maplibre-gl';
import type { FeatureCollection, Point } from 'geojson';
import { MapLayer, type LayerHandlers } from '@/map/core/LayerInterface';
import { STATE_COLORS, ZOOM_BREAKPOINTS, CLUSTER } from '@/lib/mapDesignSystem';
import type { DeliveryBatch } from '@/types';
import type { RepresentationMode } from '@/components/map/RepresentationToggle';

/**
 * Batch Cluster Layer Configuration
 */
export interface BatchClusterLayerConfig {
  /** Enable clustering (default: true) */
  enableClustering?: boolean;

  /** Cluster radius in pixels (default: 50) */
  clusterRadius?: number;

  /** Maximum zoom to cluster (default: 14) */
  clusterMaxZoom?: number;

  /** Minimum zoom to show batches (default: Z1 = 6) */
  minZoom?: number;

  /** Show batch labels (default: true) */
  showLabels?: boolean;

  /** Minimum zoom for labels (default: Z2 = 12) */
  labelMinZoom?: number;

  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Batch Cluster Layer for MapLibre
 *
 * Renders delivery batches with:
 * - Automatic clustering at low zoom
 * - Individual markers at high zoom
 * - Status-based color encoding
 * - Count badges on clusters
 */
export class BatchClusterLayer extends MapLayer<DeliveryBatch, Point> {
  private config: Required<BatchClusterLayerConfig>;
  private readonly clusterLayerId: string;
  private readonly clusterCountLayerId: string;
  private readonly unclusteredLayerId: string;
  private readonly labelLayerId: string;
  private currentMode: RepresentationMode = 'entity-rich';

  constructor(
    map: MapLibreMap,
    batches: DeliveryBatch[],
    handlers: LayerHandlers<Point> = {},
    config: BatchClusterLayerConfig = {}
  ) {
    super(map, batches, handlers, {
      id: 'batches-layer',
      minZoom: config.minZoom || ZOOM_BREAKPOINTS.Z1,
    });

    this.config = {
      enableClustering: config.enableClustering ?? true,
      clusterRadius: config.clusterRadius ?? 50,
      clusterMaxZoom: config.clusterMaxZoom ?? 14,
      minZoom: config.minZoom || ZOOM_BREAKPOINTS.Z1,
      showLabels: config.showLabels ?? true,
      labelMinZoom: config.labelMinZoom || ZOOM_BREAKPOINTS.Z2,
      debug: config.debug ?? false,
    };

    this.clusterLayerId = `${this.config.id}-clusters`;
    this.clusterCountLayerId = `${this.config.id}-cluster-count`;
    this.unclusteredLayerId = `${this.config.id}-unclustered`;
    this.labelLayerId = `${this.config.id}-labels`;
  }

  /**
   * Transform batches to GeoJSON
   * Uses first waypoint as batch location for planning purposes
   */
  protected dataToGeoJSON(batches: DeliveryBatch[]): FeatureCollection<Point> {
    const features = batches
      .filter((batch) => {
        // For planning, use first facility as batch location
        // In operational mode, would use current vehicle position
        return batch.facilities && batch.facilities.length > 0;
      })
      .map((batch) => {
        const firstFacility = batch.facilities![0];

        return {
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [firstFacility.lng, firstFacility.lat],
          },
          properties: {
            id: batch.id,
            type: 'batch',
            name: batch.name,
            status: batch.status,
            priority: batch.priority,
            facilityCount: batch.facilities?.length || 0,
            totalDistance: batch.totalDistance,
            estimatedDuration: batch.estimatedDuration,
            vehicleId: batch.vehicleId,
            driverId: batch.driverId,
            // State encoding (marker color)
            markerColor: this.getBatchMarkerColor(batch),
          },
          id: batch.id,
        };
      });

    return {
      type: 'FeatureCollection',
      features,
    };
  }

  /**
   * Get batch marker color based on status
   */
  private getBatchMarkerColor(batch: DeliveryBatch): string {
    const statusColors: Record<string, string> = {
      planned: STATE_COLORS.batch.planned.replace('bg-', '#'),
      assigned: STATE_COLORS.batch.assigned.replace('bg-', '#'),
      in_progress: STATE_COLORS.batch.in_progress.replace('bg-', '#'),
      completed: STATE_COLORS.batch.completed.replace('bg-', '#'),
      cancelled: STATE_COLORS.batch.cancelled.replace('bg-', '#'),
    };

    return statusColors[batch.status] || '#6b7280'; // gray-500 default
  }

  /**
   * Create cluster circle layer
   */
  private createClusterLayerConfig(): CircleLayerSpecification {
    return {
      id: this.clusterLayerId,
      type: 'circle',
      source: this.geoJsonSourceId,
      filter: ['has', 'point_count'],
      paint: {
        // Cluster size based on point count
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          20, // < 10 batches
          10, 30, // 10-99 batches
          100, 40, // 100+ batches
        ],
        // Cluster color (blue for batches)
        'circle-color': '#3b82f6', // blue-500
        'circle-opacity': 0.9,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    };
  }

  /**
   * Create cluster count label layer
   */
  private createClusterCountLayerConfig(): SymbolLayerSpecification {
    return {
      id: this.clusterCountLayerId,
      type: 'symbol',
      source: this.geoJsonSourceId,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': 14,
      },
      paint: {
        'text-color': '#ffffff',
      },
    };
  }

  /**
   * Create unclustered point layer
   */
  private createUnclusteredLayerConfig(): CircleLayerSpecification {
    return {
      id: this.unclusteredLayerId,
      type: 'circle',
      source: this.geoJsonSourceId,
      filter: ['!', ['has', 'point_count']],
      minzoom: this.config.minZoom,
      paint: {
        'circle-radius': 8,
        // Color based on batch status
        'circle-color': ['get', 'markerColor'],
        'circle-opacity': 0.9,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    };
  }

  /**
   * Create label layer for unclustered batches
   */
  private createLabelLayerConfig(): SymbolLayerSpecification {
    return {
      id: this.labelLayerId,
      type: 'symbol',
      source: this.geoJsonSourceId,
      filter: ['!', ['has', 'point_count']],
      minzoom: this.config.labelMinZoom,
      layout: {
        'text-field': [
          'format',
          ['get', 'name'],
          {},
          '\n',
          {},
          ['concat', ['get', 'facilityCount'], ' facilities'],
          { 'font-scale': 0.8 },
        ],
        'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
        'text-size': 12,
        'text-offset': [0, 1.5],
        'text-anchor': 'top',
        'text-optional': true,
      },
      paint: {
        'text-color': '#1f2937',
        'text-halo-color': '#ffffff',
        'text-halo-width': 2,
      },
    };
  }

  /**
   * Create layer configuration (not used directly, see add() method)
   */
  protected createLayerConfig(): any {
    // Not used - we create multiple layers in add() method
    return null;
  }

  /**
   * Add layer to map
   */
  add(): void {
    if (this.isAdded) {
      console.warn(`[BatchClusterLayer] Layer already added`);
      return;
    }

    const geoJson = this.dataToGeoJSON(this.data);

    // Add GeoJSON source with clustering
    if (!this.map.getSource(this.geoJsonSourceId)) {
      this.map.addSource(this.geoJsonSourceId, {
        type: 'geojson',
        data: geoJson,
        cluster: this.config.enableClustering,
        clusterRadius: this.config.clusterRadius,
        clusterMaxZoom: this.config.clusterMaxZoom,
      });
    }

    // Add layers
    if (this.config.enableClustering) {
      if (!this.map.getLayer(this.clusterLayerId)) {
        this.map.addLayer(this.createClusterLayerConfig());
      }
      if (!this.map.getLayer(this.clusterCountLayerId)) {
        this.map.addLayer(this.createClusterCountLayerConfig());
      }
    }

    if (!this.map.getLayer(this.unclusteredLayerId)) {
      this.map.addLayer(this.createUnclusteredLayerConfig());
    }

    if (this.config.showLabels && !this.map.getLayer(this.labelLayerId)) {
      this.map.addLayer(this.createLabelLayerConfig());
    }

    // Setup event handlers
    this.setupEventHandlers();

    this.isAdded = true;

    if (this.config.debug) {
      console.log(
        `[BatchClusterLayer] Added ${geoJson.features.length} batches (clustering: ${this.config.enableClustering})`
      );
    }
  }

  /**
   * Setup click and hover event handlers
   */
  protected setupEventHandlers(): void {
    // Cluster click - zoom in
    if (this.config.enableClustering) {
      this.map.on('click', this.clusterLayerId, (e) => {
        if (e.features && e.features.length > 0) {
          const clusterId = e.features[0].properties?.cluster_id;
          const source = this.map.getSource(this.geoJsonSourceId);

          if (source && source.type === 'geojson') {
            source.getClusterExpansionZoom(clusterId, (err, zoom) => {
              if (err) return;

              this.map.easeTo({
                center: (e.features![0].geometry as any).coordinates,
                zoom: zoom || 0,
              });
            });
          }
        }
      });

      // Cluster hover - change cursor
      this.map.on('mouseenter', this.clusterLayerId, () => {
        this.map.getCanvas().style.cursor = 'pointer';
      });

      this.map.on('mouseleave', this.clusterLayerId, () => {
        this.map.getCanvas().style.cursor = '';
      });
    }

    // Unclustered point click
    if (this.handlers.onClick) {
      this.map.on('click', this.unclusteredLayerId, (e) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          this.handlers.onClick!(feature as any, e.lngLat);
        }
      });
    }

    // Unclustered point hover
    if (this.handlers.onHover) {
      this.map.on('mouseenter', this.unclusteredLayerId, (e) => {
        this.map.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          this.handlers.onHover!(feature as any, e.lngLat);
        }
      });

      this.map.on('mouseleave', this.unclusteredLayerId, () => {
        this.map.getCanvas().style.cursor = '';
      });
    }
  }

  /**
   * Update layer data
   */
  update(batches: DeliveryBatch[]): void {
    this.data = batches;
    const geoJson = this.dataToGeoJSON(batches);

    const source = this.map.getSource(this.geoJsonSourceId);
    if (source && source.type === 'geojson') {
      source.setData(geoJson);

      if (this.config.debug) {
        console.log(
          `[BatchClusterLayer] Updated ${geoJson.features.length} batches`
        );
      }
    }
  }

  /**
   * Remove layer from map
   */
  remove(): void {
    if (!this.isAdded) {
      return;
    }

    const layersToRemove = [
      this.clusterLayerId,
      this.clusterCountLayerId,
      this.unclusteredLayerId,
      this.labelLayerId,
    ];

    layersToRemove.forEach((layerId) => {
      if (this.map.getLayer(layerId)) {
        this.map.removeLayer(layerId);
      }
    });

    if (this.map.getSource(this.geoJsonSourceId)) {
      this.map.removeSource(this.geoJsonSourceId);
    }

    this.isAdded = false;

    if (this.config.debug) {
      console.log('[BatchClusterLayer] Removed');
    }
  }

  /**
   * Toggle layer visibility
   */
  toggle(visible: boolean): void {
    const visibility = visible ? 'visible' : 'none';

    const layersToToggle = [
      this.clusterLayerId,
      this.clusterCountLayerId,
      this.unclusteredLayerId,
      this.labelLayerId,
    ];

    layersToToggle.forEach((layerId) => {
      if (this.map.getLayer(layerId)) {
        this.map.setLayoutProperty(layerId, 'visibility', visibility);
      }
    });

    if (this.config.debug) {
      console.log(`[BatchClusterLayer] Visibility: ${visibility}`);
    }
  }

  /**
   * Get batches within viewport
   */
  getBatchesInView(): DeliveryBatch[] {
    const features = this.map.queryRenderedFeatures(undefined, {
      layers: [this.unclusteredLayerId],
    });

    return features.map((f) => f.properties as unknown as DeliveryBatch);
  }

  /**
   * Apply mode configuration without recreating layer
   * Used by MapRuntime for instant mode switching
   */
  applyModeConfig(mode: RepresentationMode): void {
    this.currentMode = mode;

    if (!this.isAdded) return;

    if (mode === 'minimal') {
      // Minimal mode: smaller clusters, aggressive clustering, no labels
      this.map.setPaintProperty(this.clusterLayerId, 'circle-radius', [
        'step',
        ['get', 'point_count'],
        15, // Small size for 1-10 items
        10, 20, // Medium size for 10-50 items
        50, 25, // Large size for 50+ items
      ]);

      this.map.setPaintProperty(this.unclusteredLayerId, 'circle-radius', 4);

      // Hide labels in minimal mode
      if (this.map.getLayer(this.labelLayerId)) {
        this.map.setLayoutProperty(this.labelLayerId, 'visibility', 'none');
      }
    } else {
      // Entity-rich mode: full-size markers with labels
      this.map.setPaintProperty(this.clusterLayerId, 'circle-radius', [
        'step',
        ['get', 'point_count'],
        20, // Small size for 1-10 items
        10, 30, // Medium size for 10-50 items
        50, 40, // Large size for 50+ items
      ]);

      this.map.setPaintProperty(this.unclusteredLayerId, 'circle-radius', 8);

      // Show labels if enabled
      if (this.config.showLabels && this.map.getLayer(this.labelLayerId)) {
        this.map.setLayoutProperty(this.labelLayerId, 'visibility', 'visible');
      }
    }

    if (this.config.debug) {
      console.log(`[BatchClusterLayer] Mode applied: ${mode}`);
    }
  }
}
