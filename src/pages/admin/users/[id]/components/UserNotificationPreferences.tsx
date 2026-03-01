import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useNotificationPreferences,
  useUpdateNotificationPreference,
  NOTIFICATION_TYPES,
  NOTIFICATION_CHANNELS,
} from '@/hooks/rbac';

interface UserNotificationPreferencesProps {
  userId: string;
}

const CHANNEL_LABELS: Record<string, string> = {
  in_app: 'In-App',
  email: 'Email',
  push: 'Push',
};

export function UserNotificationPreferences({ userId }: UserNotificationPreferencesProps) {
  const { toast } = useToast();
  const { data: preferences, isLoading } = useNotificationPreferences(userId);
  const updatePreference = useUpdateNotificationPreference();

  // Build lookup: `${type}-${channel}` → enabled
  const prefMap = new Map<string, boolean>();
  (preferences || []).forEach((p) => {
    prefMap.set(`${p.notification_type}-${p.channel}`, p.enabled);
  });

  const getEnabled = (type: string, channel: string) => {
    const key = `${type}-${channel}`;
    // Default to true for system_alert, false for others if not explicitly set
    if (!prefMap.has(key)) {
      return type === 'system_alert';
    }
    return prefMap.get(key) ?? false;
  };

  const handleToggle = async (type: string, channel: string, currentValue: boolean) => {
    try {
      await updatePreference.mutateAsync({
        userId,
        notificationType: type,
        channel,
        enabled: !currentValue,
      });
    } catch (error) {
      toast({
        title: 'Error updating preference',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>
          Configure which notifications this user receives and through which channels
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_repeat(3,80px)] gap-4 px-4 py-2 border-b">
            <div className="text-sm font-medium text-muted-foreground">Notification Type</div>
            {NOTIFICATION_CHANNELS.map((channel) => (
              <div key={channel} className="text-sm font-medium text-muted-foreground text-center">
                {CHANNEL_LABELS[channel]}
              </div>
            ))}
          </div>

          {/* Rows */}
          {Object.entries(NOTIFICATION_TYPES).map(([type, meta]) => (
            <div
              key={type}
              className="grid grid-cols-[1fr_repeat(3,80px)] gap-4 px-4 py-3 hover:bg-accent/50 rounded-md transition-colors"
            >
              <div>
                <p className="text-sm font-medium">{meta.label}</p>
                <p className="text-xs text-muted-foreground">{meta.description}</p>
              </div>
              {NOTIFICATION_CHANNELS.map((channel) => {
                const enabled = getEnabled(type, channel);
                return (
                  <div key={channel} className="flex items-center justify-center">
                    <Switch
                      checked={enabled}
                      onCheckedChange={() => handleToggle(type, channel, enabled)}
                      disabled={updatePreference.isPending}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-muted rounded-md">
          <p className="text-xs text-muted-foreground">
            System alerts are enabled by default. Push notifications require the user to have enabled browser notifications.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
