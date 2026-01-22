/**
 * OperationalEventBridge.ts
 *
 * Geofencing pipeline bridge.
 *
 * GOVERNANCE:
 * - Bridges live movement to geofencing events
 * - NO geometry math
 * - NO map calls
 * - NO UI calls
 * - NO side effects beyond event emission
 *
 * This is the heart of operational intelligence.
 */

import {
  GeofencingEngine,
  type GeoEvent,
  type SpatialIndex,
  type EntityPositionUpdate,
  latLngToCell,
} from '@/map/core/spatial';
import type { NormalizedEntity } from './LiveEntityAdapter';

/**
 * Event bridge configuration
 */
export interface EventBridgeConfig {
  /** Spatial index for zone lookups */
  spatialIndex: SpatialIndex;

  /** Callback for geofencing events */
  onGeoEvent?: (event: GeoEvent) => void;

  /** Callback for batch events */
  onGeoEvents?: (events: GeoEvent[]) => void;

  /** Whether to persist events */
  persistEvents?: boolean;
}

/**
 * OperationalEventBridge - Geofencing event pipeline
 *
 * FLOW:
 * 1. LiveEntityAdapter emits entity update
 * 2. Compute h3Index (already done by adapter)
 * 3. Compare with last known h3Index
 * 4. geofencing.detect()
 * 5. GeoEvent[]
 * 6. Forward to map + UI
 *
 * RULES:
 * - No geometry math
 * - No map calls
 * - No UI calls
 * - No side effects beyond event emission
 */
export class OperationalEventBridge {
  private geofencingEngine: GeofencingEngine;
  private config: EventBridgeConfig;
  private eventBuffer: GeoEvent[] = [];

  constructor(config: EventBridgeConfig) {
    this.config = config;
    this.geofencingEngine = new GeofencingEngine(config.spatialIndex);

    // Subscribe to geofencing events
    this.geofencingEngine.subscribe((event) => {
      this.handleGeoEvent(event);
    });
  }

  /**
   * Process entity updates from LiveEntityAdapter
   */
  processEntityUpdates(entities: NormalizedEntity[]): GeoEvent[] {
    const allEvents: GeoEvent[] = [];

    for (const entity of entities) {
      const update: EntityPositionUpdate = {
        entityId: entity.id,
        entityType: entity.type,
        lat: entity.lat,
        lng: entity.lng,
        timestamp: entity.timestamp,
        metadata: entity.metadata,
      };

      // h3Index already computed by adapter
      const events = this.geofencingEngine.processUpdate(entity.h3Index, update);
      allEvents.push(...events);
    }

    // Emit batch callback
    if (allEvents.length > 0 && this.config.onGeoEvents) {
      this.config.onGeoEvents(allEvents);
    }

    return allEvents;
  }

  /**
   * Update spatial index when zones change
   */
  updateSpatialIndex(spatialIndex: SpatialIndex): void {
    this.geofencingEngine.updateSpatialIndex(spatialIndex);
  }

  /**
   * Get entities in a specific zone
   */
  getEntitiesInZone(zoneId: string): string[] {
    return this.geofencingEngine.getEntitiesInZone(zoneId);
  }

  /**
   * Check if entity is in zone
   */
  isEntityInZone(entityId: string, zoneId: string): boolean {
    return this.geofencingEngine.isEntityInZone(entityId, zoneId);
  }

  /**
   * Get entity's current zones
   */
  getEntityZones(entityId: string): string[] {
    return this.geofencingEngine.getEntityZones(entityId);
  }

  /**
   * Get buffered events (for batch processing)
   */
  getBufferedEvents(): GeoEvent[] {
    return [...this.eventBuffer];
  }

  /**
   * Clear buffered events
   */
  clearBuffer(): void {
    this.eventBuffer = [];
  }

  /**
   * Get statistics
   */
  getStats(): {
    trackedEntities: number;
    entitiesInZones: number;
    bufferedEvents: number;
  } {
    const engineStats = this.geofencingEngine.getStats();
    return {
      ...engineStats,
      bufferedEvents: this.eventBuffer.length,
    };
  }

  /**
   * Reset all tracking state
   */
  reset(): void {
    this.geofencingEngine.reset();
    this.eventBuffer = [];
  }

  /**
   * Handle individual geo event
   */
  private handleGeoEvent(event: GeoEvent): void {
    // Buffer for batch processing
    this.eventBuffer.push(event);

    // Emit individual callback
    this.config.onGeoEvent?.(event);

    // Persist if configured
    if (this.config.persistEvents) {
      this.persistEvent(event);
    }
  }

  /**
   * Persist event (placeholder for actual implementation)
   */
  private persistEvent(event: GeoEvent): void {
    // TODO: Implement persistence
    console.log('[EventBridge] Persisting event:', event.type, event.zoneId);
  }
}

/**
 * Create an operational event bridge
 */
export function createEventBridge(
  spatialIndex: SpatialIndex,
  callbacks?: {
    onGeoEvent?: (event: GeoEvent) => void;
    onGeoEvents?: (events: GeoEvent[]) => void;
  }
): OperationalEventBridge {
  return new OperationalEventBridge({
    spatialIndex,
    ...callbacks,
  });
}
