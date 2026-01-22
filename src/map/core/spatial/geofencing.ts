/**
 * geofencing.ts
 *
 * Operational geofencing engine.
 *
 * GOVERNANCE:
 * - Detects entry/exit events DETERMINISTICALLY
 * - No geometry math - uses H3 cell membership only
 * - No map dependency
 * - No UI dependency
 * - Events are replayable
 *
 * This is the operational intelligence layer.
 */

import type { SpatialIndex } from './spatialIndex';
import { getZonesForCell, getZoneById } from './spatialIndex';
import { getHighestSeverity } from './zoneTags';

/**
 * Geofencing event types
 */
export type GeoEventType = 'zone_enter' | 'zone_exit';

/**
 * Geofencing event
 */
export interface GeoEvent {
  /** Unique event ID */
  id: string;

  /** Entity that triggered the event */
  entityId: string;

  /** Entity type for filtering */
  entityType: 'vehicle' | 'driver' | 'asset';

  /** Event type */
  type: GeoEventType;

  /** H3 cell where event occurred */
  h3Index: string;

  /** Zone ID (for enter/exit events) */
  zoneId: string;

  /** Zone name for display */
  zoneName: string;

  /** Severity derived from zone tags */
  severity: 'low' | 'medium' | 'high';

  /** Event timestamp */
  timestamp: string;

  /** Previous H3 cell (for context) */
  previousH3Index?: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Entity position update
 */
export interface EntityPositionUpdate {
  entityId: string;
  entityType: 'vehicle' | 'driver' | 'asset';
  lat: number;
  lng: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/**
 * Entity tracking state
 */
interface EntityTrackingState {
  entityId: string;
  entityType: 'vehicle' | 'driver' | 'asset';
  currentH3Index: string;
  currentZoneIds: Set<string>;
  lastUpdate: string;
}

/**
 * Generate unique event ID
 */
function generateEventId(): string {
  return `geo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Geofencing engine
 * Tracks entity positions and detects zone events
 */
export class GeofencingEngine {
  private spatialIndex: SpatialIndex;
  private entityStates = new Map<string, EntityTrackingState>();
  private eventListeners = new Set<(event: GeoEvent) => void>();

  constructor(spatialIndex: SpatialIndex) {
    this.spatialIndex = spatialIndex;
  }

  /**
   * Update spatial index
   * Call when zones change
   */
  updateSpatialIndex(spatialIndex: SpatialIndex): void {
    this.spatialIndex = spatialIndex;
  }

  /**
   * Process entity position update
   * Returns any geofencing events triggered
   *
   * @param h3Index - Current H3 cell (already computed)
   * @param update - Entity update data
   * @returns Array of geofencing events
   */
  processUpdate(h3Index: string, update: EntityPositionUpdate): GeoEvent[] {
    const { entityId, entityType, timestamp, metadata } = update;

    // Get or create entity state
    let state = this.entityStates.get(entityId);

    if (!state) {
      // New entity - initialize without generating enter events
      // This prevents spurious events on system startup
      const currentZoneIds = new Set(getZonesForCell(this.spatialIndex, h3Index));

      state = {
        entityId,
        entityType,
        currentH3Index: h3Index,
        currentZoneIds,
        lastUpdate: timestamp,
      };

      this.entityStates.set(entityId, state);
      return []; // No events for initial position
    }

    const previousH3Index = state.currentH3Index;
    const previousZoneIds = state.currentZoneIds;

    // If cell hasn't changed, no events possible
    if (h3Index === previousH3Index) {
      state.lastUpdate = timestamp;
      return [];
    }

    // Get current zone membership
    const currentZoneIds = new Set(getZonesForCell(this.spatialIndex, h3Index));

    // Detect events
    const events: GeoEvent[] = [];

    // Zone exits: zones we were in but no longer are
    for (const zoneId of previousZoneIds) {
      if (!currentZoneIds.has(zoneId)) {
        const zone = getZoneById(this.spatialIndex, zoneId);
        if (zone) {
          const event: GeoEvent = {
            id: generateEventId(),
            entityId,
            entityType,
            type: 'zone_exit',
            h3Index,
            zoneId,
            zoneName: zone.name,
            severity: getHighestSeverity(zone.tags) as 'low' | 'medium' | 'high',
            timestamp,
            previousH3Index,
            metadata,
          };
          events.push(event);
        }
      }
    }

    // Zone entries: zones we're now in but weren't before
    for (const zoneId of currentZoneIds) {
      if (!previousZoneIds.has(zoneId)) {
        const zone = getZoneById(this.spatialIndex, zoneId);
        if (zone) {
          const event: GeoEvent = {
            id: generateEventId(),
            entityId,
            entityType,
            type: 'zone_enter',
            h3Index,
            zoneId,
            zoneName: zone.name,
            severity: getHighestSeverity(zone.tags) as 'low' | 'medium' | 'high',
            timestamp,
            previousH3Index,
            metadata,
          };
          events.push(event);
        }
      }
    }

    // Update state
    state.currentH3Index = h3Index;
    state.currentZoneIds = currentZoneIds;
    state.lastUpdate = timestamp;

    // Notify listeners
    events.forEach((event) => this.notifyListeners(event));

    return events;
  }

  /**
   * Get current zone membership for an entity
   */
  getEntityZones(entityId: string): string[] {
    const state = this.entityStates.get(entityId);
    return state ? Array.from(state.currentZoneIds) : [];
  }

  /**
   * Get entity's current H3 cell
   */
  getEntityCell(entityId: string): string | undefined {
    return this.entityStates.get(entityId)?.currentH3Index;
  }

  /**
   * Check if entity is in a specific zone
   */
  isEntityInZone(entityId: string, zoneId: string): boolean {
    const state = this.entityStates.get(entityId);
    return state?.currentZoneIds.has(zoneId) ?? false;
  }

  /**
   * Get all entities in a zone
   */
  getEntitiesInZone(zoneId: string): string[] {
    const entities: string[] = [];
    this.entityStates.forEach((state, entityId) => {
      if (state.currentZoneIds.has(zoneId)) {
        entities.push(entityId);
      }
    });
    return entities;
  }

  /**
   * Subscribe to geofencing events
   * Returns unsubscribe function
   */
  subscribe(listener: (event: GeoEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  /**
   * Remove entity from tracking
   */
  removeEntity(entityId: string): void {
    this.entityStates.delete(entityId);
  }

  /**
   * Clear all tracking state
   */
  reset(): void {
    this.entityStates.clear();
  }

  /**
   * Get tracking statistics
   */
  getStats(): {
    trackedEntities: number;
    entitiesInZones: number;
    listenerCount: number;
  } {
    let entitiesInZones = 0;
    this.entityStates.forEach((state) => {
      if (state.currentZoneIds.size > 0) {
        entitiesInZones++;
      }
    });

    return {
      trackedEntities: this.entityStates.size,
      entitiesInZones,
      listenerCount: this.eventListeners.size,
    };
  }

  /**
   * Notify all listeners of an event
   */
  private notifyListeners(event: GeoEvent): void {
    this.eventListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('[GeofencingEngine] Error in listener:', error);
      }
    });
  }
}

/**
 * Stateless geofencing detection
 * Use when you don't need to track entity state
 *
 * @param previousH3Index - Previous H3 cell (or undefined if new)
 * @param currentH3Index - Current H3 cell
 * @param spatialIndex - Built spatial index
 * @returns { entered: zoneIds[], exited: zoneIds[] }
 */
export function detectZoneChanges(
  previousH3Index: string | undefined,
  currentH3Index: string,
  spatialIndex: SpatialIndex
): {
  entered: string[];
  exited: string[];
} {
  const previousZones = previousH3Index
    ? new Set(getZonesForCell(spatialIndex, previousH3Index))
    : new Set<string>();

  const currentZones = new Set(getZonesForCell(spatialIndex, currentH3Index));

  const entered: string[] = [];
  const exited: string[] = [];

  // Entries
  for (const zoneId of currentZones) {
    if (!previousZones.has(zoneId)) {
      entered.push(zoneId);
    }
  }

  // Exits
  for (const zoneId of previousZones) {
    if (!currentZones.has(zoneId)) {
      exited.push(zoneId);
    }
  }

  return { entered, exited };
}

/**
 * Check if a position change crosses any zone boundaries
 * Quick check without full event generation
 */
export function crossesZoneBoundary(
  previousH3Index: string,
  currentH3Index: string,
  spatialIndex: SpatialIndex
): boolean {
  if (previousH3Index === currentH3Index) {
    return false;
  }

  const previousZones = new Set(getZonesForCell(spatialIndex, previousH3Index));
  const currentZones = getZonesForCell(spatialIndex, currentH3Index);

  // Check if any current zone is new
  for (const zoneId of currentZones) {
    if (!previousZones.has(zoneId)) {
      return true;
    }
  }

  // Check if we left any zone
  const currentSet = new Set(currentZones);
  for (const zoneId of previousZones) {
    if (!currentSet.has(zoneId)) {
      return true;
    }
  }

  return false;
}
