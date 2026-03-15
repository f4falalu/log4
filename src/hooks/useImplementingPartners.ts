import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ImplementingPartner {
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
 * Fetch all implementing partners from the database.
 */
export function useImplementingPartners(onlyActive: boolean = true) {
  return useQuery({
    queryKey: ['implementing-partners', { onlyActive }],
    queryFn: async () => {
      let query = supabase
        .from('implementing_partners')
        .select('*')
        .order('name', { ascending: true });

      if (onlyActive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (error) throw new Error(`Failed to fetch implementing partners: ${error.message}`);
      return data as ImplementingPartner[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Get a single implementing partner by ID.
 */
export function useImplementingPartner(id: string | null | undefined) {
  return useQuery({
    queryKey: ['implementing-partner', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('implementing_partners')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw new Error(`Failed to fetch implementing partner: ${error.message}`);
      return data as ImplementingPartner;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Find implementing partner by code (case-insensitive).
 */
export function useFindImplementingPartnerByCode(code: string | null | undefined) {
  return useQuery({
    queryKey: ['implementing-partner-by-code', code],
    queryFn: async () => {
      if (!code) return null;
      const { data, error } = await supabase
        .from('implementing_partners')
        .select('*')
        .ilike('code', code.trim())
        .eq('is_active', true)
        .limit(1)
        .single();
      if (error) {
        if (error.code === 'PGRST116') return null;
        throw new Error(`Failed to find implementing partner: ${error.message}`);
      }
      return data as ImplementingPartner;
    },
    enabled: !!code,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Create a new implementing partner (admin only).
 */
export function useCreateImplementingPartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newPartner: Pick<ImplementingPartner, 'name' | 'code' | 'description'>) => {
      const { data, error } = await supabase
        .from('implementing_partners')
        .insert([newPartner])
        .select()
        .single();
      if (error) throw new Error(`Failed to create implementing partner: ${error.message}`);
      return data as ImplementingPartner;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['implementing-partners'] });
    },
  });
}

/**
 * Update an implementing partner (admin only).
 */
export function useUpdateImplementingPartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Pick<ImplementingPartner, 'name' | 'code' | 'description' | 'is_active'>> }) => {
      const { data, error } = await supabase
        .from('implementing_partners')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(`Failed to update implementing partner: ${error.message}`);
      return data as ImplementingPartner;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['implementing-partners'] });
      queryClient.invalidateQueries({ queryKey: ['implementing-partner'] });
    },
  });
}

/**
 * Helper: normalize an IP name/code and find a match.
 */
export function normalizeImplementingPartner(
  codeOrName: string | null | undefined,
  partners: ImplementingPartner[],
): ImplementingPartner | null {
  if (!codeOrName || !partners.length) return null;
  const normalized = codeOrName.trim().toLowerCase();

  const exactMatch = partners.find(
    (p) => p.code.toLowerCase() === normalized || p.name.toLowerCase() === normalized,
  );
  if (exactMatch) return exactMatch;

  const fuzzyMatch = partners.find(
    (p) =>
      p.name.toLowerCase().includes(normalized) ||
      normalized.includes(p.name.toLowerCase()),
  );
  return fuzzyMatch || null;
}
