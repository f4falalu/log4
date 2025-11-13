import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface VehicleCategory {
  id: string;
  code: string;
  name: string;
  display_name: string;
  icon_name?: string;
  default_capacity_kg: number;
  default_volume_m3: number;
  default_tier_count: number;
  default_tiers: Array<{
    name: string;
    ratio: number;
    capacity_kg: number;
  }>;
  avg_speed_range?: { min: number; max: number };
  fuel_efficiency_range?: { min: number; max: number };
  is_active: boolean;
}

export function useVehicleCategories() {
  return useQuery({
    queryKey: ['vehicle-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_categories' as any)
        .select('*')
        .eq('is_active', true)
        .order('code');

      if (error) throw error;
      return data as unknown as VehicleCategory[];
    }
  });
}
