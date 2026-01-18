import { useState, useCallback } from 'react';
import { GeoLocation } from '../types/events';

export interface GeolocationState {
  loading: boolean;
  error: string | null;
}

export interface GeolocationHook extends GeolocationState {
  getCurrentPosition: () => Promise<GeoLocation>;
  watchPosition: (callback: (position: GeoLocation) => void) => number | null;
  clearWatch: (watchId: number) => void;
}

/**
 * Hook for accessing device geolocation
 * Adapted from archived code with improved error handling
 */
export const useGeoLocation = (): GeolocationHook => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentPosition = useCallback((): Promise<GeoLocation> => {
    setLoading(true);
    setError(null);

    return new Promise((resolve, reject) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        const err = 'Geolocation is not supported by this browser';
        setError(err);
        setLoading(false);
        reject(new Error(err));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLoading(false);
          const location: GeoLocation = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          resolve(location);
        },
        (err) => {
          setLoading(false);
          let msg = 'Location error';
          switch (err.code) {
            case err.PERMISSION_DENIED:
              msg = 'Location permission denied';
              break;
            case err.POSITION_UNAVAILABLE:
              msg = 'Location unavailable';
              break;
            case err.TIMEOUT:
              msg = 'Location request timed out';
              break;
          }
          setError(msg);
          reject(new Error(msg));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000,
        }
      );
    });
  }, []);

  const watchPosition = useCallback(
    (callback: (position: GeoLocation) => void): number | null => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        setError('Geolocation is not supported');
        return null;
      }

      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const location: GeoLocation = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          callback(location);
        },
        (err) => {
          let msg = 'Location error';
          switch (err.code) {
            case err.PERMISSION_DENIED:
              msg = 'Location permission denied';
              break;
            case err.POSITION_UNAVAILABLE:
              msg = 'Location unavailable';
              break;
            case err.TIMEOUT:
              msg = 'Location request timed out';
              break;
          }
          setError(msg);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000,
        }
      );

      return watchId;
    },
    []
  );

  const clearWatch = useCallback((watchId: number) => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  return {
    getCurrentPosition,
    watchPosition,
    clearWatch,
    loading,
    error,
  };
};
