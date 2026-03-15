import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProgrammeCategory {
  id: string;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch all programme categories from the database.
 */
export function useProgrammeCategories(onlyActive: boolean = true) {
  return useQuery({
    queryKey: ['programme-categories', { onlyActive }],
    queryFn: async () => {
      let query = supabase
        .from('programme_categories')
        .select('*')
        .order('name', { ascending: true });

      if (onlyActive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (error) throw new Error(`Failed to fetch programme categories: ${error.message}`);
      return data as ProgrammeCategory[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Get a single programme category by ID.
 */
export function useProgrammeCategory(id: string | null | undefined) {
  return useQuery({
    queryKey: ['programme-category', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('programme_categories')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw new Error(`Failed to fetch programme category: ${error.message}`);
      return data as ProgrammeCategory;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Find programme category by name (case-insensitive).
 */
export function useFindProgrammeCategoryByName(name: string | null | undefined) {
  return useQuery({
    queryKey: ['programme-category-by-name', name],
    queryFn: async () => {
      if (!name) return null;
      const { data, error } = await supabase
        .from('programme_categories')
        .select('*')
        .ilike('name', name.trim())
        .eq('is_active', true)
        .limit(1)
        .single();
      if (error) {
        if (error.code === 'PGRST116') return null;
        throw new Error(`Failed to find programme category: ${error.message}`);
      }
      return data as ProgrammeCategory;
    },
    enabled: !!name,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Create a new programme category (admin only).
 */
export function useCreateProgrammeCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newCategory: Pick<ProgrammeCategory, 'name' | 'code' | 'description'>) => {
      const { data, error } = await supabase
        .from('programme_categories')
        .insert([newCategory])
        .select()
        .single();
      if (error) throw new Error(`Failed to create programme category: ${error.message}`);
      return data as ProgrammeCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programme-categories'] });
    },
  });
}

/**
 * Update a programme category (admin only).
 */
export function useUpdateProgrammeCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Pick<ProgrammeCategory, 'name' | 'code' | 'description' | 'is_active'>> }) => {
      const { data, error } = await supabase
        .from('programme_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(`Failed to update programme category: ${error.message}`);
      return data as ProgrammeCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programme-categories'] });
      queryClient.invalidateQueries({ queryKey: ['programme-category'] });
    },
  });
}

/**
 * Helper: normalize a programme name and find a match.
 */
export function normalizeProgrammeCategory(
  name: string | null | undefined,
  categories: ProgrammeCategory[],
): ProgrammeCategory | null {
  if (!name || !categories.length) return null;
  const normalized = name.trim().toLowerCase();

  const exactMatch = categories.find(
    (c) => c.name.toLowerCase() === normalized || c.code.toLowerCase() === normalized,
  );
  if (exactMatch) return exactMatch;

  const fuzzyMatch = categories.find(
    (c) =>
      c.name.toLowerCase().includes(normalized) ||
      normalized.includes(c.name.toLowerCase()),
  );
  return fuzzyMatch || null;
}
