import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Program, ProgramFormData, ProgramFilters } from '@/types/program';

// Fetch programs with filters
export function usePrograms(filters?: ProgramFilters) {
  return useQuery({
    queryKey: ['programs', filters],
    queryFn: async () => {
      let query = supabase
        .from('programs')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`
        );
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.funding_source) {
        query = query.eq('funding_source', filters.funding_source);
      }

      if (filters?.priority_tier) {
        query = query.eq('priority_tier', filters.priority_tier);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch metrics for each program
      // TODO: Replace with actual metrics from database views/aggregates
      const programsWithMetrics = data?.map((program) => ({
        ...program,
        metrics: {
          facility_count: Math.floor(Math.random() * 50) + 10,
          active_requisitions: Math.floor(Math.random() * 20),
          active_schedules: Math.floor(Math.random() * 15),
          active_batches: Math.floor(Math.random() * 10),
          pending_batches: Math.floor(Math.random() * 5),
          stockout_count: Math.floor(Math.random() * 3),
          fulfillment_rate: 85 + Math.floor(Math.random() * 15),
          avg_delivery_time: 2 + Math.random() * 3,
        },
      })) as Program[];

      return { programs: programsWithMetrics || [] };
    },
  });
}

// Get single program
export function useProgram(id: string) {
  return useQuery({
    queryKey: ['programs', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Add metrics (TODO: replace with real data)
      const programWithMetrics: Program = {
        ...data,
        metrics: {
          facility_count: Math.floor(Math.random() * 50) + 10,
          active_requisitions: Math.floor(Math.random() * 20),
          active_schedules: Math.floor(Math.random() * 15),
          active_batches: Math.floor(Math.random() * 10),
          pending_batches: Math.floor(Math.random() * 5),
          stockout_count: Math.floor(Math.random() * 3),
          fulfillment_rate: 85 + Math.floor(Math.random() * 15),
          avg_delivery_time: 2 + Math.random() * 3,
        },
      };

      return programWithMetrics;
    },
    enabled: !!id,
  });
}

// Create program
export function useCreateProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ProgramFormData) => {
      const { data: program, error } = await supabase
        .from('programs')
        .insert([
          {
            name: data.name,
            code: data.code,
            description: data.description,
            funding_source: data.funding_source,
            priority_tier: data.priority_tier,
            requires_cold_chain: data.requires_cold_chain,
            sla_days: data.sla_days,
            status: data.status,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return program;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
    },
  });
}

// Update program
export function useUpdateProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: ProgramFormData & { id: string }) => {
      const { data: program, error } = await supabase
        .from('programs')
        .update({
          name: data.name,
          code: data.code,
          description: data.description,
          funding_source: data.funding_source,
          priority_tier: data.priority_tier,
          requires_cold_chain: data.requires_cold_chain,
          sla_days: data.sla_days,
          status: data.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return program;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      queryClient.invalidateQueries({ queryKey: ['programs', variables.id] });
    },
  });
}

// Delete program
export function useDeleteProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('programs').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
    },
  });
}
