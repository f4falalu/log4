import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DriverSession {
  id: string;
  driver_id: string;
  vehicle_id: string | null;
  started_at: string;
  ended_at: string | null;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  start_location: { lat: number; lng: number } | null;
  end_location: { lat: number; lng: number } | null;
  total_distance_km: number | null;
  metadata: Record<string, unknown> | null;
  driver?: {
    id: string;
    full_name: string;
    phone: string | null;
  };
  vehicle?: {
    id: string;
    plate_number: string;
  };
}

export interface GPSPoint {
  id: string;
  session_id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
}

export interface SessionFilters {
  status?: string[];
  dateFrom?: string;
  dateTo?: string;
  driverId?: string;
}

export function useSessions(filters: SessionFilters = {}) {
  return useQuery({
    queryKey: ['admin-sessions', filters],
    queryFn: async () => {
      let query = supabase
        .from('driver_sessions')
        .select(`
          *,
          driver:profiles!driver_sessions_driver_id_fkey (
            id,
            full_name,
            phone
          ),
          vehicle:vehicles (
            id,
            plate_number
          )
        `)
        .order('started_at', { ascending: false })
        .limit(100);

      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      if (filters.dateFrom) {
        query = query.gte('started_at', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('started_at', filters.dateTo);
      }

      if (filters.driverId) {
        query = query.eq('driver_id', filters.driverId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as DriverSession[];
    },
    retry: 1,
    refetchInterval: 30000,
  });
}

export function useActiveSessionsCount() {
  return useQuery({
    queryKey: ['admin-active-sessions-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('driver_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ACTIVE');

      if (error) throw error;
      return count || 0;
    },
    retry: 1,
    refetchInterval: 15000,
  });
}

export function useSessionDetail(sessionId: string) {
  return useQuery({
    queryKey: ['admin-session', sessionId],
    queryFn: async () => {
      // Fetch session
      const { data: session, error: sessionError } = await supabase
        .from('driver_sessions')
        .select(`
          *,
          driver:profiles!driver_sessions_driver_id_fkey (
            id,
            full_name,
            phone
          ),
          vehicle:vehicles (
            id,
            plate_number
          )
        `)
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      // Fetch GPS quality metrics
      const { data: gpsQuality, error: gpsError } = await supabase.rpc('get_session_gps_quality', {
        p_session_id: sessionId,
      });

      if (gpsError) {
        console.warn('GPS quality fetch failed:', gpsError);
      }

      // Fetch GPS points
      const { data: gpsPoints, error: pointsError } = await supabase
        .from('session_gps_points')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });

      if (pointsError) {
        console.warn('GPS points fetch failed:', pointsError);
      }

      return {
        session: session as DriverSession,
        gpsQuality: gpsQuality || null,
        gpsPoints: (gpsPoints || []) as GPSPoint[],
      };
    },
    enabled: !!sessionId,
  });
}

export function useForceEndSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await supabase
        .from('driver_sessions')
        .update({
          status: 'cancelled',
          ended_at: new Date().toISOString(),
          metadata: {
            force_ended: true,
            force_ended_at: new Date().toISOString(),
            force_ended_reason: 'Admin force end',
          },
        })
        .eq('id', sessionId)
        .eq('status', 'ACTIVE')
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, sessionId) => {
      toast.success('Session ended successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-session', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-active-sessions-count'] });
    },
    onError: (error) => {
      console.error('Failed to end session:', error);
      toast.error('Failed to end session. Please try again.');
    },
  });
}
