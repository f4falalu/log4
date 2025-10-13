import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DriverVehicleHistory } from '@/types';

export function useAllDriverVehicles() {
  return useQuery({
    queryKey: ['all-driver-vehicles'],
    queryFn: async () => {
      // Get all driver-vehicle history records
      const { data, error } = await supabase
        .from('driver_vehicle_history')
        .select(`
          *,
          vehicles (
            id,
            plate_number,
            model,
            type,
            photo_url,
            thumbnail_url,
            ai_generated,
            capacity,
            fuel_type,
            avg_speed
          )
        `)
        .order('assigned_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(record => ({
        driverId: record.driver_id,
        vehicleId: record.vehicles.id,
        plateNumber: record.vehicles.plate_number,
        model: record.vehicles.model,
        type: record.vehicles.type,
        photoUrl: record.vehicles.photo_url,
        thumbnailUrl: record.vehicles.thumbnail_url,
        aiGenerated: record.vehicles.ai_generated,
        capacity: Number(record.vehicles.capacity),
        fuelType: record.vehicles.fuel_type,
        avgSpeed: record.vehicles.avg_speed,
        isCurrent: record.is_current,
        assignedAt: record.assigned_at,
        totalTrips: record.total_trips,
      })) as (DriverVehicleHistory & { driverId: string })[];
    },
  });
}
