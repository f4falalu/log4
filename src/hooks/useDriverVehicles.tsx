import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DriverVehicleHistory } from '@/types';

export function useDriverVehicles(driverId: string | null) {
  return useQuery({
    queryKey: ['driver-vehicles', driverId],
    queryFn: async () => {
      if (!driverId) return [];
      
      const { data, error } = await supabase
        .rpc('get_driver_vehicles', { p_driver_id: driverId });

      if (error) throw error;

      return (data || []).map(v => ({
        vehicleId: v.vehicle_id,
        plateNumber: v.plate_number,
        model: v.model,
        type: v.type,
        photoUrl: v.photo_url,
        thumbnailUrl: v.thumbnail_url,
        aiGenerated: v.ai_generated,
        capacity: Number(v.capacity),
        fuelType: v.fuel_type,
        avgSpeed: v.avg_speed,
        isCurrent: v.is_current,
        assignedAt: v.assigned_at,
        totalTrips: v.total_trips,
      })) as DriverVehicleHistory[];
    },
    enabled: !!driverId,
  });
}
