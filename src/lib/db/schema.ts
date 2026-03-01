// MOD4 IndexedDB Schema
// Offline-first event store for field execution

import { openDB, DBSchema, IDBPDatabase } from 'idb';

// ============================================
// EVENT TYPES
// ============================================

export type EventType = 
  | 'slot_delivered'
  | 'slot_failed'
  | 'slot_skipped'
  | 'location_update'
  | 'batch_started'
  | 'batch_completed'
  | 'tradeoff_request'
  | 'support_request'
  | 'handoff_request';

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'error';

// ============================================
// CORE DATA MODELS
// ============================================

export interface Mod4Event {
  id: string;
  type: EventType;
  timestamp: number;
  device_id: string;
  driver_id: string;
  batch_id?: string;
  slot_id?: string;
  facility_id?: string;
  lat?: number;
  lng?: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  payload: Record<string, unknown>;
  sync_status: SyncStatus;
  sync_attempts: number;
  last_sync_attempt?: number;
  synced_at?: number;
}

export interface Batch {
  id: string;
  driver_id: string;
  vehicle_id: string;
  status: 'assigned' | 'active' | 'completed';
  route_polyline?: string;
  estimated_duration?: number;
  facilities: Facility[];
  slots: Slot[];
  created_at: number;
  updated_at: number;
  cached_at: number;
}

export type FacilityType = 'warehouse' | 'facility' | 'public';

export interface Facility {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type?: FacilityType;
  contact_name?: string;
  contact_phone?: string;
  instructions?: string;
}

export interface Slot {
  id: string;
  batch_id: string;
  facility_id: string;
  sequence: number;
  status: 'pending' | 'active' | 'delivered' | 'failed' | 'skipped';
  scheduled_time?: number;
  actual_time?: number;
  photo_uri?: string;
  signature_uri?: string;
  notes?: string;
}

export interface MapTile {
  id: string;
  url: string;
  blob: Blob;
  cached_at: number;
  expires_at: number;
}

export interface SyncMeta {
  id: 'sync_state';
  last_sync: number;
  pending_count: number;
  error_count: number;
  is_syncing: boolean;
  last_error?: string;
}

// ============================================
// DELIVERY ITEM & POD MODELS
// ============================================

export interface DeliveryItem {
  id: string;
  slot_id: string;
  name: string;
  description?: string;
  expected_quantity: number;
  delivered_quantity: number;
  unit: string; // 'units', 'boxes', 'kg', etc.
}

export type DiscrepancyReason = 
  | 'damaged_in_transit'
  | 'short_shipment'
  | 'wrong_item'
  | 'refused_by_recipient'
  | 'item_not_found'
  | 'other';

export type PoDStatus = 'completed' | 'flagged';

export interface ProofOfDelivery {
  id: string;
  slot_id: string;
  batch_id: string;
  driver_id: string;
  facility_id: string;
  facility_name: string;
  status: PoDStatus;
  
  // Items
  items: DeliveryItem[];
  
  // Discrepancy
  has_discrepancy: boolean;
  discrepancy_reason?: DiscrepancyReason;
  discrepancy_notes?: string;
  
  // Recipient attestation
  recipient_name: string;
  recipient_role?: string;
  recipient_signature_url: string;
  
  // Location verification
  delivered_at: number;
  delivery_latitude: number;
  delivery_longitude: number;
  location_accuracy_m: number;
  
  // Proxy delivery
  is_proxy_delivery: boolean;
  proxy_reason?: string;
  proxy_notes?: string;
  
  // Evidence
  photo_url: string;
  notes?: string;
  
  // Sync
  created_at: number;
  synced_at?: number;
  sync_status: SyncStatus;
}

// ============================================
// DATABASE SCHEMA
// ============================================

export interface Mod4DB extends DBSchema {
  events: {
    key: string;
    value: Mod4Event;
    indexes: {
      'by-sync-status': SyncStatus;
      'by-timestamp': number;
      'by-batch': string;
    };
  };
  batches: {
    key: string;
    value: Batch;
    indexes: {
      'by-status': string;
      'by-driver': string;
    };
  };
  slots: {
    key: string;
    value: Slot;
    indexes: {
      'by-batch': string;
      'by-status': string;
    };
  };
  tiles: {
    key: string;
    value: MapTile;
    indexes: {
      'by-expires': number;
    };
  };
  sync_meta: {
    key: string;
    value: SyncMeta;
  };
  delivery_items: {
    key: string;
    value: DeliveryItem;
    indexes: {
      'by-slot': string;
    };
  };
  proof_of_delivery: {
    key: string;
    value: ProofOfDelivery;
    indexes: {
      'by-slot': string;
      'by-batch': string;
      'by-status': PoDStatus;
      'by-delivered-at': number;
    };
  };
}

// ============================================
// DATABASE INITIALIZATION
// ============================================

const DB_NAME = 'mod4';
const DB_VERSION = 2;

let dbInstance: IDBPDatabase<Mod4DB> | null = null;

export async function initDB(): Promise<IDBPDatabase<Mod4DB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<Mod4DB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // Events store
      if (!db.objectStoreNames.contains('events')) {
        const eventStore = db.createObjectStore('events', { keyPath: 'id' });
        eventStore.createIndex('by-sync-status', 'sync_status');
        eventStore.createIndex('by-timestamp', 'timestamp');
        eventStore.createIndex('by-batch', 'batch_id');
      }

      // Batches store
      if (!db.objectStoreNames.contains('batches')) {
        const batchStore = db.createObjectStore('batches', { keyPath: 'id' });
        batchStore.createIndex('by-status', 'status');
        batchStore.createIndex('by-driver', 'driver_id');
      }

      // Slots store
      if (!db.objectStoreNames.contains('slots')) {
        const slotStore = db.createObjectStore('slots', { keyPath: 'id' });
        slotStore.createIndex('by-batch', 'batch_id');
        slotStore.createIndex('by-status', 'status');
      }

      // Tiles store (for offline maps)
      if (!db.objectStoreNames.contains('tiles')) {
        const tileStore = db.createObjectStore('tiles', { keyPath: 'id' });
        tileStore.createIndex('by-expires', 'expires_at');
      }

      // Sync metadata
      if (!db.objectStoreNames.contains('sync_meta')) {
        db.createObjectStore('sync_meta', { keyPath: 'id' });
      }

      // Delivery items store (new in v2)
      if (!db.objectStoreNames.contains('delivery_items')) {
        const itemStore = db.createObjectStore('delivery_items', { keyPath: 'id' });
        itemStore.createIndex('by-slot', 'slot_id');
      }

      // Proof of delivery store (new in v2)
      if (!db.objectStoreNames.contains('proof_of_delivery')) {
        const podStore = db.createObjectStore('proof_of_delivery', { keyPath: 'id' });
        podStore.createIndex('by-slot', 'slot_id');
        podStore.createIndex('by-batch', 'batch_id');
        podStore.createIndex('by-status', 'status');
        podStore.createIndex('by-delivered-at', 'delivered_at');
      }
    },
  });

  // Initialize sync meta if not exists
  const syncMeta = await dbInstance.get('sync_meta', 'sync_state');
  if (!syncMeta) {
    await dbInstance.put('sync_meta', {
      id: 'sync_state',
      last_sync: 0,
      pending_count: 0,
      error_count: 0,
      is_syncing: false,
    });
  }

  return dbInstance;
}

export async function getDB(): Promise<IDBPDatabase<Mod4DB>> {
  if (!dbInstance) {
    return initDB();
  }
  return dbInstance;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateDeviceId(): string {
  let deviceId = localStorage.getItem('mod4_device_id');
  if (!deviceId) {
    deviceId = `dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('mod4_device_id', deviceId);
  }
  return deviceId;
}

export function generatePoDId(): string {
  return `pod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
