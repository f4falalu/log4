// MOD4 GPS Telemetry
// Battery-aware adaptive GPS streaming with Kalman filtering

import { create } from 'zustand';
import { createEvent } from '@/lib/db/events';
import { useAuthStore } from '@/stores/authStore';
import { useBatchStore } from '@/stores/batchStore';

export interface GpsPosition {
  lat: number;
  lng: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

interface TelemetryState {
  isTracking: boolean;
  currentPosition: GpsPosition | null;
  lastEmittedPosition: GpsPosition | null;
  watchId: number | null;
  batteryLevel: number | null;
  isCharging: boolean;
  intervalMs: number;
  
  // Kalman filter state
  kalmanLat: number | null;
  kalmanLng: number | null;
  kalmanVariance: number;
  
  // Actions
  startTracking: () => void;
  stopTracking: () => void;
  updateBatteryStatus: () => void;
}

// Adaptive frequency based on battery level
function getAdaptiveInterval(batteryLevel: number | null, isCharging: boolean): number {
  if (isCharging) return 3000; // 3s when charging
  if (batteryLevel === null) return 10000; // 10s default
  if (batteryLevel > 0.5) return 5000; // 5s when > 50%
  if (batteryLevel > 0.2) return 15000; // 15s when 20-50%
  return 30000; // 30s when < 20% (battery saver)
}

// Simple Kalman filter for GPS smoothing
function kalmanFilter(
  measurement: number,
  estimate: number | null,
  variance: number,
  measurementNoise: number
): { estimate: number; variance: number } {
  if (estimate === null) {
    return { estimate: measurement, variance: measurementNoise };
  }
  
  const processNoise = 0.00001; // Small process noise for GPS
  const predictedVariance = variance + processNoise;
  const kalmanGain = predictedVariance / (predictedVariance + measurementNoise);
  const newEstimate = estimate + kalmanGain * (measurement - estimate);
  const newVariance = (1 - kalmanGain) * predictedVariance;
  
  return { estimate: newEstimate, variance: newVariance };
}

// Minimum distance (meters) before emitting new position event
const MIN_DISTANCE_METERS = 10;

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export const useTelemetryStore = create<TelemetryState>()((set, get) => ({
  isTracking: false,
  currentPosition: null,
  lastEmittedPosition: null,
  watchId: null,
  batteryLevel: null,
  isCharging: false,
  intervalMs: 10000,
  kalmanLat: null,
  kalmanLng: null,
  kalmanVariance: 1,

  startTracking: () => {
    const state = get();
    if (state.isTracking || state.watchId !== null) return;

    // Update battery status first
    get().updateBatteryStatus();

    if (!navigator.geolocation) {
      console.error('Geolocation not supported');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy, heading, speed } = position.coords;
        const state = get();
        
        // Apply Kalman filter
        const measurementNoise = accuracy / 111000; // Convert meters to degrees approx
        const latResult = kalmanFilter(latitude, state.kalmanLat, state.kalmanVariance, measurementNoise);
        const lngResult = kalmanFilter(longitude, state.kalmanLng, state.kalmanVariance, measurementNoise);

        const smoothedPosition: GpsPosition = {
          lat: latResult.estimate,
          lng: lngResult.estimate,
          accuracy,
          heading,
          speed,
          timestamp: position.timestamp,
        };

        set({
          currentPosition: smoothedPosition,
          kalmanLat: latResult.estimate,
          kalmanLng: lngResult.estimate,
          kalmanVariance: latResult.variance,
        });

        // Check if we should emit event (moved enough distance)
        const lastEmitted = state.lastEmittedPosition;
        const shouldEmit = !lastEmitted || 
          haversineDistance(
            lastEmitted.lat, 
            lastEmitted.lng, 
            smoothedPosition.lat, 
            smoothedPosition.lng
          ) >= MIN_DISTANCE_METERS;

        if (shouldEmit) {
          // Emit location event
          const driver = useAuthStore.getState().driver;
          const batch = useBatchStore.getState().currentBatch;
          
          if (driver) {
            await createEvent({
              type: 'location_update',
              driver_id: driver.id,
              batch_id: batch?.id,
              lat: smoothedPosition.lat,
              lng: smoothedPosition.lng,
              accuracy: smoothedPosition.accuracy,
              heading: smoothedPosition.heading ?? undefined,
              speed: smoothedPosition.speed ?? undefined,
              payload: {
                raw_lat: latitude,
                raw_lng: longitude,
              },
            });
          }

          set({ lastEmittedPosition: smoothedPosition });
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    set({ isTracking: true, watchId });

    // Set up battery monitoring
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const updateBattery = () => {
          const batteryLevel = battery.level;
          const isCharging = battery.charging;
          const intervalMs = getAdaptiveInterval(batteryLevel, isCharging);
          set({ batteryLevel, isCharging, intervalMs });
        };

        battery.addEventListener('chargingchange', updateBattery);
        battery.addEventListener('levelchange', updateBattery);
        updateBattery();
      });
    }
  },

  stopTracking: () => {
    const { watchId } = get();
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }
    set({
      isTracking: false,
      watchId: null,
      currentPosition: null,
      lastEmittedPosition: null,
      kalmanLat: null,
      kalmanLng: null,
      kalmanVariance: 1,
    });
  },

  updateBatteryStatus: async () => {
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        const batteryLevel = battery.level;
        const isCharging = battery.charging;
        const intervalMs = getAdaptiveInterval(batteryLevel, isCharging);
        set({ batteryLevel, isCharging, intervalMs });
      } catch (error) {
        console.error('Battery API error:', error);
      }
    }
  },
}));

// Hook for components
export function useGpsTelemetry() {
  const store = useTelemetryStore();
  return {
    isTracking: store.isTracking,
    position: store.currentPosition,
    batteryLevel: store.batteryLevel,
    isCharging: store.isCharging,
    intervalMs: store.intervalMs,
    startTracking: store.startTracking,
    stopTracking: store.stopTracking,
  };
}
