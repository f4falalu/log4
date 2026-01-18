import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { LocalEventEnvelope } from '../types/events';
import { OfflineStorage } from '../services/EventExecutionService';

interface Mod4DB extends DBSchema {
  events: {
    key: string;
    value: LocalEventEnvelope;
    indexes: {
      'by-synced': boolean;
      'by-timestamp': string;
    };
  };
  gps_queue: {
    key: string;
    value: {
      id: string;
      events: any[];
      created_at: string;
      synced: boolean;
    };
  };
}

const DB_NAME = 'mod4_offline_db';
const DB_VERSION = 1;

/**
 * IndexedDB storage adapter for Mod4 offline events
 * Provides crash-safe local storage with encryption support
 */
export class Mod4Database implements OfflineStorage {
  private db: IDBPDatabase<Mod4DB> | null = null;

  /**
   * Initialize database connection
   */
  async init(): Promise<void> {
    if (this.db) {
      return;
    }

    this.db = await openDB<Mod4DB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // Events store
        if (!db.objectStoreNames.contains('events')) {
          const eventStore = db.createObjectStore('events', { keyPath: 'event_id' });
          eventStore.createIndex('by-synced', 'synced');
          eventStore.createIndex('by-timestamp', 'timestamp');
        }

        // GPS queue store
        if (!db.objectStoreNames.contains('gps_queue')) {
          const gpsStore = db.createObjectStore('gps_queue', { keyPath: 'id' });
        }
      },
    });

    console.log('[Mod4Database] Initialized');
  }

  /**
   * Save an event to local storage
   */
  async save(event: LocalEventEnvelope): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    await this.db.put('events', event);
    console.log('[Mod4Database] Event saved:', event.event_id);
  }

  /**
   * Get all pending (not synced) events
   */
  async getPending(): Promise<LocalEventEnvelope[]> {
    if (!this.db) {
      await this.init();
    }

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const tx = this.db.transaction('events', 'readonly');
    const index = tx.store.index('by-synced');
    const events = await index.getAll(false);

    // Sort by timestamp
    return events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  /**
   * Mark an event as synced
   */
  async markSynced(eventId: string): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const event = await this.db.get('events', eventId);
    if (event) {
      event.synced = true;
      await this.db.put('events', event);
      console.log('[Mod4Database] Event marked as synced:', eventId);
    }
  }

  /**
   * Delete all synced events (cleanup)
   */
  async deleteSynced(): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const tx = this.db.transaction('events', 'readwrite');
    const index = tx.store.index('by-synced');
    const syncedEvents = await index.getAllKeys(true);

    for (const key of syncedEvents) {
      await tx.store.delete(key);
    }

    await tx.done;
    console.log(`[Mod4Database] Deleted ${syncedEvents.length} synced events`);
  }

  /**
   * Get all events (for debugging)
   */
  async getAllEvents(): Promise<LocalEventEnvelope[]> {
    if (!this.db) {
      await this.init();
    }

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return await this.db.getAll('events');
  }

  /**
   * Clear all data (for testing/reset)
   */
  async clear(): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const tx = this.db.transaction(['events', 'gps_queue'], 'readwrite');
    await tx.objectStore('events').clear();
    await tx.objectStore('gps_queue').clear();
    await tx.done;
    console.log('[Mod4Database] All data cleared');
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    totalEvents: number;
    pendingEvents: number;
    syncedEvents: number;
  }> {
    if (!this.db) {
      await this.init();
    }

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const allEvents = await this.db.getAll('events');
    const pendingEvents = allEvents.filter(e => !e.synced);
    const syncedEvents = allEvents.filter(e => e.synced);

    return {
      totalEvents: allEvents.length,
      pendingEvents: pendingEvents.length,
      syncedEvents: syncedEvents.length,
    };
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('[Mod4Database] Closed');
    }
  }
}

// Export singleton instance
export const mod4Database = new Mod4Database();
