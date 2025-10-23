import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CreateHandoffParams {
  from_vehicle_id: string;
  to_vehicle_id: string;
  from_batch_id: string;
  location_lat: number;
  location_lng: number;
  scheduled_time?: string;
  notes?: string;
}

export interface ConfirmHandoffParams {
  handoff_id: string;
  actual_time?: string;
}

/**
 * Hook for managing handoff creation and confirmation workflow
 */
export function useHandoffFlow() {
  const queryClient = useQueryClient();

  const createHandoff = useMutation({
    mutationFn: async (params: CreateHandoffParams) => {
      const { data, error } = await supabase
        .from('handoffs')
        .insert({
          from_vehicle_id: params.from_vehicle_id,
          to_vehicle_id: params.to_vehicle_id,
          from_batch_id: params.from_batch_id,
          location_lat: params.location_lat,
          location_lng: params.location_lng,
          scheduled_time: params.scheduled_time || new Date().toISOString(),
          status: 'planned',
          notes: params.notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handoffs'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-batches'] });
      toast.success('Handoff created', {
        description: 'The handoff has been scheduled successfully.',
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to create handoff', {
        description: error.message,
      });
    },
  });

  const confirmHandoff = useMutation({
    mutationFn: async (params: ConfirmHandoffParams) => {
      const { data, error } = await supabase
        .from('handoffs')
        .update({
          status: 'completed',
          actual_time: params.actual_time || new Date().toISOString(),
        })
        .eq('id', params.handoff_id)
        .select()
        .single();

      if (error) throw error;

      // Update batch assignment to new vehicle
      if (data) {
        const { error: batchError } = await supabase
          .from('delivery_batches')
          .update({ vehicle_id: data.to_vehicle_id })
          .eq('id', data.from_batch_id);

        if (batchError) throw batchError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handoffs'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-batches'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Handoff completed', {
        description: 'The batch has been transferred to the new vehicle.',
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to complete handoff', {
        description: error.message,
      });
    },
  });

  const cancelHandoff = useMutation({
    mutationFn: async (handoff_id: string) => {
      const { data, error } = await supabase
        .from('handoffs')
        .update({ status: 'cancelled' })
        .eq('id', handoff_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handoffs'] });
      toast.success('Handoff cancelled', {
        description: 'The handoff has been cancelled.',
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to cancel handoff', {
        description: error.message,
      });
    },
  });

  return {
    createHandoff: createHandoff.mutateAsync,
    confirmHandoff: confirmHandoff.mutateAsync,
    cancelHandoff: cancelHandoff.mutateAsync,
    isCreating: createHandoff.isPending,
    isConfirming: confirmHandoff.isPending,
    isCancelling: cancelHandoff.isPending,
  };
}
