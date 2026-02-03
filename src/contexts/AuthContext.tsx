import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { AppRole } from '@/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  activeRole: AppRole | null;
  setActiveRole: (role: AppRole) => void;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, phone?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  sendDriverOtp: (email: string, workspaceId: string) => Promise<{ data?: string; error: any }>;
  verifyDriverOtp: (email: string, otp: string) => Promise<{ success: boolean; error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeRole, setActiveRoleState] = useState<AppRole | null>(() => {
    // Load active role from localStorage on init
    const stored = localStorage.getItem('activeRole');
    return stored as AppRole | null;
  });
  const navigate = useNavigate();

  const setActiveRole = (role: AppRole) => {
    setActiveRoleState(role);
    localStorage.setItem('activeRole', role);
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    const redirectUrl = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string, phone?: string) => {
    const redirectUrl = `${window.location.origin}/auth/callback`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          phone: phone,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('activeRole');
    setActiveRoleState(null);
    navigate('/auth');
  };

  const sendDriverOtp = async (email: string, workspaceId: string) => {
    const { data, error } = await supabase.rpc('generate_mod4_otp', {
      p_email: email,
      p_workspace_id: workspaceId,
    });
    return { data, error };
  };

  const verifyDriverOtp = async (email: string, otp: string) => {
    const { data, error } = await supabase.rpc('verify_mod4_otp', {
      p_email: email,
      p_otp: otp,
    });

    if (error) {
      return { success: false, error };
    }

    // After successful OTP verification, the user is linked via the RPC function
    // Now we need to sign them in
    if (data === true) {
      // Refresh the session to get the updated user state
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      if (sessionError) {
        return { success: false, error: sessionError };
      }
      setSession(session);
      setUser(session?.user ?? null);
      return { success: true, error: null };
    }

    return { success: false, error: new Error('Invalid OTP code') };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, activeRole, setActiveRole, signIn, signInWithGoogle, signUp, signOut, sendDriverOtp, verifyDriverOtp }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
