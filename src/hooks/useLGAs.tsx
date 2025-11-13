import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LGA, CreateLGAInput, UpdateLGAInput } from '@/types/zones';
import { toast } from 'sonner';

export function useLGAs(zoneId?: string | null) {
  return useQuery({
    queryKey: ['lgas', zoneId],
    queryFn: async () => {
      let query = supabase.from('lgas' as any).select('*').order('name', { ascending: true });
      
      if (zoneId) {
        query = query.eq('zone_id', zoneId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as LGA[];
    },
  });
}

export function useLGA(lgaId: string | null) {
  return useQuery({
    queryKey: ['lga', lgaId],
    queryFn: async () => {
      if (!lgaId) return null;
      
      const { data, error } = await supabase
        .from('lgas' as any)
        .select('*')
        .eq('id', lgaId)
        .single();

      if (error) throw error;
      return data as unknown as LGA;
    },
    enabled: !!lgaId,
  });
}

export function useCreateLGA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateLGAInput) => {
      const { data, error } = await supabase
        .from('lgas' as any)
        .insert([{
          name: input.name,
          zone_id: input.zone_id,
          warehouse_id: input.warehouse_id,
          state: input.state || 'kano',
          population: input.population,
        }])
        .select()
        .single();

      if (error) throw error;
      return data as unknown as LGA;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lgas'] });
      queryClient.invalidateQueries({ queryKey: ['lgas', data.zone_id] });
      queryClient.invalidateQueries({ queryKey: ['zone-metrics'] });
      toast.success('LGA created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create LGA: ${error.message}`);
    },
  });
}

export function useUpdateLGA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateLGAInput) => {
      const { id, ...updates } = input;
      const { data, error } = await supabase
        .from('lgas' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as LGA;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lgas'] });
      queryClient.invalidateQueries({ queryKey: ['lga', data.id] });
      queryClient.invalidateQueries({ queryKey: ['zone-metrics'] });
      toast.success('LGA updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update LGA: ${error.message}`);
    },
  });
}

export function useDeleteLGA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lgaId: string) => {
      const { error } = await supabase
        .from('lgas' as any)
        .delete()
        .eq('id', lgaId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lgas'] });
      queryClient.invalidateQueries({ queryKey: ['zone-metrics'] });
      toast.success('LGA deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete LGA: ${error.message}`);
    },
  });
}
