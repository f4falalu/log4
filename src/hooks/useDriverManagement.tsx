import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DriverFormData {
  name: string;
  phone: string;
  license_type: 'standard' | 'commercial';
  license_expiry?: string;
  shift_start: string;
  shift_end: string;
  max_hours: number;
}

export function useDriverManagement() {
  const queryClient = useQueryClient();

  const createDriver = useMutation({
    mutationFn: async (data: DriverFormData) => {
      const { error } = await supabase
        .from('drivers')
        .insert(data);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Driver added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add driver', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  const updateDriver = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DriverFormData> }) => {
      const { error } = await supabase
        .from('drivers')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Driver updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update driver', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  const deleteDriver = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('drivers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Driver deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete driver', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return {
    createDriver: createDriver.mutate,
    updateDriver: updateDriver.mutate,
    deleteDriver: deleteDriver.mutate,
    isCreating: createDriver.isPending,
    isUpdating: updateDriver.isPending,
    isDeleting: deleteDriver.isPending,
  };
}
