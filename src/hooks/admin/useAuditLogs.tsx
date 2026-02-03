import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AuditEvent {
  id: string;
  session_id: string | null;
  event_type: string;
  event_data: Record<string, unknown>;
  created_at: string;
  driver?: {
    full_name: string;
  };
  session?: {
    id: string;
    driver_id: string;
  };
}

export interface AuditFilters {
  eventTypes?: string[];
  dateFrom?: string;
  dateTo?: string;
  sessionId?: string;
  search?: string;
}

export const EVENT_TYPE_OPTIONS = [
  'session_started',
  'session_ended',
  'session_paused',
  'session_resumed',
  'delivery_started',
  'delivery_completed',
  'delivery_failed',
  'gps_point_recorded',
  'photo_captured',
  'signature_captured',
  'location_arrived',
  'location_departed',
  'break_started',
  'break_ended',
  'incident_reported',
];

export const EVENT_TYPE_COLORS: Record<string, string> = {
  session_started: 'bg-green-500/10 text-green-600',
  session_ended: 'bg-red-500/10 text-red-600',
  session_paused: 'bg-amber-500/10 text-amber-600',
  session_resumed: 'bg-blue-500/10 text-blue-600',
  delivery_started: 'bg-indigo-500/10 text-indigo-600',
  delivery_completed: 'bg-emerald-500/10 text-emerald-600',
  delivery_failed: 'bg-red-500/10 text-red-600',
  gps_point_recorded: 'bg-gray-500/10 text-gray-600',
  photo_captured: 'bg-purple-500/10 text-purple-600',
  signature_captured: 'bg-pink-500/10 text-pink-600',
  location_arrived: 'bg-cyan-500/10 text-cyan-600',
  location_departed: 'bg-orange-500/10 text-orange-600',
  break_started: 'bg-amber-500/10 text-amber-600',
  break_ended: 'bg-amber-500/10 text-amber-600',
  incident_reported: 'bg-red-500/10 text-red-600',
};

export function useAuditLogs(filters: AuditFilters = {}) {
  return useQuery({
    queryKey: ['admin-audit-logs', filters],
    queryFn: async () => {
      let query = supabase
        .from('mod4_events')
        .select(`
          id,
          session_id,
          event_type,
          event_data,
          created_at,
          session:driver_sessions (
            id,
            driver_id,
            driver:profiles!driver_sessions_driver_id_fkey (
              full_name
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(500);

      if (filters.eventTypes && filters.eventTypes.length > 0) {
        query = query.in('event_type', filters.eventTypes);
      }

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      if (filters.sessionId) {
        query = query.eq('session_id', filters.sessionId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform the data to flatten the nested structure
      return (data || []).map((event: any) => ({
        ...event,
        driver: event.session?.driver,
      })) as AuditEvent[];
    },
    retry: 1,
    staleTime: 30000,
  });
}

export function useEventStats() {
  return useQuery({
    queryKey: ['admin-event-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_event_distribution', {
        p_days: 7,
      });

      if (error) throw error;
      return data as Array<{ event_type: string; count: number }>;
    },
    retry: 1,
    staleTime: 60000,
  });
}
