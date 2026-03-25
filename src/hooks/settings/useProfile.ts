import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getUserProfile,
  updateUserProfile,
  updateUserPreferences,
  changePassword,
  uploadAvatar,
  type UserProfile,
  type UpdateProfilePayload,
  type UpdatePreferencesPayload,
} from '@/services/profile';
import { toast } from 'sonner';

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: () => getUserProfile(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateProfile(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => updateUserProfile(userId, payload),

    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ['profile', userId] });
      const prev = queryClient.getQueryData<UserProfile>(['profile', userId]);

      queryClient.setQueryData<UserProfile>(['profile', userId], (old) =>
        old ? { ...old, ...newData } : old
      );

      return { prev };
    },

    onError: (_err, _newData, context) => {
      if (context?.prev) {
        queryClient.setQueryData(['profile', userId], context.prev);
      }
      toast.error('Failed to update profile');
    },

    onSuccess: () => {
      toast.success('Profile updated');
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });
}

export function useUpdatePreferences(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (prefs: UpdatePreferencesPayload) => updateUserPreferences(userId, prefs),

    onMutate: async (newPrefs) => {
      await queryClient.cancelQueries({ queryKey: ['profile', userId] });
      const prev = queryClient.getQueryData<UserProfile>(['profile', userId]);

      queryClient.setQueryData<UserProfile>(['profile', userId], (old) =>
        old ? { ...old, user_preferences: { ...old.user_preferences, ...newPrefs } } : old
      );

      return { prev };
    },

    onError: (_err, _newData, context) => {
      if (context?.prev) {
        queryClient.setQueryData(['profile', userId], context.prev);
      }
      toast.error('Failed to update preferences');
    },

    onSuccess: () => {
      toast.success('Preferences updated');
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (newPassword: string) => changePassword(newPassword),

    onSuccess: () => {
      toast.success('Password changed successfully');
    },

    onError: () => {
      toast.error('Failed to change password');
    },
  });
}

export function useUploadAvatar(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => uploadAvatar(userId, file),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      toast.success('Avatar updated');
    },

    onError: () => {
      toast.error('Failed to upload avatar');
    },
  });
}
