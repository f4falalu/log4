import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
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
  const { workspaceId } = useWorkspace();

  const createDriver = useMutation({
    mutationFn: async (data: DriverFormData) => {
      if (!workspaceId) throw new Error('No workspace selected');

      // Build insert payload — only include defined values to avoid sending undefined
      const dbData: Record<string, unknown> = {
        name: data.name,
        phone: data.phone,
        license_type: data.license_type,
        shift_start: data.shift_start,
        shift_end: data.shift_end,
        max_hours: data.max_hours,
        workspace_id: workspaceId,
      };

      // Optional fields — only add if provided
      if (data.email) dbData.email = data.email;
      if (data.middle_name) dbData.middle_name = data.middle_name;
      if (data.date_of_birth) dbData.date_of_birth = data.date_of_birth;
      if (data.license_number) dbData.license_number = data.license_number;
      if (data.license_state) dbData.license_state = data.license_state;
      if (data.license_expiry) dbData.license_expiry = data.license_expiry;
      if (data.employer) dbData.employer = data.employer;
      if (data.position) dbData.position = data.position;
      if (data.employment_type) dbData.employment_type = data.employment_type;
      if (data.group_name) dbData.group_name = data.group_name;
      if (data.start_date) dbData.start_date = data.start_date;
      if (data.preferred_services) dbData.preferred_services = data.preferred_services;
      if (data.federal_id) dbData.federal_id = data.federal_id;
      if (data.address_line1) dbData.address_line1 = data.address_line1;
      if (data.address_line2) dbData.address_line2 = data.address_line2;
      if (data.city) dbData.city = data.city;
      if (data.state_province) dbData.state_province = data.state_province;
      if (data.country) dbData.country = data.country;
      if (data.postal_code) dbData.postal_code = data.postal_code;
      if (data.emergency_contact_name) dbData.emergency_contact_name = data.emergency_contact_name;
      if (data.emergency_contact_phone) dbData.emergency_contact_phone = data.emergency_contact_phone;
      if (data.profile_photo_url) dbData.profile_photo_url = data.profile_photo_url;

      const { data: driver, error } = await supabase
        .from('drivers')
        .insert(dbData as any)
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
      // Filter to only include fields that exist in the drivers table
      const dbData: Record<string, unknown> = {};

      // Basic fields
      if (data.name !== undefined) dbData.name = data.name;
      if (data.phone !== undefined) dbData.phone = data.phone;
      if (data.email !== undefined) dbData.email = data.email;
      if (data.middle_name !== undefined) dbData.middle_name = data.middle_name;
      if (data.date_of_birth !== undefined) dbData.date_of_birth = data.date_of_birth;

      // License & Credentials
      if (data.license_type !== undefined) dbData.license_type = data.license_type;
      if (data.license_number !== undefined) dbData.license_number = data.license_number;
      if (data.license_state !== undefined) dbData.license_state = data.license_state;
      if (data.license_expiry !== undefined) dbData.license_expiry = data.license_expiry;

      // Employment Details
      if (data.employer !== undefined) dbData.employer = data.employer;
      if (data.position !== undefined) dbData.position = data.position;
      if (data.employment_type !== undefined) dbData.employment_type = data.employment_type;
      if (data.group_name !== undefined) dbData.group_name = data.group_name;
      if (data.start_date !== undefined) dbData.start_date = data.start_date;
      if (data.preferred_services !== undefined) dbData.preferred_services = data.preferred_services;
      if (data.federal_id !== undefined) dbData.federal_id = data.federal_id;

      // Shift & Hours
      if (data.shift_start !== undefined) dbData.shift_start = data.shift_start;
      if (data.shift_end !== undefined) dbData.shift_end = data.shift_end;
      if (data.max_hours !== undefined) dbData.max_hours = data.max_hours;

      // Address & Contact
      if (data.address_line1 !== undefined) dbData.address_line1 = data.address_line1;
      if (data.address_line2 !== undefined) dbData.address_line2 = data.address_line2;
      if (data.city !== undefined) dbData.city = data.city;
      if (data.state_province !== undefined) dbData.state_province = data.state_province;
      if (data.country !== undefined) dbData.country = data.country;
      if (data.postal_code !== undefined) dbData.postal_code = data.postal_code;
      if (data.emergency_contact_name !== undefined) dbData.emergency_contact_name = data.emergency_contact_name;
      if (data.emergency_contact_phone !== undefined) dbData.emergency_contact_phone = data.emergency_contact_phone;

      // Profile & Documents
      if (data.profile_photo_url !== undefined) dbData.profile_photo_url = data.profile_photo_url;

      const { error } = await supabase
        .from('drivers')
        .update(dbData)
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
