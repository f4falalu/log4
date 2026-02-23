import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AdminUnit {
  id: string;
  name: string;
  admin_level: number;
  country_id: string;
}

export function useAdminUnitsByCountry(countryIds: string[], adminLevel: number = 4) {
  return useQuery({
    queryKey: ['admin-units-by-country', countryIds, adminLevel],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_units')
        .select('id, name, admin_level, country_id')
        .in('country_id', countryIds)
        .eq('admin_level', adminLevel)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as AdminUnit[];
    },
    enabled: countryIds.length > 0,
  });
}
