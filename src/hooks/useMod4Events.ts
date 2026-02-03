/**
 * useMod4Events - Event persistence hook for Mod4 driver execution
 * Records delivery lifecycle events to the mod4_events table
 */

import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Event types matching the database constraint
export type Mod4EventType =
  | 'session_started'
  | 'session_ended'
  | 'delivery_started'
  | 'delivery_completed'
  | 'delivery_discrepancy'
  | 'location_captured'
  | 'proxy_delivery_reason_recorded'
  | 'recipient_signature_captured'
  | 'new_device_login'
  | 'photo_captured'
  | 'item_reconciled'
  | 'batch_assigned'
  | 'batch_started'
  | 'batch_completed';

export interface Mod4Event {
  eventId: string;
  eventType: Mod4EventType;
  driverId: string;
  sessionId: string;
  deviceId: string;
  vehicleId: string | null;
  batchId: string | null;
  tripId: string | null;
  dispatchId: string | null;
  lat: number;
  lng: number;
  capturedAt: Date;
  receivedAt: Date;
  metadata: Record<string, unknown>;
  syncStatus: 'synced' | 'pending' | 'failed';
}

interface RecordEventParams {
  eventType: Mod4EventType;
  driverId: string;
  sessionId: string;
  deviceId: string;
  lat: number;
  lng: number;
  metadata?: Record<string, unknown>;
  vehicleId?: string | null;
  batchId?: string | null;
  tripId?: string | null;
  dispatchId?: string | null;
}

interface UseMod4EventsOptions {
  driverId?: string | null;
  sessionId?: string | null;
  batchId?: string | null;
  limit?: number;
}

// Offline event queue stored in localStorage
const OFFLINE_QUEUE_KEY = 'mod4_offline_events';

function getOfflineQueue(): RecordEventParams[] {
  try {
    const stored = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addToOfflineQueue(event: RecordEventParams): void {
  const queue = getOfflineQueue();
  queue.push(event);
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

function clearOfflineQueue(): void {
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
}

export function useMod4Events(options: UseMod4EventsOptions = {}) {
  const { driverId, sessionId, batchId, limit = 50 } = options;
  const queryClient = useQueryClient();

  // Fetch event history
  const eventsQuery = useQuery({
    queryKey: ['mod4-events', driverId, sessionId, batchId],
    queryFn: async (): Promise<Mod4Event[]> => {
      if (!driverId) return [];

      const { data, error } = await supabase.rpc('get_driver_event_timeline', {
        p_driver_id: driverId,
        p_session_id: sessionId ?? null,
        p_limit: limit,
      });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        eventId: row.event_id,
        eventType: row.event_type as Mod4EventType,
        driverId,
        sessionId: sessionId || '',
        deviceId: '',
        vehicleId: null,
        batchId: null,
        tripId: null,
        dispatchId: null,
        lat: row.lat,
        lng: row.lng,
        capturedAt: new Date(row.captured_at),
        receivedAt: new Date(),
        metadata: row.metadata || {},
        syncStatus: 'synced' as const,
      }));
    },
    enabled: !!driverId,
    staleTime: 10000,
  });

  // Record event mutation
  const recordEventMutation = useMutation({
    mutationFn: async (params: RecordEventParams): Promise<string> => {
      // If offline, queue the event
      if (!navigator.onLine) {
        addToOfflineQueue(params);
        return `offline_${Date.now()}`;
      }

      const { data, error } = await supabase.rpc('insert_mod4_event', {
        p_event_type: params.eventType,
        p_driver_id: params.driverId,
        p_session_id: params.sessionId,
        p_device_id: params.deviceId,
        p_lat: params.lat,
        p_lng: params.lng,
        p_captured_at: new Date().toISOString(),
        p_metadata: params.metadata || {},
        p_vehicle_id: params.vehicleId ?? null,
        p_batch_id: params.batchId ?? null,
        p_trip_id: params.tripId ?? null,
        p_dispatch_id: params.dispatchId ?? null,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mod4-events'] });
    },
  });

  // Sync offline events
  const syncOfflineEventsMutation = useMutation({
    mutationFn: async (): Promise<{ synced: number; failed: number }> => {
      const queue = getOfflineQueue();
      if (queue.length === 0) return { synced: 0, failed: 0 };

      let synced = 0;
      let failed = 0;
      const remainingEvents: RecordEventParams[] = [];

      for (const event of queue) {
        try {
          await supabase.rpc('insert_mod4_event', {
            p_event_type: event.eventType,
            p_driver_id: event.driverId,
            p_session_id: event.sessionId,
            p_device_id: event.deviceId,
            p_lat: event.lat,
            p_lng: event.lng,
            p_captured_at: new Date().toISOString(),
            p_metadata: event.metadata || {},
            p_vehicle_id: event.vehicleId ?? null,
            p_batch_id: event.batchId ?? null,
            p_trip_id: event.tripId ?? null,
            p_dispatch_id: event.dispatchId ?? null,
          });
          synced++;
        } catch {
          failed++;
          remainingEvents.push(event);
        }
      }

      // Update queue with failed events
      if (remainingEvents.length > 0) {
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remainingEvents));
      } else {
        clearOfflineQueue();
      }

      return { synced, failed };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mod4-events'] });
    },
  });

  // Record event with current position
  const recordEvent = useCallback(
    async (
      eventType: Mod4EventType,
      context: {
        driverId: string;
        sessionId: string;
        deviceId: string;
        vehicleId?: string | null;
        batchId?: string | null;
        tripId?: string | null;
        dispatchId?: string | null;
        metadata?: Record<string, unknown>;
      },
      position?: { lat: number; lng: number }
    ): Promise<string> => {
      // Get position if not provided
      let lat = position?.lat ?? 0;
      let lng = position?.lng ?? 0;

      if (!position && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 10000,
            });
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {
          console.warn('Failed to get position for event');
        }
      }

      return recordEventMutation.mutateAsync({
        eventType,
        driverId: context.driverId,
        sessionId: context.sessionId,
        deviceId: context.deviceId,
        lat,
        lng,
        metadata: context.metadata,
        vehicleId: context.vehicleId,
        batchId: context.batchId,
        tripId: context.tripId,
        dispatchId: context.dispatchId,
      });
    },
    [recordEventMutation]
  );

  // Convenience methods for common events
  const recordDeliveryStarted = useCallback(
    (
      context: {
        driverId: string;
        sessionId: string;
        deviceId: string;
        batchId: string;
        facilityId: string;
        facilityName: string;
        stopIndex: number;
      },
      position?: { lat: number; lng: number }
    ) =>
      recordEvent(
        'delivery_started',
        {
          driverId: context.driverId,
          sessionId: context.sessionId,
          deviceId: context.deviceId,
          batchId: context.batchId,
          metadata: {
            facilityId: context.facilityId,
            facilityName: context.facilityName,
            stopIndex: context.stopIndex,
          },
        },
        position
      ),
    [recordEvent]
  );

  const recordDeliveryCompleted = useCallback(
    (
      context: {
        driverId: string;
        sessionId: string;
        deviceId: string;
        batchId: string;
        facilityId: string;
        facilityName: string;
        stopIndex: number;
        itemsDelivered?: number;
        proofCaptured?: boolean;
      },
      position?: { lat: number; lng: number }
    ) =>
      recordEvent(
        'delivery_completed',
        {
          driverId: context.driverId,
          sessionId: context.sessionId,
          deviceId: context.deviceId,
          batchId: context.batchId,
          metadata: {
            facilityId: context.facilityId,
            facilityName: context.facilityName,
            stopIndex: context.stopIndex,
            itemsDelivered: context.itemsDelivered,
            proofCaptured: context.proofCaptured,
            completedAt: new Date().toISOString(),
          },
        },
        position
      ),
    [recordEvent]
  );

  const recordBatchStarted = useCallback(
    (
      context: {
        driverId: string;
        sessionId: string;
        deviceId: string;
        batchId: string;
        batchName: string;
        totalStops: number;
      },
      position?: { lat: number; lng: number }
    ) =>
      recordEvent(
        'batch_started',
        {
          driverId: context.driverId,
          sessionId: context.sessionId,
          deviceId: context.deviceId,
          batchId: context.batchId,
          metadata: {
            batchName: context.batchName,
            totalStops: context.totalStops,
            startedAt: new Date().toISOString(),
          },
        },
        position
      ),
    [recordEvent]
  );

  const recordBatchCompleted = useCallback(
    (
      context: {
        driverId: string;
        sessionId: string;
        deviceId: string;
        batchId: string;
        batchName: string;
        totalStops: number;
        completedStops: number;
      },
      position?: { lat: number; lng: number }
    ) =>
      recordEvent(
        'batch_completed',
        {
          driverId: context.driverId,
          sessionId: context.sessionId,
          deviceId: context.deviceId,
          batchId: context.batchId,
          metadata: {
            batchName: context.batchName,
            totalStops: context.totalStops,
            completedStops: context.completedStops,
            completedAt: new Date().toISOString(),
          },
        },
        position
      ),
    [recordEvent]
  );

  const recordPhotoCaptured = useCallback(
    (
      context: {
        driverId: string;
        sessionId: string;
        deviceId: string;
        batchId: string;
        facilityId: string;
        photoType: 'proof_of_delivery' | 'damage' | 'signature' | 'other';
        photoUrl?: string;
      },
      position?: { lat: number; lng: number }
    ) =>
      recordEvent(
        'photo_captured',
        {
          driverId: context.driverId,
          sessionId: context.sessionId,
          deviceId: context.deviceId,
          batchId: context.batchId,
          metadata: {
            facilityId: context.facilityId,
            photoType: context.photoType,
            photoUrl: context.photoUrl,
            capturedAt: new Date().toISOString(),
          },
        },
        position
      ),
    [recordEvent]
  );

  return {
    // Event history
    events: eventsQuery.data || [],
    isLoading: eventsQuery.isLoading,

    // Recording
    recordEvent,
    recordDeliveryStarted,
    recordDeliveryCompleted,
    recordBatchStarted,
    recordBatchCompleted,
    recordPhotoCaptured,
    isRecording: recordEventMutation.isPending,

    // Offline sync
    offlineQueueSize: getOfflineQueue().length,
    syncOfflineEvents: () => syncOfflineEventsMutation.mutateAsync(),
    isSyncing: syncOfflineEventsMutation.isPending,

    // Errors
    error: eventsQuery.error || recordEventMutation.error,
  };
}
