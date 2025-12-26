import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PayloadItem {
  id: string;
  batch_id?: string | null;
  payload_id?: string | null;
  facility_id?: string;
  box_type: 'small' | 'medium' | 'large' | 'custom';
  custom_length_cm?: number;
  custom_width_cm?: number;
  custom_height_cm?: number;
  quantity: number;
  weight_kg: number;
  volume_m3: number;
  status: string;
  created_at: string;
  facility?: {
    id: string;
    name: string;
    type: string;
  };
}

export interface CreatePayloadItemData {
  batch_id?: string | null;
  payload_id?: string | null;
  facility_id?: string;
  box_type: 'small' | 'medium' | 'large' | 'custom';
  custom_length_cm?: number;
  custom_width_cm?: number;
  custom_height_cm?: number;
  quantity: number;
  weight_kg: number;
  status?: string;
}

export function usePayloadItems(batchId?: string, payloadId?: string) {
  return useQuery({
    queryKey: ['payload-items', batchId, payloadId],
    queryFn: async () => {
      let query = (supabase as any)
        .from('payload_items')
        .select(`
          *,
          facility:facilities(id, name, type)
        `)
        .order('created_at', { ascending: false });

      if (batchId) {
        query = query.eq('batch_id', batchId);
      }

      if (payloadId) {
        query = query.eq('payload_id', payloadId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching payload items:', error);
        throw error;
      }

      return data as unknown as PayloadItem[];
    },
    enabled: !!batchId || !!payloadId,
  });
}

export function useCreatePayloadItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePayloadItemData) => {
      const { data: item, error } = await (supabase as any)
        .from('payload_items')
        .insert(data)
        .select(`
          *,
          facility:facilities(id, name, type)
        `)
        .single();

      if (error) throw error;
      return item;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payload-items'] });
      if (data.batch_id) {
        queryClient.invalidateQueries({ queryKey: ['payload-items', data.batch_id] });
      }
      if (data.payload_id) {
        queryClient.invalidateQueries({ queryKey: ['payload-items', undefined, data.payload_id] });
        queryClient.invalidateQueries({ queryKey: ['payload', data.payload_id] });
        queryClient.invalidateQueries({ queryKey: ['payloads'] });
      }
      toast.success('Payload item added successfully');
    },
    onError: (error: any) => {
      console.error('Error creating payload item:', error);
      toast.error('Failed to add payload item');
    },
  });
}

export function useUpdatePayloadItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreatePayloadItemData> }) => {
      const { data: item, error } = await (supabase as any)
        .from('payload_items')
        .update(data)
        .eq('id', id)
        .select(`
          *,
          facility:facilities(id, name, type)
        `)
        .single();

      if (error) throw error;
      return item;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payload-items'] });
      if (data.batch_id) {
        queryClient.invalidateQueries({ queryKey: ['payload-items', data.batch_id] });
      }
      if (data.payload_id) {
        queryClient.invalidateQueries({ queryKey: ['payload-items', undefined, data.payload_id] });
        queryClient.invalidateQueries({ queryKey: ['payload', data.payload_id] });
        queryClient.invalidateQueries({ queryKey: ['payloads'] });
      }
      toast.success('Payload item updated successfully');
    },
    onError: (error: any) => {
      console.error('Error updating payload item:', error);
      toast.error('Failed to update payload item');
    },
  });
}

export function useDeletePayloadItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('payload_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payload-items'] });
      queryClient.invalidateQueries({ queryKey: ['payloads'] });
      queryClient.invalidateQueries({ queryKey: ['payload'] });
      toast.success('Payload item removed successfully');
    },
    onError: (error: any) => {
      console.error('Error deleting payload item:', error);
      toast.error('Failed to remove payload item');
    },
  });
}

export function useCalculatePayloadUtilization(vehicleId?: string, payloadItems?: PayloadItem[]) {
  return useQuery({
    queryKey: ['payload-utilization', vehicleId, payloadItems?.length],
    queryFn: async () => {
      if (!vehicleId || !payloadItems?.length) return 0;

      // Get vehicle capacity
      const { data: vehicle, error } = await (supabase as any)
        .from('vehicles')
        .select('capacity_volume_m3')
        .eq('id', vehicleId)
        .single();

      if (error || !vehicle?.capacity_volume_m3) return 0;

      // Calculate total volume
      const totalVolume = payloadItems.reduce((sum, item) => sum + item.volume_m3, 0);
      
      // Calculate utilization percentage
      const utilization = (totalVolume / (vehicle as any).capacity_volume_m3) * 100;
      return Math.min(utilization, 100);
    },
    enabled: !!vehicleId && !!payloadItems?.length,
  });
}
