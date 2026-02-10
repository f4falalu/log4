/**
 * usePlaybackData - Fetches historical driver events for playback mode
 * Provides data for timeline replay and analytics
 */

import { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  PlaybackEvent,
  StopAnalytics,
  TripAnalytics,
  DriverStatus,
  EventType,
} from '@/types/live-map';

interface UsePlaybackDataOptions {
  batchId?: string;
  driverId?: string;
  startTime?: Date;
  endTime?: Date;
  enabled?: boolean;
}

interface PlaybackData {
  events: PlaybackEvent[];
  analytics: TripAnalytics | null;
  stopAnalytics: StopAnalytics[];
  timeRange: { start: Date; end: Date } | null;
}

// Transform database row to PlaybackEvent
function transformPlaybackEvent(row: Record<string, unknown>): PlaybackEvent {
  const locationData = row.location as { coordinates?: [number, number] } | null;

  return {
    id: row.id as string,
    timestamp: new Date(row.recorded_at as string),
    eventType: row.event_type as EventType,
    driverStatus: row.driver_status as DriverStatus,
    location: locationData?.coordinates
      ? [locationData.coordinates[0], locationData.coordinates[1]]
      : [0, 0],
    driverId: row.driver_id as string,
    driverName: (row.driver as Record<string, unknown>)?.name as string,
    batchId: row.batch_id as string,
    facilityId: (row.metadata as Record<string, unknown>)?.facility_id as string,
    facilityName: (row.metadata as Record<string, unknown>)?.facility_name as string,
    metadata: (row.metadata as Record<string, unknown>) || {},
  };
}

// Calculate stop analytics from events
function calculateStopAnalytics(events: PlaybackEvent[]): StopAnalytics[] {
  const stops: StopAnalytics[] = [];
  let currentStop: Partial<StopAnalytics> | null = null;
  let stopIndex = 0;

  for (const event of events) {
    if (event.eventType === 'ARRIVED_AT_STOP') {
      currentStop = {
        facilityId: event.facilityId || `stop-${stopIndex}`,
        facilityName: event.facilityName || `Stop ${stopIndex + 1}`,
        stopIndex,
        arrivalTime: event.timestamp,
        proofCaptured: false,
        delayed: false,
      };
    } else if (event.eventType === 'PROOF_CAPTURED' && currentStop) {
      currentStop.proofCaptured = true;
    } else if (event.eventType === 'DELAY_REPORTED' && currentStop) {
      currentStop.delayed = true;
    } else if (event.eventType === 'DEPARTED_STOP' && currentStop) {
      currentStop.departureTime = event.timestamp;
      currentStop.duration = Math.round(
        (event.timestamp.getTime() - currentStop.arrivalTime!.getTime()) / 1000
      );
      stops.push(currentStop as StopAnalytics);
      currentStop = null;
      stopIndex++;
    }
  }

  // Handle incomplete stop (driver still at stop)
  if (currentStop && currentStop.arrivalTime) {
    currentStop.departureTime = null;
    currentStop.duration = Math.round(
      (Date.now() - currentStop.arrivalTime.getTime()) / 1000
    );
    stops.push(currentStop as StopAnalytics);
  }

  return stops;
}

// Calculate trip analytics from events
function calculateTripAnalytics(
  events: PlaybackEvent[],
  stopAnalytics: StopAnalytics[],
  batchId: string
): TripAnalytics | null {
  if (events.length === 0) return null;

  const startEvent = events.find((e) => e.eventType === 'ROUTE_STARTED');
  const endEvent = events.find((e) => e.eventType === 'ROUTE_COMPLETED');

  if (!startEvent) return null;

  const startTime = startEvent.timestamp;
  const endTime = endEvent?.timestamp || new Date();
  const totalDuration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

  // Calculate moving time (total - time at stops)
  const stopTime = stopAnalytics.reduce((acc, stop) => acc + stop.duration, 0);
  const movingTime = totalDuration - stopTime;

  // Calculate total distance (rough estimate from coordinates)
  let totalDistance = 0;
  let lastLocation: [number, number] | null = null;
  for (const event of events) {
    if (event.location[0] !== 0 && event.location[1] !== 0) {
      if (lastLocation) {
        totalDistance += calculateDistance(lastLocation, event.location);
      }
      lastLocation = event.location;
    }
  }

  const completedStops = stopAnalytics.filter((s) => s.departureTime !== null).length;
  const avgStopDuration =
    completedStops > 0
      ? Math.round(
          stopAnalytics.reduce((acc, s) => acc + s.duration, 0) / completedStops
        )
      : 0;
  const maxStopDuration =
    stopAnalytics.length > 0
      ? Math.max(...stopAnalytics.map((s) => s.duration))
      : 0;
  const delays = stopAnalytics.filter((s) => s.delayed).length;

  return {
    batchId,
    driverId: events[0].driverId,
    startTime,
    endTime: endEvent ? endTime : null,
    totalDuration,
    movingTime,
    idleTime: stopTime,
    totalDistance: Math.round(totalDistance),
    stopsCount: stopAnalytics.length,
    completedStops,
    avgStopDuration,
    maxStopDuration,
    delays,
    stops: stopAnalytics,
  };
}

// Haversine distance calculation
function calculateDistance(
  [lng1, lat1]: [number, number],
  [lng2, lat2]: [number, number]
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function usePlaybackData(options: UsePlaybackDataOptions = {}) {
  const { batchId, driverId, startTime, endTime, enabled = true } = options;

  // Fetch historical events
  const fetchPlaybackEvents = useCallback(async (): Promise<PlaybackData> => {
    try {
      let query = supabase
        .from('driver_events')
        .select(`
          *,
          driver:drivers(name)
        `)
        .order('recorded_at', { ascending: true });

      if (batchId) {
        query = query.eq('batch_id', batchId);
      }

      if (driverId) {
        query = query.eq('driver_id', driverId);
      }

      if (startTime) {
        query = query.gte('recorded_at', startTime.toISOString());
      }

      if (endTime) {
        query = query.lte('recorded_at', endTime.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      const events = (data || []).map(transformPlaybackEvent);

      if (events.length === 0) {
        return {
          events: [],
          analytics: null,
          stopAnalytics: [],
          timeRange: null,
        };
      }

      const stopAnalytics = calculateStopAnalytics(events);
      const analytics = calculateTripAnalytics(
        events,
        stopAnalytics,
        batchId || events[0].batchId
      );

      const timeRange = {
        start: events[0].timestamp,
        end: events[events.length - 1].timestamp,
      };

      return {
        events,
        analytics,
        stopAnalytics,
        timeRange,
      };
    } catch (err) {
      console.error('Error fetching playback data:', err);
      return {
        events: [],
        analytics: null,
        stopAnalytics: [],
        timeRange: null,
      };
    }
  }, [batchId, driverId, startTime, endTime]);

  const query = useQuery({
    queryKey: ['playback-data', batchId, driverId, startTime?.toISOString(), endTime?.toISOString()],
    queryFn: fetchPlaybackEvents,
    enabled: enabled && !!(batchId || driverId),
    staleTime: 60000, // Data is relatively static for playback
  });

  // Get event at specific time
  const getEventAtTime = useCallback(
    (time: Date): PlaybackEvent | null => {
      if (!query.data?.events.length) return null;

      const events = query.data.events;
      let lastEvent: PlaybackEvent | null = null;

      for (const event of events) {
        if (event.timestamp <= time) {
          lastEvent = event;
        } else {
          break;
        }
      }

      return lastEvent;
    },
    [query.data]
  );

  // Get driver position at specific time (interpolated)
  const getPositionAtTime = useCallback(
    (time: Date): [number, number] | null => {
      if (!query.data?.events.length) return null;

      const events = query.data.events;
      let prevEvent: PlaybackEvent | null = null;
      let nextEvent: PlaybackEvent | null = null;

      for (let i = 0; i < events.length; i++) {
        if (events[i].timestamp <= time) {
          prevEvent = events[i];
          nextEvent = events[i + 1] || null;
        } else {
          break;
        }
      }

      if (!prevEvent) return null;
      if (!nextEvent) return prevEvent.location;

      // Linear interpolation between events
      const t =
        (time.getTime() - prevEvent.timestamp.getTime()) /
        (nextEvent.timestamp.getTime() - prevEvent.timestamp.getTime());

      return [
        prevEvent.location[0] + t * (nextEvent.location[0] - prevEvent.location[0]),
        prevEvent.location[1] + t * (nextEvent.location[1] - prevEvent.location[1]),
      ];
    },
    [query.data]
  );

  // Get all events up to a specific time
  const getEventsUntilTime = useCallback(
    (time: Date): PlaybackEvent[] => {
      if (!query.data?.events.length) return [];
      return query.data.events.filter((e) => e.timestamp <= time);
    },
    [query.data]
  );

  return {
    ...query,
    events: query.data?.events || [],
    analytics: query.data?.analytics || null,
    stopAnalytics: query.data?.stopAnalytics || [],
    timeRange: query.data?.timeRange || null,
    getEventAtTime,
    getPositionAtTime,
    getEventsUntilTime,
  };
}

// Fetch list of batches available for playback
export function usePlaybackBatches(enabled = true) {
  return useQuery({
    queryKey: ['playback-batches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_batches')
        .select(`
          id,
          name,
          status,
          actual_start_time,
          actual_end_time,
          driver:drivers!delivery_batches_driver_id_fkey(name)
        `)
        .not('actual_start_time', 'is', null)
        .order('actual_start_time', { ascending: false })
        .limit(50);

      if (error) throw error;

      return (data || []).map((batch) => ({
        id: batch.id,
        name: batch.name || `Batch ${batch.id.slice(0, 8)}`,
        status: batch.status,
        driverName: (batch.driver as Record<string, unknown>)?.name,
        startTime: batch.actual_start_time ? new Date(batch.actual_start_time) : null,
        endTime: batch.actual_end_time ? new Date(batch.actual_end_time) : null,
      }));
    },
    enabled,
  });
}
