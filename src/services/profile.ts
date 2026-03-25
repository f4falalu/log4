import { supabase } from '@/integrations/supabase/client';

export interface UserProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  organization: string | null;
  timezone: string;
  language: string;
  user_status: string;
  created_at: string | null;
  updated_at: string | null;
  user_preferences: {
    email_notifications: boolean;
    in_app_notifications: boolean;
  } | null;
}

export interface UpdateProfilePayload {
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  timezone?: string;
  language?: string;
}

export interface UpdatePreferencesPayload {
  email_notifications: boolean;
  in_app_notifications: boolean;
}

export async function getUserProfile(userId: string): Promise<UserProfile> {
  // Fetch profile + preferences in parallel
  const [profileResult, prefsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, phone, avatar_url, organization, timezone, language, user_status, created_at, updated_at')
      .eq('id', userId)
      .single(),
    supabase
      .from('user_preferences')
      .select('email_notifications, in_app_notifications')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  if (profileResult.error) throw profileResult.error;

  return {
    ...profileResult.data,
    timezone: profileResult.data.timezone || 'UTC',
    language: profileResult.data.language || 'en',
    user_preferences: prefsResult.data || {
      email_notifications: true,
      in_app_notifications: true,
    },
  } as UserProfile;
}

export async function updateUserProfile(userId: string, payload: UpdateProfilePayload) {
  const { error } = await supabase
    .from('profiles')
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) throw error;
}

export async function updateUserPreferences(userId: string, prefs: UpdatePreferencesPayload) {
  const { error } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: userId,
      ...prefs,
      updated_at: new Date().toISOString(),
    });

  if (error) throw error;
}

export async function changePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop();
  const filePath = `avatars/${userId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

  // Update profile with new avatar URL
  await updateUserProfile(userId, { avatar_url: data.publicUrl });

  return data.publicUrl;
}
