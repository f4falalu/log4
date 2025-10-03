import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Driver } from '@/types';

export function useDrivers() {
  return useQuery({
    queryKey: ['drivers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .order('name');

      if (error) throw error;

      return data.map(d => ({
        id: d.id,
        name: d.name,
        phone: d.phone,
        licenseType: d.license_type as 'standard' | 'commercial',
        status: d.status as 'available' | 'busy' | 'offline',
        currentLocation: d.current_lat && d.current_lng ? {
          lat: Number(d.current_lat),
          lng: Number(d.current_lng)
        } : undefined,
        shiftStart: d.shift_start,
        shiftEnd: d.shift_end,
        maxHours: d.max_hours
      })) as Driver[];
    }
  });
}
