import { SupabaseClient } from '@supabase/supabase-js';
import { GPSEvent } from '../types/events';

export interface GPSTrackingConfig {
  /**
   * Tracking interval in milliseconds
   * @default 10000 (10 seconds)
   */
  interval?: number;

  /**
   * Minimum distance change in meters to trigger update
   * @default 5
   */
  minDistance?: number;

  /**
   * Batch size for GPS events before upload
   * @default 10
   */
  batchSize?: number;

  /**
   * Enable high accuracy GPS
   * @default true
   */
  highAccuracy?: boolean;

  /**
   * Maximum age of cached position in milliseconds
   * @default 5000
   */
  maxAge?: number;

  /**
   * Timeout for position request in milliseconds
   * @default 10000
   */
  timeout?: number;
}

const DEFAULT_CONFIG: Required<GPSTrackingConfig> = {
  interval: 10000,
  minDistance: 5,
  batchSize: 10,
  highAccuracy: true,
  maxAge: 5000,
  timeout: 10000,
};

/**
 * GPS Tracking Service
 * Provides continuous GPS tracking with batch uploads and offline queue
 */
export class GPSTrackingService {
  private watchId: number | null = null;
  private eventQueue: GPSEvent[] = [];
  private lastPosition: { lat: number; lng: number } | null = null;
  private config: Required<GPSTrackingConfig>;
  private isTracking = false;
  private uploadInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: {
      driverId: string;
      sessionId: string;
      deviceId: string;
    },
    config: GPSTrackingConfig = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start continuous GPS tracking
   */
  async startTracking(): Promise<void> {
    if (this.isTracking) {
      console.log('[GPSTracking] Already tracking');
      return;
    }

    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported by this browser');
    }

    console.log('[GPSTracking] Starting GPS tracking');
    this.isTracking = true;

    // Watch position continuously
    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handlePositionUpdate(position),
      (error) => this.handlePositionError(error),
      {
        enableHighAccuracy: this.config.highAccuracy,
        maximumAge: this.config.maxAge,
        timeout: this.config.timeout,
      }
    );

    // Set up periodic upload
    this.uploadInterval = setInterval(() => {
      this.uploadBatch().catch(err => console.error('[GPSTracking] Upload error:', err));
    }, this.config.interval);
  }

  /**
   * Stop GPS tracking
   */
  stopTracking(): void {
    if (!this.isTracking) {
      return;
    }

    console.log('[GPSTracking] Stopping GPS tracking');
    this.isTracking = false;

    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.uploadInterval) {
      clearInterval(this.uploadInterval);
      this.uploadInterval = null;
    }

    // Upload any remaining events
    if (this.eventQueue.length > 0) {
      this.uploadBatch().catch(err => console.error('[GPSTracking] Final upload error:', err));
    }
  }

  /**
   * Handle GPS position update
   */
  private handlePositionUpdate(position: GeolocationPosition): void {
    const { latitude: lat, longitude: lng, altitude, accuracy, heading, speed } = position.coords;

    // Check minimum distance threshold
    if (this.lastPosition) {
      const distance = this.calculateDistance(
        this.lastPosition.lat,
        this.lastPosition.lng,
        lat,
        lng
      );

      if (distance < this.config.minDistance) {
        return; // Skip if movement is below threshold
      }
    }

    this.lastPosition = { lat, lng };

    // Get battery level if available
    const battery = this.getBatteryLevel();

    // Create GPS event
    const gpsEvent: GPSEvent = {
      driver_id: this.context.driverId,
      session_id: this.context.sessionId,
      device_id: this.context.deviceId,
      lat,
      lng,
      altitude_m: altitude || undefined,
      accuracy_m: accuracy || undefined,
      heading: heading || undefined,
      speed_mps: speed || undefined,
      captured_at: new Date(position.timestamp).toISOString(),
      battery_level: battery,
      network_type: this.getNetworkType(),
      is_moving: speed ? speed > 0.5 : undefined, // Moving if speed > 0.5 m/s
    };

    this.eventQueue.push(gpsEvent);

    // Upload if batch size reached
    if (this.eventQueue.length >= this.config.batchSize) {
      this.uploadBatch().catch(err => console.error('[GPSTracking] Batch upload error:', err));
    }
  }

  /**
   * Handle GPS position error
   */
  private handlePositionError(error: GeolocationPositionError): void {
    let message = 'GPS error';
    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = 'GPS permission denied';
        this.stopTracking();
        break;
      case error.POSITION_UNAVAILABLE:
        message = 'GPS position unavailable';
        break;
      case error.TIMEOUT:
        message = 'GPS request timed out';
        break;
    }
    console.error('[GPSTracking]', message, error);
  }

  /**
   * Upload batch of GPS events to Supabase
   */
  private async uploadBatch(): Promise<void> {
    if (this.eventQueue.length === 0) {
      return;
    }

    if (!navigator.onLine) {
      console.log('[GPSTracking] Offline, queuing events');
      return;
    }

    const batch = [...this.eventQueue];
    this.eventQueue = [];

    try {
      console.log(`[GPSTracking] Uploading ${batch.length} GPS events`);

      const { error } = await this.supabase.rpc('ingest_gps_events', {
        events: JSON.stringify(batch),
      });

      if (error) {
        console.error('[GPSTracking] Upload failed:', error);
        // Re-queue failed events
        this.eventQueue.unshift(...batch);
      } else {
        console.log(`[GPSTracking] Uploaded ${batch.length} events successfully`);
      }
    } catch (error) {
      console.error('[GPSTracking] Upload exception:', error);
      // Re-queue failed events
      this.eventQueue.unshift(...batch);
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   * Returns distance in meters
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Get battery level (if Battery API is available)
   */
  private getBatteryLevel(): number | undefined {
    // Battery API is deprecated but still available in some browsers
    // @ts-ignore
    const battery = navigator.battery || navigator.mozBattery || navigator.webkitBattery;
    if (battery && typeof battery.level === 'number') {
      return Math.round(battery.level * 100);
    }
    return undefined;
  }

  /**
   * Get network type
   */
  private getNetworkType(): string | undefined {
    // @ts-ignore
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    return connection?.effectiveType || connection?.type;
  }

  /**
   * Get current tracking status
   */
  getStatus(): {
    isTracking: boolean;
    queuedEvents: number;
    lastPosition: { lat: number; lng: number } | null;
  } {
    return {
      isTracking: this.isTracking,
      queuedEvents: this.eventQueue.length,
      lastPosition: this.lastPosition,
    };
  }

  /**
   * Update context (e.g., when session changes)
   */
  updateContext(context: Partial<GPSTrackingService['context']>) {
    Object.assign(this.context, context);
  }

  /**
   * Destroy service (cleanup)
   */
  destroy(): void {
    this.stopTracking();
  }
}
