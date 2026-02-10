import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/types/supabase';

type VendorRole = Database['public']['Enums']['vendor_role'];
type VendorService = Database['public']['Enums']['vendor_service'];
type VendorStatus = Database['public']['Enums']['vendor_status'];
type OrganizationType = Database['public']['Enums']['organization_type'];

export interface Vendor {
  id: string;
  name: string;

  // Legacy fields (deprecated, keep for backward compatibility)
  contact_name?: string;
  contact_phone?: string;
  email?: string;
  address?: string;

  // New core fields
  organization_type?: OrganizationType;
  vendor_roles: VendorRole[];
  vendor_status?: VendorStatus;

  // Structured address
  country?: string;
  state?: string;
  lga?: string;

  // Primary contact
  organization_lead_name?: string;
  organization_lead_title?: string;
  primary_email?: string;
  primary_phone?: string;

  // Services
  services_offered?: VendorService[];

  // Metadata
  created_at: string;
  onboarded_at?: string;
  onboarded_by?: string;
  internal_notes?: string;

  // Computed fields
  fleet_count?: number;
}

export interface CreateVendorData {
  name: string;
  vendor_roles: VendorRole[];

  // Optional core fields
  organization_type?: OrganizationType;
  vendor_status?: VendorStatus;

  // Structured address
  country?: string;
  state?: string;
  lga?: string;
  address?: string;

  // Primary contact
  organization_lead_name?: string;
  organization_lead_title?: string;
  primary_email?: string;
  primary_phone?: string;

  // Services (conditional - required if service_vendor or partner)
  services_offered?: VendorService[];

  // Legacy fields (for backward compatibility)
  contact_name?: string;
  contact_phone?: string;
  email?: string;

  // Metadata
  internal_notes?: string;
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

          // Legacy fields
          contact_name: vendor.contact_name || undefined,
          contact_phone: vendor.contact_phone || undefined,
          email: vendor.email || undefined,
          address: vendor.address || undefined,

          // New core fields
          organization_type: vendor.organization_type || undefined,
          vendor_roles: vendor.vendor_roles || [],
          vendor_status: vendor.vendor_status || undefined,

          // Structured address
          country: vendor.country || undefined,
          state: vendor.state || undefined,
          lga: vendor.lga || undefined,

          // Primary contact
          organization_lead_name: vendor.organization_lead_name || undefined,
          organization_lead_title: vendor.organization_lead_title || undefined,
          primary_email: vendor.primary_email || undefined,
          primary_phone: vendor.primary_phone || undefined,

          // Services
          services_offered: vendor.services_offered || undefined,

          // Metadata
          created_at: vendor.created_at || new Date().toISOString(),
          onboarded_at: vendor.onboarded_at || undefined,
          onboarded_by: vendor.onboarded_by || undefined,
          internal_notes: vendor.internal_notes || undefined,

          // Computed fields
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
      // Get current user for onboarded_by
      const { data: { user } } = await supabase.auth.getUser();

      const vendorData = {
        ...data,
        vendor_status: data.vendor_status || 'active' as VendorStatus,
        onboarded_at: new Date().toISOString(),
        onboarded_by: user?.id,
      };

      const { data: vendor, error } = await (supabase as any)
        .from('vendors')
        .insert(vendorData)
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
