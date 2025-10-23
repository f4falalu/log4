import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OptimizationParams {
  warehouseId: string;
  facilityIds: string[];
  vehicleType?: string;
}

interface OptimizationResult {
  optimized_route: [number, number][];
  total_distance: number;
  estimated_duration: number;
  stops: Array<{
    facility_id: string;
    arrival_time: string;
    departure_time: string;
  }>;
}

export function useScheduleOptimization() {
  return useMutation({
    mutationFn: async (params: OptimizationParams) => {
      const { data, error } = await supabase.functions.invoke('optimize-route', {
        body: {
          warehouse_id: params.warehouseId,
          facility_ids: params.facilityIds,
          vehicle_type: params.vehicleType
        }
      });

      if (error) throw error;
      return data as OptimizationResult;
    },
    onSuccess: (data) => {
      toast.success(`Route optimized: ${data.total_distance.toFixed(1)} km`, {
        description: `Estimated duration: ${Math.round(data.estimated_duration / 60)} min`
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to optimize route', {
        description: error.message
      });
    }
  });
}
