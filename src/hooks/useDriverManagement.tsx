import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DriverFormData {
  // Basic Information
  name: string;
  phone: string;
  email?: string;
  middle_name?: string;
  date_of_birth?: string;

  // License & Credentials
  license_type: 'standard' | 'commercial';
  license_number?: string;
  license_state?: string;
  license_expiry?: string;

  // Employment Details
  employer?: string;
  position?: string;
  employment_type?: string;
  group_name?: string;
  start_date?: string;
  preferred_services?: string;
  federal_id?: string;

  // Shift & Hours
  shift_start: string;
  shift_end: string;
  max_hours: number;

  // Address & Contact
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state_province?: string;
  country?: string;
  postal_code?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;

  // Profile & Documents
  profile_photo_url?: string;
}

export function useDriverManagement() {
  const queryClient = useQueryClient();

  const createDriver = useMutation({
    mutationFn: async (data: DriverFormData) => {
      const { data: driver, error } = await supabase
        .from('drivers')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return driver;
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
    createDriver,
    updateDriver: updateDriver.mutate,
    deleteDriver: deleteDriver.mutate,
    isCreating: createDriver.isPending,
    isUpdating: updateDriver.isPending,
    isDeleting: deleteDriver.isPending,
  };
}
