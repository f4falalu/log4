import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Facility } from '@/types';
import { toast } from 'sonner';

export function useFacilities() {
  return useQuery({
    queryKey: ['facilities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .order('name');

      if (error) throw error;

      return data.map(f => ({
        id: f.id,
        name: f.name,
        address: f.address,
        lat: Number(f.lat),
        lng: Number(f.lng),
        type: f.type,
        phone: f.phone || undefined,
        contactPerson: f.contact_person || undefined,
        capacity: f.capacity || undefined,
        operatingHours: f.operating_hours || undefined
      })) as Facility[];
    }
  });
}

export function useAddFacility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (facility: Omit<Facility, 'id'>) => {
      const { data, error } = await supabase
        .from('facilities')
        .insert([{
          name: facility.name,
          address: facility.address,
          lat: facility.lat,
          lng: facility.lng,
          type: facility.type as any,
          phone: facility.phone || null,
          contact_person: facility.contactPerson || null,
          capacity: facility.capacity || null,
          operating_hours: facility.operatingHours || null
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      toast.success('Facility added successfully');
    },
    onError: (error) => {
      toast.error(`Failed to add facility: ${error.message}`);
    }
  });
}
