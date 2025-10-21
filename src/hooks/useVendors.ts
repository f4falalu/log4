import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Vendor {
  id: string;
  name: string;
  contact_name?: string;
  contact_phone?: string;
  email?: string;
  address?: string;
  created_at: string;
  fleet_count?: number;
}

export interface CreateVendorData {
  name: string;
  contact_name?: string;
  contact_phone?: string;
  email?: string;
  address?: string;
}

export function useVendors() {
  return useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('vendors')
        .select(`
          *,
          fleets(count)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching vendors:', error);
        throw error;
      }

      // Transform the data to include fleet count
      return data?.map(vendor => ({
        ...vendor,
        fleet_count: Array.isArray(vendor.fleets) ? vendor.fleets.length : 0
      })) as Vendor[];
    },
  });
}

export function useCreateVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateVendorData) => {
      const { data: vendor, error } = await (supabase as any)
        .from('vendors')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return vendor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast.success('Vendor created successfully');
    },
    onError: (error: any) => {
      console.error('Error creating vendor:', error);
      toast.error('Failed to create vendor');
    },
  });
}

export function useUpdateVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateVendorData> }) => {
      const { data: vendor, error } = await (supabase as any)
        .from('vendors')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return vendor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast.success('Vendor updated successfully');
    },
    onError: (error: any) => {
      console.error('Error updating vendor:', error);
      toast.error('Failed to update vendor');
    },
  });
}

export function useDeleteVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('vendors')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast.success('Vendor deleted successfully');
    },
    onError: (error: any) => {
      console.error('Error deleting vendor:', error);
      toast.error('Failed to delete vendor');
    },
  });
}
