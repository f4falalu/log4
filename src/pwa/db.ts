/**
 * db.ts
 *
 * IndexedDB schema and utilities for offline PWA functionality
 * Stores map tiles, entity positions, queued actions, and analytics
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { FeatureCollection } from 'geojson';

/**
 * Map Database Schema
 */
export interface MapDB extends DBSchema {
  /** Cached map tiles (vector + raster) */
  tiles: {
    key: string; // Tile URL
    value: {
      url: string;
      data: Blob;
      timestamp: number;
      zoom: number;
      x: number;
      y: number;
    };
    indexes: {
      'by-zoom': number;
      'by-timestamp': number;
    };
  };

  /** Entity positions (vehicles, drivers, facilities, batches) */
  entities: {
    key: string; // Entity ID
    value: {
      type: 'vehicle' | 'driver' | 'facility' | 'batch' | 'warehouse';
      id: string;
      geoJson: FeatureCollection;
      timestamp: number;
    };
    indexes: {
      'by-type': string;
      'by-timestamp': number;
    };
  };

  /** Queued actions (offline mutations) */
  actions: {
    key: string; // Action ID
    value: {
      id: string;
      type: 'trade_off_approval' | 'batch_assignment' | 'zone_edit';
      payload: any;
      timestamp: number;
      synced: boolean;
      error?: string;
    };
    indexes: {
      'by-synced': boolean;
      'by-timestamp': number;
    };
  };

  /** Analytics snapshots */
  analytics: {
    key: string; // Snapshot key
    value: {
      key: string;
      data: any;
      timestamp: number;
      ttl: number; // Time to live in ms
    };
    indexes: {
      'by-timestamp': number;
      'by-ttl': number;
    };
  };

  /** Offline metadata */
  metadata: {
    key: string;
    value: {
      key: string;
      value: any;
      timestamp: number;
    };
  };
}

const DB_NAME = 'biko-map-db';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<MapDB> | null = null;

/**
 * Initialize and open the IndexedDB database
 */
export async function initDB(): Promise<IDBPDatabase<MapDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<MapDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create tiles store
      if (!db.objectStoreNames.contains('tiles')) {
        const tilesStore = db.createObjectStore('tiles', { keyPath: 'url' });
        tilesStore.createIndex('by-zoom', 'zoom');
        tilesStore.createIndex('by-timestamp', 'timestamp');
      }

      // Create entities store
      if (!db.objectStoreNames.contains('entities')) {
        const entitiesStore = db.createObjectStore('entities', { keyPath: 'id' });
        entitiesStore.createIndex('by-type', 'type');
        entitiesStore.createIndex('by-timestamp', 'timestamp');
      }

      // Create actions store
      if (!db.objectStoreNames.contains('actions')) {
        const actionsStore = db.createObjectStore('actions', { keyPath: 'id' });
        actionsStore.createIndex('by-synced', 'synced');
        actionsStore.createIndex('by-timestamp', 'timestamp');
      }

      // Create analytics store
      if (!db.objectStoreNames.contains('analytics')) {
        const analyticsStore = db.createObjectStore('analytics', { keyPath: 'key' });
        analyticsStore.createIndex('by-timestamp', 'timestamp');
        analyticsStore.createIndex('by-ttl', 'ttl');
      }

      // Create metadata store
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' });
      }

      console.log('[IndexedDB] Database initialized:', DB_NAME, 'v' + DB_VERSION);
    },
  });

  return dbInstance;
}

/**
 * Tile Cache Operations
 */
export const tileCache = {
  /**
   * Store a tile in cache
   */
  async set(url: string, data: Blob, zoom: number, x: number, y: number): Promise<void> {
    const db = await initDB();
    await db.put('tiles', {
      url,
      data,
      zoom,
      x,
      y,
      timestamp: Date.now(),
    });
  },

  /**
   * Get a tile from cache
   */
  async get(url: string): Promise<Blob | undefined> {
    const db = await initDB();
    const tile = await db.get('tiles', url);
    return tile?.data;
  },

  /**
   * Check if tile exists
   */
  async has(url: string): Promise<boolean> {
    const db = await initDB();
    const tile = await db.get('tiles', url);
    return !!tile;
  },

  /**
   * Clear tiles for a specific zoom level
   */
  async clearZoom(zoom: number): Promise<void> {
    const db = await initDB();
    const tiles = await db.getAllFromIndex('tiles', 'by-zoom', zoom);
    await Promise.all(tiles.map(tile => db.delete('tiles', tile.url)));
  },

  /**
   * Clear old tiles (older than maxAge ms)
   */
  async clearOld(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    const db = await initDB();
    const cutoff = Date.now() - maxAge;
    const allTiles = await db.getAll('tiles');
    const oldTiles = allTiles.filter(tile => tile.timestamp < cutoff);
    await Promise.all(oldTiles.map(tile => db.delete('tiles', tile.url)));
    console.log(`[TileCache] Cleared ${oldTiles.length} old tiles`);
  },
};

/**
 * Entity Cache Operations
 */
export const entityCache = {
  /**
   * Store entity GeoJSON
   */
  async set(
    type: 'vehicle' | 'driver' | 'facility' | 'batch' | 'warehouse',
    geoJson: FeatureCollection
  ): Promise<void> {
    const db = await initDB();
    await db.put('entities', {
      type,
      id: type, // Use type as ID for collections
      geoJson,
      timestamp: Date.now(),
    });
  },

  /**
   * Get entity GeoJSON
   */
  async get(type: string): Promise<FeatureCollection | undefined> {
    const db = await initDB();
    const entity = await db.get('entities', type);
    return entity?.geoJson;
  },

  /**
   * Get all entities of a type
   */
  async getByType(type: string): Promise<FeatureCollection[]> {
    const db = await initDB();
    const entities = await db.getAllFromIndex('entities', 'by-type', type);
    return entities.map(e => e.geoJson);
  },

  /**
   * Clear all entities
   */
  async clear(): Promise<void> {
    const db = await initDB();
    await db.clear('entities');
  },
};

/**
 * Action Queue Operations
 */
export const actionQueue = {
  /**
   * Add action to queue
   */
  async enqueue(
    type: 'trade_off_approval' | 'batch_assignment' | 'zone_edit',
    payload: any
  ): Promise<string> {
    const db = await initDB();
    const id = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await db.add('actions', {
      id,
      type,
      payload,
      timestamp: Date.now(),
      synced: false,
    });

    console.log('[ActionQueue] Enqueued:', id);
    return id;
  },

  /**
   * Get all unsynced actions
   */
  async getUnsynced(): Promise<MapDB['actions']['value'][]> {
    const db = await initDB();
    return db.getAllFromIndex('actions', 'by-synced', false);
  },

  /**
   * Mark action as synced
   */
  async markSynced(id: string): Promise<void> {
    const db = await initDB();
    const action = await db.get('actions', id);
    if (action) {
      action.synced = true;
      await db.put('actions', action);
      console.log('[ActionQueue] Marked synced:', id);
    }
  },

  /**
   * Mark action as failed
   */
  async markFailed(id: string, error: string): Promise<void> {
    const db = await initDB();
    const action = await db.get('actions', id);
    if (action) {
      action.error = error;
      await db.put('actions', action);
      console.error('[ActionQueue] Marked failed:', id, error);
    }
  },

  /**
   * Delete action
   */
  async delete(id: string): Promise<void> {
    const db = await initDB();
    await db.delete('actions', id);
  },

  /**
   * Clear all synced actions
   */
  async clearSynced(): Promise<void> {
    const db = await initDB();
    const synced = await db.getAllFromIndex('actions', 'by-synced', true);
    await Promise.all(synced.map(action => db.delete('actions', action.id)));
    console.log(`[ActionQueue] Cleared ${synced.length} synced actions`);
  },
};

/**
 * Analytics Cache Operations
 */
export const analyticsCache = {
  /**
   * Store analytics snapshot
   */
  async set(key: string, data: any, ttl: number = 3600000): Promise<void> {
    const db = await initDB();
    await db.put('analytics', {
      key,
      data,
      timestamp: Date.now(),
      ttl: Date.now() + ttl,
    });
  },

  /**
   * Get analytics snapshot
   */
  async get(key: string): Promise<any | undefined> {
    const db = await initDB();
    const snapshot = await db.get('analytics', key);

    // Check if expired
    if (snapshot && snapshot.ttl < Date.now()) {
      await db.delete('analytics', key);
      return undefined;
    }

    return snapshot?.data;
  },

  /**
   * Clear expired snapshots
   */
  async clearExpired(): Promise<void> {
    const db = await initDB();
    const all = await db.getAll('analytics');
    const expired = all.filter(s => s.ttl < Date.now());
    await Promise.all(expired.map(s => db.delete('analytics', s.key)));
    console.log(`[AnalyticsCache] Cleared ${expired.length} expired snapshots`);
  },
};

/**
 * Metadata Operations
 */
export const metadata = {
  /**
   * Set metadata value
   */
  async set(key: string, value: any): Promise<void> {
    const db = await initDB();
    await db.put('metadata', {
      key,
      value,
      timestamp: Date.now(),
    });
  },

  /**
   * Get metadata value
   */
  async get(key: string): Promise<any | undefined> {
    const db = await initDB();
    const meta = await db.get('metadata', key);
    return meta?.value;
  },
};

/**
 * Database maintenance
 */
export const maintenance = {
  /**
   * Run cleanup (remove old data)
   */
  async cleanup(): Promise<void> {
    console.log('[IndexedDB] Running cleanup...');
    await Promise.all([
      tileCache.clearOld(),
      actionQueue.clearSynced(),
      analyticsCache.clearExpired(),
    ]);
    console.log('[IndexedDB] Cleanup complete');
  },

  /**
   * Get database size estimate
   */
  async getSize(): Promise<number> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return estimate.usage || 0;
    }
    return 0;
  },

  /**
   * Clear all data
   */
  async clearAll(): Promise<void> {
    const db = await initDB();
    await Promise.all([
      db.clear('tiles'),
      db.clear('entities'),
      db.clear('actions'),
      db.clear('analytics'),
      db.clear('metadata'),
    ]);
    console.log('[IndexedDB] All data cleared');
  },
};
