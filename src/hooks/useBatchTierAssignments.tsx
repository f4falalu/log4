import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BatchTierAssignment {
  id: string;
  batch_id: string;
  requisition_id: string;
  vehicle_tier_id: string;
  tier_position: string;
  assigned_weight_kg: number;
  assigned_volume_m3: number;
  position_x?: number;
  position_y?: number;
  loading_status: 'planned' | 'loaded' | 'in_transit' | 'delivered';
}

export function useBatchTierAssignments(batchId?: string) {
  return useQuery({
    queryKey: ['batch-tier-assignments', batchId],
    queryFn: async () => {
      if (!batchId) return [];
      
      const { data, error } = await supabase
        .from('batch_tier_assignments' as any)
        .select(`
          *,
          requisitions (
            id,
            requisition_number,
            facility_id,
            facilities (
              name,
              address
            )
          ),
          vehicle_tiers (
            tier_name,
            max_weight_kg
          )
        `)
        .eq('batch_id', batchId);

      if (error) throw error;
      return data as any;
    },
    enabled: !!batchId,
  });
}

export function useCreateBatchTierAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignment: Omit<BatchTierAssignment, 'id'>) => {
      const { error } = await supabase
        .from('batch_tier_assignments' as any)
        .insert(assignment as any);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch-tier-assignments'] });
    },
    onError: (error) => {
      toast.error('Failed to assign cargo', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

export function useDeleteBatchTierAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from('batch_tier_assignments' as any)
        .delete()
        .eq('id', assignmentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch-tier-assignments'] });
    },
  });
}
