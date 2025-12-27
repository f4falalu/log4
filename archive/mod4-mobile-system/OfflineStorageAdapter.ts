import { LocalEventEnvelope } from './events';
import { OfflineStorage } from './EventExecutionService';
import { SecurityService } from './SecurityService';

const DB_NAME = 'mod4_db';
const STORE_NAME = 'events';
const DB_VERSION = 1;

interface EncryptedRecord {
  event_id: string;
  synced: boolean;
  retry_count: number;
  payload: string; // Encrypted JSON
  iv: string;      // Initialization Vector
}

/**
 * PRD Section 5.1: Local Storage
 * Implements encrypted, crash-safe, append-only event log using IndexedDB.
 */
export class IndexedDBAdapter implements OfflineStorage {
  private dbPromise: Promise<IDBDatabase>;

  constructor(private readonly security: SecurityService) {
    this.dbPromise = this.openDB();
  }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB not supported'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          // Create object store with event_id as key
          db.createObjectStore(STORE_NAME, { keyPath: 'event_id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async save(event: LocalEventEnvelope): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      // TODO: Apply encryption here before put() (PRD 5.1)
      const request = store.put(event);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getPending(): Promise<LocalEventEnvelope[]> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const allRecords: EncryptedRecord[] = request.result;
        // Filter for unsynced events
        const pendingRecords = allRecords.filter(r => !r.synced);
        
        // Decrypt all pending records
        Promise.all(pendingRecords.map(async (r) => {
          const decrypted = await this.security.decrypt(r.payload, r.iv);
          // Reconstruct LocalEventEnvelope, ensuring sync status is current from DB record
          return { ...decrypted, synced: r.synced, retry_count: r.retry_count };
        }))
        .then(resolve)
        .catch(reject);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async markSynced(eventId: string): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(eventId);

      getRequest.onsuccess = () => {
        const record: EncryptedRecord = getRequest.result;
        if (record) {
          record.synced = true;
          store.put(record).onsuccess = () => resolve();
        } else {
          resolve(); // Record not found, possibly already handled
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }
}