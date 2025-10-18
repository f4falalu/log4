import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PayloadItem } from '@/lib/payloadValidation';

export function usePayloadItems(batchId: string) {
  return useQuery({
    queryKey: ['payload-items', batchId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('payload_items')
        .select('*')
        .eq('batch_id', batchId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as PayloadItem[];
    },
    enabled: !!batchId,
  });
}

export function useCreatePayloadItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ batchId, items }: { batchId: string; items: PayloadItem[] }) => {
      const itemsToInsert = items.map(item => ({
        batch_id: batchId,
        name: item.name,
        quantity: item.quantity,
        weight_kg: item.weight_kg,
        volume_m3: item.volume_m3,
        temperature_required: item.temperature_required || false,
        handling_instructions: item.handling_instructions
      }));

      const { data, error } = await (supabase as any)
        .from('payload_items')
        .insert(itemsToInsert)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payload-items', variables.batchId] });
      toast.success('Payload items saved');
    },
    onError: (error: any) => {
      toast.error(`Failed to save payload items: ${error.message}`);
    }
  });
}
