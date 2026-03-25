import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AdminUnitWithParent {
  id: string;
  name: string;
  admin_level: number;
  country_id: string;
  parent_id: string;
}

/**
 * Fetches admin units by parent IDs (e.g., LGAs under selected states).
 * @param parentIds - Array of parent admin_unit IDs (e.g., selected state IDs)
 * @param adminLevel - The admin level to fetch (default 6 = LGA)
 */
export function useAdminUnitsByParent(parentIds: string[], adminLevel: number = 6) {
  return useQuery({
    queryKey: ['admin-units-by-parent', parentIds, adminLevel],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_units')
        .select('id, name, admin_level, country_id, parent_id')
        .in('parent_id', parentIds)
        .eq('admin_level', adminLevel)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as AdminUnitWithParent[];
    },
    enabled: parentIds.length > 0,
  });
}
