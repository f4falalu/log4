import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UserGrowthData {
  date: string;
  count: number;
}

export interface SessionActivityData {
  date: string;
  sessions: number;
  distance_km: number;
}

export interface EventDistributionData {
  event_type: string;
  count: number;
}

export function useUserGrowth(days: number = 30) {
  return useQuery({
    queryKey: ['admin-user-growth', days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_growth', {
        p_days: days,
      });

      if (error) throw error;
      return (data || []) as UserGrowthData[];
    },
    retry: 1,
    staleTime: 300000,
  });
}

export function useSessionActivity(days: number = 30) {
  return useQuery({
    queryKey: ['admin-session-activity', days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_session_activity', {
        p_days: days,
      });

      if (error) throw error;
      return (data || []) as SessionActivityData[];
    },
    retry: 1,
    staleTime: 300000,
  });
}

export function useEventDistribution(days: number = 7) {
  return useQuery({
    queryKey: ['admin-event-distribution', days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_event_distribution', {
        p_days: days,
      });

      if (error) throw error;
      return (data || []) as EventDistributionData[];
    },
    retry: 1,
    staleTime: 300000,
  });
}
