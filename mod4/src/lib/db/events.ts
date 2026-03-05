// MOD4 Event Operations
// All mutations emit immutable events — no direct state changes

import { getDB, Mod4Event, EventType, generateEventId, generateDeviceId } from './schema';

interface CreateEventParams {
  type: EventType;
  driver_id: string;
  batch_id?: string;
  slot_id?: string;
  facility_id?: string;
  lat?: number;
  lng?: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  payload?: Record<string, unknown>;
}

// Create and store an event locally
export async function createEvent(params: CreateEventParams): Promise<Mod4Event> {
  const db = await getDB();
  
  const event: Mod4Event = {
    id: generateEventId(),
    type: params.type,
    timestamp: Date.now(),
    device_id: generateDeviceId(),
    driver_id: params.driver_id,
    batch_id: params.batch_id,
    slot_id: params.slot_id,
    facility_id: params.facility_id,
    lat: params.lat,
    lng: params.lng,
    accuracy: params.accuracy,
    heading: params.heading,
    speed: params.speed,
    payload: params.payload || {},
    sync_status: 'pending',
    sync_attempts: 0,
  };

  await db.put('events', event);
  
  // Update pending count
  await updatePendingCount();

  return event;
}

// Get all pending events for sync
export async function getPendingEvents(): Promise<Mod4Event[]> {
  const db = await getDB();
  return db.getAllFromIndex('events', 'by-sync-status', 'pending');
}

// Get events with errors for retry
export async function getErrorEvents(): Promise<Mod4Event[]> {
  const db = await getDB();
  return db.getAllFromIndex('events', 'by-sync-status', 'error');
}

// Mark event as syncing
export async function markEventSyncing(eventId: string): Promise<void> {
  const db = await getDB();
  const event = await db.get('events', eventId);
  if (event) {
    event.sync_status = 'syncing';
    event.sync_attempts += 1;
    event.last_sync_attempt = Date.now();
    await db.put('events', event);
  }
}

// Mark event as synced
export async function markEventSynced(eventId: string): Promise<void> {
  const db = await getDB();
  const event = await db.get('events', eventId);
  if (event) {
    event.sync_status = 'synced';
    event.synced_at = Date.now();
    await db.put('events', event);
    await updatePendingCount();
  }
}

// Mark event as error
export async function markEventError(eventId: string, error: string): Promise<void> {
  const db = await getDB();
  const event = await db.get('events', eventId);
  if (event) {
    event.sync_status = 'error';
    event.payload = { ...event.payload, last_error: error };
    await db.put('events', event);
    await updatePendingCount();
  }
}

// Get events by batch
export async function getEventsByBatch(batchId: string): Promise<Mod4Event[]> {
  const db = await getDB();
  return db.getAllFromIndex('events', 'by-batch', batchId);
}

// Update pending count in sync meta
async function updatePendingCount(): Promise<void> {
  const db = await getDB();
  const pending = await db.getAllFromIndex('events', 'by-sync-status', 'pending');
  const errors = await db.getAllFromIndex('events', 'by-sync-status', 'error');
  
  const syncMeta = await db.get('sync_meta', 'sync_state');
  if (syncMeta) {
    syncMeta.pending_count = pending.length;
    syncMeta.error_count = errors.length;
    await db.put('sync_meta', syncMeta);
  }
}

// Get sync status summary
export async function getSyncStatus(): Promise<{
  pending: number;
  syncing: number;
  synced: number;
  error: number;
}> {
  const db = await getDB();
  const pending = await db.getAllFromIndex('events', 'by-sync-status', 'pending');
  const syncing = await db.getAllFromIndex('events', 'by-sync-status', 'syncing');
  const synced = await db.getAllFromIndex('events', 'by-sync-status', 'synced');
  const error = await db.getAllFromIndex('events', 'by-sync-status', 'error');
  
  return {
    pending: pending.length,
    syncing: syncing.length,
    synced: synced.length,
    error: error.length,
  };
}
