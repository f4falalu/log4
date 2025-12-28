import { useState, useEffect, useRef } from 'react';
import { EventExecutionService } from './EventExecutionService';
import { IndexedDBAdapter } from './OfflineStorageAdapter';
import { AuthService } from './AuthService';
import { SecurityService } from './SecurityService';
import { LocationCorrectionService } from './LocationCorrectionService';

interface Mod4Context {
  eventService: EventExecutionService | null;
  authService: AuthService | null;
  locationService: LocationCorrectionService | null;
  isReady: boolean;
  error: Error | null;
}

/**
 * React Hook to initialize the Mobile Execution Service stack.
 * Handles dependency injection and async initialization of crypto/storage.
 */
export function useMod4Service(
  driverId: string,
  deviceId: string,
  vehicleId: string,
  apiEndpoint: string,
  secret: string // User PIN or derived secret for encryption
): Mod4Context {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Refs to hold singleton instances
  const services = useRef<Omit<Mod4Context, 'isReady' | 'error'>>({
    eventService: null,
    authService: null,
    locationService: null,
  });

  useEffect(() => {
    const init = async () => {
      try {
        // 1. Initialize Security
        const security = new SecurityService();
        await security.initialize(secret);

        // 2. Initialize Storage with Security
        const storage = new IndexedDBAdapter(security);

        // 3. Initialize Event Service
        const eventService = new EventExecutionService(storage, apiEndpoint, {
          driverId,
          deviceId,
          vehicleId
        });

        services.current.eventService = eventService;
        services.current.authService = new AuthService(eventService, deviceId);
        services.current.locationService = new LocationCorrectionService(eventService);

        setIsReady(true);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Initialization failed'));
      }
    };

    if (driverId && secret) {
      init();
    }
  }, [driverId, deviceId, vehicleId, apiEndpoint, secret]);

  return {
    ...services.current,
    isReady,
    error
  };
}