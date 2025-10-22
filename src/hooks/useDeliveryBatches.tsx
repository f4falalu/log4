import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DeliveryBatch } from '@/types';
import { toast } from 'sonner';

export function useDeliveryBatches() {
  return useQuery({
    queryKey: ['delivery-batches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_batches')
        .select(`
          *,
          warehouse:warehouses(name)
        `)
        .order('scheduled_date', { ascending: false });

      if (error) throw error;

      return data.map(b => ({
        id: b.id,
        name: b.name,
        facilities: [], // Will be populated separately
        warehouseId: b.warehouse_id,
        warehouseName: b.warehouse?.name || '',
        driverId: b.driver_id || undefined,
        vehicleId: b.vehicle_id || undefined,
        scheduledDate: b.scheduled_date,
        scheduledTime: b.scheduled_time,
        status: b.status as 'planned' | 'assigned' | 'in-progress' | 'completed' | 'cancelled',
        priority: b.priority as 'low' | 'medium' | 'high' | 'urgent',
        totalDistance: Number(b.total_distance),
        estimatedDuration: b.estimated_duration,
        actualStartTime: b.actual_start_time || undefined,
        actualEndTime: b.actual_end_time || undefined,
        medicationType: b.medication_type,
        totalQuantity: b.total_quantity,
        optimizedRoute: b.optimized_route as [number, number][],
        notes: b.notes || undefined,
        createdAt: b.created_at
      })) as DeliveryBatch[];
    }
  });
}

export function useCreateDeliveryBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (batch: Omit<DeliveryBatch, 'id' | 'createdAt'>) => {
      const { data, error } = await supabase
        .from('delivery_batches')
        .insert({
          name: batch.name,
          warehouse_id: batch.warehouseId,
          driver_id: batch.driverId,
          vehicle_id: batch.vehicleId,
          scheduled_date: batch.scheduledDate,
          scheduled_time: batch.scheduledTime,
          status: batch.status,
          priority: batch.priority,
          total_distance: batch.totalDistance,
          estimated_duration: batch.estimatedDuration,
          actual_start_time: batch.actualStartTime,
          actual_end_time: batch.actualEndTime,
          medication_type: batch.medicationType,
          total_quantity: batch.totalQuantity,
          optimized_route: batch.optimizedRoute,
          facility_ids: batch.facilities.map(f => f.id),
          notes: batch.notes
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-batches'] });
      toast.success('Delivery batch created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create batch: ${error.message}`);
    }
  });
}

export function useDeleteDeliveryBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (batchId: string) => {
      const { error } = await supabase
        .from('delivery_batches')
        .delete()
        .eq('id', batchId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-batches'] });
      toast.success('Batch deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete batch: ${error.message}`);
    }
  });
}
