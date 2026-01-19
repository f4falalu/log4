/**
 * =====================================================
 * Requisition to Payload Conversion Hook
 * =====================================================
 * Converts requisition items to payload items for batch planning.
 *
 * RFC-012: This hook no longer directly modifies requisition status.
 * Status changes are handled by the database via RPC functions that
 * enforce the proper state machine transitions.
 *
 * Flow:
 * 1. Requisition must be in 'ready_for_dispatch' status
 * 2. Call assign_requisitions_to_batch RPC to transition to 'assigned_to_batch'
 * 3. Requisition status flows automatically via database triggers
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ConvertRequisitionData {
  requisitionId: string;
  batchId: string;
}

/**
 * Convert a single requisition to payload items and assign to batch.
 * RFC-012: Uses RPC for status transition instead of direct update.
 */
export function useConvertRequisitionToPayload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requisitionId, batchId }: ConvertRequisitionData) => {
      // Fetch requisition items
      const { data: requisitionItems, error: fetchError } = await supabase
        .from('requisition_items')
        .select('*')
        .eq('requisition_id', requisitionId);

      if (fetchError) throw fetchError;
      if (!requisitionItems || requisitionItems.length === 0) {
        throw new Error('No items found in requisition');
      }

      // Convert requisition items to payload items
      const payloadItems = requisitionItems.map(item => ({
        batch_id: batchId,
        name: item.item_name,
        quantity: item.quantity,
        weight_kg: item.weight_kg || 10,
        volume_m3: item.volume_m3 || 0.1,
        temperature_required: item.temperature_required || false,
        handling_instructions: item.handling_instructions
      }));

      // Insert payload items
      const { data: insertedItems, error: insertError } = await supabase
        .from('payload_items')
        .insert(payloadItems)
        .select();

      if (insertError) throw insertError;

      // RFC-012: Use RPC to assign requisition to batch with proper state transition
      // This enforces the state machine: ready_for_dispatch → assigned_to_batch
      const { error: assignError } = await supabase
        .rpc('assign_requisitions_to_batch', {
          p_requisition_ids: [requisitionId],
          p_batch_id: batchId
        });

      if (assignError) {
        // If RPC fails, rollback payload items
        await supabase
          .from('payload_items')
          .delete()
          .in('id', insertedItems.map(item => item.id));
        throw new Error(`Failed to assign requisition to batch: ${assignError.message}`);
      }

      return insertedItems;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['payload-items'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-batches'] });
      toast.success('Requisition converted to payload successfully');
    },
    onError: (error: Error) => {
      console.error('Error converting requisition to payload:', error);
      toast.error(`Failed to convert requisition: ${error.message}`);
    }
  });
}

/**
 * Convert multiple requisitions to payload items and assign to batch.
 * RFC-012: Uses RPC for status transition instead of direct update.
 */
export function useBatchRequisitionConversion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requisitionIds, batchId }: { requisitionIds: string[]; batchId: string }) => {
      const results = [];
      const successfulRequisitionIds: string[] = [];

      for (const requisitionId of requisitionIds) {
        // Fetch requisition items
        const { data: requisitionItems, error: fetchError } = await supabase
          .from('requisition_items')
          .select('*')
          .eq('requisition_id', requisitionId);

        if (fetchError) {
          console.error(`Error fetching requisition ${requisitionId}:`, fetchError);
          continue;
        }

        if (!requisitionItems || requisitionItems.length === 0) continue;

        // Convert to payload items
        const payloadItems = requisitionItems.map(item => ({
          batch_id: batchId,
          name: item.item_name,
          quantity: item.quantity,
          weight_kg: item.weight_kg || 10,
          volume_m3: item.volume_m3 || 0.1,
          temperature_required: item.temperature_required || false,
          handling_instructions: item.handling_instructions
        }));

        // Insert payload items
        const { data, error: insertError } = await supabase
          .from('payload_items')
          .insert(payloadItems)
          .select();

        if (insertError) {
          console.error(`Error inserting payload items for requisition ${requisitionId}:`, insertError);
          continue;
        }

        results.push(data);
        successfulRequisitionIds.push(requisitionId);
      }

      // RFC-012: Use RPC to assign all successful requisitions to batch
      // This enforces the state machine: ready_for_dispatch → assigned_to_batch
      if (successfulRequisitionIds.length > 0) {
        const { data: assignedCount, error: assignError } = await supabase
          .rpc('assign_requisitions_to_batch', {
            p_requisition_ids: successfulRequisitionIds,
            p_batch_id: batchId
          });

        if (assignError) {
          console.error('Error assigning requisitions to batch:', assignError);
          // Note: Payload items are already inserted, but requisition status won't change
          // This is a partial failure state - items are in batch but requisitions are not linked
          toast.warning('Payload items created but requisition status update failed');
        } else if (assignedCount !== undefined) {
          console.log(`Successfully assigned ${assignedCount} requisitions to batch`);
        }
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['payload-items'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-batches'] });
      toast.success(`${results.length} requisitions converted to payload`);
    },
    onError: (error: Error) => {
      console.error('Error batch converting requisitions:', error);
      toast.error(`Failed to convert requisitions: ${error.message}`);
    }
  });
}
