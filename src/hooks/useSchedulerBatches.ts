/**
 * =====================================================
 * Scheduler Batches Data Hook
 * =====================================================
 * Query and manage scheduler batches (pre-dispatch planning)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  SchedulerBatch,
  SchedulerBatchStatus,
  SchedulerFilters,
} from '@/types/scheduler';

// =====================================================
// QUERY KEY FACTORY
// =====================================================

export const schedulerBatchesKeys = {
  all: ['scheduler-batches'] as const,
  lists: () => [...schedulerBatchesKeys.all, 'list'] as const,
  list: (filters?: SchedulerFilters) => [...schedulerBatchesKeys.lists(), filters] as const,
  details: () => [...schedulerBatchesKeys.all, 'detail'] as const,
  detail: (id: string) => [...schedulerBatchesKeys.details(), id] as const,
};

// =====================================================
// QUERY SCHEDULER BATCHES
// =====================================================

interface UseSchedulerBatchesOptions {
  filters?: SchedulerFilters;
  enabled?: boolean;
}

export function useSchedulerBatches(options: UseSchedulerBatchesOptions = {}) {
  const { filters, enabled = true } = options;

  return useQuery({
    queryKey: schedulerBatchesKeys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('scheduler_batches')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters) {
        if (filters.status && filters.status.length > 0) {
          query = query.in('status', filters.status);
        }

        if (filters.warehouse_id) {
          query = query.eq('warehouse_id', filters.warehouse_id);
        }

        if (filters.zone && filters.zone.length > 0) {
          query = query.in('zone', filters.zone);
        }

        if (filters.date_range) {
          query = query
            .gte('planned_date', filters.date_range.from)
            .lte('planned_date', filters.date_range.to);
        }

        if (filters.driver_id) {
          query = query.eq('driver_id', filters.driver_id);
        }

        if (filters.vehicle_id) {
          query = query.eq('vehicle_id', filters.vehicle_id);
        }

        if (filters.priority && filters.priority.length > 0) {
          query = query.in('priority', filters.priority);
        }

        // Search filter (batch code, name, or notes)
        if (filters.search) {
          query = query.or(`batch_code.ilike.%${filters.search}%,name.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as SchedulerBatch[];
    },
    enabled,
    staleTime: 1000 * 60, // 1 minute
  });
}

// =====================================================
// QUERY SINGLE SCHEDULER BATCH
// =====================================================

export function useSchedulerBatch(id: string | undefined) {
  return useQuery({
    queryKey: schedulerBatchesKeys.detail(id!),
    queryFn: async () => {
      if (!id) throw new Error('Batch ID is required');

      const { data, error } = await supabase
        .from('scheduler_batches')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as SchedulerBatch;
    },
    enabled: !!id,
  });
}

// =====================================================
// CREATE SCHEDULER BATCH
// =====================================================

export function useCreateSchedulerBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (batch: Partial<SchedulerBatch>) => {
      const { data, error } = await supabase
        .from('scheduler_batches')
        .insert([
          {
            ...batch,
            created_by: (await supabase.auth.getUser()).data.user?.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data as SchedulerBatch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulerBatchesKeys.lists() });
      toast.success('Batch created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create batch: ${error.message}`);
    },
  });
}

// =====================================================
// UPDATE SCHEDULER BATCH
// =====================================================

export function useUpdateSchedulerBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SchedulerBatch> }) => {
      const { data, error } = await supabase
        .from('scheduler_batches')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SchedulerBatch;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: schedulerBatchesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: schedulerBatchesKeys.detail(data.id) });
      toast.success('Batch updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update batch: ${error.message}`);
    },
  });
}

// =====================================================
// DELETE SCHEDULER BATCH
// =====================================================

export function useDeleteSchedulerBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('scheduler_batches')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulerBatchesKeys.lists() });
      toast.success('Batch deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete batch: ${error.message}`);
    },
  });
}

// =====================================================
// UPDATE BATCH STATUS
// =====================================================

export function useUpdateBatchStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: SchedulerBatchStatus }) => {
      const { data, error } = await supabase
        .from('scheduler_batches')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SchedulerBatch;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: schedulerBatchesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: schedulerBatchesKeys.detail(data.id) });
      toast.success(`Batch moved to ${data.status}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });
}

// =====================================================
// BULK OPERATIONS
// =====================================================

export function useBulkUpdateBatches() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ids,
      updates,
    }: {
      ids: string[];
      updates: Partial<SchedulerBatch>;
    }) => {
      const { data, error} = await supabase
        .from('scheduler_batches')
        .update(updates)
        .in('id', ids)
        .select();

      if (error) throw error;
      return data as SchedulerBatch[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulerBatchesKeys.lists() });
      toast.success('Batches updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update batches: ${error.message}`);
    },
  });
}

export function useBulkDeleteBatches() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('scheduler_batches')
        .delete()
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulerBatchesKeys.lists() });
      toast.success('Batches deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete batches: ${error.message}`);
    },
  });
}

// =====================================================
// SCHEDULER STATS
// =====================================================

export function useSchedulerStats() {
  return useQuery({
    queryKey: ['scheduler-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduler_overview_stats')
        .select('*')
        .single();

      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 30, // 30 seconds
  });
}
