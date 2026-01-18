import { SupabaseClient } from '@supabase/supabase-js';
import { Mod4Event, Mod4EventType, GeoLocation, LocalEventEnvelope } from '../types/events';
import { SyncManager } from './SyncManager';

/**
 * Interface for the local persistence layer (IndexedDB)
 */
export interface OfflineStorage {
  save(event: LocalEventEnvelope): Promise<void>;
  getPending(): Promise<LocalEventEnvelope[]>;
  markSynced(eventId: string): Promise<void>;
  deleteSynced(): Promise<void>;
}

/**
 * Event Execution Service
 * Handles offline-first event capture and synchronization
 * Adapted from archived code to use Supabase
 */
export class EventExecutionService {
  private syncManager: SyncManager;

  constructor(
    private readonly storage: OfflineStorage,
    private readonly supabase: SupabaseClient,
    private readonly context: {
      driverId: string;
      sessionId: string;
      deviceId: string;
      vehicleId?: string;
    }
  ) {
    this.syncManager = new SyncManager(storage, supabase);
  }

  /**
   * Captures an event locally
   * Event Lifecycle: Captured locally -> Timestamped -> Stored -> Synced
   */
  async captureEvent(
    type: Mod4EventType,
    geo: GeoLocation,
    metadata: Record<string, any> = {},
    options: {
      batchId?: string;
      facilityId?: string;
      tripId?: string;
    } = {}
  ): Promise<Mod4Event> {
    // 1. Construct Immutable Event
    const event: Mod4Event = {
      event_id: crypto.randomUUID(),
      event_type: type,
      driver_id: this.context.driverId,
      session_id: this.context.sessionId,
      device_id: this.context.deviceId,
      vehicle_id: this.context.vehicleId,
      batch_id: options.batchId,
      facility_id: options.facilityId,
      trip_id: options.tripId,
      timestamp: new Date().toISOString(),
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
    this.syncManager.triggerSync().catch(err => {
      console.warn('Background sync failed:', err);
    });

    return event;
  }

  /**
   * Capture delivery completion event
   */
  async captureDeliveryCompleted(
    batchId: string,
    facilityId: string,
    geo: GeoLocation,
    items: any[],
    proofOfDelivery: any
  ): Promise<Mod4Event> {
    return this.captureEvent(
      'delivery_completed',
      geo,
      {
        items,
        proof_of_delivery: proofOfDelivery,
        completed_at: new Date().toISOString(),
      },
      { batchId, facilityId }
    );
  }

  /**
   * Capture photo event
   */
  async capturePhoto(
    batchId: string,
    facilityId: string,
    geo: GeoLocation,
    photoUrl: string
  ): Promise<Mod4Event> {
    return this.captureEvent(
      'photo_captured',
      geo,
      { photo_url: photoUrl },
      { batchId, facilityId }
    );
  }

  /**
   * Capture signature event
   */
  async captureSignature(
    batchId: string,
    facilityId: string,
    geo: GeoLocation,
    signatureData: string,
    recipientName: string,
    recipientRole: string
  ): Promise<Mod4Event> {
    return this.captureEvent(
      'signature_captured',
      geo,
      {
        signature_data: signatureData,
        recipient_name: recipientName,
        recipient_role: recipientRole,
      },
      { batchId, facilityId }
    );
  }

  /**
   * Capture discrepancy event
   */
  async captureDiscrepancy(
    batchId: string,
    facilityId: string,
    geo: GeoLocation,
    discrepancies: any[]
  ): Promise<Mod4Event> {
    return this.captureEvent(
      'delivery_discrepancy',
      geo,
      { discrepancies },
      { batchId, facilityId }
    );
  }

  /**
   * Manually trigger synchronization
   */
  async forceSync(): Promise<{ success: boolean; synced: number; failed: number }> {
    return this.syncManager.triggerSync();
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<{
    pending: number;
    isSyncing: boolean;
  }> {
    const pending = await this.storage.getPending();
    return {
      pending: pending.length,
      isSyncing: this.syncManager.isSyncing,
    };
  }

  /**
   * Update context (e.g., when session changes)
   */
  updateContext(context: Partial<EventExecutionService['context']>) {
    Object.assign(this.context, context);
  }
}
