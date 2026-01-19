import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface AssignDriverToBatchParams {
  batchId: string;
  vehicleId: string;
  driverId: string;
}

/**
 * RFC-012 Phase 5: Hook to assign driver and vehicle to a delivery batch
 * Uses the assign_driver_to_batch RPC function which enforces proper state transitions
 */
export function useAssignDriverToBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ batchId, vehicleId, driverId }: AssignDriverToBatchParams) => {
      const { data, error } = await supabase.rpc('assign_driver_to_batch', {
        p_batch_id: batchId,
        p_vehicle_id: vehicleId,
        p_driver_id: driverId,
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-batches'] });
      toast.success('Driver and vehicle assigned successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to assign driver: ${error.message}`);
      console.error('Assignment error:', error);
    },
  });
}
