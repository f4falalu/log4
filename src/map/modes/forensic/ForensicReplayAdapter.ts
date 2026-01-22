/**
 * ForensicReplayAdapter.ts
 *
 * Time truth engine.
 *
 * GOVERNANCE:
 * - Converts historical data into time-indexed state
 * - No interpolation unless explicit
 * - No inference
 * - No smoothing
 * - Frame at T is reproducible
 * - Same inputs always yield same frame
 */

import type { Zone, H3CellState, GeoEvent } from '@/map/core/spatial';

/**
 * Historical entity position
 */
export interface HistoricalEntityPosition {
  entityId: string;
  entityType: 'vehicle' | 'driver' | 'asset';
  lat: number;
  lng: number;
  h3Index: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/**
 * Zone audit log entry
 */
export interface ZoneAuditEntry {
  zoneId: string;
  action: 'created' | 'updated' | 'deactivated' | 'tagged';
  timestamp: string;
  before?: Partial<Zone>;
  after?: Partial<Zone>;
  userId: string;
}

/**
 * Replay frame - state at a point in time
 */
export interface ReplayFrame {
  /** Timestamp of this frame */
  timestamp: string;

  /** Entity positions at this time */
  entities: HistoricalEntityPosition[];

  /** Zone definitions as of this time */
  zones: Zone[];

  /** Cell states derived from zones */
  cellStates: H3CellState[];

  /** Active events at this time */
  events: GeoEvent[];
}

/**
 * Replay data source
 */
export interface ReplayDataSource {
  /** Historical entity positions */
  entityHistory: HistoricalEntityPosition[];

  /** Zone audit log */
  zoneAuditLog: ZoneAuditEntry[];

  /** Geofencing event log */
  eventLog: GeoEvent[];

  /** Time range */
  startTime: Date;
  endTime: Date;
}

/**
 * ForensicReplayAdapter - Time-indexed state reconstruction
 *
 * RESPONSIBILITIES:
 * - Load historical data
 * - Reconstruct state at any point in time
 * - Provide deterministic frames
 *
 * RULES:
 * - No interpolation unless explicit
 * - No inference
 * - No smoothing
 * - Frame at T is reproducible
 */
export class ForensicReplayAdapter {
  private dataSource: ReplayDataSource | null = null;
  private frameCache = new Map<string, ReplayFrame>();
  private maxCacheSize = 100;

  /**
   * Load replay data source
   */
  loadData(source: ReplayDataSource): void {
    this.dataSource = source;
    this.frameCache.clear();

    console.log(
      `[ForensicReplayAdapter] Loaded data: ` +
      `${source.entityHistory.length} positions, ` +
      `${source.zoneAuditLog.length} zone entries, ` +
      `${source.eventLog.length} events`
    );
  }

  /**
   * Get frame at a specific timestamp
   */
  getFrameAt(timestamp: Date): ReplayFrame | null {
    if (!this.dataSource) {
      console.warn('[ForensicReplayAdapter] No data source loaded');
      return null;
    }

    const ts = timestamp.toISOString();

    // Check cache
    const cached = this.frameCache.get(ts);
    if (cached) {
      return cached;
    }

    // Reconstruct frame
    const frame = this.reconstructFrame(timestamp);

    // Cache frame
    this.cacheFrame(ts, frame);

    return frame;
  }

  /**
   * Get frames in a time range
   */
  getFramesInRange(
    startTime: Date,
    endTime: Date,
    intervalMs: number
  ): ReplayFrame[] {
    const frames: ReplayFrame[] = [];
    let currentTime = startTime.getTime();
    const endMs = endTime.getTime();

    while (currentTime <= endMs) {
      const frame = this.getFrameAt(new Date(currentTime));
      if (frame) {
        frames.push(frame);
      }
      currentTime += intervalMs;
    }

    return frames;
  }

  /**
   * Get time range of loaded data
   */
  getTimeRange(): { start: Date; end: Date } | null {
    if (!this.dataSource) return null;

    return {
      start: this.dataSource.startTime,
      end: this.dataSource.endTime,
    };
  }

  /**
   * Clear cached frames
   */
  clearCache(): void {
    this.frameCache.clear();
  }

  /**
   * Reconstruct frame at timestamp
   */
  private reconstructFrame(timestamp: Date): ReplayFrame {
    if (!this.dataSource) {
      return this.createEmptyFrame(timestamp);
    }

    const ts = timestamp.toISOString();
    const tsMs = timestamp.getTime();

    // Get entity positions at or before timestamp
    const entities = this.getEntitiesAtTime(tsMs);

    // Reconstruct zones at timestamp using audit log
    const zones = this.reconstructZonesAtTime(tsMs);

    // Derive cell states from zones
    const cellStates = this.deriveCellStatesFromZones(zones);

    // Get events at or before timestamp
    const events = this.getEventsAtTime(tsMs);

    return {
      timestamp: ts,
      entities,
      zones,
      cellStates,
      events,
    };
  }

  /**
   * Get entity positions at a specific time
   * Returns most recent position for each entity before/at timestamp
   */
  private getEntitiesAtTime(tsMs: number): HistoricalEntityPosition[] {
    if (!this.dataSource) return [];

    const latestByEntity = new Map<string, HistoricalEntityPosition>();

    for (const pos of this.dataSource.entityHistory) {
      const posTime = new Date(pos.timestamp).getTime();
      if (posTime > tsMs) continue;

      const existing = latestByEntity.get(pos.entityId);
      if (!existing || new Date(existing.timestamp).getTime() < posTime) {
        latestByEntity.set(pos.entityId, pos);
      }
    }

    return Array.from(latestByEntity.values());
  }

  /**
   * Reconstruct zone state at a specific time
   * Applies all audit entries <= timestamp
   */
  private reconstructZonesAtTime(tsMs: number): Zone[] {
    if (!this.dataSource) return [];

    // Sort audit entries by timestamp
    const relevantEntries = this.dataSource.zoneAuditLog
      .filter((entry) => new Date(entry.timestamp).getTime() <= tsMs)
      .sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

    // Apply entries to build zone state
    const zonesById = new Map<string, Zone>();

    for (const entry of relevantEntries) {
      switch (entry.action) {
        case 'created':
          if (entry.after) {
            zonesById.set(entry.zoneId, entry.after as Zone);
          }
          break;

        case 'updated':
        case 'tagged':
          const existing = zonesById.get(entry.zoneId);
          if (existing && entry.after) {
            zonesById.set(entry.zoneId, { ...existing, ...entry.after });
          }
          break;

        case 'deactivated':
          const zone = zonesById.get(entry.zoneId);
          if (zone) {
            zonesById.set(entry.zoneId, { ...zone, active: false });
          }
          break;
      }
    }

    // Return only active zones
    return Array.from(zonesById.values()).filter((z) => z.active);
  }

  /**
   * Derive cell states from zones
   * Simplified version - full implementation would use spatial index
   */
  private deriveCellStatesFromZones(zones: Zone[]): H3CellState[] {
    // Collect all cells from all zones
    const cellMap = new Map<string, H3CellState>();

    for (const zone of zones) {
      for (const h3Index of zone.h3Cells) {
        const existing = cellMap.get(h3Index);

        if (existing) {
          // Cell already exists, merge zone info
          existing.zoneIds.push(zone.id);
          existing.zoneNames.push(zone.name);
          existing.tags = [...new Set([...existing.tags, ...zone.tags])];
        } else {
          // New cell
          cellMap.set(h3Index, {
            h3Index,
            zoneIds: [zone.id],
            zoneNames: [zone.name],
            tags: [...zone.tags],
            riskLevel: this.deriveRiskLevel(zone.tags),
            inZone: true,
          });
        }
      }
    }

    return Array.from(cellMap.values());
  }

  /**
   * Derive risk level from tags
   */
  private deriveRiskLevel(tags: string[]): 'none' | 'low' | 'medium' | 'high' {
    if (tags.some((t) => t.includes('high') || t.includes('security'))) {
      return 'high';
    }
    if (tags.some((t) => t.includes('medium') || t.includes('restricted'))) {
      return 'medium';
    }
    if (tags.length > 0) {
      return 'low';
    }
    return 'none';
  }

  /**
   * Get events at or before timestamp
   */
  private getEventsAtTime(tsMs: number): GeoEvent[] {
    if (!this.dataSource) return [];

    return this.dataSource.eventLog.filter(
      (event) => new Date(event.timestamp).getTime() <= tsMs
    );
  }

  /**
   * Create empty frame
   */
  private createEmptyFrame(timestamp: Date): ReplayFrame {
    return {
      timestamp: timestamp.toISOString(),
      entities: [],
      zones: [],
      cellStates: [],
      events: [],
    };
  }

  /**
   * Cache frame with LRU eviction
   */
  private cacheFrame(key: string, frame: ReplayFrame): void {
    if (this.frameCache.size >= this.maxCacheSize) {
      // Evict oldest entry
      const firstKey = this.frameCache.keys().next().value;
      if (firstKey) {
        this.frameCache.delete(firstKey);
      }
    }

    this.frameCache.set(key, frame);
  }
}

/**
 * Create a forensic replay adapter
 */
export function createReplayAdapter(): ForensicReplayAdapter {
  return new ForensicReplayAdapter();
}
