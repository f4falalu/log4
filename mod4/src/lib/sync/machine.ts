// MOD4 Sync State Machine
// Manages offline/online sync lifecycle with Supabase

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { getPendingEvents, getErrorEvents, markEventSyncing, markEventSynced, markEventError } from '../db/events';
import { getDB, Mod4Event, generateDeviceId } from '../db/schema';
import { supabase } from '@/integrations/supabase';
import { useAuthStore } from '@/stores/authStore';

// ============================================
// DRIVER SESSION MANAGEMENT
// ============================================

let activeSessionId: string | null = null;

/** Get or create a driver session for GPS event tracking */
async function ensureDriverSession(userId: string): Promise<string> {
  if (activeSessionId) return activeSessionId;

  const deviceId = generateDeviceId();

  // Try to find an existing active session for this user
  const { data: existing } = await supabase
    .from('driver_sessions')
    .select('id')
    .eq('driver_id', userId)
    .eq('status', 'ACTIVE')
    .limit(1)
    .single();

  if (existing?.id) {
    activeSessionId = existing.id;
    return activeSessionId;
  }

  // Create a new session via RPC
  const { data: sessionId, error } = await supabase.rpc('start_driver_session', {
    p_driver_id: userId,
    p_device_id: deviceId,
  });

  if (error) {
    console.error('[MOD4 Sync] Failed to create driver session:', error.message);
    throw error;
  }

  activeSessionId = sessionId as string;
  console.log('[MOD4 Sync] Driver session created:', activeSessionId);
  return activeSessionId;
}

/** Clear the cached session (e.g. on logout) */
export function clearDriverSession(): void {
  activeSessionId = null;
}

// ============================================
// SYNC STATES
// ============================================

export type SyncState =
  | 'IDLE'       // Online, nothing to sync
  | 'OFFLINE'    // No network connectivity
  | 'QUEUED'     // Events pending, waiting to sync
  | 'SYNCING'    // Actively syncing
  | 'SYNCED'     // Just completed sync
  | 'ERROR';     // Sync failed

export interface SyncStore {
  // State
  state: SyncState;
  isOnline: boolean;
  pendingCount: number;
  errorCount: number;
  lastSync: number | null;
  lastError: string | null;

  // Actions
  setOnline: (online: boolean) => void;
  setState: (state: SyncState) => void;
  setPendingCount: (count: number) => void;
  setErrorCount: (count: number) => void;
  setLastSync: (timestamp: number) => void;
  setLastError: (error: string | null) => void;

  // Sync operations
  triggerSync: () => Promise<void>;
  retryErrors: () => Promise<void>;
  refreshCounts: () => Promise<void>;
}

// ============================================
// SYNC STORE
// ============================================

export const useSyncStore = create<SyncStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    state: navigator.onLine ? 'IDLE' : 'OFFLINE',
    isOnline: navigator.onLine,
    pendingCount: 0,
    errorCount: 0,
    lastSync: null,
    lastError: null,

    // Basic setters
    setOnline: (online) => set({ isOnline: online, state: online ? 'IDLE' : 'OFFLINE' }),
    setState: (state) => set({ state }),
    setPendingCount: (count) => set({ pendingCount: count }),
    setErrorCount: (count) => set({ errorCount: count }),
    setLastSync: (timestamp) => set({ lastSync: timestamp }),
    setLastError: (error) => set({ lastError: error }),

    // Refresh counts from DB
    refreshCounts: async () => {
      const pending = await getPendingEvents();
      const errors = await getErrorEvents();
      set({
        pendingCount: pending.length,
        errorCount: errors.length,
        state: pending.length > 0 ? 'QUEUED' : get().state
      });
    },

    // Trigger sync of pending events
    triggerSync: async () => {
      const { isOnline, state } = get();

      if (!isOnline) {
        set({ state: 'OFFLINE' });
        return;
      }

      if (state === 'SYNCING') {
        return; // Already syncing
      }

      const pending = await getPendingEvents();
      if (pending.length === 0) {
        set({ state: 'IDLE' });
        return;
      }

      set({ state: 'SYNCING' });

      try {
        // Process events in batches
        await syncEvents(pending);

        // Check for more pending
        const remaining = await getPendingEvents();
        set({
          state: remaining.length > 0 ? 'QUEUED' : 'SYNCED',
          lastSync: Date.now(),
          pendingCount: remaining.length,
          lastError: null
        });

        // Reset to IDLE after brief SYNCED state
        if (remaining.length === 0) {
          setTimeout(() => {
            if (get().state === 'SYNCED') {
              set({ state: 'IDLE' });
            }
          }, 2000);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Sync failed';
        set({ state: 'ERROR', lastError: errorMessage });
      }
    },

    // Retry events with errors
    retryErrors: async () => {
      const errors = await getErrorEvents();
      const db = await getDB();

      for (const event of errors) {
        event.sync_status = 'pending';
        await db.put('events', event);
      }

      set({ errorCount: 0, state: 'QUEUED' });
      get().triggerSync();
    },
  }))
);

// ============================================
// SYNC ENGINE
// ============================================

async function syncEvents(events: Mod4Event[]): Promise<void> {
  const driver = useAuthStore.getState().driver;

  if (!driver) {
    console.warn('[MOD4 Sync] No driver logged in, skipping sync');
    return;
  }

  // Group events by type for batch processing
  const batchSize = 50;

  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);

    for (const event of batch) {
      await markEventSyncing(event.id);

      try {
        // Sync event to Supabase based on event type
        await syncEventToSupabase(event, driver.id);
        await markEventSynced(event.id);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[MOD4 Sync] Event sync failed:', event.id, errorMessage);
        await markEventError(event.id, errorMessage);
        throw error;
      }
    }
  }
}

// Sync individual event to Supabase
async function syncEventToSupabase(event: Mod4Event, driverId: string): Promise<void> {
  const driver = useAuthStore.getState().driver;

  switch (event.type) {
    case 'location_update': {
      // Ensure we have an active session (required by driver_gps_events)
      const userId = driver?.user_id || driverId;
      const sessionId = await ensureDriverSession(userId);

      const { error } = await supabase.from('driver_gps_events' as any).insert({
        driver_id: driverId,
        device_id: event.device_id,
        session_id: sessionId,
        lat: event.lat,
        lng: event.lng,
        accuracy_m: event.accuracy ?? (event.payload?.accuracy as number | null) ?? null,
        heading: event.heading ?? (event.payload?.heading as number | null) ?? null,
        speed_mps: event.speed ?? (event.payload?.speed as number | null) ?? null,
        captured_at: new Date(event.timestamp).toISOString(),
        battery_level: (event.payload?.battery_level as number | null) ?? null,
        network_type: (event.payload?.network_type as string | null) ?? null,
        batch_id: event.batch_id ?? null,
      });

      if (error) throw new Error(`GPS insert failed: ${error.message}`);
      break;
    }

    case 'delivery_status':
      await supabase.from('delivery_assignments').update({
        status: event.payload.status as string,
        actual_arrival_time: event.payload.arrived_at as string | null,
        actual_delivery_time: event.payload.delivered_at as string | null,
        notes: event.payload.notes as string | null,
        updated_at: event.timestamp,
      }).eq('id', event.payload.assignment_id as string);
      break;

    case 'proof_of_delivery':
      await supabase.from('delivery_assignments').update({
        status: 'delivered',
        actual_delivery_time: event.timestamp,
        proof_of_delivery: event.payload,
        updated_at: event.timestamp,
      }).eq('id', event.payload.assignment_id as string);
      break;

    case 'driver_status':
      await supabase.from('drivers').update({
        status: event.payload.status as string,
        updated_at: event.timestamp,
      }).eq('id', driverId);
      break;

    default:
      // Generic event - store in driver_events table
      await supabase.from('driver_events').insert({
        driver_id: driverId,
        event_type: event.type,
        event_data: event.payload,
        client_timestamp: event.timestamp,
        synced: true,
      });
  }
}

// ============================================
// LOCATION TRACKING
// ============================================

let watchId: number | null = null;

export function startLocationTracking(): void {
  if (!navigator.geolocation) {
    console.warn('[MOD4] Geolocation not supported');
    return;
  }

  if (watchId !== null) {
    console.log('[MOD4] Location tracking already active');
    return;
  }

  watchId = navigator.geolocation.watchPosition(
    async (position) => {
      const { addEvent } = await import('../db/events');

      await addEvent({
        type: 'location_update',
        data: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed,
          heading: position.coords.heading,
          altitude: position.coords.altitude,
          battery_level: await getBatteryLevel(),
          is_charging: await getChargingStatus(),
          network_type: getNetworkType(),
        },
      });

      // Trigger sync if online
      if (navigator.onLine) {
        useSyncStore.getState().triggerSync();
      }
    },
    (error) => {
      console.error('[MOD4] Location error:', error.message);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 30000,
      timeout: 60000,
    }
  );

  console.log('[MOD4] Location tracking started');
}

export function stopLocationTracking(): void {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
    console.log('[MOD4] Location tracking stopped');
  }
}

// Battery API helpers
async function getBatteryLevel(): Promise<number | null> {
  try {
    if ('getBattery' in navigator) {
      const battery = await (navigator as Navigator & { getBattery: () => Promise<{ level: number }> }).getBattery();
      return Math.round(battery.level * 100);
    }
  } catch {
    // Battery API not available
  }
  return null;
}

async function getChargingStatus(): Promise<boolean | null> {
  try {
    if ('getBattery' in navigator) {
      const battery = await (navigator as Navigator & { getBattery: () => Promise<{ charging: boolean }> }).getBattery();
      return battery.charging;
    }
  } catch {
    // Battery API not available
  }
  return null;
}

function getNetworkType(): string | null {
  const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
  return connection?.effectiveType || null;
}

// ============================================
// NETWORK LISTENERS
// ============================================

export function initSyncListeners(): () => void {
  const handleOnline = () => {
    console.log('[MOD4] Network: Online');
    useSyncStore.getState().setOnline(true);
    useSyncStore.getState().triggerSync();
  };

  const handleOffline = () => {
    console.log('[MOD4] Network: Offline');
    useSyncStore.getState().setOnline(false);
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Clear cached session on sign-out
  const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      clearDriverSession();
    }
  });

  // Initial count refresh
  useSyncStore.getState().refreshCounts();

  // Periodic sync attempt (every 30 seconds when online)
  const interval = setInterval(() => {
    if (navigator.onLine) {
      useSyncStore.getState().triggerSync();
    }
  }, 30000);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    authSub.unsubscribe();
    clearInterval(interval);
    stopLocationTracking();
  };
}
