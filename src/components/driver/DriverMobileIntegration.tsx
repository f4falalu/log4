import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSuspendLink, useRevokeLink, useGenerateOTP } from '@/hooks/admin/useIntegration';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Smartphone,
  Wifi,
  WifiOff,
  Shield,
  ShieldOff,
  Clock,
  Monitor,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  KeyRound,
  Mail,
  Copy,
  Check,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface DriverMobileIntegrationProps {
  driverId: string;
  driverEmail?: string;
}

// Fetch mod4_driver_links for this driver (by driver_id column)
function useDriverMod4Link(driverId: string) {
  return useQuery({
    queryKey: ['driver-mod4-link', driverId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mod4_driver_links')
        .select('*')
        .eq('driver_id', driverId)
        .order('linked_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!driverId,
    refetchInterval: 30000, // Auto-refresh every 30 seconds to catch OTP usage
    staleTime: 10000, // Consider data stale after 10 seconds
  });
}

// Fetch devices via user_id from the link
function useDriverDevices(userId: string | null) {
  return useQuery({
    queryKey: ['driver-devices', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('driver_devices')
        .select('*')
        .eq('user_id', userId!)
        .is('revoked_at', null)
        .order('last_seen_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
}

// Fetch active/recent sessions via user_id (driver_sessions.driver_id = auth.users.id)
function useDriverMobileSessions(userId: string | null) {
  return useQuery({
    queryKey: ['driver-sessions', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('driver_sessions')
        .select('*')
        .eq('driver_id', userId!)
        .order('started_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
}

// Fetch event sync stats
function useDriverEventStats(driverId: string) {
  return useQuery({
    queryKey: ['driver-event-stats', driverId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mod4_events')
        .select('sync_status')
        .eq('driver_id', driverId);

      if (error) throw error;
      const events = data || [];
      return {
        total: events.length,
        synced: events.filter(e => e.sync_status === 'synced').length,
        pending: events.filter(e => e.sync_status === 'pending').length,
        failed: events.filter(e => e.sync_status === 'failed').length,
      };
    },
    enabled: !!driverId,
  });
}

const linkStatusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary'; icon: typeof CheckCircle2 }> = {
  active: { label: 'Active', variant: 'success', icon: CheckCircle2 },
  suspended: { label: 'Suspended', variant: 'warning', icon: AlertCircle },
  revoked: { label: 'Revoked', variant: 'destructive', icon: XCircle },
};

const platformIcons: Record<string, string> = {
  ios: 'iOS',
  android: 'Android',
  web: 'Web',
};

export function DriverMobileIntegration({ driverId, driverEmail }: DriverMobileIntegrationProps) {
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  const [email, setEmail] = useState(driverEmail || '');
  const [generatedOTP, setGeneratedOTP] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const linkQuery = useDriverMod4Link(driverId);
  const link = linkQuery.data;
  const devicesQuery = useDriverDevices(link?.user_id || null);
  const sessionsQuery = useDriverMobileSessions(link?.user_id || null);
  const eventStatsQuery = useDriverEventStats(driverId);
  const suspendLink = useSuspendLink();
  const revokeLink = useRevokeLink();
  const generateOTP = useGenerateOTP();

  // Get workspace ID
  const { data: workspaceId, isLoading: workspaceLoading, error: workspaceError } = useQuery({
    queryKey: ['driver-current-workspace-id'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: membership } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      return membership?.workspace_id as string | null;
    },
    retry: 1,
  });

  const isLoading = linkQuery.isLoading || workspaceLoading;

  const handleGenerateOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !workspaceId) return;

    try {
      const otp = await generateOTP.mutateAsync({ email, workspaceId });
      setGeneratedOTP(otp);
      linkQuery.refetch(); // Refresh the link status
    } catch {
      // Error handled by mutation
    }
  };

  const handleCopy = async () => {
    if (!generatedOTP) return;
    await navigator.clipboard.writeText(generatedOTP);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDialogOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setEmail(driverEmail || '');
      setGeneratedOTP(null);
      setCopied(false);
    }
    setOtpDialogOpen(newOpen);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Link Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold uppercase text-muted-foreground flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            MOD4 Link Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!link ? (
            <div className="text-center py-6">
              <ShieldOff className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium mb-1">Not linked to MOD4</p>
              <p className="text-xs text-muted-foreground mb-4">
                Generate an OTP code for this driver to link their mobile app.
              </p>
              <Button
                onClick={() => setOtpDialogOpen(true)}
                disabled={!workspaceId || !driverEmail}
                className="gap-2"
              >
                <KeyRound className="h-4 w-4" />
                Generate OTP Code
              </Button>
              {!driverEmail ? (
                <p className="text-xs text-destructive mt-2">
                  ⚠️ Driver email required. Please update driver profile.
                </p>
              ) : !workspaceId ? (
                <p className="text-xs text-destructive mt-2">
                  ⚠️ {workspaceError ? 'Workspace error: Unable to fetch workspace.' : 'No workspace found. Please ensure you are a member of a workspace.'}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Link Status</span>
                </div>
                <Badge variant={linkStatusConfig[link.status]?.variant || 'secondary'}>
                  {linkStatusConfig[link.status]?.label || link.status}
                </Badge>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Method</span>
                  <p className="font-medium capitalize">{link.link_method.replace('_', ' ')}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Linked</span>
                  <p className="font-medium">
                    {formatDistanceToNow(new Date(link.linked_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
              {link.status === 'active' && (
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => suspendLink.mutate(link.id)}
                    disabled={suspendLink.isPending}
                  >
                    Suspend
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => revokeLink.mutate(link.id)}
                    disabled={revokeLink.isPending}
                  >
                    Revoke
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Registered Devices */}
      {link && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase text-muted-foreground flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Registered Devices
            </CardTitle>
          </CardHeader>
          <CardContent>
            {devicesQuery.isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (devicesQuery.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No registered devices</p>
            ) : (
              <div className="space-y-3">
                {devicesQuery.data?.map((device) => (
                  <div key={device.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          {device.device_name || 'Unknown Device'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {platformIcons[device.platform || ''] || device.platform || 'Unknown'}
                          {' · '}
                          Last seen {formatDistanceToNow(new Date(device.last_seen_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <Badge variant={device.is_trusted ? 'success' : 'secondary'} size="sm">
                      {device.is_trusted ? 'Trusted' : 'Untrusted'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Active Sessions */}
      {link && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase text-muted-foreground flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              Recent Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sessionsQuery.isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (sessionsQuery.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No sessions found</p>
            ) : (
              <div className="space-y-3">
                {sessionsQuery.data?.map((session) => {
                  const isActive = session.status === 'ACTIVE' || session.status === 'active';
                  const metadata = session.device_metadata as Record<string, unknown> | null;
                  return (
                    <div key={session.id} className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {isActive ? (
                            <Wifi className="h-4 w-4 text-green-500" />
                          ) : (
                            <WifiOff className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="text-sm font-medium">
                            {isActive ? 'Active Session' : 'Ended Session'}
                          </span>
                        </div>
                        <Badge variant={isActive ? 'success' : 'secondary'} size="sm">
                          {session.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Started {formatDistanceToNow(new Date(session.started_at), { addSuffix: true })}
                        </div>
                        {session.last_heartbeat_at && (
                          <div className="flex items-center gap-1">
                            <RefreshCw className="h-3 w-3" />
                            Heartbeat {formatDistanceToNow(new Date(session.last_heartbeat_at), { addSuffix: true })}
                          </div>
                        )}
                        {metadata?.app_version && (
                          <div>App v{String(metadata.app_version)}</div>
                        )}
                        {metadata?.device_model && (
                          <div>{String(metadata.device_model)}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sync Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold uppercase text-muted-foreground flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Event Sync Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {eventStatsQuery.isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{eventStatsQuery.data?.total ?? 0}</p>
                <p className="text-xs text-muted-foreground">Total Events</p>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{eventStatsQuery.data?.synced ?? 0}</p>
                <p className="text-xs text-muted-foreground">Synced</p>
              </div>
              <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">{eventStatsQuery.data?.pending ?? 0}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{eventStatsQuery.data?.failed ?? 0}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* OTP Generation Dialog */}
      <Dialog open={otpDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-[420px]">
          {generatedOTP ? (
            <>
              <DialogHeader>
                <DialogTitle>OTP Code Generated</DialogTitle>
                <DialogDescription>
                  Share this code with the driver for <strong>{email}</strong>.
                  It expires in 15 minutes.
                </DialogDescription>
              </DialogHeader>

              <div className="py-6">
                <div className="flex items-center justify-center gap-3">
                  <div className="text-4xl font-mono font-bold tracking-[0.5em] text-center select-all">
                    {generatedOTP}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-4">
                  The driver enters this code in their Mod4 app to link their account.
                </p>
              </div>

              <DialogFooter>
                <Button onClick={() => handleDialogOpenChange(false)}>
                  Done
                </Button>
              </DialogFooter>
            </>
          ) : (
            <form onSubmit={handleGenerateOTP}>
              <DialogHeader>
                <DialogTitle>Generate OTP Code</DialogTitle>
                <DialogDescription>
                  Generate a one-time passcode for this driver to link their account to Mod4.
                </DialogDescription>
              </DialogHeader>

              <div className="py-4">
                <div className="space-y-2">
                  <Label htmlFor="driver-otp-email">Driver Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="driver-otp-email"
                      type="email"
                      placeholder="driver@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    A 6-digit code will be generated. Share it with the driver verbally or via secure channel.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleDialogOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!email || generateOTP.isPending}>
                  {generateOTP.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-4 w-4 mr-2" />
                      Generate Code
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
