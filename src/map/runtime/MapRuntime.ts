/**
 * MapRuntime.ts
 *
 * Singleton runtime that owns the map lifecycle completely.
 *
 * GOVERNANCE:
 * - React NEVER calls MapLibre APIs directly
 * - React only sends commands to MapRuntime
 * - MapRuntime owns map instance, layers, sources
 * - Layers are mounted once and updated via config
 *
 * This pattern matches industry standards:
 * - Uber Base Web Maps (MapController)
 * - Google Maps Platform (SDK-owned instance)
 * - Mapbox Studio (Runtime singleton)
 * - CARTO (Deck.gl controller)
 * - Esri ArcGIS (MapView owned by framework)
 */

import maplibregl from 'maplibre-gl';
import type { RepresentationMode } from '@/components/map/RepresentationToggle';
import { VehicleSymbolLayer } from '@/map/layers/VehicleSymbolLayer';
import { VehicleTrailLayer } from '@/map/layers/VehicleTrailLayer';
import { DriverSymbolLayer } from '@/map/layers/DriverSymbolLayer';
import { RouteLineLayer } from '@/map/layers/RouteLineLayer';
import { AlertSymbolLayer } from '@/map/layers/AlertSymbolLayer';
import { BatchClusterLayer } from '@/map/layers/BatchClusterLayer';
import { FacilitySymbolLayer } from '@/map/layers/FacilitySymbolLayer';
import { WarehouseSymbolLayer } from '@/map/layers/WarehouseSymbolLayer';
import type { MapLayer } from '@/map/core/LayerInterface';
import { MapStateMachine, MapRuntimeState } from '@/lib/mapStateMachine';

export type MapContext = 'operational' | 'planning' | 'forensic';

export interface MapConfig {
  context: MapContext;
  style: string | maplibregl.StyleSpecification;
  center: [number, number];
  zoom: number;
  minZoom?: number;
  maxZoom?: number;
}

export interface LayerHandlers {
  onVehicleClick?: (vehicle: any) => void;
  onDriverClick?: (driver: any) => void;
  onRouteClick?: (route: any) => void;
  onAlertClick?: (alert: any) => void;
  onBatchClick?: (batch: any) => void;
  onFacilityClick?: (facility: any) => void;
  onWarehouseClick?: (warehouse: any) => void;
}

/**
 * Mode Configuration
 * Defines capabilities and requirements for each map mode
 */
export interface MapModeConfig {
  requiresTimeRange: boolean;
  requiresPlaybackData: boolean;
  readOnly: boolean;
  defaultMode: RepresentationMode;
}

export const MODE_CONFIG: Record<MapContext, MapModeConfig> = {
  operational: {
    requiresTimeRange: false,
    requiresPlaybackData: false,
    readOnly: false,
    defaultMode: 'entity-rich',
  },
  planning: {
    requiresTimeRange: false,
    requiresPlaybackData: false,
    readOnly: false,
    defaultMode: 'entity-rich',
  },
  forensic: {
    requiresTimeRange: true,
    requiresPlaybackData: true,
    readOnly: true,
    defaultMode: 'minimal',
  },
};

/**
 * Layer Governance Configuration
 *
 * CRITICAL: Defines which layers are allowed in each map mode
 * Operational mode MUST NOT render analytics/planning geometry
 *
 * GOVERNANCE RULE:
 * - Operational = entity-centric (vehicles, routes, facilities, warehouses)
 * - Planning = entity-centric + analytics (H3 hexagons, coverage rings)
 * - Forensic = entity-centric + playback timeline
 */
export const LAYER_GOVERNANCE: Record<MapContext, {
  allowed: string[];
  forbidden: string[];
}> = {
  operational: {
    allowed: ['warehouses', 'facilities', 'trails', 'routes', 'vehicles', 'drivers', 'alerts', 'batches'],
    forbidden: ['h3-hexagon', 'warehouse-coverage', 'planning-zones', 'analytics-overlay'],
  },
  planning: {
    allowed: ['warehouses', 'facilities', 'trails', 'routes', 'vehicles', 'drivers', 'alerts', 'batches', 'h3-hexagon', 'warehouse-coverage', 'planning-zones'],
    forbidden: [],
  },
  forensic: {
    allowed: ['warehouses', 'facilities', 'trails', 'routes', 'vehicles', 'drivers', 'alerts', 'batches', 'playback-timeline'],
    forbidden: ['h3-hexagon', 'warehouse-coverage', 'planning-zones'],
  },
};

/**
 * Update Queue Entry
 */
interface UpdateQueueEntry {
  data: any[];
  timestamp: number;
  priority: 'high' | 'normal' | 'low';
}

/**
 * Update Queue Configuration
 */
const QUEUE_CONFIG = {
  MAX_QUEUE_SIZE: 100, // Prevent unbounded growth
  DROP_STRATEGY: 'oldest' as const, // Drop oldest updates when full
};

/**
 * Playback Data
 * Required for forensic mode
 */
export interface PlaybackData {
  startTime: Date;
  endTime: Date;
  currentTime: Date;
  isPlaying: boolean;
  speed: number;
}

/**
 * MapRuntime - Single authority for all map lifecycle
 *
 * GOVERNANCE:
 * - React NEVER calls MapLibre APIs directly
 * - React only sends commands to MapRuntime
 * - MapRuntime owns map instance, layers, sources
 * - Layers are mounted once and updated via config
 */
class MapRuntime {
  private map: maplibregl.Map | null = null;
  private container: HTMLElement | null = null;
  private layers = new Map<string, MapLayer>();
  private mode: RepresentationMode = 'entity-rich';
  private context: MapContext = 'operational';
  private handlers: LayerHandlers = {};
  private stateMachine = new MapStateMachine();
  private playbackData: PlaybackData | null = null;
  private readyCallbacks: (() => void)[] = [];
  private updateQueues = new Map<string, UpdateQueueEntry[]>(); // FIFO queues per layer
  private queueMetrics = { enqueued: 0, dropped: 0, flushed: 0 }; // Queue health metrics
  private demoEngine: any | null = null; // DemoEngine instance (owned by MapRuntime)

  /**
   * Register callback to be called when MapRuntime is ready
   * If already ready, calls callback immediately
   *
   * USAGE: Demo engines, data feeders, and external systems must use this
   * to ensure MapRuntime is fully initialized before pushing data.
   */
  onReady(callback: () => void): void {
    if (this.stateMachine.is(MapRuntimeState.READY)) {
      callback();
    } else {
      this.readyCallbacks.push(callback);
    }
  }

  /**
   * Mark runtime as ready and fire all pending callbacks
   * Called only after:
   * - Map 'load' event fires
   * - All sources added
   * - All layers mounted
   */
  private markReady(): void {
    this.stateMachine.setState(MapRuntimeState.READY, 'All layers mounted and updates flushed');
    console.log('[MapRuntime] READY — accepting data updates');

    this.readyCallbacks.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        console.error('[MapRuntime] Error in ready callback:', error);
      }
    });

    this.readyCallbacks = [];
  }

  /**
   * Initialize map instance OR reattach to new container
   * Called once on component mount
   */
  init(container: HTMLElement, config: MapConfig, handlers: LayerHandlers = {}): void {
    // If already initialized, check if context changed
    if (!this.stateMachine.is(MapRuntimeState.UNINITIALIZED) && this.map) {
      const contextChanged = this.context !== config.context;

      // Update context and handlers
      this.context = config.context;
      this.handlers = handlers;

      // If context changed, clean up forbidden layers
      if (contextChanged) {
        this.enforceModeGovernance(config.context);
      }

      this.attach(container);
      console.log(`[MapRuntime] Reattached to ${config.context} container (context changed: ${contextChanged})`);
      return;
    }

    this.context = config.context;
    this.handlers = handlers;
    this.container = container;

    // Transition to INITIALIZING
    this.stateMachine.setState(MapRuntimeState.INITIALIZING, `Initializing ${config.context} map`);

    // Create MapLibre instance
    this.map = new maplibregl.Map({
      container,
      style: config.style,
      center: config.center,
      zoom: config.zoom,
      minZoom: config.minZoom || 0,
      maxZoom: config.maxZoom || 22,
    });

    // Mount layers when map is ready
    this.map.on('load', () => {
      // Load operational sprites
      this.loadOperationalSprites();

      // Transition to LOADING_LAYERS
      this.stateMachine.setState(MapRuntimeState.LOADING_LAYERS, 'Map load event fired');
      this.mountLayers();
    });
  }

  /**
   * Attach map to a new container
   * Used when navigating between different map pages
   *
   * SAFE REATTACHMENT:
   * - Saves camera position and zoom
   * - Cleanly destroys old map instance
   * - Reinitializes with saved state
   * - Remounts all layers
   * - Restores demo if it was running
   */
  private attach(newContainer: HTMLElement): void {
    if (!this.map) return;

    // If already attached to this container, do nothing
    if (this.container === newContainer) {
      return;
    }

    console.log('[MapRuntime] Reattaching to new container');

    // Save current state
    const currentCenter = this.map.getCenter();
    const currentZoom = this.map.getZoom();
    const currentBearing = this.map.getBearing();
    const currentPitch = this.map.getPitch();
    const wasDemo = this.isDemoActive();
    const currentStyle = this.map.getStyle();

    // Transition to DETACHED state
    this.stateMachine.setState(MapRuntimeState.DETACHED, 'Container lost, reattaching');

    // Stop demo temporarily
    if (wasDemo) {
      this.disableDemoMode();
    }

    // Remove layers cleanly
    this.layers.forEach((layer) => {
      layer.remove();
    });
    this.layers.clear();

    // Remove old map instance
    this.map.remove();
    this.map = null;

    // Store new container reference
    this.container = newContainer;

    // Transition to INITIALIZING
    this.stateMachine.setState(MapRuntimeState.INITIALIZING, 'Reinitializing with new container');

    // Recreate MapLibre instance with saved state
    this.map = new maplibregl.Map({
      container: newContainer,
      style: currentStyle,
      center: currentCenter,
      zoom: currentZoom,
      bearing: currentBearing,
      pitch: currentPitch,
    });

    // Remount layers when map is ready
    this.map.on('load', () => {
      // Load operational sprites
      this.loadOperationalSprites();

      this.stateMachine.setState(MapRuntimeState.LOADING_LAYERS, 'Map reloaded');
      this.mountLayers();

      // Restart demo if it was running
      if (wasDemo) {
        this.enableDemoMode({ mode: this.context });
      }
    });

    console.log(`[MapRuntime] Container reattached successfully`);
  }

  /**
   * Load operational sprites into the map
   * Uses Phosphor icon sprites generated at /public/map/sprites/operational.*
   */
  private loadOperationalSprites(): void {
    if (!this.map) return;

    // Get current style
    const style = this.map.getStyle();
    if (!style) return;

    // Add sprite URL to style (must be absolute URL)
    // MapLibre will automatically load both operational.json and operational.png
    const baseUrl = import.meta.env.VITE_BASE_URL || window.location.origin;
    style.sprite = `${baseUrl}/map/sprites/operational`;

    // Update map style with sprite reference
    this.map.setStyle(style);

    console.log('[MapRuntime] Loaded operational sprites from', style.sprite);
  }

  /**
   * Mount all layers (called once on map load)
   * Layers are created and added to map, then updated via data/config
   */
  private mountLayers(): void {
    if (!this.map) return;

    // Create layer instances
    // Layer order (bottom to top): warehouses → facilities → trails → routes → vehicles → drivers → alerts → batches

    // Warehouses layer (base layer - departure points)
    const warehousesLayer = new WarehouseSymbolLayer(
      this.map,
      [],
      {
        onClick: this.handlers.onWarehouseClick,
      },
      { id: 'warehouses-layer' }
    );

    // Facilities layer (delivery destinations)
    const facilitiesLayer = new FacilitySymbolLayer(
      this.map,
      [],
      {
        onClick: this.handlers.onFacilityClick,
      },
      { id: 'facilities-layer' }
    );

    // Trails layer BEFORE vehicle symbol layer (renders behind)
    const trailsLayer = new VehicleTrailLayer(
      this.map,
      [],
      {},
      { id: 'trails-layer', minZoom: 6 }
    );

    const vehiclesLayer = new VehicleSymbolLayer(
      this.map,
      [],
      {
        onClick: this.handlers.onVehicleClick,
      },
      { id: 'vehicles-layer' }
    );

    const driversLayer = new DriverSymbolLayer(
      this.map,
      [],
      {
        onClick: this.handlers.onDriverClick,
      },
      { id: 'drivers-layer' }
    );

    const routesLayer = new RouteLineLayer(
      this.map,
      [],
      {
        onClick: this.handlers.onRouteClick,
      },
      { id: 'routes-layer' }
    );

    const alertsLayer = new AlertSymbolLayer(
      this.map,
      [],
      {
        onClick: this.handlers.onAlertClick,
      },
      { id: 'alerts-layer' }
    );

    const batchesLayer = new BatchClusterLayer(
      this.map,
      [],
      {
        onClick: this.handlers.onBatchClick,
      },
      { id: 'batches-layer' }
    );

    // Store layer references (in render order)
    this.layers.set('warehouses', warehousesLayer);
    this.layers.set('facilities', facilitiesLayer);
    this.layers.set('trails', trailsLayer);
    this.layers.set('routes', routesLayer);
    this.layers.set('vehicles', vehiclesLayer);
    this.layers.set('drivers', driversLayer);
    this.layers.set('alerts', alertsLayer);
    this.layers.set('batches', batchesLayer);

    // Mount layers to map
    this.layers.forEach((layer) => {
      layer.add();
    });

    console.log('[MapRuntime] Layers mounted');

    // Transition to LAYERS_MOUNTED
    this.stateMachine.setState(MapRuntimeState.LAYERS_MOUNTED, 'All layers added to map');

    // Flush any pending updates that arrived before layers were ready
    this.flushPendingUpdates();

    // Mark runtime as ready - all sources and layers are now available
    this.markReady();
  }

  /**
   * Enqueue update for layer
   * Uses FIFO queue with size limits and backpressure
   */
  private enqueueUpdate(
    layerId: string,
    data: any[],
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): void {
    const queue = this.updateQueues.get(layerId) || [];

    // Check queue size limit
    if (queue.length >= QUEUE_CONFIG.MAX_QUEUE_SIZE) {
      console.warn(
        `[MapRuntime] Queue for ${layerId} at capacity (${queue.length}), dropping oldest update`
      );

      // Drop oldest update (FIFO head)
      queue.shift();
      this.queueMetrics.dropped++;
    }

    // Enqueue new update
    queue.push({
      data,
      timestamp: Date.now(),
      priority,
    });

    this.updateQueues.set(layerId, queue);
    this.queueMetrics.enqueued++;
  }

  /**
   * Flush pending updates to layers
   * Called after layers are mounted
   * Processes queues in FIFO order
   */
  private flushPendingUpdates(): void {
    if (this.updateQueues.size === 0) return;

    const totalUpdates = Array.from(this.updateQueues.values()).reduce(
      (sum, queue) => sum + queue.length,
      0
    );

    console.log(`[MapRuntime] Flushing ${totalUpdates} pending updates across ${this.updateQueues.size} layers`);

    this.updateQueues.forEach((queue, layerId) => {
      const layer = this.layers.get(layerId);
      if (!layer) {
        console.warn(`[MapRuntime] Layer ${layerId} not found, discarding ${queue.length} queued updates`);
        return;
      }

      // Process queue in FIFO order
      // Take only the most recent update (optimization)
      const latestUpdate = queue[queue.length - 1];
      if (latestUpdate) {
        layer.update(latestUpdate.data);
        this.queueMetrics.flushed += queue.length;
        console.log(
          `[MapRuntime] Flushed ${queue.length} updates for layer: ${layerId} (${latestUpdate.data.length} items)`
        );
      }
    });

    this.updateQueues.clear();
  }

  /**
   * Update representation mode
   * Layers update styling without recreation
   */
  setMode(mode: RepresentationMode): void {
    if (!this.stateMachine.canAcceptUpdates()) {
      console.warn('[MapRuntime] Not ready yet, state:', this.stateMachine.getState());
      return;
    }

    this.mode = mode;

    // Notify layers of mode change
    // Layers update styling without being removed/re-added
    this.layers.forEach((layer) => {
      if ('applyModeConfig' in layer) {
        (layer as any).applyModeConfig(mode);
      }
    });

    console.log(`[MapRuntime] Mode changed to: ${mode}`);
  }

  /**
   * Update layer data
   * Layers update GeoJSON without recreation
   *
   * CRITICAL: Queues updates if layer is not yet registered
   * Flushes queue when layer is mounted
   */
  updateLayer(id: string, data: any[], priority: 'high' | 'normal' | 'low' = 'normal'): void {
    // Queue updates if not ready yet
    if (!this.stateMachine.canAcceptUpdates()) {
      console.warn('[MapRuntime] State:', this.stateMachine.getState(), '- queueing update for layer:', id);
      this.enqueueUpdate(id, data, priority);
      return;
    }

    const layer = this.layers.get(id);
    if (layer) {
      layer.update(data);
    } else {
      // Layer not registered yet - queue the update
      console.warn(`[MapRuntime] Layer ${id} not registered yet - queueing update`);
      this.enqueueUpdate(id, data, priority);
    }
  }

  /**
   * Show/hide layer
   */
  setLayerVisibility(id: string, visible: boolean): void {
    if (!this.stateMachine.canAcceptUpdates()) return;

    const layer = this.layers.get(id);
    if (layer) {
      visible ? layer.show() : layer.hide();
    }
  }

  /**
   * Toggle layer visibility
   * Convenience method for filter controls
   * Maps logical layer names to actual layer IDs
   */
  toggleLayerVisibility(id: string, visible: boolean): void {
    // Map logical layer names to actual MapLibre layer IDs
    const layerIdMap: Record<string, string> = {
      'trails': 'trails-layer-line',
      'routes': 'routes-layer-line',
      'facilities': 'facilities-layer-symbols',
      'warehouses': 'warehouses-layer-symbols',
      'vehicles': 'vehicles-layer-symbol',
    };

    const actualLayerId = layerIdMap[id] || id;
    this.setLayerVisibility(actualLayerId, visible);
  }

  /**
   * Layer ID Registry
   * Maps logical layer names to actual MapLibre layer IDs
   * Centralizes layer ID management to prevent hard-coded references
   */
  private getLayerIds(): Record<string, string[]> {
    return {
      vehicles: ['vehicles-layer-symbol', 'vehicles-layer-label', 'vehicles-layer-payload-ring'],
      trails: ['trails-layer-line'],
      routes: ['routes-layer-line', 'routes-layer-progress', 'routes-layer-arrows', 'routes-layer-eta-markers'],
      facilities: ['facilities-layer-symbols', 'facilities-layer-labels'],
      warehouses: ['warehouses-layer-symbols', 'warehouses-layer-labels'],
      drivers: ['drivers-layer-symbol', 'drivers-layer-label'],
      alerts: ['alerts-layer-symbol'],
      batches: ['batches-layer-cluster'],
    };
  }

  /**
   * Safely get a MapLibre layer ID if it exists
   */
  private getExistingLayerId(layerId: string): string | null {
    if (!this.map) return null;
    return this.map.getLayer(layerId) ? layerId : null;
  }

  /**
   * Apply focus mode
   * De-emphasizes non-relevant entities via opacity
   * Uses MapLibre paint expressions for GPU-accelerated filtering
   *
   * GOVERNANCE:
   * - Uses layer registry to avoid hard-coded layer IDs
   * - Gracefully handles missing layers
   * - Affects all entity layers proportionally
   */
  applyFocusMode(mode: {
    onlySelected: boolean;
    onlyIssues: boolean;
    selectedVehicleId?: string | null;
  }): void {
    if (!this.map) return;

    const layerRegistry = this.getLayerIds();
    const vehicleLayerIds = layerRegistry.vehicles;

    // Find the first existing vehicle layer
    const vehicleSymbolLayerId = vehicleLayerIds.find(id => this.getExistingLayerId(id));

    if (!vehicleSymbolLayerId) {
      console.warn('[MapRuntime] No vehicle layers found, skipping focus mode');
      return;
    }

    // Reset to full opacity if no focus mode active
    if (!mode.onlySelected && !mode.onlyIssues) {
      vehicleLayerIds.forEach(layerId => {
        if (this.getExistingLayerId(layerId)) {
          try {
            this.map?.setPaintProperty(layerId, 'icon-opacity', 1);
            this.map?.setPaintProperty(layerId, 'text-opacity', 1);
          } catch {
            // Layer might not support these properties, ignore
          }
        }
      });

      // Also reset other entity layers
      const otherLayers = ['facilities', 'warehouses', 'routes', 'trails'];
      otherLayers.forEach(layerType => {
        layerRegistry[layerType]?.forEach(layerId => {
          if (this.getExistingLayerId(layerId)) {
            try {
              this.map?.setPaintProperty(layerId, 'line-opacity', 0.8);
              this.map?.setPaintProperty(layerId, 'icon-opacity', 1);
            } catch {
              // Ignore if property doesn't exist
            }
          }
        });
      });
      return;
    }

    // Build filter expression for focus mode
    let opacityExpression: any[] = ['case'];

    if (mode.onlySelected && mode.selectedVehicleId) {
      // Dim all vehicles except selected
      opacityExpression.push(
        ['==', ['get', 'id'], mode.selectedVehicleId],
        1, // Full opacity for selected
        0.25 // Dim others
      );
    } else if (mode.onlyIssues) {
      // Highlight vehicles with delays, breakdowns, alerts
      opacityExpression.push(
        ['in', ['get', 'status'], ['literal', ['delayed', 'broken_down', 'offline']]],
        1, // Full opacity for issues
        0.25 // Dim others
      );
    } else {
      // Default case
      opacityExpression.push(1);
    }

    // Apply opacity expression to all vehicle layers
    vehicleLayerIds.forEach(layerId => {
      if (this.getExistingLayerId(layerId)) {
        try {
          this.map?.setPaintProperty(layerId, 'icon-opacity', opacityExpression);
          this.map?.setPaintProperty(layerId, 'text-opacity', opacityExpression);
        } catch {
          // Layer might not support these properties
        }
      }
    });

    // Dim other entity layers when focusing on vehicles
    const otherLayers = ['facilities', 'warehouses'];
    otherLayers.forEach(layerType => {
      layerRegistry[layerType]?.forEach(layerId => {
        if (this.getExistingLayerId(layerId)) {
          try {
            this.map?.setPaintProperty(layerId, 'icon-opacity', 0.3);
          } catch {
            // Ignore
          }
        }
      });
    });

    console.log('[MapRuntime] Focus mode applied:', mode);
  }

  /**
   * Get map instance (for external controls)
   */
  getMap(): maplibregl.Map | null {
    return this.map;
  }

  /**
   * Centralized data update
   * Runtime decides which layers consume what data
   */
  update(data: {
    vehicles?: any[];
    trails?: any[];
    drivers?: any[];
    routes?: any[];
    alerts?: any[];
    batches?: any[];
    playback?: PlaybackData;
  }): void {
    if (!this.stateMachine.canAcceptUpdates()) {
      console.warn('[MapRuntime] State:', this.stateMachine.getState(), '- cannot accept updates yet');
      return;
    }

    // Update layers
    if (data.warehouses !== undefined) this.updateLayer('warehouses', data.warehouses);
    if (data.facilities !== undefined) this.updateLayer('facilities', data.facilities);
    if (data.trails !== undefined) this.updateLayer('trails', data.trails);
    if (data.vehicles !== undefined) this.updateLayer('vehicles', data.vehicles);
    if (data.drivers !== undefined) this.updateLayer('drivers', data.drivers);
    if (data.routes !== undefined) this.updateLayer('routes', data.routes);
    if (data.alerts !== undefined) this.updateLayer('alerts', data.alerts);
    if (data.batches !== undefined) this.updateLayer('batches', data.batches);

    // Update playback state (forensic mode only)
    if (data.playback !== undefined) {
      this.playbackData = data.playback;
    }
  }

  /**
   * Set playback data (for forensic mode)
   */
  setPlaybackData(playback: PlaybackData | null): void {
    const modeConfig = MODE_CONFIG[this.context];

    if (modeConfig.requiresPlaybackData && !playback) {
      console.warn('[MapRuntime] Forensic mode requires playback data');
      return;
    }

    this.playbackData = playback;
  }

  /**
   * Get playback data
   */
  getPlaybackData(): PlaybackData | null {
    return this.playbackData;
  }

  /**
   * Check if playback data is available
   */
  hasPlaybackData(): boolean {
    return this.playbackData !== null &&
           this.playbackData.startTime instanceof Date &&
           this.playbackData.endTime instanceof Date &&
           this.playbackData.currentTime instanceof Date &&
           !isNaN(this.playbackData.startTime.getTime()) &&
           !isNaN(this.playbackData.endTime.getTime()) &&
           !isNaN(this.playbackData.currentTime.getTime());
  }

  /**
   * Validate mode requirements
   * Returns true if current state satisfies mode requirements
   */
  validateModeRequirements(context: MapContext): boolean {
    const config = MODE_CONFIG[context];

    if (config.requiresPlaybackData && !this.hasPlaybackData()) {
      return false;
    }

    return true;
  }

  /**
   * Get current context
   */
  getContext(): MapContext {
    return this.context;
  }

  /**
   * Enforce mode governance
   *
   * CRITICAL: Removes any layers that are forbidden in the new context
   * This prevents planning/analytics geometry from appearing in Operational mode
   *
   * Called when:
   * - Context changes (e.g., navigating from Planning → Operational)
   * - On initial mount to ensure clean state
   */
  private enforceModeGovernance(newContext: MapContext): void {
    if (!this.map) return;

    const governance = LAYER_GOVERNANCE[newContext];
    const forbiddenLayers = governance.forbidden;

    console.log(`[MapRuntime] Enforcing ${newContext} mode governance, forbidden: ${forbiddenLayers.join(', ')}`);

    // List of layer ID patterns to check and remove
    const layerPatternsToRemove = [
      // H3 hexagon layers (Planning mode analytics)
      'h3-hexagon-layer-fill',
      'h3-hexagon-layer-border',
      'h3-hexagon-layer-labels',
      // Warehouse coverage layers (Planning mode)
      'warehouse-coverage-layer-fill',
      'warehouse-coverage-layer-border',
      // Planning zones
      'planning-zones-fill',
      'planning-zones-border',
      // Analytics overlays
      'analytics-overlay-fill',
      'analytics-heatmap',
    ];

    // Remove forbidden layers from MapLibre
    layerPatternsToRemove.forEach((layerId) => {
      try {
        if (this.map?.getLayer(layerId)) {
          this.map.removeLayer(layerId);
          console.log(`[MapRuntime] Removed forbidden layer: ${layerId}`);
        }
      } catch (e) {
        // Layer might not exist, which is fine
      }
    });

    // Remove associated sources
    const sourcePatternsToRemove = [
      'h3-hexagon-layer-source',
      'warehouse-coverage-layer-source',
      'planning-zones-source',
      'analytics-overlay-source',
    ];

    sourcePatternsToRemove.forEach((sourceId) => {
      try {
        if (this.map?.getSource(sourceId)) {
          this.map.removeSource(sourceId);
          console.log(`[MapRuntime] Removed forbidden source: ${sourceId}`);
        }
      } catch (e) {
        // Source might not exist, which is fine
      }
    });

    console.log(`[MapRuntime] Mode governance enforced for ${newContext}`);
  }

  /**
   * Enable demo mode
   * DemoEngine is owned by MapRuntime, not React components
   *
   * GOVERNANCE: Demo lifecycle follows map lifecycle
   * - Start demo ONLY after ready
   * - Demo survives page navigation
   * - Demo stops cleanly on disable
   */
  enableDemoMode(config?: { mode?: MapContext; seed?: number }): void {
    if (!this.stateMachine.is(MapRuntimeState.READY)) {
      console.warn('[MapRuntime] Cannot enable demo - state:', this.stateMachine.getState());
      return;
    }

    if (this.demoEngine) {
      console.warn('[MapRuntime] Demo already enabled');
      return;
    }

    // Lazy load DemoDataEngine
    import('@/map/demo/DemoDataEngine').then(({ DemoDataEngine }) => {
      this.demoEngine = new DemoDataEngine({
        mode: config?.mode || this.context,
        seed: config?.seed,
      });

      this.demoEngine.start();
      console.log('[MapRuntime] Demo mode enabled');
    });
  }

  /**
   * Disable demo mode
   */
  disableDemoMode(): void {
    if (this.demoEngine) {
      this.demoEngine.stop();
      this.demoEngine = null;
      console.log('[MapRuntime] Demo mode disabled');
    }
  }

  /**
   * Check if demo is running
   */
  isDemoActive(): boolean {
    return this.demoEngine !== null;
  }

  /**
   * Get demo state (for debugging)
   */
  getDemoState(): any {
    return this.demoEngine?.getState() || null;
  }

  /**
   * Get runtime state (for debugging)
   */
  getRuntimeState(): MapRuntimeState {
    return this.stateMachine.getState();
  }

  /**
   * Get state transition history (for debugging)
   */
  getStateHistory(count: number = 5): any[] {
    return this.stateMachine.getRecentHistory(count);
  }

  /**
   * Get queue metrics (for debugging)
   */
  getQueueMetrics(): {
    metrics: typeof this.queueMetrics;
    queueSizes: Record<string, number>;
  } {
    const queueSizes: Record<string, number> = {};
    this.updateQueues.forEach((queue, layerId) => {
      queueSizes[layerId] = queue.length;
    });

    return {
      metrics: { ...this.queueMetrics },
      queueSizes,
    };
  }

  /**
   * Cleanup (called on app unmount, not on hot reload)
   */
  destroy(): void {
    if (!this.map) return;

    // Stop demo if running
    this.disableDemoMode();

    this.layers.forEach((layer) => {
      layer.remove();
    });

    this.layers.clear();
    this.map.remove();
    this.map = null;
    this.playbackData = null;
    this.readyCallbacks = [];
    this.updateQueues.clear();
    this.queueMetrics = { enqueued: 0, dropped: 0, flushed: 0 };

    // Destroy state machine
    this.stateMachine.destroy();

    console.log('[MapRuntime] Destroyed');
  }
}

// Export singleton instance
export const mapRuntime = new MapRuntime();
