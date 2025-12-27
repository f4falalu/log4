import { useState, useCallback } from 'react';
import { GeoLocation } from './events';

export const useGeoLocation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentPosition = useCallback((): Promise<GeoLocation> => {
    setLoading(true);
    setError(null);

    return new Promise((resolve) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        setError('Geolocation is not supported');
        setLoading(false);
        // Fallback/Mock (NYC)
        resolve({ lat: 40.7128, lng: -74.0060 });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLoading(false);
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
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
          resolve({ lat: 40.7128, lng: -74.0060 }); // Fallback
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, []);

  return { getCurrentPosition, loading, error };
};