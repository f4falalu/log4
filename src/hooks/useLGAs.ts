import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LGA, CreateLGAInput, UpdateLGAInput } from '@/types/zones';
import { toast } from 'sonner';

/**
 * Fetch all LGAs from the database
 * @param zoneId - Optional zone filter (default: returns all LGAs)
 * @param state - Optional state filter (default: returns all LGAs)
 */
export function useLGAs(zoneId?: string | null, state?: string) {
  return useQuery({
    queryKey: ['lgas', { zoneId, state }],
    queryFn: async () => {
      let query = supabase
        .from('lgas')
        .select('*')
        .order('name', { ascending: true });

      if (zoneId) {
        query = query.eq('zone_id', zoneId);
      }

      if (state) {
        query = query.eq('state', state.toLowerCase());
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch LGAs: ${error.message}`);
      }

      return data as LGA[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Get a single LGA by ID
 */
export function useLGA(id: string | null | undefined) {
  return useQuery({
    queryKey: ['lga', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('lgas')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw new Error(`Failed to fetch LGA: ${error.message}`);
      }

      return data as LGA;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Find LGA by name (case-insensitive)
 */
export function useFindLGAByName(name: string | null | undefined, state?: string) {
  return useQuery({
    queryKey: ['lga-by-name', name, state],
    queryFn: async () => {
      if (!name) return null;

      let query = supabase
        .from('lgas')
        .select('*')
        .ilike('name', name.trim());

      if (state) {
        query = query.eq('state', state.toLowerCase());
      }

      const { data, error } = await query
        .limit(1)
        .single();

      if (error) {
        // Not found is okay, return null
        if (error.code === 'PGRST116') return null;
        throw new Error(`Failed to find LGA: ${error.message}`);
      }

      return data as LGA;
    },
    enabled: !!name,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Helper function to normalize LGA name and find match
 * @param name - The LGA name from CSV or user input
 * @param lgas - Array of LGAs from DB
 * @returns Matched LGA or null
 */
export function normalizeLGA(
  name: string | null | undefined,
  lgas: LGA[]
): LGA | null {
  if (!name || !lgas.length) return null;

  const normalized = name.trim().toLowerCase();

  // Exact match (case-insensitive)
  const exactMatch = lgas.find(
    (lga) => lga.name.toLowerCase() === normalized
  );
  if (exactMatch) return exactMatch;

  // Fuzzy match (contains or partial)
  const fuzzyMatch = lgas.find((lga) => {
    const lgaName = lga.name.toLowerCase();
    return (
      lgaName.includes(normalized) ||
      normalized.includes(lgaName)
    );
  });
  if (fuzzyMatch) return fuzzyMatch;

  return null;
}

/**
 * Create a new LGA (admin only)
 */
export function useCreateLGA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateLGAInput) => {
      const { data, error } = await supabase
        .from('lgas')
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
      return data as LGA;
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

/**
 * Update an LGA (admin only)
 */
export function useUpdateLGA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateLGAInput) => {
      const { id, ...updates } = input;
      const { data, error } = await supabase
        .from('lgas')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as LGA;
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

/**
 * Delete an LGA (admin only)
 */
export function useDeleteLGA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lgaId: string) => {
      const { error } = await supabase
        .from('lgas')
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

export default useLGAs;
