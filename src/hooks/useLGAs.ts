import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LGA, CreateLGAInput, UpdateLGAInput } from '@/types/zones';
import { toast } from 'sonner';

export interface LGAFilters {
  zone_id?: string;
  warehouse_id?: string;
  state?: string;
  search?: string;
}

/**
 * Fetch all LGAs from the database with optional filters
 */
export function useLGAs(filters?: LGAFilters) {
  return useQuery({
    queryKey: ['lgas', filters],
    queryFn: async () => {
      let query = supabase
        .from('lgas')
        .select(`
          *,
          zones:zone_id (
            id,
            name,
            code
          ),
          warehouses:warehouse_id (
            id,
            name
          )
        `)
        .order('name', { ascending: true });

      if (filters?.zone_id) {
        query = query.eq('zone_id', filters.zone_id);
      }

      if (filters?.warehouse_id) {
        query = query.eq('warehouse_id', filters.warehouse_id);
      }

      if (filters?.state) {
        query = query.eq('state', filters.state.toLowerCase());
      }

      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`);
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

/**
 * Get LGA statistics
 */
export function useLGAStats() {
  return useQuery({
    queryKey: ['lga-stats'],
    queryFn: async () => {
      const { data: lgas, error } = await supabase
        .from('lgas')
        .select('id, zone_id, warehouse_id, population');

      if (error) throw error;

      const totalLGAs = lgas?.length || 0;
      const assignedToZone = lgas?.filter((l) => l.zone_id).length || 0;
      const assignedToWarehouse = lgas?.filter((l) => l.warehouse_id).length || 0;
      const totalPopulation = lgas?.reduce((sum, l) => sum + (l.population || 0), 0) || 0;

      // Get facility count by LGA
      const { data: facilities } = await supabase
        .from('facilities')
        .select('lga');

      const facilitiesByLGA = facilities?.reduce((acc, f) => {
        if (f.lga) {
          acc[f.lga] = (acc[f.lga] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>) || {};

      return {
        totalLGAs,
        assignedToZone,
        assignedToWarehouse,
        totalPopulation,
        unassignedToZone: totalLGAs - assignedToZone,
        unassignedToWarehouse: totalLGAs - assignedToWarehouse,
        facilitiesByLGA,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export default useLGAs;
