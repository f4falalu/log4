import { EventExecutionService } from './EventExecutionService';
import { GeoLocation } from './events';

const DEVICE_KNOWN_KEY = 'mod4_device_known_driver';

/**
 * PRD Section 4: Identity, Auth & Device Model
 */
export class AuthService {
  constructor(
    private readonly eventService: EventExecutionService,
    private readonly deviceId: string
  ) {}

  /**
   * Handles driver login and detects new device usage.
   * Section 4.3: First login from a new device emits `new_device_login`
   */
  async login(
    driverId: string, 
    currentGeo: GeoLocation
  ): Promise<void> {
    // 1. Perform standard auth (e.g., API call to /admin/auth)
    // In a real implementation, this would validate credentials.
    // await this.api.authenticate(driverId, ...);

    // 2. Check Device Identity (Observed, not enforced)
    const knownDriver = typeof localStorage !== 'undefined' 
      ? localStorage.getItem(DEVICE_KNOWN_KEY) 
      : null;

    if (knownDriver !== driverId) {
      // This is a new device for this driver (or first login)
      await this.eventService.captureEvent(
        'new_device_login',
        'system', // No trip associated with login
        'system', // No dispatch associated with login
        currentGeo,
        {
          previous_known_driver: knownDriver,
          detected_device_id: this.deviceId
        }
      );

      // Mark device as known for this driver
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(DEVICE_KNOWN_KEY, driverId);
      }
    }
  }
}