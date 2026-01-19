import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface StartDispatchParams {
  batchId: string;
}

/**
 * RFC-012 Phase 5: Hook to start dispatch for a delivery batch
 * Uses the start_dispatch RPC function which:
 * - Locks the batch snapshot (immutability guarantee)
 * - Transitions batch status to 'in-progress'
 * - Updates requisition statuses to 'in_transit'
 */
export function useStartDispatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ batchId }: StartDispatchParams) => {
      const { data, error } = await supabase.rpc('start_dispatch', {
        p_batch_id: batchId,
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-batches'] });
      toast.success('Dispatch started - batch snapshot locked');
    },
    onError: (error: Error) => {
      toast.error(`Failed to start dispatch: ${error.message}`);
      console.error('Start dispatch error:', error);
    },
  });
}
