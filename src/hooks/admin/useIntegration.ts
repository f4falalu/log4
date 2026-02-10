import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Mod4DriverLink {
  id: string;
  user_id: string;
  driver_id: string | null;
  status: 'active' | 'suspended' | 'revoked';
  link_method: 'email_invitation' | 'otp' | 'admin_direct';
  linked_by: string;
  linked_at: string;
  user_email: string;
  user_name: string | null;
  linked_by_name: string | null;
}

export interface Mod4OTPCode {
  id: string;
  target_email: string;
  otp_code: string;
  status: 'pending' | 'used' | 'expired';
  created_by: string;
  created_at: string;
  expires_at: string;
  attempts: number;
  max_attempts: number;
}

// =====================================================
// QUERIES
// =====================================================

export function useLinkedUsers() {
  return useQuery({
    queryKey: ['admin-integration', 'linked'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_mod4_linked_users');

      if (error) throw error;
      return (data || []) as Mod4DriverLink[];
    },
    retry: 1,
    staleTime: 30000,
  });
}

export function usePendingOTPs() {
  return useQuery({
    queryKey: ['admin-integration', 'otps'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mod4_otp_codes')
        .select('*')
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Mod4OTPCode[];
    },
    retry: 1,
    refetchInterval: 30000,
  });
}

// =====================================================
// MUTATIONS
// =====================================================

export function useLinkUserDirect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.rpc('link_user_to_mod4', {
        p_user_id: userId,
        p_link_method: 'admin_direct',
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('User linked to Mod4 successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-integration'] });
    },
    onError: (error) => {
      console.error('Failed to link user:', error);
      toast.error('Failed to link user to Mod4');
    },
  });
}

export function useGenerateOTP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, workspaceId }: { email: string; workspaceId: string }) => {
      // Call Edge Function which creates the user via GoTrue Admin API
      // then generates the OTP via RPC
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-driver-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ email, workspaceId }),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate OTP');
      }

      return result.otp as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-integration', 'otps'] });
    },
    onError: (error) => {
      console.error('Failed to generate OTP:', error);
      toast.error('Failed to generate OTP code');
    },
  });
}

export function useSuspendLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from('mod4_driver_links')
        .update({ status: 'suspended', updated_at: new Date().toISOString() })
        .eq('id', linkId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Driver link suspended');
      queryClient.invalidateQueries({ queryKey: ['admin-integration'] });
    },
    onError: (error) => {
      console.error('Failed to suspend link:', error);
      toast.error('Failed to suspend driver link');
    },
  });
}

export function useRevokeLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from('mod4_driver_links')
        .update({ status: 'revoked', updated_at: new Date().toISOString() })
        .eq('id', linkId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Driver link revoked');
      queryClient.invalidateQueries({ queryKey: ['admin-integration'] });
    },
    onError: (error) => {
      console.error('Failed to revoke link:', error);
      toast.error('Failed to revoke driver link');
    },
  });
}

export function useRevokeOTP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (otpId: string) => {
      const { error } = await supabase
        .from('mod4_otp_codes')
        .update({ status: 'expired' })
        .eq('id', otpId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('OTP code revoked');
      queryClient.invalidateQueries({ queryKey: ['admin-integration', 'otps'] });
    },
    onError: (error) => {
      console.error('Failed to revoke OTP:', error);
      toast.error('Failed to revoke OTP code');
    },
  });
}
