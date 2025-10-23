import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ConvertRequisitionData {
  requisitionId: string;
  batchId: string;
}

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

      // Update requisition status to 'fulfilled'
      const { error: updateError } = await supabase
        .from('requisitions')
        .update({ 
          status: 'fulfilled',
          fulfilled_at: new Date().toISOString()
        })
        .eq('id', requisitionId);

      if (updateError) throw updateError;

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

export function useBatchRequisitionConversion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requisitionIds, batchId }: { requisitionIds: string[]; batchId: string }) => {
      const results = [];

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

        // Update requisition status
        await supabase
          .from('requisitions')
          .update({ 
            status: 'fulfilled',
            fulfilled_at: new Date().toISOString()
          })
          .eq('id', requisitionId);

        results.push(data);
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
