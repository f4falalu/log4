import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FundingSource {
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
 * Fetch all funding sources from the database.
 */
export function useFundingSources(onlyActive: boolean = true) {
  return useQuery({
    queryKey: ['funding-sources', { onlyActive }],
    queryFn: async () => {
      let query = supabase
        .from('funding_sources')
        .select('*')
        .order('name', { ascending: true });

      if (onlyActive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (error) throw new Error(`Failed to fetch funding sources: ${error.message}`);
      return data as FundingSource[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Get a single funding source by ID.
 */
export function useFundingSource(id: string | null | undefined) {
  return useQuery({
    queryKey: ['funding-source', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('funding_sources')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw new Error(`Failed to fetch funding source: ${error.message}`);
      return data as FundingSource;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Find funding source by code (case-insensitive).
 */
export function useFindFundingSourceByCode(code: string | null | undefined) {
  return useQuery({
    queryKey: ['funding-source-by-code', code],
    queryFn: async () => {
      if (!code) return null;
      const { data, error } = await supabase
        .from('funding_sources')
        .select('*')
        .ilike('code', code.trim())
        .eq('is_active', true)
        .limit(1)
        .single();
      if (error) {
        if (error.code === 'PGRST116') return null;
        throw new Error(`Failed to find funding source: ${error.message}`);
      }
      return data as FundingSource;
    },
    enabled: !!code,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Create a new funding source (admin only).
 */
export function useCreateFundingSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newSource: Pick<FundingSource, 'name' | 'code' | 'description'>) => {
      const { data, error } = await supabase
        .from('funding_sources')
        .insert([newSource])
        .select()
        .single();
      if (error) throw new Error(`Failed to create funding source: ${error.message}`);
      return data as FundingSource;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funding-sources'] });
    },
  });
}

/**
 * Update a funding source (admin only).
 */
export function useUpdateFundingSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Pick<FundingSource, 'name' | 'code' | 'description' | 'is_active'>> }) => {
      const { data, error } = await supabase
        .from('funding_sources')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(`Failed to update funding source: ${error.message}`);
      return data as FundingSource;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funding-sources'] });
      queryClient.invalidateQueries({ queryKey: ['funding-source'] });
    },
  });
}

/**
 * Helper: normalize a funding source name/code and find a match.
 */
export function normalizeFundingSource(
  codeOrName: string | null | undefined,
  sources: FundingSource[],
): FundingSource | null {
  if (!codeOrName || !sources.length) return null;
  const normalized = codeOrName.trim().toLowerCase();

  const exactMatch = sources.find(
    (s) => s.code.toLowerCase() === normalized || s.name.toLowerCase() === normalized,
  );
  if (exactMatch) return exactMatch;

  const fuzzyMatch = sources.find(
    (s) =>
      s.name.toLowerCase().includes(normalized) ||
      normalized.includes(s.name.toLowerCase()),
  );
  return fuzzyMatch || null;
}
