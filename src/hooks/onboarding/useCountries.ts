import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Country {
  id: string;
  name: string;
  iso_code: string;
  iso3_code: string;
  is_active: boolean;
}

export function useCountries() {
  return useQuery({
    queryKey: ['countries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('countries')
        .select('id, name, iso_code, iso3_code, is_active')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as Country[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
