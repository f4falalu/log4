import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ScheduleBatch {
  id: string;
  schedule_id: string;
  batch_name: string;
  facility_ids: string[];
  driver_id?: string;
  vehicle_id?: string;
  sequence: number;
  estimated_distance?: number;
  estimated_duration?: number;
  capacity_used_pct?: number;
  status: 'draft' | 'ready' | 'dispatched' | 'completed';
  route_data?: any;
  created_at: string;
  updated_at: string;
}

export function useScheduleBatches(scheduleId?: string) {
  return useQuery({
    queryKey: ['schedule-batches', scheduleId],
    queryFn: async () => {
      let query = supabase
        .from('schedule_batches')
        .select('*')
        .order('sequence', { ascending: true });

      if (scheduleId) {
        query = query.eq('schedule_id', scheduleId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ScheduleBatch[];
    },
    enabled: !!scheduleId,
  });
}

export function useCreateScheduleBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (batch: Omit<ScheduleBatch, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('schedule_batches')
        .insert(batch)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-batches'] });
      toast.success('Batch created successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to create batch', {
        description: error.message,
      });
    },
  });
}

export function useUpdateScheduleBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ScheduleBatch> }) => {
      const { data, error } = await supabase
        .from('schedule_batches')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-batches'] });
      toast.success('Batch updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update batch', {
        description: error.message,
      });
    },
  });
}
