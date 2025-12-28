import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FacilityType {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch all facility types from the database
 * @param onlyActive - If true, only return active facility types (default: true)
 */
export function useFacilityTypes(onlyActive: boolean = true) {
  return useQuery({
    queryKey: ['facility-types', { onlyActive }],
    queryFn: async () => {
      let query = supabase
        .from('facility_types')
        .select('*')
        .order('name', { ascending: true });

      if (onlyActive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch facility types: ${error.message}`);
      }

      return data as FacilityType[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Get a single facility type by ID
 */
export function useFacilityType(id: string | null | undefined) {
  return useQuery({
    queryKey: ['facility-type', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('facility_types')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw new Error(`Failed to fetch facility type: ${error.message}`);
      }

      return data as FacilityType;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Find facility type by name (case-insensitive)
 */
export function useFindFacilityTypeByName(name: string | null | undefined) {
  return useQuery({
    queryKey: ['facility-type-by-name', name],
    queryFn: async () => {
      if (!name) return null;

      const { data, error } = await supabase
        .from('facility_types')
        .select('*')
        .ilike('name', name.trim())
        .eq('is_active', true)
        .limit(1)
        .single();

      if (error) {
        // Not found is okay, return null
        if (error.code === 'PGRST116') return null;
        throw new Error(`Failed to find facility type: ${error.message}`);
      }

      return data as FacilityType;
    },
    enabled: !!name,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Create a new facility type (admin only)
 */
export function useCreateFacilityType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newType: Pick<FacilityType, 'name' | 'description'>) => {
      const { data, error } = await supabase
        .from('facility_types')
        .insert([newType])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create facility type: ${error.message}`);
      }

      return data as FacilityType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facility-types'] });
    },
  });
}

/**
 * Update a facility type (admin only)
 */
export function useUpdateFacilityType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Pick<FacilityType, 'name' | 'description' | 'is_active'>>;
    }) => {
      const { data, error } = await supabase
        .from('facility_types')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update facility type: ${error.message}`);
      }

      return data as FacilityType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facility-types'] });
      queryClient.invalidateQueries({ queryKey: ['facility-type'] });
    },
  });
}

/**
 * Helper function to normalize facility type name and find match
 * @param name - The facility type name from CSV or user input
 * @param facilityTypes - Array of facility types from DB
 * @returns Matched facility type or null
 */
export function normalizeFacilityType(
  name: string | null | undefined,
  facilityTypes: FacilityType[]
): FacilityType | null {
  if (!name || !facilityTypes.length) return null;

  const normalized = name.trim().toLowerCase();

  // Exact match (case-insensitive)
  const exactMatch = facilityTypes.find(
    (type) => type.name.toLowerCase() === normalized
  );
  if (exactMatch) return exactMatch;

  // Fuzzy match (contains)
  const fuzzyMatch = facilityTypes.find((type) =>
    type.name.toLowerCase().includes(normalized) ||
    normalized.includes(type.name.toLowerCase())
  );
  if (fuzzyMatch) return fuzzyMatch;

  return null;
}
