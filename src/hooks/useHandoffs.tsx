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
          console.log('Handoff update:', payload);
          queryClient.invalidateQueries({ queryKey: ['active-handoffs'] });
          
          if (payload.eventType === 'INSERT') {
            toast.info('New handoff initiated');
          } else if (payload.eventType === 'UPDATE' && (payload.new as any).status === 'completed') {
            toast.success('Handoff completed');
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
      const { data, error } = await (supabase as any)
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

export interface CreateHandoffData {
  from_vehicle_id: string;
  to_vehicle_id: string;
  from_batch_id: string;
  location_lat: number;
  location_lng: number;
  scheduled_time: string;
  notes?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
}

export function useCreateHandoff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateHandoffData) => {
      const { data: handoff, error } = await (supabase as any)
        .from('handoffs')
        .insert({
          from_vehicle_id: data.from_vehicle_id,
          to_vehicle_id: data.to_vehicle_id,
          from_batch_id: data.from_batch_id,
          location_lat: data.location_lat,
          location_lng: data.location_lng,
          planned_time: data.scheduled_time,
          notes: data.notes,
          status: data.status
        })
        .select()
        .single();

      if (error) throw error;
      return handoff;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-handoffs'] });
      toast.success('Handoff scheduled successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create handoff: ${error.message}`);
    }
  });
}

export function useUpdateHandoff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateHandoffData> }) => {
      const updateData: any = {};
      
      if (data.status) updateData.status = data.status;
      if (data.notes) updateData.notes = data.notes;
      if (data.scheduled_time) updateData.planned_time = data.scheduled_time;
      if (data.location_lat) updateData.location_lat = data.location_lat;
      if (data.location_lng) updateData.location_lng = data.location_lng;
      
      // Add actual_time for status changes
      if (data.status === 'in_progress' || data.status === 'completed') {
        updateData.actual_time = new Date().toISOString();
      }

      const { data: handoff, error } = await (supabase as any)
        .from('handoffs')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return handoff;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-handoffs'] });
      toast.success('Handoff updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update handoff: ${error.message}`);
    }
  });
}
