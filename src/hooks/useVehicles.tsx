import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Vehicle } from '@/types';

export function useVehicles() {
  return useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('vehicles')
          .select('*')
          .order('model');

        if (error) {
          console.error('Error fetching vehicles:', error);
          throw error;
        }

        // Handle case where data is null or undefined
        if (!data) {
          console.warn('No vehicles data returned from the database');
          return [];
        }

        return data.map(v => ({
          id: v.id,
          type: v.type || 'unknown',
          model: v.model || 'Unknown Model',
          plateNumber: v.plate_number || 'N/A',
          capacity: v.capacity ? Number(v.capacity) : 0,
          maxWeight: v.max_weight || 0,
          fuelType: (v.fuel_type as 'diesel' | 'petrol' | 'electric') || 'petrol',
          avgSpeed: v.avg_speed || 0,
          status: (v.status as 'available' | 'in-use' | 'maintenance') || 'available',
          currentDriverId: v.current_driver_id || undefined,
          fuelEfficiency: v.fuel_efficiency ? Number(v.fuel_efficiency) : 0,
          photo_url: v.photo_url,
          thumbnail_url: v.thumbnail_url,
          photo_uploaded_at: v.photo_uploaded_at,
          ai_generated: v.ai_generated || false,
        }));
      } catch (error) {
        console.error('Error in useVehicles hook:', error);
        throw error;
      }
    },
    // Add retry logic
    retry: 2,
    // Add stale time to prevent unnecessary refetches
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
