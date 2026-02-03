/**
 * useGeolocation - Browser geolocation hook with continuous tracking
 * Provides current position and supports background GPS updates for Mod4
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Position {
  lat: number;
  lng: number;
  altitude: number | null;
  accuracy: number;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: Date;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watch?: boolean;
  trackingInterval?: number; // ms between GPS submissions
}

interface GPSTrackingOptions {
  driverId: string;
  sessionId: string;
  deviceId: string;
  vehicleId?: string | null;
  batchId?: string | null;
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 5000,
    watch = false,
    trackingInterval = 5000,
  } = options;

  const [position, setPosition] = useState<Position | null>(null);
  const [error, setError] = useState<GeolocationPositionError | null>(null);
  const [isSupported] = useState(() => 'geolocation' in navigator);
  const [isTracking, setIsTracking] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const trackingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const trackingOptionsRef = useRef<GPSTrackingOptions | null>(null);

  const positionOptions: PositionOptions = {
    enableHighAccuracy,
    timeout,
    maximumAge,
  };

  // Convert GeolocationPosition to our Position interface
  const toPosition = (geoPos: GeolocationPosition): Position => ({
    lat: geoPos.coords.latitude,
    lng: geoPos.coords.longitude,
    altitude: geoPos.coords.altitude,
    accuracy: geoPos.coords.accuracy,
    altitudeAccuracy: geoPos.coords.altitudeAccuracy,
    heading: geoPos.coords.heading,
    speed: geoPos.coords.speed,
    timestamp: new Date(geoPos.timestamp),
  });

  // Handle position update
  const handleSuccess = useCallback((geoPos: GeolocationPosition) => {
    setPosition(toPosition(geoPos));
    setError(null);
  }, []);

  // Handle error
  const handleError = useCallback((err: GeolocationPositionError) => {
    setError(err);
  }, []);

  // Get current position once
  const getCurrentPosition = useCallback((): Promise<Position> => {
    return new Promise((resolve, reject) => {
      if (!isSupported) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const position = toPosition(pos);
          setPosition(position);
          setError(null);
          resolve(position);
        },
        (err) => {
          setError(err);
          reject(err);
        },
        positionOptions
      );
    });
  }, [isSupported, positionOptions]);

  // Watch position effect
  useEffect(() => {
    if (!watch || !isSupported) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      positionOptions
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [watch, isSupported, handleSuccess, handleError]);

  // Submit GPS event mutation
  const submitGPSMutation = useMutation({
    mutationFn: async (data: {
      position: Position;
      options: GPSTrackingOptions;
    }) => {
      const { position, options } = data;

      const events = [
        {
          driver_id: options.driverId,
          session_id: options.sessionId,
          device_id: options.deviceId,
          vehicle_id: options.vehicleId || null,
          lat: position.lat,
          lng: position.lng,
          altitude_m: position.altitude,
          accuracy_m: position.accuracy,
          heading: position.heading,
          speed_mps: position.speed,
          captured_at: position.timestamp.toISOString(),
          battery_level: await getBatteryLevel(),
          network_type: getNetworkType(),
          is_background: document.hidden,
          batch_id: options.batchId || null,
        },
      ];

      const { data: result, error } = await supabase.rpc('ingest_gps_events', {
        events: JSON.stringify(events),
      });

      if (error) throw error;
      return result;
    },
  });

  // Start continuous GPS tracking with submission to database
  const startTracking = useCallback(
    (options: GPSTrackingOptions) => {
      if (!isSupported) {
        console.error('Geolocation is not supported');
        return;
      }

      trackingOptionsRef.current = options;
      setIsTracking(true);

      // Start watching position
      watchIdRef.current = navigator.geolocation.watchPosition(
        handleSuccess,
        handleError,
        positionOptions
      );

      // Submit GPS events at interval
      trackingIntervalRef.current = setInterval(async () => {
        if (!position || !trackingOptionsRef.current) return;

        try {
          await submitGPSMutation.mutateAsync({
            position,
            options: trackingOptionsRef.current,
          });
        } catch (err) {
          console.error('Failed to submit GPS event:', err);
        }
      }, trackingInterval);

      // Submit initial position
      getCurrentPosition().then((pos) => {
        if (trackingOptionsRef.current) {
          submitGPSMutation.mutate({
            position: pos,
            options: trackingOptionsRef.current,
          });
        }
      });
    },
    [isSupported, position, trackingInterval, getCurrentPosition, submitGPSMutation]
  );

  // Stop tracking
  const stopTracking = useCallback(() => {
    setIsTracking(false);
    trackingOptionsRef.current = null;

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (trackingIntervalRef.current) {
      clearInterval(trackingIntervalRef.current);
      trackingIntervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return {
    position,
    error,
    isSupported,
    isTracking,
    isSubmitting: submitGPSMutation.isPending,
    getCurrentPosition,
    startTracking,
    stopTracking,
  };
}

// Helper: Get battery level (if available)
async function getBatteryLevel(): Promise<number | null> {
  try {
    if ('getBattery' in navigator) {
      const battery = await (navigator as any).getBattery();
      return Math.round(battery.level * 100);
    }
  } catch {
    // Battery API not available
  }
  return null;
}

// Helper: Get network type
function getNetworkType(): string | null {
  try {
    const connection = (navigator as any).connection;
    if (connection) {
      return connection.effectiveType || connection.type || null;
    }
  } catch {
    // Network Information API not available
  }
  return null;
}

// Hook for simple one-time position
export function useCurrentPosition() {
  const [position, setPosition] = useState<Position | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPosition = useCallback(async () => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000,
        });
      });

      const position: Position = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        altitude: pos.coords.altitude,
        accuracy: pos.coords.accuracy,
        altitudeAccuracy: pos.coords.altitudeAccuracy,
        heading: pos.coords.heading,
        speed: pos.coords.speed,
        timestamp: new Date(pos.timestamp),
      };

      setPosition(position);
      return position;
    } catch (err) {
      const geoError = err as GeolocationPositionError;
      setError(geoError.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { position, loading, error, getPosition };
}
