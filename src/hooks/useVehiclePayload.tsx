import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PayloadItem {
  id: string;
  batch_id: string;
  name: string;
  quantity: number;
  weight_kg: number;
  volume_m3: number;
  temperature_required: boolean;
  handling_instructions: string | null;
}

export interface VehiclePayload {
  items: PayloadItem[];
  totalWeight: number;
  totalVolume: number;
  utilizationPct: number;
  capacityWeight: number;
  capacityVolume: number;
}

/**
 * Fetches real-time payload data for a vehicle
 * Calculates total weight, volume, and utilization percentage
 */
export function useVehiclePayload(vehicleId: string | null) {
  return useQuery({
    queryKey: ['vehicle-payload', vehicleId],
    queryFn: async (): Promise<VehiclePayload | null> => {
      if (!vehicleId) return null;

      // Get vehicle capacity data
      const { data: vehicle, error: vehicleError } = await supabase
        .from('vehicles')
        .select('capacity, max_weight')
        .eq('id', vehicleId)
        .single();

      if (vehicleError) throw vehicleError;

      // Get current batch for this vehicle
      const { data: batches, error: batchError } = await supabase
        .from('delivery_batches')
        .select('id')
        .eq('vehicle_id', vehicleId)
        .in('status', ['planned', 'in-progress'])
        .order('scheduled_date', { ascending: true })
        .limit(1);

      if (batchError) throw batchError;
      if (!batches || batches.length === 0) {
        return {
          items: [],
          totalWeight: 0,
          totalVolume: 0,
          utilizationPct: 0,
          capacityWeight: vehicle.max_weight || 1000,
          capacityVolume: vehicle.capacity || 10,
        };
      }

      const batchId = batches[0].id;

      // Get payload items for the batch
      const { data: items, error: itemsError } = await supabase
        .from('payload_items')
        .select('*')
        .eq('batch_id', batchId);

      if (itemsError) throw itemsError;

      const payloadItems = (items || []) as PayloadItem[];
      const totalWeight = payloadItems.reduce((sum, item) => sum + item.weight_kg, 0);
      const totalVolume = payloadItems.reduce((sum, item) => sum + item.volume_m3, 0);
      
      const capacityWeight = vehicle.max_weight || 1000;
      const capacityVolume = vehicle.capacity || 10;
      
      // Calculate utilization based on the more constrained resource
      const weightUtilization = (totalWeight / capacityWeight) * 100;
      const volumeUtilization = (totalVolume / capacityVolume) * 100;
      const utilizationPct = Math.max(weightUtilization, volumeUtilization);

      return {
        items: payloadItems,
        totalWeight,
        totalVolume,
        utilizationPct: Math.min(utilizationPct, 100),
        capacityWeight,
        capacityVolume,
      };
    },
    enabled: !!vehicleId,
    refetchInterval: 10000, // Refetch every 10 seconds
  });
}
