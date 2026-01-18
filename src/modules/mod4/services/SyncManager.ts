import { SupabaseClient } from '@supabase/supabase-js';
import { LocalEventEnvelope } from '../types/events';
import { OfflineStorage } from './EventExecutionService';

/**
 * Sync Manager
 * Handles reliable event synchronization with exponential backoff
 * Adapted from archived code to use Supabase RPC functions
 */
export class SyncManager {
  public isSyncing = false;
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;
  private backoffDelay = 1000; // Start with 1s
  private readonly MAX_DELAY = 60000; // Max 60s cap
  private readonly BATCH_SIZE = 10; // Sync events in batches

  constructor(
    private readonly storage: OfflineStorage,
    private readonly supabase: SupabaseClient
  ) {
    // Auto-trigger sync when network recovers
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[SyncManager] Network online, triggering sync');
        this.triggerSync().catch(err => console.error('Sync error:', err));
      });
    }
  }

  /**
   * Attempts to upload all pending events
   * Returns summary of sync results
   */
  async triggerSync(): Promise<{ success: boolean; synced: number; failed: number }> {
    if (this.isSyncing) {
      console.log('[SyncManager] Sync already in progress, skipping');
      return { success: false, synced: 0, failed: 0 };
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.log('[SyncManager] Offline, skipping sync');
      return { success: false, synced: 0, failed: 0 };
    }

    this.isSyncing = true;
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    let syncedCount = 0;
    let failedCount = 0;

    try {
      const pendingEvents = await this.storage.getPending();

      if (pendingEvents.length === 0) {
        console.log('[SyncManager] No pending events to sync');
        this.isSyncing = false;
        this.backoffDelay = 1000; // Reset backoff on success
        return { success: true, synced: 0, failed: 0 };
      }

      console.log(`[SyncManager] Syncing ${pendingEvents.length} pending events`);

      // Sync events in batches
      for (let i = 0; i < pendingEvents.length; i += this.BATCH_SIZE) {
        const batch = pendingEvents.slice(i, i + this.BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map(envelope => this.syncEvent(envelope))
        );

        results.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            syncedCount++;
          } else {
            failedCount++;
            console.error('[SyncManager] Failed to sync event:', batch[index].event_id, result);
          }
        });
      }

      // All events processed
      this.backoffDelay = 1000; // Reset backoff
      console.log(`[SyncManager] Sync complete. Synced: ${syncedCount}, Failed: ${failedCount}`);

      return { success: failedCount === 0, synced: syncedCount, failed: failedCount };
    } catch (error) {
      console.error('[SyncManager] Sync error:', error);
      this.scheduleRetry();
      return { success: false, synced: syncedCount, failed: failedCount };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync a single event using Supabase RPC
   */
  private async syncEvent(envelope: LocalEventEnvelope): Promise<boolean> {
    try {
      // Strip local storage metadata before sending
      const { synced, retry_count, encrypted, cipher_text, iv, ...payload } = envelope;

      // Call insert_mod4_event RPC function
      const { data, error } = await this.supabase.rpc('insert_mod4_event', {
        p_event_id: payload.event_id,
        p_event_type: payload.event_type,
        p_driver_id: payload.driver_id,
        p_session_id: payload.session_id,
        p_batch_id: payload.batch_id || null,
        p_facility_id: payload.facility_id || null,
        p_trip_id: payload.trip_id || null,
        p_vehicle_id: payload.vehicle_id || null,
        p_device_id: payload.device_id,
        p_timestamp: payload.timestamp,
        p_lat: payload.geo.lat,
        p_lng: payload.geo.lng,
        p_metadata: payload.metadata || {}
      });

      if (error) {
        console.error('[SyncManager] RPC error:', error);
        return false;
      }

      // Mark as synced in local storage
      await this.storage.markSynced(envelope.event_id);
      console.log('[SyncManager] Event synced:', envelope.event_id);
      return true;
    } catch (error) {
      console.error('[SyncManager] Exception syncing event:', error);
      return false;
    }
  }

  /**
   * Schedule retry with exponential backoff
   */
  private scheduleRetry() {
    console.log(`[SyncManager] Scheduling retry in ${this.backoffDelay}ms`);
    this.retryTimeout = setTimeout(() => {
      this.triggerSync().catch(err => console.error('Retry sync error:', err));
    }, this.backoffDelay);

    this.backoffDelay = Math.min(this.backoffDelay * 2, this.MAX_DELAY);
  }

  /**
   * Cleanup synced events from storage
   */
  async cleanupSynced(): Promise<void> {
    await this.storage.deleteSynced();
  }

  /**
   * Destroy sync manager (cleanup listeners)
   */
  destroy() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  }
}
