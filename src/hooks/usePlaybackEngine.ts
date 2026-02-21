/**
 * usePlaybackEngine Hook
 *
 * High-level hook that:
 * 1. Fetches raw trip data from backend (via usePlaybackData)
 * 2. Normalizes data into time-indexed structures
 * 3. Stores normalized trip in PlaybackStore
 * 4. Provides loading/error states
 *
 * This hook is the bridge between raw backend data and the playback engine.
 */

import { useEffect, useMemo } from 'react';
import { usePlaybackData } from './usePlaybackData';
import { usePlaybackStore } from '@/stores/playbackStore';
import { preprocessTripData, downsampleGPS, type RawPlaybackData } from '@/lib/playback-preprocessing';
import type { Polyline } from '@/types/live-map';

interface UsePlaybackEngineOptions {
  batchId: string | null;
  plannedRoute?: Polyline | null;
  enabled?: boolean;
}

interface UsePlaybackEngineReturn {
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isFetching: boolean;
}

/**
 * Playback engine hook
 *
 * Usage:
 * ```
 * const { isLoading, isError } = usePlaybackEngine({
 *   batchId: selectedBatchId,
 *   plannedRoute: null, // Optional
 * });
 * ```
 */
export function usePlaybackEngine(
  options: UsePlaybackEngineOptions
): UsePlaybackEngineReturn {
  const { batchId, plannedRoute = null, enabled = true } = options;

  const setTripData = usePlaybackStore((state) => state.setTripData);

  // Fetch raw data from backend
  const {
    events,
    stopAnalytics,
    analytics,
    timeRange,
    isLoading,
    isError,
    error,
    isFetching,
  } = usePlaybackData({
    batchId: batchId || undefined,
    enabled: enabled && !!batchId,
  });

  // Normalize data when raw data changes
  const normalizedTrip = useMemo(() => {
    if (!batchId || !timeRange || events.length === 0 || !analytics) {
      return null;
    }

    const rawData: RawPlaybackData = {
      events,
      stopAnalytics,
      analytics,
      timeRange,
    };

    const trip = preprocessTripData(rawData, batchId, plannedRoute);

    // Downsample GPS if needed (performance optimization)
    if (trip && trip.gps.length > 50000) {
      trip.gps = downsampleGPS(trip.gps, 50000);
    }

    return trip;
  }, [batchId, events, stopAnalytics, analytics, timeRange, plannedRoute]);

  // Update store when normalized trip changes
  useEffect(() => {
    setTripData(normalizedTrip);
  }, [normalizedTrip, setTripData]);

  // Log when trip is loaded
  useEffect(() => {
    if (normalizedTrip) {
      console.log('[usePlaybackEngine] Trip loaded and normalized', {
        batchId: normalizedTrip.batchId,
        duration: (normalizedTrip.endTime - normalizedTrip.startTime) / 1000 / 60,
        gpsPoints: normalizedTrip.gps.length,
        events: normalizedTrip.events.length,
        stops: normalizedTrip.stops.length,
      });
    }
  }, [normalizedTrip]);

  return {
    isLoading,
    isError,
    error: error as Error | null,
    isFetching,
  };
}
