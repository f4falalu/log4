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
  return useQuery<Vendor[]>({
    queryKey: ['vendors'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
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

        // Handle case where data is null or undefined
        if (!data) {
          console.warn('No vendors data returned from the database');
          return [];
        }

        // Transform the data to include fleet count with null checks
        return data.map(vendor => ({
          id: vendor.id,
          name: vendor.name || 'Unnamed Vendor',
          contact_name: vendor.contact_name || '',
          contact_phone: vendor.contact_phone || '',
          email: vendor.email || '',
          address: vendor.address || '',
          created_at: vendor.created_at,
          fleet_count: Array.isArray(vendor.fleets) ? vendor.fleets.length : 0
        }));
      } catch (error) {
        console.error('Error in useVendors hook:', error);
        throw error;
      }
    },
    // Add retry logic
    retry: 2,
    // Add stale time to prevent unnecessary refetches
    staleTime: 5 * 60 * 1000, // 5 minutes
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
