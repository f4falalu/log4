/**
 * =====================================================
 * Publish to FleetOps Hook
 * =====================================================
 * Publishes scheduler batches to delivery_batches table for dispatch
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { SchedulerBatch } from '@/types/scheduler';
import { schedulerBatchesKeys } from './useSchedulerBatches';

interface PublishResult {
  scheduler_batch_id: string;
  delivery_batch_id: string;
  batch_code: string;
}

interface PublishError {
  scheduler_batch_id: string;
  error_message: string;
}

interface PublishResponse {
  success: boolean;
  published_batches: PublishResult[];
  errors: PublishError[];
}

/**
 * Publish scheduler batches to FleetOps (delivery_batches table)
 */
export function usePublishToFleetOps() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (scheduler_batch_ids: string[]): Promise<PublishResponse> => {
      const published_batches: PublishResult[] = [];
      const errors: PublishError[] = [];

      // Fetch all scheduler batches to publish
      const { data: schedulerBatches, error: fetchError } = await supabase
        .from('scheduler_batches')
        .select('*')
        .in('id', scheduler_batch_ids);

      if (fetchError) {
        throw new Error(`Failed to fetch batches: ${fetchError.message}`);
      }

      if (!schedulerBatches || schedulerBatches.length === 0) {
        throw new Error('No batches found to publish');
      }

      // Validate batches are ready to publish
      for (const batch of schedulerBatches as SchedulerBatch[]) {
        // Check if batch has required fields
        if (!batch.driver_id || !batch.vehicle_id) {
          errors.push({
            scheduler_batch_id: batch.id,
            error_message: 'Batch must have driver and vehicle assigned',
          });
          continue;
        }

        if (!batch.facility_ids || batch.facility_ids.length === 0) {
          errors.push({
            scheduler_batch_id: batch.id,
            error_message: 'Batch must have at least one facility',
          });
          continue;
        }

        // Check if already published
        if (batch.status === 'published') {
          errors.push({
            scheduler_batch_id: batch.id,
            error_message: 'Batch already published',
          });
          continue;
        }

        try {
          // Create delivery batch in FleetOps
          const { data: deliveryBatch, error: createError } = await supabase
            .from('delivery_batches')
            .insert([
              {
                name: batch.name || batch.batch_code,
                warehouse_id: batch.warehouse_id,
                scheduled_date: batch.planned_date,
                scheduled_time: batch.time_window,
                driver_id: batch.driver_id,
                vehicle_id: batch.vehicle_id,
                facility_ids: batch.facility_ids,
                optimized_route: batch.optimized_route,
                total_distance: batch.total_distance_km,
                estimated_duration: batch.estimated_duration_min,
                status: 'planned', // Set to planned in FleetOps
                priority: batch.priority,
                medication_type: null, // Can be enhanced later
                total_quantity: batch.total_consignments,
                payload_utilization_pct: batch.capacity_utilization_pct,
              },
            ])
            .select()
            .single();

          if (createError) {
            errors.push({
              scheduler_batch_id: batch.id,
              error_message: createError.message,
            });
            continue;
          }

          // Update scheduler batch to mark as published
          const { error: updateError } = await supabase
            .from('scheduler_batches')
            .update({
              status: 'published',
              published_batch_id: deliveryBatch.id,
              published_at: new Date().toISOString(),
            })
            .eq('id', batch.id);

          if (updateError) {
            // Rollback delivery batch creation
            await supabase.from('delivery_batches').delete().eq('id', deliveryBatch.id);

            errors.push({
              scheduler_batch_id: batch.id,
              error_message: `Failed to update scheduler batch: ${updateError.message}`,
            });
            continue;
          }

          // Success
          published_batches.push({
            scheduler_batch_id: batch.id,
            delivery_batch_id: deliveryBatch.id,
            batch_code: batch.batch_code,
          });
        } catch (error) {
          errors.push({
            scheduler_batch_id: batch.id,
            error_message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return {
        success: errors.length === 0,
        published_batches,
        errors,
      };
    },

    onSuccess: (result) => {
      // Invalidate scheduler batches cache
      queryClient.invalidateQueries({ queryKey: schedulerBatchesKeys.lists() });

      // Invalidate delivery batches cache (FleetOps)
      queryClient.invalidateQueries({ queryKey: ['delivery-batches'] });

      // Show appropriate toast message
      if (result.success) {
        toast.success(
          `✅ ${result.published_batches.length} batch${result.published_batches.length > 1 ? 'es' : ''} published to FleetOps successfully!`,
          {
            description: 'Visible in FleetOps Tactical Map',
            duration: 5000,
          }
        );
      } else {
        const successCount = result.published_batches.length;
        const errorCount = result.errors.length;

        if (successCount > 0) {
          toast.warning(
            `⚠️ ${successCount} batch${successCount > 1 ? 'es' : ''} published, ${errorCount} failed`,
            {
              description: result.errors.map((e) => e.error_message).join(', '),
              duration: 7000,
            }
          );
        } else {
          toast.error('Failed to publish batches', {
            description: result.errors.map((e) => e.error_message).join(', '),
            duration: 7000,
          });
        }
      }
    },

    onError: (error: Error) => {
      toast.error('Failed to publish to FleetOps', {
        description: error.message,
        duration: 5000,
      });
    },
  });
}

/**
 * Unpublish a batch (move back from FleetOps to Scheduler)
 * Use with caution - only for batches not yet dispatched
 */
export function useUnpublishBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (scheduler_batch_id: string) => {
      // Get scheduler batch
      const { data: schedulerBatch, error: fetchError } = await supabase
        .from('scheduler_batches')
        .select('*, published_batch_id')
        .eq('id', scheduler_batch_id)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch batch: ${fetchError.message}`);
      }

      if (!schedulerBatch.published_batch_id) {
        throw new Error('Batch not published');
      }

      // Check if delivery batch is still in 'planned' status
      const { data: deliveryBatch, error: deliveryError } = await supabase
        .from('delivery_batches')
        .select('status')
        .eq('id', schedulerBatch.published_batch_id)
        .single();

      if (deliveryError) {
        throw new Error('Delivery batch not found');
      }

      if (deliveryBatch.status !== 'planned') {
        throw new Error(`Cannot unpublish batch in status: ${deliveryBatch.status}`);
      }

      // Delete delivery batch
      const { error: deleteError } = await supabase
        .from('delivery_batches')
        .delete()
        .eq('id', schedulerBatch.published_batch_id);

      if (deleteError) {
        throw new Error(`Failed to delete delivery batch: ${deleteError.message}`);
      }

      // Update scheduler batch status
      const { error: updateError } = await supabase
        .from('scheduler_batches')
        .update({
          status: 'scheduled',
          published_batch_id: null,
          published_at: null,
        })
        .eq('id', scheduler_batch_id);

      if (updateError) {
        throw new Error(`Failed to update scheduler batch: ${updateError.message}`);
      }

      return schedulerBatch;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulerBatchesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['delivery-batches'] });
      toast.success('Batch unpublished successfully');
    },

    onError: (error: Error) => {
      toast.error('Failed to unpublish batch', {
        description: error.message,
      });
    },
  });
}
