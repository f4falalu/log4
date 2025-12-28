/**
 * =====================================================
 * Real-time Scheduler Updates Hook
 * =====================================================
 * Subscribe to scheduler_batches table changes
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { schedulerBatchesKeys } from './useSchedulerBatches';
import type { SchedulerBatch } from '@/types/scheduler';

interface RealtimeSchedulerOptions {
  onInsert?: (batch: SchedulerBatch) => void;
  onUpdate?: (batch: SchedulerBatch) => void;
  onDelete?: (batchId: string) => void;
  showToasts?: boolean;
}

/**
 * Subscribe to real-time updates for scheduler batches
 */
export function useRealtimeScheduler(options: RealtimeSchedulerOptions = {}) {
  const {
    onInsert,
    onUpdate,
    onDelete,
    showToasts = false,
  } = options;

  const queryClient = useQueryClient();

  useEffect(() => {
    // Subscribe to scheduler_batches table changes
    const channel = supabase
      .channel('scheduler_batches_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'scheduler_batches',
        },
        (payload) => {
          const batch = payload.new as SchedulerBatch;

          // Invalidate queries to refetch data
          queryClient.invalidateQueries({ queryKey: schedulerBatchesKeys.lists() });

          // Call custom handler
          if (onInsert) {
            onInsert(batch);
          }

          // Show toast if enabled
          if (showToasts) {
            toast.info('New batch created', {
              description: batch.batch_code || batch.name,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'scheduler_batches',
        },
        (payload) => {
          const batch = payload.new as SchedulerBatch;
          const oldBatch = payload.old as Partial<SchedulerBatch>;

          // Invalidate queries
          queryClient.invalidateQueries({ queryKey: schedulerBatchesKeys.lists() });
          queryClient.invalidateQueries({ queryKey: schedulerBatchesKeys.detail(batch.id) });

          // Call custom handler
          if (onUpdate) {
            onUpdate(batch);
          }

          // Show toast for status changes
          if (showToasts && oldBatch.status !== batch.status) {
            let message = '';
            switch (batch.status) {
              case 'ready':
                message = 'Batch ready for dispatch';
                break;
              case 'scheduled':
                message = 'Batch scheduled';
                break;
              case 'published':
                message = '✅ Batch published to FleetOps';
                break;
              case 'cancelled':
                message = 'Batch cancelled';
                break;
            }

            if (message) {
              toast.info(message, {
                description: batch.batch_code || batch.name,
              });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'scheduler_batches',
        },
        (payload) => {
          const oldBatch = payload.old as Partial<SchedulerBatch>;

          // Invalidate queries
          queryClient.invalidateQueries({ queryKey: schedulerBatchesKeys.lists() });

          // Call custom handler
          if (onDelete && oldBatch.id) {
            onDelete(oldBatch.id);
          }

          // Show toast if enabled
          if (showToasts) {
            toast.info('Batch deleted', {
              description: oldBatch.batch_code || oldBatch.name,
            });
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, onInsert, onUpdate, onDelete, showToasts]);
}
