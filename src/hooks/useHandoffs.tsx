import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Handoff, completeHandoff, cancelHandoff } from '@/lib/handoffManagement';

export function useActiveHandoffs() {
  const queryClient = useQueryClient();

  // Setup realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('handoffs-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'handoffs' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['active-handoffs'] });
          
          if (payload.eventType === 'INSERT') {
            toast.info('New handoff initiated');
          } else if (payload.eventType === 'UPDATE') {
            const newData = payload.new as { status?: string };
            if (newData.status === 'completed') {
              toast.success('Handoff completed');
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['active-handoffs'],
    queryFn: async () => {
      interface HandoffRow {
        id: string;
        from_vehicle_id: string;
        to_vehicle_id: string;
        from_batch_id: string;
        status: string;
        location_lat: number;
        location_lng: number;
        scheduled_time?: string;
        actual_time?: string;
        notes?: string;
        from_vehicle?: { model: string; plate_number: string };
        to_vehicle?: { model: string; plate_number: string };
        from_batch?: { name: string };
      }

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
      return (data || []) as HandoffRow[];
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
