// MOD4 Auth Store
// Driver authentication state management with Supabase

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase';
import { generateDeviceId } from '@/lib/db/schema';
import type { User, Session } from '@supabase/supabase-js';

export interface Driver {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  vehicle_id?: string;
  avatar_url?: string;
  organization_id?: string;
  status?: 'active' | 'inactive' | 'on_break' | 'on_delivery';
}

export type ActivationStep = 'idle' | 'otp_verified' | 'pin_set' | 'activated';

// localStorage keys for device-bound data
const LINKED_EMAIL_KEY = 'mod4_linked_email';

/** Get the email stored on this device after activation */
export function getLinkedEmail(): string | null {
  return localStorage.getItem(LINKED_EMAIL_KEY);
}

/** Clear device-bound email (e.g. "Not you?" action) */
export function clearLinkedEmail(): void {
  localStorage.removeItem(LINKED_EMAIL_KEY);
}

/** Mask email for display (e.g. "d***@mod4.biko.com") */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, 1);
  return `${visible}***@${domain}`;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  driver: Driver | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  activationStep: ActivationStep;

  // Actions
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setDriver: (driver: Driver | null) => void;
  setLoading: (loading: boolean) => void;

  // Auth operations
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithOtp: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (email: string, token: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  fetchDriverProfile: () => Promise<void>;

  // Onboarding operations
  activateWithOTP: (identifier: string, otp: string) => Promise<{ success: boolean; email?: string; error?: string }>;
  setPIN: (pin: string, displayName?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithPIN: (pin: string) => Promise<{ success: boolean; error?: string }>;
  requestAccess: (name: string, phone: string, email?: string, orgHint?: string) => Promise<{ success: boolean; requestId?: string; error?: string }>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      driver: null,
      isAuthenticated: false,
      isLoading: false,
      activationStep: 'idle' as ActivationStep,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setSession: (session) => set({ session }),
      setDriver: (driver) => set({ driver }),
      setLoading: (loading) => set({ isLoading: loading }),

      // Email/password login
      login: async (email: string, password: string) => {
        set({ isLoading: true });

        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            set({ isLoading: false });
            return { success: false, error: error.message };
          }

          set({
            user: data.user,
            session: data.session,
            isAuthenticated: true,
            isLoading: false
          });

          // Fetch driver profile after login
          await get().fetchDriverProfile();

          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Login failed'
          };
        }
      },

      // Custom numeric OTP login (send 6-digit code via email)
      loginWithOtp: async (email: string) => {
        set({ isLoading: true });

        try {
          // Call edge function to generate and send OTP
          const { data, error } = await supabase.functions.invoke('send-email-login-otp', {
            body: { email },
          });

          if (error) {
            set({ isLoading: false });
            return {
              success: false,
              error: error.message || 'Failed to send OTP'
            };
          }

          if (!data?.success) {
            set({ isLoading: false });
            return {
              success: false,
              error: data?.error || 'Failed to send OTP'
            };
          }

          set({ isLoading: false });
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to send OTP'
          };
        }
      },

      // Verify OTP code (custom numeric OTP)
      verifyOtp: async (email: string, code: string) => {
        set({ isLoading: true });

        try {
          // Verify OTP via RPC
          const { data: verifyData, error: verifyError } = await supabase.rpc(
            'verify_email_login_otp',
            { p_email: email, p_code: code }
          ) as { data: { success: boolean; temp_password?: string; error?: string } | null; error: any };

          if (verifyError || !verifyData?.success) {
            set({ isLoading: false });
            return {
              success: false,
              error: verifyData?.error || verifyError?.message || 'OTP verification failed'
            };
          }

          // Sign in with temporary password
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password: verifyData.temp_password!,
          });

          if (authError) {
            set({ isLoading: false });
            return { success: false, error: authError.message };
          }

          set({
            user: authData.user,
            session: authData.session,
            isAuthenticated: true,
            isLoading: false
          });

          // Fetch driver profile after login
          await get().fetchDriverProfile();

          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          return {
            success: false,
            error: error instanceof Error ? error.message : 'OTP verification failed'
          };
        }
      },

      // Reset password
      resetPassword: async (email: string) => {
        set({ isLoading: true });

        try {
          // Determine the correct redirect URL based on environment
          const redirectTo = import.meta.env.PROD
            ? 'https://driverbiko.netlify.app/reset-password'
            : `${window.location.origin}/reset-password`;

          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo,
          });

          set({ isLoading: false });

          if (error) {
            return { success: false, error: error.message };
          }

          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to send reset email'
          };
        }
      },

      // =============================================
      // Onboarding: Activate with admin-issued OTP
      // =============================================
      activateWithOTP: async (identifier: string, otp: string) => {
        set({ isLoading: true });

        try {
          // Step 1: Verify OTP via the custom RPC (anon callable)
          // This validates the OTP, sets user password to the OTP value,
          // creates mod4_driver_links, and returns the resolved email
          const { data: resolvedEmail, error: verifyError } = await supabase.rpc(
            'verify_mod4_otp',
            { p_email: identifier, p_otp: otp }
          );

          if (verifyError || !resolvedEmail) {
            set({ isLoading: false });
            return {
              success: false,
              error: verifyError?.message || 'Invalid or expired activation code'
            };
          }

          // Step 2: Sign in with the email + OTP as password
          // (verify_mod4_otp set the password to the OTP value)
          const { data, error: signInError } = await supabase.auth.signInWithPassword({
            email: resolvedEmail,
            password: otp,
          });

          if (signInError) {
            set({ isLoading: false });
            return { success: false, error: signInError.message };
          }

          // Store email on device for future PIN logins
          localStorage.setItem(LINKED_EMAIL_KEY, resolvedEmail);

          set({
            user: data.user,
            session: data.session,
            isAuthenticated: true,
            isLoading: false,
            activationStep: 'otp_verified',
          });

          await get().fetchDriverProfile();

          return { success: true, email: resolvedEmail };
        } catch (error) {
          set({ isLoading: false });
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Activation failed'
          };
        }
      },

      // =============================================
      // Onboarding: Set PIN + register device
      // =============================================
      setPIN: async (pin: string, displayName?: string) => {
        set({ isLoading: true });

        try {
          const deviceId = generateDeviceId();
          const platform = /Android/i.test(navigator.userAgent)
            ? 'android'
            : /iPhone|iPad|iPod/i.test(navigator.userAgent)
              ? 'ios'
              : 'web';

          // Call the server-side RPC to set PIN and register device
          const { error: rpcError } = await supabase.rpc('complete_driver_activation', {
            p_pin: pin,
            p_device_id: deviceId,
            p_device_name: navigator.userAgent.split(/[()]/)[1]?.trim() || 'Unknown Device',
            p_platform: platform,
            p_user_agent: navigator.userAgent,
            p_display_name: displayName || null,
          });

          if (rpcError) {
            set({ isLoading: false });
            return { success: false, error: rpcError.message };
          }

          // Re-sign in with the new PIN to get a fresh session
          const email = getLinkedEmail();
          if (email) {
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
              email,
              password: pin,
            });

            if (signInError) {
              set({ isLoading: false });
              return { success: false, error: signInError.message };
            }

            set({
              user: data.user,
              session: data.session,
              isAuthenticated: true,
            });
          }

          set({ isLoading: false, activationStep: 'activated' });
          await get().fetchDriverProfile();

          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to set PIN'
          };
        }
      },

      // =============================================
      // Login with PIN (returning driver)
      // =============================================
      loginWithPIN: async (pin: string) => {
        set({ isLoading: true });

        const email = getLinkedEmail();
        if (!email) {
          set({ isLoading: false });
          return { success: false, error: 'No account linked to this device' };
        }

        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password: pin,
          });

          if (error) {
            set({ isLoading: false });
            return { success: false, error: 'Invalid PIN' };
          }

          // Validate device is still trusted
          const deviceId = generateDeviceId();
          const { data: isTrusted } = await supabase.rpc('validate_driver_device', {
            p_device_id: deviceId,
          });

          if (!isTrusted) {
            // Device has been revoked — sign out
            await supabase.auth.signOut();
            set({
              user: null,
              session: null,
              driver: null,
              isAuthenticated: false,
              isLoading: false,
            });
            return {
              success: false,
              error: 'This device is no longer authorized. Please contact your admin.'
            };
          }

          set({
            user: data.user,
            session: data.session,
            isAuthenticated: true,
            isLoading: false,
            activationStep: 'activated',
          });

          await get().fetchDriverProfile();

          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Login failed'
          };
        }
      },

      // =============================================
      // Request access (unauthenticated driver)
      // =============================================
      requestAccess: async (
        name: string,
        phone: string,
        email?: string,
        orgHint?: string
      ) => {
        set({ isLoading: true });

        try {
          const deviceId = generateDeviceId();

          const { data: requestId, error } = await supabase.rpc(
            'submit_onboarding_request',
            {
              p_full_name: name,
              p_phone: phone,
              p_email: email || null,
              p_organization_hint: orgHint || null,
              p_device_id: deviceId,
            }
          );

          set({ isLoading: false });

          if (error) {
            return { success: false, error: error.message };
          }

          return { success: true, requestId: requestId as string };
        } catch (error) {
          set({ isLoading: false });
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to submit request'
          };
        }
      },

      logout: async () => {
        await supabase.auth.signOut();
        set({
          user: null,
          session: null,
          driver: null,
          isAuthenticated: false,
          activationStep: 'idle',
        });
      },

      refreshSession: async () => {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          set({
            user: session.user,
            session,
            isAuthenticated: true
          });
          await get().fetchDriverProfile();
        } else {
          set({
            user: null,
            session: null,
            driver: null,
            isAuthenticated: false
          });
        }
      },

      // Fetch driver profile from database via mod4_driver_links
      fetchDriverProfile: async () => {
        const { user } = get();
        if (!user) return;

        try {
          // Query mod4_driver_links which bridges auth.users → drivers
          const { data: link, error } = await supabase
            .from('mod4_driver_links' as any)
            .select('id, user_id, driver_id, status')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .maybeSingle() as { data: { id: string; user_id: string; driver_id: string | null; status: string } | null; error: any };

          if (error || !link) {
            console.warn('[MOD4] No active driver link found:', error?.message || 'no link');
            // Create a basic profile from user data if no driver link exists
            set({
              driver: {
                id: user.id,
                user_id: user.id,
                name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Driver',
                email: user.email || '',
                phone: user.phone || undefined,
              }
            });
            return;
          }

          // Build driver profile from link + auth user metadata
          set({
            driver: {
              id: link.driver_id || link.id,
              user_id: link.user_id,
              name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Driver',
              email: user.email || '',
              phone: user.phone || undefined,
              status: 'active',
            }
          });
        } catch (error) {
          console.warn('[MOD4] Error fetching driver profile:', error);
          // Fallback: still allow the app to function with basic profile
          const { user: currentUser } = get();
          if (currentUser) {
            set({
              driver: {
                id: currentUser.id,
                user_id: currentUser.id,
                name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Driver',
                email: currentUser.email || '',
              }
            });
          }
        }
      },
    }),
    {
      name: 'mod4-auth',
      partialize: (state) => ({
        // Only persist these fields
        driver: state.driver,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Auth state listener - set up on app initialization
export function initAuthListener() {
  // Listen for auth changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      console.log('[MOD4] Auth state changed:', event);

      const store = useAuthStore.getState();

      if (session) {
        store.setUser(session.user);
        store.setSession(session);
        await store.fetchDriverProfile();
      } else {
        store.setUser(null);
        store.setSession(null);
        store.setDriver(null);
      }
    }
  );

  // Check initial session
  useAuthStore.getState().refreshSession();

  return () => {
    subscription.unsubscribe();
  };
}
