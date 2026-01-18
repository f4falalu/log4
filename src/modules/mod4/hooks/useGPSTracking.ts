import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GPSTrackingService, GPSTrackingConfig } from '../services/GPSTrackingService';

export interface GPSTrackingHook {
  isTracking: boolean;
  queuedEvents: number;
  lastPosition: { lat: number; lng: number } | null;
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  error: string | null;
}

/**
 * Hook for GPS tracking functionality
 * Manages GPS tracking service lifecycle
 */
export const useGPSTracking = (
  driverId: string,
  sessionId: string,
  deviceId: string,
  config?: GPSTrackingConfig
): GPSTrackingHook => {
  const [isTracking, setIsTracking] = useState(false);
  const [queuedEvents, setQueuedEvents] = useState(0);
  const [lastPosition, setLastPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const serviceRef = useRef<GPSTrackingService | null>(null);
  const statusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize service
  useEffect(() => {
    if (!driverId || !sessionId || !deviceId) {
      return;
    }

    serviceRef.current = new GPSTrackingService(
      supabase,
      { driverId, sessionId, deviceId },
      config
    );

    return () => {
      if (serviceRef.current) {
        serviceRef.current.destroy();
        serviceRef.current = null;
      }
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
        statusIntervalRef.current = null;
      }
    };
  }, [driverId, sessionId, deviceId, config]);

  // Update status periodically
  useEffect(() => {
    if (!serviceRef.current) {
      return;
    }

    const updateStatus = () => {
      if (serviceRef.current) {
        const status = serviceRef.current.getStatus();
        setIsTracking(status.isTracking);
        setQueuedEvents(status.queuedEvents);
        setLastPosition(status.lastPosition);
      }
    };

    updateStatus(); // Initial update
    statusIntervalRef.current = setInterval(updateStatus, 1000);

    return () => {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
        statusIntervalRef.current = null;
      }
    };
  }, []);

  const startTracking = useCallback(async () => {
    if (!serviceRef.current) {
      setError('GPS tracking service not initialized');
      return;
    }

    try {
      setError(null);
      await serviceRef.current.startTracking();
      setIsTracking(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start GPS tracking';
      setError(message);
      console.error('[useGPSTracking] Start error:', err);
    }
  }, []);

  const stopTracking = useCallback(() => {
    if (!serviceRef.current) {
      return;
    }

    try {
      serviceRef.current.stopTracking();
      setIsTracking(false);
    } catch (err) {
      console.error('[useGPSTracking] Stop error:', err);
    }
  }, []);

  return {
    isTracking,
    queuedEvents,
    lastPosition,
    startTracking,
    stopTracking,
    error,
  };
};
