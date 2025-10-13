import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DriverVehicleHistory } from '@/types';

export function useAllDriverVehicles() {
  return useQuery({
    queryKey: ['all-driver-vehicles'],
    queryFn: async () => {
      try {
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

        if (error) {
          console.error('Error fetching driver vehicles:', error);
          throw error;
        }

        // Guard against null/malformed data
        if (!data || !Array.isArray(data)) {
          return [];
        }

        return data
          .filter(record => record && record.vehicles && record.driver_id)
          .map(record => ({
            driverId: record.driver_id,
            vehicleId: record.vehicles.id,
            plateNumber: record.vehicles.plate_number || '',
            model: record.vehicles.model || 'Unknown',
            type: record.vehicles.type || 'Unknown',
            photoUrl: record.vehicles.photo_url,
            thumbnailUrl: record.vehicles.thumbnail_url,
            aiGenerated: record.vehicles.ai_generated || false,
            capacity: record.vehicles.capacity ? Number(record.vehicles.capacity) : 0,
            fuelType: record.vehicles.fuel_type,
            avgSpeed: record.vehicles.avg_speed || 40,
            isCurrent: record.is_current || false,
            assignedAt: record.assigned_at,
            totalTrips: record.total_trips || 0,
          })) as (DriverVehicleHistory & { driverId: string })[];
      } catch (error) {
        console.error('Error in useAllDriverVehicles:', error);
        return [];
      }
    },
    retry: 1,
    staleTime: 30000, // 30 seconds
  });
}
