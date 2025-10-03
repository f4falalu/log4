import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Warehouse } from '@/types';

export function useWarehouses() {
  return useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .order('name');

      if (error) throw error;

      return data.map(w => ({
        id: w.id,
        name: w.name,
        address: w.address,
        lat: Number(w.lat),
        lng: Number(w.lng),
        type: w.type as 'central' | 'zonal',
        capacity: w.capacity,
        operatingHours: w.operating_hours
      })) as Warehouse[];
    }
  });
}
