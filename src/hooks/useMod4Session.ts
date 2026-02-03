/**
 * useMod4Session - Driver session management hook
 * Handles session lifecycle: start, end, heartbeat, and device tracking
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DeviceInfo {
  fingerprint?: string;
  app_version?: string;
  os_version?: string;
  device_model?: string;
}

interface Session {
  id: string;
  driverId: string;
  deviceId: string;
  vehicleId: string | null;
  status: 'active' | 'idle' | 'ended' | 'expired';
  startedAt: Date;
  endedAt: Date | null;
  lastHeartbeatAt: Date;
}

interface UseMod4SessionOptions {
  driverId: string | null;
  vehicleId?: string | null;
  autoHeartbeat?: boolean;
  heartbeatInterval?: number; // ms
}

function generateDeviceId(): string {
  const stored = localStorage.getItem('mod4_device_id');
  if (stored) return stored;

  const newId = `device_${crypto.randomUUID()}`;
  localStorage.setItem('mod4_device_id', newId);
  return newId;
}

function getDeviceInfo(): DeviceInfo {
  const userAgent = navigator.userAgent;
  let os_version = 'unknown';
  let device_model = 'unknown';

  if (/iPhone|iPad|iPod/.test(userAgent)) {
    os_version = userAgent.match(/OS (\d+_\d+)/)?.[1]?.replace('_', '.') || 'iOS';
    device_model = userAgent.match(/(iPhone|iPad|iPod)/)?.[1] || 'iOS Device';
  } else if (/Android/.test(userAgent)) {
    os_version = userAgent.match(/Android (\d+\.?\d*)/)?.[1] || 'Android';
    device_model = userAgent.match(/;\s*([^;)]+)\s*Build/)?.[1]?.trim() || 'Android Device';
  } else {
    os_version = navigator.platform || 'unknown';
    device_model = 'Desktop';
  }

  return {
    fingerprint: `${navigator.userAgent}_${screen.width}x${screen.height}`,
    app_version: '1.0.0',
    os_version,
    device_model,
  };
}

export function useMod4Session(options: UseMod4SessionOptions) {
  const {
    driverId,
    vehicleId = null,
    autoHeartbeat = true,
    heartbeatInterval = 60000, // 1 minute
  } = options;

  const queryClient = useQueryClient();
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const [deviceId] = useState(() => generateDeviceId());

  // Fetch current active session
  const sessionQuery = useQuery({
    queryKey: ['mod4-session', driverId],
    queryFn: async (): Promise<Session | null> => {
      if (!driverId) return null;

      const { data, error } = await supabase
        .from('driver_sessions')
        .select('*')
        .eq('driver_id', driverId)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (!data) return null;

      return {
        id: data.id,
        driverId: data.driver_id,
        deviceId: data.device_id,
        vehicleId: data.vehicle_id,
        status: data.status as Session['status'],
        startedAt: new Date(data.started_at),
        endedAt: data.ended_at ? new Date(data.ended_at) : null,
        lastHeartbeatAt: new Date(data.last_heartbeat_at),
      };
    },
    enabled: !!driverId,
    staleTime: 30000,
  });

  // Start session mutation
  const startSessionMutation = useMutation({
    mutationFn: async (params: {
      startLat?: number;
      startLng?: number;
    } = {}): Promise<string> => {
      if (!driverId) throw new Error('Driver ID is required');

      const deviceInfo = getDeviceInfo();

      const { data, error } = await supabase.rpc('start_driver_session', {
        p_driver_id: driverId,
        p_device_id: deviceId,
        p_vehicle_id: vehicleId,
        p_start_lat: params.startLat ?? null,
        p_start_lng: params.startLng ?? null,
        p_device_info: deviceInfo,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mod4-session', driverId] });
    },
  });

  // End session mutation
  const endSessionMutation = useMutation({
    mutationFn: async (endReason: string = 'user_logout'): Promise<boolean> => {
      const session = sessionQuery.data;
      if (!session) return false;

      const { data, error } = await supabase.rpc('end_driver_session', {
        p_session_id: session.id,
        p_end_reason: endReason,
      });

      if (error) throw error;
      return data as boolean;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mod4-session', driverId] });
    },
  });

  // Heartbeat mutation
  const heartbeatMutation = useMutation({
    mutationFn: async (): Promise<boolean> => {
      const session = sessionQuery.data;
      if (!session) return false;

      const { data, error } = await supabase.rpc('update_session_heartbeat', {
        p_session_id: session.id,
      });

      if (error) throw error;
      return data as boolean;
    },
  });

  // Auto-heartbeat effect
  useEffect(() => {
    if (!autoHeartbeat || !sessionQuery.data) {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      return;
    }

    // Send initial heartbeat
    heartbeatMutation.mutate();

    // Set up interval
    heartbeatRef.current = setInterval(() => {
      heartbeatMutation.mutate();
    }, heartbeatInterval);

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };
  }, [autoHeartbeat, sessionQuery.data?.id, heartbeatInterval]);

  // Start session with geolocation
  const startSession = useCallback(async () => {
    try {
      // Try to get current position for session start
      const position = await new Promise<GeolocationPosition | null>((resolve) => {
        if (!navigator.geolocation) {
          resolve(null);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 5000 }
        );
      });

      return await startSessionMutation.mutateAsync({
        startLat: position?.coords.latitude,
        startLng: position?.coords.longitude,
      });
    } catch (error) {
      console.error('Failed to start session:', error);
      throw error;
    }
  }, [startSessionMutation]);

  // End session
  const endSession = useCallback(async (reason?: string) => {
    try {
      return await endSessionMutation.mutateAsync(reason);
    } catch (error) {
      console.error('Failed to end session:', error);
      throw error;
    }
  }, [endSessionMutation]);

  return {
    // Session data
    session: sessionQuery.data,
    isActive: !!sessionQuery.data && sessionQuery.data.status === 'active',
    deviceId,

    // Loading states
    isLoading: sessionQuery.isLoading,
    isStarting: startSessionMutation.isPending,
    isEnding: endSessionMutation.isPending,

    // Actions
    startSession,
    endSession,
    sendHeartbeat: () => heartbeatMutation.mutate(),

    // Errors
    error: sessionQuery.error || startSessionMutation.error || endSessionMutation.error,
  };
}
