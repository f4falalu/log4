import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface NotificationPreference {
  id: string;
  user_id: string;
  notification_type: string;
  channel: string;
  enabled: boolean;
}

export const NOTIFICATION_TYPES = {
  delivery_complete: { label: 'Delivery Complete', description: 'When a delivery is marked as complete' },
  batch_assigned: { label: 'Batch Assigned', description: 'When a new batch is assigned to a driver' },
  requisition_approved: { label: 'Requisition Approved', description: 'When a requisition is approved or rejected' },
  schedule_published: { label: 'Schedule Published', description: 'When a new delivery schedule is published' },
  system_alert: { label: 'System Alert', description: 'Critical system notifications and alerts' },
  role_changed: { label: 'Role Changed', description: 'When your role or permissions change' },
} as const;

export const NOTIFICATION_CHANNELS = ['in_app', 'email', 'push'] as const;

export type NotificationType = keyof typeof NOTIFICATION_TYPES;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

/**
 * Get notification preferences for a user
 */
export function useNotificationPreferences(userId: string | undefined) {
  return useQuery({
    queryKey: ['notification-preferences', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return (data || []) as NotificationPreference[];
    },
    enabled: !!userId,
  });
}

/**
 * Update a notification preference (upsert)
 */
export function useUpdateNotificationPreference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      notificationType,
      channel,
      enabled,
    }: {
      userId: string;
      notificationType: string;
      channel: string;
      enabled: boolean;
    }) => {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert(
          {
            user_id: userId,
            notification_type: notificationType,
            channel,
            enabled,
          },
          { onConflict: 'user_id,notification_type,channel' }
        );

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences', variables.userId] });
    },
  });
}
