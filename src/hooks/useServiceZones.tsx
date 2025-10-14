import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ServiceZone } from '@/types/zones';

export function useServiceZones() {
  return useQuery({
    queryKey: ['service-zones'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_zones')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      return (data || []).map(zone => ({
        id: zone.id,
        name: zone.name,
        description: zone.description || undefined,
        geometry: zone.geometry as unknown as GeoJSON.Feature<GeoJSON.Polygon>,
        color: zone.color,
        created_by: zone.created_by || undefined,
        created_at: zone.created_at,
        updated_at: zone.updated_at,
        is_active: zone.is_active,
        metadata: (zone.metadata as any) || undefined,
      })) as ServiceZone[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
