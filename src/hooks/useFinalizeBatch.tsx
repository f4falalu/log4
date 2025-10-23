import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface FinalizeBatchData {
  vehicleId: string;
  warehouseId: string;
  facilityIds: string[];
  scheduledDate: string;
  scheduledTime: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  notes?: string;
}

export function useFinalizeBatch() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (data: FinalizeBatchData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get payload items for the vehicle (from temporary storage or state)
      // For now, we'll use all unassigned payload items
      const { data: payloadItems, error: payloadError } = await supabase
        .from('payload_items')
        .select('*')
        .is('batch_id', null);

      if (payloadError) throw payloadError;

      // Calculate totals
      const totalWeight = payloadItems?.reduce((sum, item) => sum + item.weight_kg * item.quantity, 0) || 0;
      const totalVolume = payloadItems?.reduce((sum, item) => sum + item.volume_m3 * item.quantity, 0) || 0;
      const totalQuantity = payloadItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;

      // Get vehicle capacity to calculate utilization
      const { data: vehicle } = await supabase
        .from('vehicles')
        .select('capacity, max_weight')
        .eq('id', data.vehicleId)
        .single();

      const vehicleCapacity = vehicle?.capacity || 10;
      const maxWeight = vehicle?.max_weight || 1000;
      const utilizationPct = Math.max(
        (totalVolume / vehicleCapacity) * 100,
        (totalWeight / maxWeight) * 100
      );

      // Generate batch name
      const batchName = `BATCH-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

      // Create delivery batch
      const { data: batch, error: batchError } = await supabase
        .from('delivery_batches')
        .insert({
          name: batchName,
          warehouse_id: data.warehouseId,
          vehicle_id: data.vehicleId,
          scheduled_date: data.scheduledDate,
          scheduled_time: data.scheduledTime,
          status: 'planned',
          priority: data.priority,
          total_distance: 0, // Will be calculated by route optimization
          estimated_duration: 0, // Will be calculated by route optimization
          total_quantity: totalQuantity,
          total_weight: totalWeight,
          total_volume: totalVolume,
          payload_utilization_pct: utilizationPct,
          optimized_route: {},
          facility_ids: data.facilityIds,
          medication_type: 'General', // Can be enhanced based on requisition
          notes: data.notes,
          route_optimization_method: 'client'
        })
        .select()
        .single();

      if (batchError) throw batchError;

      // Update payload items with batch_id
      if (payloadItems && payloadItems.length > 0) {
        const { error: updateError } = await supabase
          .from('payload_items')
          .update({ batch_id: batch.id })
          .in('id', payloadItems.map(item => item.id));

        if (updateError) throw updateError;
      }

      // Create notification for warehouse officers
      await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          type: 'batch_created',
          title: 'New Batch Created',
          message: `Batch ${batchName} has been finalized and is ready for dispatch`,
          related_entity_type: 'batch',
          related_entity_id: batch.id
        });

      return batch;
    },
    onSuccess: (batch) => {
      queryClient.invalidateQueries({ queryKey: ['delivery-batches'] });
      queryClient.invalidateQueries({ queryKey: ['payload-items'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      
      toast.success('Batch finalized successfully', {
        description: 'Batch is now visible in FleetOps for dispatch',
        action: {
          label: 'View in FleetOps',
          onClick: () => navigate('/fleetops')
        }
      });
    },
    onError: (error: Error) => {
      console.error('Error finalizing batch:', error);
      toast.error(`Failed to finalize batch: ${error.message}`);
    }
  });
}
