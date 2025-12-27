import { LocalEventEnvelope } from './events';
import { OfflineStorage } from './EventExecutionService';

/**
 * Handles reliable event synchronization with exponential backoff.
 * PRD Section 13: App must tolerate long offline windows & high latency.
 */
export class SyncManager {
  private isSyncing = false;
  private retryTimeout: any = null;
  private backoffDelay = 1000; // Start with 1s
  private readonly MAX_DELAY = 60000; // Max 60s cap

  constructor(
    private readonly storage: OfflineStorage,
    private readonly apiEndpoint: string
  ) {
    // Auto-trigger sync when network recovers
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.triggerSync());
    }
  }

  /**
   * Attempts to upload all pending events sequentially.
   * Stops on first failure to preserve event order.
   */
  async triggerSync(): Promise<void> {
    if (this.isSyncing || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      return;
    }

    this.isSyncing = true;
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    try {
      const pendingEvents = await this.storage.getPending();
      
      if (pendingEvents.length === 0) {
        this.isSyncing = false;
        this.backoffDelay = 1000; // Reset backoff on success
        return;
      }

      for (const envelope of pendingEvents) {
        const success = await this.syncEvent(envelope);
        if (!success) {
          throw new Error('Sync failed'); // Break loop to retry later
        }
      }

      // All pending events synced successfully
      this.backoffDelay = 1000; 
    } catch (error) {
      this.scheduleRetry();
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncEvent(envelope: LocalEventEnvelope): Promise<boolean> {
    try {
      // Strip local storage metadata before sending
      const { synced, retry_count, ...payload } = envelope;
      
      const response = await fetch(`${this.apiEndpoint}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        await this.storage.markSynced(envelope.event_id);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  private scheduleRetry() {
    this.retryTimeout = setTimeout(() => this.triggerSync(), this.backoffDelay);
    this.backoffDelay = Math.min(this.backoffDelay * 2, this.MAX_DELAY);
  }
}