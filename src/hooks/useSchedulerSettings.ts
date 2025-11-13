/**
 * =====================================================
 * Scheduler Settings Hook
 * =====================================================
 * Manage user preferences for scheduler interface
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { SchedulerSettings } from '@/types/scheduler';

// =====================================================
// QUERY SCHEDULER SETTINGS
// =====================================================

export function useSchedulerSettings() {
  return useQuery({
    queryKey: ['scheduler-settings'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Try to fetch existing settings
      const { data, error } = await supabase
        .from('scheduler_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      // If no settings exist, create default
      if (!data) {
        const { data: newSettings, error: createError } = await supabase
          .from('scheduler_settings')
          .insert([
            {
              user_id: user.id,
              default_capacity_threshold: 90,
              default_time_window: 'all_day',
              default_view: 'map',
              show_zones: true,
              auto_cluster_enabled: true,
              notify_on_optimization_complete: true,
              notify_on_publish: true,
            },
          ])
          .select()
          .single();

        if (createError) throw createError;
        return newSettings as SchedulerSettings;
      }

      return data as SchedulerSettings;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// =====================================================
// UPDATE SCHEDULER SETTINGS
// =====================================================

export function useUpdateSchedulerSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<SchedulerSettings>) => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('scheduler_settings')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as SchedulerSettings;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduler-settings'] });
      toast.success('Settings updated');
    },

    onError: (error: Error) => {
      toast.error('Failed to update settings', {
        description: error.message,
      });
    },
  });
}
