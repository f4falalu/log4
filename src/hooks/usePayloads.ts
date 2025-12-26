import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Payload {
  id: string;
  vehicle_id: string | null;
  workspace_id: string;
  name: string;
  status: 'draft' | 'ready' | 'finalized';
  total_weight_kg: number;
  total_volume_m3: number;
  utilization_pct: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  vehicle?: {
    id: string;
    license_plate: string;
    type: string;
    capacity_volume_m3: number;
    capacity_weight_kg: number;
  };
}

export interface CreatePayloadData {
  vehicle_id?: string | null;
  name: string;
  status?: 'draft' | 'ready' | 'finalized';
  notes?: string;
}

export interface UpdatePayloadData {
  vehicle_id?: string | null;
  name?: string;
  status?: 'draft' | 'ready' | 'finalized';
  notes?: string;
}

/**
 * Fetch all payloads, optionally filtered by status
 */
export function usePayloads(status?: 'draft' | 'ready' | 'finalized') {
  return useQuery({
    queryKey: ['payloads', status],
    queryFn: async () => {
      let query = supabase
        .from('payloads')
        .select(`
          *,
          vehicle:vehicles(id, license_plate, type, capacity_volume_m3, capacity_weight_kg)
        `)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching payloads:', error);
        throw error;
      }

      return data as Payload[];
    },
  });
}

/**
 * Fetch a single payload by ID with its items
 */
export function usePayloadById(id: string | null) {
  return useQuery({
    queryKey: ['payload', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('payloads')
        .select(`
          *,
          vehicle:vehicles(id, license_plate, type, capacity_volume_m3, capacity_weight_kg)
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching payload:', error);
        throw error;
      }

      return data as Payload;
    },
    enabled: !!id,
  });
}

/**
 * Create a new draft payload
 */
export function useCreatePayload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePayloadData) => {
      const { data: payload, error } = await supabase
        .from('payloads')
        .insert({
          ...data,
          status: data.status || 'draft',
        })
        .select(`
          *,
          vehicle:vehicles(id, license_plate, type, capacity_volume_m3, capacity_weight_kg)
        `)
        .single();

      if (error) throw error;
      return payload as Payload;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payloads'] });
      toast.success('Payload created successfully');
    },
    onError: (error: any) => {
      console.error('Error creating payload:', error);
      toast.error('Failed to create payload');
    },
  });
}

/**
 * Update an existing payload
 */
export function useUpdatePayload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePayloadData }) => {
      const { data: payload, error } = await supabase
        .from('payloads')
        .update(data)
        .eq('id', id)
        .select(`
          *,
          vehicle:vehicles(id, license_plate, type, capacity_volume_m3, capacity_weight_kg)
        `)
        .single();

      if (error) throw error;
      return payload as Payload;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payloads'] });
      queryClient.invalidateQueries({ queryKey: ['payload', data.id] });
      toast.success('Payload updated successfully');
    },
    onError: (error: any) => {
      console.error('Error updating payload:', error);
      toast.error('Failed to update payload');
    },
  });
}

/**
 * Delete a payload (will cascade delete items)
 */
export function useDeletePayload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('payloads')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payloads'] });
      toast.success('Payload deleted successfully');
    },
    onError: (error: any) => {
      console.error('Error deleting payload:', error);
      toast.error('Failed to delete payload');
    },
  });
}

/**
 * Finalize a payload (changes status to finalized and optionally converts to batch)
 */
export function useFinalizePayload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: payload, error } = await supabase
        .from('payloads')
        .update({ status: 'finalized' })
        .eq('id', id)
        .select(`
          *,
          vehicle:vehicles(id, license_plate, type, capacity_volume_m3, capacity_weight_kg)
        `)
        .single();

      if (error) throw error;
      return payload as Payload;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payloads'] });
      queryClient.invalidateQueries({ queryKey: ['payload', data.id] });
      toast.success('Payload finalized and sent to FleetOps');
    },
    onError: (error: any) => {
      console.error('Error finalizing payload:', error);
      toast.error('Failed to finalize payload');
    },
  });
}
