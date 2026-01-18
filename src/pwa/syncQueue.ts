/**
 * syncQueue.ts
 *
 * Offline Action Queue Manager
 * Handles queuing, syncing, and reconciliation of offline mutations
 */

import { actionQueue } from './db';
import type { MapDB } from './db';

/**
 * Action types that can be queued
 */
export type QueuedActionType =
  | 'trade_off_approval'
  | 'batch_assignment'
  | 'zone_edit'
  | 'delivery_update'
  | 'vehicle_status_change';

/**
 * Queued action payload types
 */
export interface TradeOffApprovalPayload {
  handoffId: string;
  approved: boolean;
  rejectionReason?: string;
  approvedBy: string;
  timestamp: string;
}

export interface BatchAssignmentPayload {
  batchId: string;
  vehicleId: string;
  driverId: string;
  assignedBy: string;
  timestamp: string;
}

export interface ZoneEditPayload {
  zoneId: string;
  geometry: GeoJSON.Polygon;
  name?: string;
  editedBy: string;
  timestamp: string;
}

export interface DeliveryUpdatePayload {
  deliveryId: string;
  status: 'completed' | 'failed' | 'partially_delivered';
  notes?: string;
  completedBy: string;
  timestamp: string;
}

export interface VehicleStatusChangePayload {
  vehicleId: string;
  status: 'available' | 'in-use' | 'maintenance';
  reason?: string;
  changedBy: string;
  timestamp: string;
}

export type ActionPayload =
  | TradeOffApprovalPayload
  | BatchAssignmentPayload
  | ZoneEditPayload
  | DeliveryUpdatePayload
  | VehicleStatusChangePayload;

/**
 * Sync result for an action
 */
export interface SyncResult {
  actionId: string;
  success: boolean;
  error?: string;
  timestamp: number;
}

/**
 * Sync Queue Manager
 */
export class SyncQueueManager {
  private syncing = false;
  private listeners: Set<(results: SyncResult[]) => void> = new Set();

  /**
   * Enqueue an action for offline sync
   */
  async enqueue(type: QueuedActionType, payload: ActionPayload): Promise<string> {
    const actionId = await actionQueue.enqueue(type, payload);
    console.log('[SyncQueue] Enqueued action:', type, actionId);

    // Attempt immediate sync if online
    if (navigator.onLine) {
      this.sync().catch((err) => console.warn('[SyncQueue] Immediate sync failed:', err));
    }

    return actionId;
  }

  /**
   * Sync all unsynced actions
   */
  async sync(): Promise<SyncResult[]> {
    if (this.syncing) {
      console.log('[SyncQueue] Sync already in progress');
      return [];
    }

    if (!navigator.onLine) {
      console.log('[SyncQueue] Offline - skipping sync');
      return [];
    }

    this.syncing = true;
    const results: SyncResult[] = [];

    try {
      const unsyncedActions = await actionQueue.getUnsynced();
      console.log(`[SyncQueue] Syncing ${unsyncedActions.length} actions...`);

      for (const action of unsyncedActions) {
        const result = await this.syncAction(action);
        results.push(result);
      }

      // Notify listeners
      this.notifyListeners(results);

      console.log(
        `[SyncQueue] Sync complete: ${results.filter((r) => r.success).length}/${results.length} succeeded`
      );

      return results;
    } catch (error) {
      console.error('[SyncQueue] Sync failed:', error);
      throw error;
    } finally {
      this.syncing = false;
    }
  }

  /**
   * Sync a single action
   */
  private async syncAction(
    action: MapDB['actions']['value']
  ): Promise<SyncResult> {
    try {
      const endpoint = this.getEndpointForAction(action.type);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add auth headers from Supabase client
          ...(await this.getAuthHeaders()),
        },
        body: JSON.stringify(action.payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // Mark as synced
      await actionQueue.markSynced(action.id);

      return {
        actionId: action.id,
        success: true,
        timestamp: Date.now(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Mark as failed
      await actionQueue.markFailed(action.id, errorMessage);

      return {
        actionId: action.id,
        success: false,
        error: errorMessage,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get API endpoint for action type
   */
  private getEndpointForAction(type: QueuedActionType): string {
    const endpoints: Record<QueuedActionType, string> = {
      trade_off_approval: '/api/tradeoffs/approve',
      batch_assignment: '/api/batches/assign',
      zone_edit: '/api/zones/edit',
      delivery_update: '/api/deliveries/update',
      vehicle_status_change: '/api/vehicles/status',
    };

    return endpoints[type] || '/api/sync-action';
  }

  /**
   * Get auth headers from Supabase
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    try {
      // Try to get auth token from Supabase client
      const { createClient } = await import('@/integrations/supabase/client');
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token) {
        return {
          Authorization: `Bearer ${session.access_token}`,
        };
      }
    } catch (error) {
      console.warn('[SyncQueue] Failed to get auth headers:', error);
    }

    return {};
  }

  /**
   * Get all unsynced actions
   */
  async getUnsynced(): Promise<MapDB['actions']['value'][]> {
    return actionQueue.getUnsynced();
  }

  /**
   * Get count of unsynced actions
   */
  async getUnsyncedCount(): Promise<number> {
    const unsynced = await actionQueue.getUnsynced();
    return unsynced.length;
  }

  /**
   * Clear all synced actions
   */
  async clearSynced(): Promise<void> {
    await actionQueue.clearSynced();
    console.log('[SyncQueue] Cleared synced actions');
  }

  /**
   * Delete a specific action (use with caution)
   */
  async deleteAction(actionId: string): Promise<void> {
    await actionQueue.delete(actionId);
    console.log('[SyncQueue] Deleted action:', actionId);
  }

  /**
   * Subscribe to sync results
   */
  subscribe(callback: (results: SyncResult[]) => void): () => void {
    this.listeners.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of sync results
   */
  private notifyListeners(results: SyncResult[]): void {
    this.listeners.forEach((listener) => {
      try {
        listener(results);
      } catch (error) {
        console.error('[SyncQueue] Listener error:', error);
      }
    });
  }

  /**
   * Register service worker sync
   */
  async registerBackgroundSync(): Promise<void> {
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('sync-queued-actions');
        console.log('[SyncQueue] Background sync registered');
      } catch (error) {
        console.warn('[SyncQueue] Background sync registration failed:', error);
      }
    } else {
      console.warn('[SyncQueue] Background sync not supported');
    }
  }

  /**
   * Check if currently syncing
   */
  isSyncing(): boolean {
    return this.syncing;
  }
}

/**
 * Singleton instance
 */
let syncQueueInstance: SyncQueueManager | null = null;

/**
 * Get sync queue manager instance
 */
export function getSyncQueue(): SyncQueueManager {
  if (!syncQueueInstance) {
    syncQueueInstance = new SyncQueueManager();
  }
  return syncQueueInstance;
}

/**
 * React hook for sync queue
 */
export function useSyncQueue() {
  const queue = getSyncQueue();

  const enqueue = async (type: QueuedActionType, payload: ActionPayload) => {
    return queue.enqueue(type, payload);
  };

  const sync = async () => {
    return queue.sync();
  };

  const getUnsyncedCount = async () => {
    return queue.getUnsyncedCount();
  };

  const subscribe = (callback: (results: SyncResult[]) => void) => {
    return queue.subscribe(callback);
  };

  return {
    enqueue,
    sync,
    getUnsyncedCount,
    subscribe,
    isSyncing: queue.isSyncing(),
  };
}

/**
 * Setup automatic sync on network reconnection
 */
export function setupAutoSync(): void {
  const queue = getSyncQueue();

  // Sync when coming back online
  window.addEventListener('online', () => {
    console.log('[SyncQueue] Network reconnected - starting sync...');
    queue.sync().catch((err) => console.error('[SyncQueue] Auto-sync failed:', err));
  });

  // Register background sync
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(() => {
      queue.registerBackgroundSync().catch((err) =>
        console.warn('[SyncQueue] Background sync setup failed:', err)
      );
    });
  }

  // Periodic sync attempt (every 5 minutes if online)
  setInterval(
    () => {
      if (navigator.onLine && !queue.isSyncing()) {
        queue.sync().catch((err) => console.warn('[SyncQueue] Periodic sync failed:', err));
      }
    },
    5 * 60 * 1000
  ); // 5 minutes
}
