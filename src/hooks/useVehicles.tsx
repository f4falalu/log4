import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Vehicle } from '@/types';

export function useVehicles() {
  return useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('model');

      if (error) throw error;

      return data.map(v => ({
        id: v.id,
        type: v.type,
        model: v.model,
        plateNumber: v.plate_number,
        capacity: Number(v.capacity),
        maxWeight: v.max_weight,
        fuelType: v.fuel_type as 'diesel' | 'petrol' | 'electric',
        avgSpeed: v.avg_speed,
        status: v.status as 'available' | 'in-use' | 'maintenance',
        currentDriverId: v.current_driver_id || undefined,
        fuelEfficiency: Number(v.fuel_efficiency),
        photo_url: v.photo_url,
        thumbnail_url: v.thumbnail_url,
        photo_uploaded_at: v.photo_uploaded_at,
        ai_generated: v.ai_generated,
      })) as Vehicle[];
    }
  });
}
