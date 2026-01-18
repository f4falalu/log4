/**
 * TelemetryAdapter.ts
 *
 * Adapter for connecting real-time telemetry data to MapLibre sources
 * Handles smoothing, interpolation, and updates without jitter
 */

import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';

/**
 * Update options for telemetry data
 */
interface TelemetryUpdateOptions {
  /** Smooth position transitions (prevents jitter) */
  smooth?: boolean;

  /** Transition duration in ms (for smooth updates) */
  transitionDuration?: number;

  /** Store in IndexedDB for offline access */
  persistOffline?: boolean;
}

/**
 * Telemetry source configuration
 */
interface TelemetrySourceConfig {
  /** MapLibre source ID */
  sourceId: string;

  /** Layer ID (for querying features) */
  layerId?: string;

  /** Debounce delay in ms (prevents too frequent updates) */
  debounceMs?: number;

  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Telemetry Adapter
 *
 * Manages real-time data updates to MapLibre sources
 * with smoothing, debouncing, and offline persistence
 */
export class TelemetryAdapter {
  private map: MapLibreMap;
  private config: Required<TelemetrySourceConfig>;
  private updateQueue: Map<string, NodeJS.Timeout> = new Map();
  private lastUpdate: Map<string, number> = new Map();
  private smoothingEnabled: boolean = true;

  constructor(map: MapLibreMap, config: TelemetrySourceConfig) {
    this.map = map;
    this.config = {
      sourceId: config.sourceId,
      layerId: config.layerId || config.sourceId,
      debounceMs: config.debounceMs || 300,
      debug: config.debug || false,
    };
  }

  /**
   * Update source data with optional smoothing and debouncing
   */
  updateSource(
    data: FeatureCollection,
    options: TelemetryUpdateOptions = {}
  ): void {
    const {
      smooth = this.smoothingEnabled,
      transitionDuration = 500,
      persistOffline = false,
    } = options;

    // Debounce updates to prevent too frequent changes
    const existingTimeout = this.updateQueue.get(this.config.sourceId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeout = setTimeout(() => {
      this.performUpdate(data, smooth, transitionDuration);

      if (persistOffline) {
        this.persistToIndexedDB(data);
      }

      this.updateQueue.delete(this.config.sourceId);
    }, this.config.debounceMs);

    this.updateQueue.set(this.config.sourceId, timeout);
  }

  /**
   * Perform the actual source update
   */
  private performUpdate(
    data: FeatureCollection,
    smooth: boolean,
    transitionDuration: number
  ): void {
    const source = this.map.getSource(this.config.sourceId) as GeoJSONSource;

    if (!source) {
      console.warn(
        `[TelemetryAdapter] Source ${this.config.sourceId} not found`
      );
      return;
    }

    if (smooth) {
      // Smooth transition: interpolate positions
      this.smoothUpdate(source, data, transitionDuration);
    } else {
      // Direct update: immediate position change
      source.setData(data);
    }

    this.lastUpdate.set(this.config.sourceId, Date.now());

    if (this.config.debug) {
      console.log(
        `[TelemetryAdapter] Updated ${this.config.sourceId}:`,
        `${data.features.length} features`,
        smooth ? '(smooth)' : '(direct)'
      );
    }
  }

  /**
   * Smooth update with position interpolation
   * Prevents marker "jumping" when positions change
   */
  private smoothUpdate(
    source: GeoJSONSource,
    newData: FeatureCollection,
    duration: number
  ): void {
    // For now, use direct update
    // TODO: Implement actual interpolation using MapLibre's feature state
    // This would require:
    // 1. Get current feature positions
    // 2. Calculate interpolated positions
    // 3. Animate using requestAnimationFrame
    // 4. Update feature state progressively

    source.setData(newData);
  }

  /**
   * Persist data to IndexedDB for offline access
   */
  private async persistToIndexedDB(data: FeatureCollection): Promise<void> {
    // TODO: Implement IndexedDB persistence (Phase 3)
    // This will be connected to the PWA IndexedDB schema
    if (this.config.debug) {
      console.log(
        `[TelemetryAdapter] Would persist ${data.features.length} features to IndexedDB`
      );
    }
  }

  /**
   * Enable/disable smoothing
   */
  setSmoothing(enabled: boolean): void {
    this.smoothingEnabled = enabled;
  }

  /**
   * Get time since last update
   */
  getTimeSinceUpdate(): number {
    const lastUpdate = this.lastUpdate.get(this.config.sourceId);
    return lastUpdate ? Date.now() - lastUpdate : Infinity;
  }

  /**
   * Clear pending updates
   */
  clearPendingUpdates(): void {
    const timeout = this.updateQueue.get(this.config.sourceId);
    if (timeout) {
      clearTimeout(timeout);
      this.updateQueue.delete(this.config.sourceId);
    }
  }

  /**
   * Destroy adapter and cleanup
   */
  destroy(): void {
    this.clearPendingUpdates();
    this.updateQueue.clear();
    this.lastUpdate.clear();
  }
}

/**
 * Create multiple telemetry adapters for different sources
 */
export class TelemetryManager {
  private map: MapLibreMap;
  private adapters: Map<string, TelemetryAdapter> = new Map();

  constructor(map: MapLibreMap) {
    this.map = map;
  }

  /**
   * Register a new telemetry source
   */
  register(config: TelemetrySourceConfig): TelemetryAdapter {
    if (this.adapters.has(config.sourceId)) {
      console.warn(
        `[TelemetryManager] Adapter for ${config.sourceId} already exists`
      );
      return this.adapters.get(config.sourceId)!;
    }

    const adapter = new TelemetryAdapter(this.map, config);
    this.adapters.set(config.sourceId, adapter);

    console.log(`[TelemetryManager] Registered adapter: ${config.sourceId}`);

    return adapter;
  }

  /**
   * Get an existing adapter
   */
  get(sourceId: string): TelemetryAdapter | undefined {
    return this.adapters.get(sourceId);
  }

  /**
   * Update a source by ID
   */
  update(
    sourceId: string,
    data: FeatureCollection,
    options?: TelemetryUpdateOptions
  ): void {
    const adapter = this.adapters.get(sourceId);
    if (!adapter) {
      console.warn(
        `[TelemetryManager] No adapter found for source: ${sourceId}`
      );
      return;
    }

    adapter.updateSource(data, options);
  }

  /**
   * Unregister an adapter
   */
  unregister(sourceId: string): void {
    const adapter = this.adapters.get(sourceId);
    if (adapter) {
      adapter.destroy();
      this.adapters.delete(sourceId);
      console.log(`[TelemetryManager] Unregistered adapter: ${sourceId}`);
    }
  }

  /**
   * Destroy all adapters
   */
  destroy(): void {
    this.adapters.forEach((adapter) => adapter.destroy());
    this.adapters.clear();
    console.log('[TelemetryManager] All adapters destroyed');
  }
}
