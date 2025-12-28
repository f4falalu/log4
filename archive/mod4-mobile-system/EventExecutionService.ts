import { Mod4Event, EventType, GeoLocation, LocalEventEnvelope } from './events';
import { SyncManager } from './SyncManager';

/**
 * Interface for the local persistence layer (e.g., IndexedDB, SQLite)
 */
export interface OfflineStorage {
  save(event: LocalEventEnvelope): Promise<void>;
  getPending(): Promise<LocalEventEnvelope[]>;
  markSynced(eventId: string): Promise<void>;
}

function uuidv4(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class EventExecutionService {
  private syncManager: SyncManager;

  constructor(
    private readonly storage: OfflineStorage,
    private readonly apiEndpoint: string,
    private readonly context: {
      driverId: string;
      deviceId: string;
      vehicleId: string;
    }
  ) {
    this.syncManager = new SyncManager(storage, apiEndpoint);
  }

  /**
   * Captures an event locally.
   * Section 5.2: Event Lifecycle - Captured locally -> Timestamped -> Stored -> Synced
   */
  async captureEvent(
    type: EventType,
    tripId: string,
    dispatchId: string,
    geo: GeoLocation,
    metadata: Record<string, any> = {}
  ): Promise<Mod4Event> {
    
    // 1. Construct Immutable Event
    const event: Mod4Event = {
      event_id: uuidv4(),
      event_type: type,
      driver_id: this.context.driverId,
      trip_id: tripId,
      dispatch_id: dispatchId,
      vehicle_id: this.context.vehicleId,
      device_id: this.context.deviceId,
      timestamp: new Date().toISOString(), // Section 5.3: Timestamp at source
      geo,
      metadata,
    };

    // 2. Store Durably (Offline-first)
    const envelope: LocalEventEnvelope = {
      ...event,
      synced: false,
      retry_count: 0
    };

    await this.storage.save(envelope);

    // 3. Attempt Sync (Non-blocking)
    // Section 13: Performance - Sync must be resumable
    this.syncManager.triggerSync();

    return event;
  }

  /**
   * Manually trigger synchronization (e.g. from UI "Sync Now" button)
   */
  async forceSync(): Promise<void> {
    return this.syncManager.triggerSync();
  }
}