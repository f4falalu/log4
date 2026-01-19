import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface CompleteDispatchParams {
  batchId: string;
}

/**
 * RFC-012 Phase 5: Hook to complete dispatch for a delivery batch
 * Uses the complete_dispatch RPC function which:
 * - Transitions batch status to 'completed'
 * - Sets actual_end_time timestamp
 * - Batch snapshot remains locked (immutability preserved)
 */
export function useCompleteDispatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ batchId }: CompleteDispatchParams) => {
      const { data, error } = await supabase.rpc('complete_dispatch', {
        p_batch_id: batchId,
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-batches'] });
      toast.success('Dispatch completed successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to complete dispatch: ${error.message}`);
      console.error('Complete dispatch error:', error);
    },
  });
}
