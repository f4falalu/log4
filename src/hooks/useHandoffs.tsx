import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Handoff, completeHandoff, cancelHandoff } from '@/lib/handoffManagement';

export function useActiveHandoffs() {
  return useQuery({
    queryKey: ['active-handoffs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('handoffs')
        .select(`
          *,
          from_vehicle:vehicles!handoffs_from_vehicle_id_fkey(model, plate_number),
          to_vehicle:vehicles!handoffs_to_vehicle_id_fkey(model, plate_number),
          from_batch:delivery_batches!handoffs_from_batch_id_fkey(name)
        `)
        .in('status', ['planned', 'in-progress'])
        .order('planned_time', { ascending: true });

      if (error) throw error;
      return data as any[];
    },
    refetchInterval: 15000, // Refetch every 15 seconds
  });
}

export function useCompleteHandoff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: completeHandoff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-handoffs'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-batches'] });
      toast.success('Handoff completed successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to complete handoff: ${error.message}`);
    }
  });
}

export function useCancelHandoff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ handoffId, reason }: { handoffId: string; reason?: string }) =>
      cancelHandoff(handoffId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-handoffs'] });
      toast.success('Handoff cancelled');
    },
    onError: (error: any) => {
      toast.error(`Failed to cancel handoff: ${error.message}`);
    }
  });
}
