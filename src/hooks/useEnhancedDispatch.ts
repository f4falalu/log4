import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EnhancedDispatchData {
  vehicle_id: string;
  driver_id?: string;
  facility_ids: string[];
  estimated_start_time: string;
  estimated_end_time: string;
  estimated_distance_km?: number;
  estimated_duration_min?: number;
  payload_utilization_pct: number;
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  status: string;
}

export interface EnhancedDeliveryBatch {
  id: string;
  vehicle_id: string;
  driver_id?: string;
  facility_ids: string[];
  estimated_start_time: string;
  estimated_end_time: string;
  estimated_distance_km?: number;
  estimated_duration_min?: number;
  payload_utilization_pct: number;
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  status: string;
  created_at: string;
  vehicle?: {
    model: string;
    plate_number: string;
  };
}

export function useEnhancedDeliveryBatches() {
  return useQuery({
    queryKey: ['enhanced-delivery-batches'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('delivery_batches')
        .select(`
          *,
          vehicle:vehicles(model, plate_number)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map((batch: any) => ({
        id: batch.id,
        vehicle_id: batch.vehicle_id,
        driver_id: batch.driver_id,
        facility_ids: batch.facility_ids || [],
        estimated_start_time: batch.estimated_start_time,
        estimated_end_time: batch.estimated_end_time,
        estimated_distance_km: batch.estimated_distance_km,
        estimated_duration_min: batch.estimated_duration_min,
        payload_utilization_pct: batch.payload_utilization_pct || 0,
        priority: batch.priority,
        notes: batch.notes,
        status: batch.status,
        created_at: batch.created_at,
        vehicle: batch.vehicle
      })) as EnhancedDeliveryBatch[];
    }
  });
}

export function useCreateEnhancedDispatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: EnhancedDispatchData) => {
      // Create a basic batch name
      const batchName = `Batch-${Date.now()}`;
      
      const { data: batch, error } = await (supabase as any)
        .from('delivery_batches')
        .insert({
          name: batchName,
          vehicle_id: data.vehicle_id,
          driver_id: data.driver_id,
          facility_ids: data.facility_ids,
          estimated_start_time: data.estimated_start_time,
          estimated_end_time: data.estimated_end_time,
          estimated_distance_km: data.estimated_distance_km,
          estimated_duration_min: data.estimated_duration_min,
          payload_utilization_pct: data.payload_utilization_pct,
          priority: data.priority,
          notes: data.notes,
          status: data.status,
          // Required fields with defaults
          warehouse_id: null, // Will be set based on facilities
          scheduled_date: data.estimated_start_time.split('T')[0],
          scheduled_time: data.estimated_start_time.split('T')[1]?.split('.')[0] || '09:00:00',
          total_distance: data.estimated_distance_km || 0,
          estimated_duration: data.estimated_duration_min || 0,
          medication_type: 'general',
          total_quantity: 1
        })
        .select()
        .single();

      if (error) throw error;
      return batch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enhanced-delivery-batches'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-batches'] });
      toast.success('Enhanced dispatch created successfully');
    },
    onError: (error: any) => {
      console.error('Enhanced dispatch creation error:', error);
      toast.error(`Failed to create dispatch: ${error.message}`);
    }
  });
}

export function useUpdateEnhancedDispatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EnhancedDispatchData> }) => {
      const { data: batch, error } = await (supabase as any)
        .from('delivery_batches')
        .update({
          vehicle_id: data.vehicle_id,
          driver_id: data.driver_id,
          facility_ids: data.facility_ids,
          estimated_start_time: data.estimated_start_time,
          estimated_end_time: data.estimated_end_time,
          estimated_distance_km: data.estimated_distance_km,
          estimated_duration_min: data.estimated_duration_min,
          payload_utilization_pct: data.payload_utilization_pct,
          priority: data.priority,
          notes: data.notes,
          status: data.status
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return batch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enhanced-delivery-batches'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-batches'] });
      toast.success('Enhanced dispatch updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update dispatch: ${error.message}`);
    }
  });
}
