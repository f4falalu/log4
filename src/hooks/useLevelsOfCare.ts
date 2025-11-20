import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LevelOfCare {
  id: string;
  name: string;
  description: string | null;
  hierarchy_level: number | null;
  is_active: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch all levels of care from the database
 * @param onlyActive - If true, only return active levels (default: true)
 */
export function useLevelsOfCare(onlyActive: boolean = true) {
  return useQuery({
    queryKey: ['levels-of-care', { onlyActive }],
    queryFn: async () => {
      let query = supabase
        .from('levels_of_care')
        .select('*')
        .order('hierarchy_level', { ascending: true });

      if (onlyActive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch levels of care: ${error.message}`);
      }

      return data as LevelOfCare[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Get a single level of care by ID
 */
export function useLevelOfCare(id: string | null | undefined) {
  return useQuery({
    queryKey: ['level-of-care', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('levels_of_care')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw new Error(`Failed to fetch level of care: ${error.message}`);
      }

      return data as LevelOfCare;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Find level of care by name (case-insensitive)
 */
export function useFindLevelOfCareByName(name: string | null | undefined) {
  return useQuery({
    queryKey: ['level-of-care-by-name', name],
    queryFn: async () => {
      if (!name) return null;

      const { data, error } = await supabase
        .from('levels_of_care')
        .select('*')
        .ilike('name', name.trim())
        .eq('is_active', true)
        .limit(1)
        .single();

      if (error) {
        // Not found is okay, return null
        if (error.code === 'PGRST116') return null;
        throw new Error(`Failed to find level of care: ${error.message}`);
      }

      return data as LevelOfCare;
    },
    enabled: !!name,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Create a new level of care (admin only)
 */
export function useCreateLevelOfCare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      newLevel: Pick<LevelOfCare, 'name' | 'description' | 'hierarchy_level'>
    ) => {
      const { data, error } = await supabase
        .from('levels_of_care')
        .insert([newLevel])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create level of care: ${error.message}`);
      }

      return data as LevelOfCare;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['levels-of-care'] });
    },
  });
}

/**
 * Update a level of care (admin only)
 */
export function useUpdateLevelOfCare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<
        Pick<LevelOfCare, 'name' | 'description' | 'hierarchy_level' | 'is_active'>
      >;
    }) => {
      const { data, error } = await supabase
        .from('levels_of_care')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update level of care: ${error.message}`);
      }

      return data as LevelOfCare;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['levels-of-care'] });
      queryClient.invalidateQueries({ queryKey: ['level-of-care'] });
    },
  });
}

/**
 * Helper function to normalize level of care name and find match
 * @param name - The level of care name from CSV or user input
 * @param levelsOfCare - Array of levels of care from DB
 * @returns Matched level of care or null
 */
export function normalizeLevelOfCare(
  name: string | null | undefined,
  levelsOfCare: LevelOfCare[]
): LevelOfCare | null {
  if (!name || !levelsOfCare.length) return null;

  const normalized = name.trim().toLowerCase();

  // Exact match (case-insensitive)
  const exactMatch = levelsOfCare.find(
    (level) => level.name.toLowerCase() === normalized
  );
  if (exactMatch) return exactMatch;

  // Fuzzy match (contains or partial)
  const fuzzyMatch = levelsOfCare.find((level) => {
    const levelName = level.name.toLowerCase();
    return (
      levelName.includes(normalized) ||
      normalized.includes(levelName)
    );
  });
  if (fuzzyMatch) return fuzzyMatch;

  return null;
}
