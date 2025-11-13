import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface VehicleTier {
  id: string;
  vehicle_id: string;
  tier_name: string;
  tier_position: number;
  max_weight_kg: number;
  max_volume_m3: number;
  weight_ratio: number;
}

export function useVehicleTiers(vehicleId?: string) {
  return useQuery({
    queryKey: ['vehicle-tiers', vehicleId],
    queryFn: async () => {
      if (!vehicleId) return [];
      
      const { data, error } = await supabase
        .from('vehicle_tiers' as any)
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('tier_position');

      if (error) throw error;
      return data as unknown as VehicleTier[];
    },
    enabled: !!vehicleId,
  });
}

export function useCreateVehicleTiers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tiers: Omit<VehicleTier, 'id'>[]) => {
      const { error } = await supabase
        .from('vehicle_tiers' as any)
        .insert(tiers as any);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-tiers'] });
      toast.success('Vehicle tiers configured successfully');
    },
    onError: (error) => {
      toast.error('Failed to configure tiers', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}
