import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface OnboardingRequest {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  organization_hint: string | null;
  device_id: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DriverDevice {
  id: string;
  user_id: string;
  device_id: string;
  device_name: string | null;
  platform: string | null;
  is_trusted: boolean;
  registered_at: string;
  last_seen_at: string;
  revoked_at: string | null;
  user_email: string;
}

// =====================================================
// QUERIES
// =====================================================

export function useOnboardingRequests() {
  return useQuery({
    queryKey: ['admin-integration', 'onboarding-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('onboarding_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as OnboardingRequest[];
    },
    retry: 1,
    staleTime: 30000,
  });
}

export function useDriverDevices() {
  return useQuery({
    queryKey: ['admin-integration', 'devices'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_driver_devices');

      if (error) throw error;
      return (data || []) as DriverDevice[];
    },
    retry: 1,
    staleTime: 30000,
  });
}

// =====================================================
// MUTATIONS
// =====================================================

export function useApproveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, notes }: { requestId: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('onboarding_requests')
        .update({
          status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          reviewer_notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Request approved');
      queryClient.invalidateQueries({ queryKey: ['admin-integration'] });
    },
    onError: (error) => {
      console.error('Failed to approve request:', error);
      toast.error('Failed to approve request');
    },
  });
}

export function useRejectRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, notes }: { requestId: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('onboarding_requests')
        .update({
          status: 'rejected',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          reviewer_notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Request rejected');
      queryClient.invalidateQueries({ queryKey: ['admin-integration'] });
    },
    onError: (error) => {
      console.error('Failed to reject request:', error);
      toast.error('Failed to reject request');
    },
  });
}

export function useRevokeDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deviceId: string) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('driver_devices')
        .update({
          is_trusted: false,
          revoked_at: new Date().toISOString(),
          revoked_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', deviceId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Device revoked');
      queryClient.invalidateQueries({ queryKey: ['admin-integration'] });
    },
    onError: (error) => {
      console.error('Failed to revoke device:', error);
      toast.error('Failed to revoke device');
    },
  });
}
