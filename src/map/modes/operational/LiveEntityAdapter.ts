/**
 * LiveEntityAdapter.ts
 *
 * Live data normalization.
 *
 * GOVERNANCE:
 * - Converts live feeds into stable, minimal stream
 * - Normalizes input
 * - Debounces/batches updates
 * - Computes current H3 index via latLngToCell
 * - NO map imports
 * - NO zone lookups here
 * - NO alert logic here
 */

import { latLngToCell } from '@/map/core/spatial';

/**
 * Raw entity from live feed
 */
export interface RawLiveEntity {
  id: string;
  lat: number;
  lng: number;
  timestamp: string | number | Date;
  type: 'vehicle' | 'driver' | 'asset';
  metadata?: Record<string, unknown>;
}

/**
 * Normalized live entity
 */
export interface NormalizedEntity {
  id: string;
  lat: number;
  lng: number;
  h3Index: string;
  timestamp: string;
  type: 'vehicle' | 'driver' | 'asset';
  metadata?: Record<string, unknown>;
}

/**
 * Entity update callback
 */
export type EntityUpdateCallback = (entities: NormalizedEntity[]) => void;

/**
 * Adapter configuration
 */
export interface LiveEntityAdapterConfig {
  /** Debounce interval in ms */
  debounceMs?: number;

  /** Batch size before flush */
  batchSize?: number;

  /** Callback for entity updates */
  onUpdate: EntityUpdateCallback;
}

/**
 * LiveEntityAdapter - Normalize live entity feeds
 *
 * Responsibilities:
 * - Normalize timestamps
 * - Compute H3 index for each entity
 * - Debounce and batch updates
 * - Provide stable output stream
 *
 * Does NOT:
 * - Look up zones
 * - Generate alerts
 * - Touch the map
 */
export class LiveEntityAdapter {
  private config: Required<LiveEntityAdapterConfig>;
  private buffer: RawLiveEntity[] = [];
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private entityCache = new Map<string, NormalizedEntity>();

  constructor(config: LiveEntityAdapterConfig) {
    this.config = {
      debounceMs: config.debounceMs ?? 100,
      batchSize: config.batchSize ?? 50,
      onUpdate: config.onUpdate,
    };
  }

  /**
   * Push raw entities into the adapter
   */
  push(entities: RawLiveEntity[]): void {
    this.buffer.push(...entities);

    // Flush immediately if batch size reached
    if (this.buffer.length >= this.config.batchSize) {
      this.flush();
      return;
    }

    // Otherwise debounce
    this.scheduleFlush();
  }

  /**
   * Push a single entity
   */
  pushOne(entity: RawLiveEntity): void {
    this.push([entity]);
  }

  /**
   * Force flush all buffered entities
   */
  flush(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.buffer.length === 0) return;

    const toProcess = [...this.buffer];
    this.buffer = [];

    // Normalize all entities
    const normalized = toProcess.map((raw) => this.normalize(raw));

    // Update cache
    normalized.forEach((entity) => {
      this.entityCache.set(entity.id, entity);
    });

    // Emit update
    this.config.onUpdate(normalized);
  }

  /**
   * Get all cached entities
   */
  getAllEntities(): NormalizedEntity[] {
    return Array.from(this.entityCache.values());
  }

  /**
   * Get entity by ID
   */
  getEntity(id: string): NormalizedEntity | undefined {
    return this.entityCache.get(id);
  }

  /**
   * Clear cache
   */
  clear(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.buffer = [];
    this.entityCache.clear();
  }

  /**
   * Destroy adapter
   */
  destroy(): void {
    this.clear();
  }

  /**
   * Schedule debounced flush
   */
  private scheduleFlush(): void {
    if (this.debounceTimer) return;

    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.flush();
    }, this.config.debounceMs);
  }

  /**
   * Normalize a raw entity
   */
  private normalize(raw: RawLiveEntity): NormalizedEntity {
    // Normalize timestamp
    let timestamp: string;
    if (typeof raw.timestamp === 'string') {
      timestamp = raw.timestamp;
    } else if (typeof raw.timestamp === 'number') {
      timestamp = new Date(raw.timestamp).toISOString();
    } else if (raw.timestamp instanceof Date) {
      timestamp = raw.timestamp.toISOString();
    } else {
      timestamp = new Date().toISOString();
    }

    // Compute H3 index
    const h3Index = latLngToCell(raw.lat, raw.lng);

    return {
      id: raw.id,
      lat: raw.lat,
      lng: raw.lng,
      h3Index,
      timestamp,
      type: raw.type,
      metadata: raw.metadata,
    };
  }
}

/**
 * Create a live entity adapter
 */
export function createLiveEntityAdapter(
  onUpdate: EntityUpdateCallback,
  options?: Partial<Omit<LiveEntityAdapterConfig, 'onUpdate'>>
): LiveEntityAdapter {
  return new LiveEntityAdapter({
    onUpdate,
    ...options,
  });
}
