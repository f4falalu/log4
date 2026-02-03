/**
 * useOfflineEventQueue - Hook for managing offline event persistence
 * Uses IndexedDB via Mod4Database for crash-safe local storage
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { mod4Database } from '@/modules/mod4/storage/Mod4Database';
import { LocalEventEnvelope, Mod4EventType, GeoLocation } from '@/modules/mod4/types/events';
import { supabase } from '@/integrations/supabase/client';

interface UseOfflineEventQueueOptions {
  autoSync?: boolean;
  syncInterval?: number; // ms
  onSyncComplete?: (result: { synced: number; failed: number }) => void;
}

interface QueueStats {
  totalEvents: number;
  pendingEvents: number;
  syncedEvents: number;
}

export function useOfflineEventQueue(options: UseOfflineEventQueueOptions = {}) {
  const {
    autoSync = true,
    syncInterval = 30000, // 30 seconds
    onSyncComplete,
  } = options;

  const [isInitialized, setIsInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [stats, setStats] = useState<QueueStats>({
    totalEvents: 0,
    pendingEvents: 0,
    syncedEvents: 0,
  });
  const [error, setError] = useState<Error | null>(null);

  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isOnlineRef = useRef(navigator.onLine);

  // Initialize database
  useEffect(() => {
    const init = async () => {
      try {
        await mod4Database.init();
        const currentStats = await mod4Database.getStats();
        setStats(currentStats);
        setIsInitialized(true);
      } catch (err) {
        console.error('[useOfflineEventQueue] Init error:', err);
        setError(err instanceof Error ? err : new Error('Failed to initialize'));
      }
    };

    init();
  }, []);

  // Sync events to server
  const syncEvents = useCallback(async (): Promise<{ synced: number; failed: number }> => {
    if (isSyncing || !isInitialized) {
      return { synced: 0, failed: 0 };
    }

    if (!navigator.onLine) {
      return { synced: 0, failed: 0 };
    }

    setIsSyncing(true);
    let synced = 0;
    let failed = 0;

    try {
      const pendingEvents = await mod4Database.getPending();

      for (const event of pendingEvents) {
        try {
          // Insert event to database
          const { error: insertError } = await supabase.rpc('insert_mod4_event', {
            p_event_type: event.event_type,
            p_driver_id: event.driver_id,
            p_session_id: event.session_id,
            p_device_id: event.device_id,
            p_lat: event.geo.lat,
            p_lng: event.geo.lng,
            p_captured_at: event.timestamp,
            p_metadata: event.metadata || {},
            p_vehicle_id: event.vehicle_id ?? null,
            p_batch_id: event.batch_id ?? null,
            p_trip_id: event.trip_id ?? null,
            p_dispatch_id: null,
          });

          if (insertError) {
            throw insertError;
          }

          // Mark as synced
          await mod4Database.markSynced(event.event_id);
          synced++;
        } catch (err) {
          console.error('[useOfflineEventQueue] Sync error for event:', event.event_id, err);
          failed++;

          // Update retry count
          event.retry_count = (event.retry_count || 0) + 1;
          await mod4Database.save(event);
        }
      }

      // Update stats
      const currentStats = await mod4Database.getStats();
      setStats(currentStats);

      // Cleanup synced events periodically
      if (currentStats.syncedEvents > 100) {
        await mod4Database.deleteSynced();
      }

      onSyncComplete?.({ synced, failed });
    } catch (err) {
      console.error('[useOfflineEventQueue] Sync failed:', err);
      setError(err instanceof Error ? err : new Error('Sync failed'));
    } finally {
      setIsSyncing(false);
    }

    return { synced, failed };
  }, [isSyncing, isInitialized, onSyncComplete]);

  // Queue an event for offline storage
  const queueEvent = useCallback(
    async (
      eventType: Mod4EventType,
      context: {
        driverId: string;
        sessionId: string;
        deviceId: string;
        vehicleId?: string;
        batchId?: string;
        facilityId?: string;
        tripId?: string;
      },
      geo: GeoLocation,
      metadata: Record<string, any> = {}
    ): Promise<string> => {
      if (!isInitialized) {
        throw new Error('Queue not initialized');
      }

      const event: LocalEventEnvelope = {
        event_id: crypto.randomUUID(),
        event_type: eventType,
        driver_id: context.driverId,
        session_id: context.sessionId,
        device_id: context.deviceId,
        vehicle_id: context.vehicleId,
        batch_id: context.batchId,
        facility_id: context.facilityId,
        trip_id: context.tripId,
        timestamp: new Date().toISOString(),
        geo,
        metadata,
        synced: false,
        retry_count: 0,
      };

      await mod4Database.save(event);

      // Update stats
      const currentStats = await mod4Database.getStats();
      setStats(currentStats);

      // Attempt immediate sync if online
      if (navigator.onLine && autoSync) {
        syncEvents();
      }

      return event.event_id;
    },
    [isInitialized, autoSync, syncEvents]
  );

  // Auto-sync interval
  useEffect(() => {
    if (!autoSync || !isInitialized) return;

    const handleOnline = () => {
      isOnlineRef.current = true;
      // Sync when coming back online
      syncEvents();
    };

    const handleOffline = () => {
      isOnlineRef.current = false;
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set up periodic sync
    syncIntervalRef.current = setInterval(() => {
      if (isOnlineRef.current) {
        syncEvents();
      }
    }, syncInterval);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [autoSync, isInitialized, syncInterval, syncEvents]);

  // Clear all events
  const clearQueue = useCallback(async () => {
    if (!isInitialized) return;

    await mod4Database.clear();
    setStats({
      totalEvents: 0,
      pendingEvents: 0,
      syncedEvents: 0,
    });
  }, [isInitialized]);

  // Get pending events
  const getPendingEvents = useCallback(async (): Promise<LocalEventEnvelope[]> => {
    if (!isInitialized) return [];
    return await mod4Database.getPending();
  }, [isInitialized]);

  return {
    // State
    isInitialized,
    isSyncing,
    stats,
    error,
    pendingCount: stats.pendingEvents,

    // Actions
    queueEvent,
    syncEvents,
    clearQueue,
    getPendingEvents,
  };
}
