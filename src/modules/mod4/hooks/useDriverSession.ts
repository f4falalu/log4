import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DriverSession } from '../types/events';

export interface DriverSessionHook {
  session: DriverSession | null;
  loading: boolean;
  error: string | null;
  startSession: (driverId: string, deviceId: string, vehicleId?: string) => Promise<DriverSession | null>;
  endSession: (reason?: string) => Promise<void>;
  updateHeartbeat: () => Promise<void>;
  isActive: boolean;
}

/**
 * Hook for managing driver sessions
 * Handles session lifecycle and automatic heartbeat
 */
export const useDriverSession = (autoHeartbeat = true): DriverSessionHook => {
  const [session, setSession] = useState<DriverSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-heartbeat interval (every 5 minutes)
  useEffect(() => {
    if (!session || !autoHeartbeat || session.status !== 'active') {
      return;
    }

    const interval = setInterval(() => {
      updateHeartbeat().catch(err => {
        console.error('[useDriverSession] Heartbeat error:', err);
      });
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [session, autoHeartbeat]);

  /**
   * Start a new driver session
   */
  const startSession = useCallback(async (
    driverId: string,
    deviceId: string,
    vehicleId?: string
  ): Promise<DriverSession | null> => {
    setLoading(true);
    setError(null);

    try {
      // Get device info
      const deviceModel = navigator.userAgent;
      const osVersion = navigator.platform;
      const appVersion = import.meta.env.VITE_APP_VERSION || '1.0.0';

      // Get battery level if available
      // @ts-ignore
      const battery = navigator.battery || navigator.mozBattery || navigator.webkitBattery;
      const batteryLevel = battery && typeof battery.level === 'number'
        ? Math.round(battery.level * 100)
        : undefined;

      // Get network type
      // @ts-ignore
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      const networkType = connection?.effectiveType || connection?.type;

      // Call start_driver_session RPC
      const { data, error: rpcError } = await supabase.rpc('start_driver_session', {
        p_driver_id: driverId,
        p_device_id: deviceId,
        p_vehicle_id: vehicleId || null,
        p_device_model: deviceModel,
        p_os_version: osVersion,
        p_app_version: appVersion,
        p_battery_level: batteryLevel,
        p_network_type: networkType,
      });

      if (rpcError) {
        throw rpcError;
      }

      if (!data || data.length === 0) {
        throw new Error('Failed to create session');
      }

      const newSession: DriverSession = {
        id: data[0].session_id,
        driver_id: driverId,
        device_id: deviceId,
        vehicle_id: vehicleId,
        started_at: new Date().toISOString(),
        last_heartbeat_at: new Date().toISOString(),
        status: 'active',
        device_model: deviceModel,
        os_version: osVersion,
        app_version: appVersion,
        battery_level: batteryLevel,
        network_type: networkType,
      };

      setSession(newSession);
      console.log('[useDriverSession] Session started:', newSession.id);
      return newSession;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start session';
      setError(message);
      console.error('[useDriverSession] Start session error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * End the current session
   */
  const endSession = useCallback(async (reason = 'user_ended'): Promise<void> => {
    if (!session) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: rpcError } = await supabase.rpc('end_driver_session', {
        p_session_id: session.id,
        p_end_reason: reason,
      });

      if (rpcError) {
        throw rpcError;
      }

      setSession(null);
      console.log('[useDriverSession] Session ended:', session.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to end session';
      setError(message);
      console.error('[useDriverSession] End session error:', err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  /**
   * Update session heartbeat
   */
  const updateHeartbeat = useCallback(async (): Promise<void> => {
    if (!session) {
      return;
    }

    try {
      // Get current battery and network info
      // @ts-ignore
      const battery = navigator.battery || navigator.mozBattery || navigator.webkitBattery;
      const batteryLevel = battery && typeof battery.level === 'number'
        ? Math.round(battery.level * 100)
        : undefined;

      // @ts-ignore
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      const networkType = connection?.effectiveType || connection?.type;

      const { error: rpcError } = await supabase.rpc('update_session_heartbeat', {
        p_session_id: session.id,
        p_battery_level: batteryLevel,
        p_network_type: networkType,
      });

      if (rpcError) {
        throw rpcError;
      }

      // Update local session
      setSession(prev => prev ? {
        ...prev,
        last_heartbeat_at: new Date().toISOString(),
        battery_level: batteryLevel,
        network_type: networkType,
      } : null);

      console.log('[useDriverSession] Heartbeat updated');
    } catch (err) {
      console.error('[useDriverSession] Heartbeat error:', err);
    }
  }, [session]);

  return {
    session,
    loading,
    error,
    startSession,
    endSession,
    updateHeartbeat,
    isActive: session !== null && session.status === 'active',
  };
};
