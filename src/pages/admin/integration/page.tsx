import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, Link2, Clock, Users } from 'lucide-react';
import {
  LinkedUsersTable,
  LinkByEmailDialog,
  GenerateOTPDialog,
} from '@/components/admin/integration';
import { useLinkedUsers, usePendingOTPs } from '@/hooks/admin/useIntegration';

export default function AdminIntegrationPage() {
  // Get workspace ID for dialogs
  const { data: workspaceId } = useQuery({
    queryKey: ['admin-current-workspace-id'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: membership } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (membership) return membership.workspace_id as string;

      // Fallback: first active workspace
      const { data: ws } = await supabase
        .from('workspaces')
        .select('id')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      return ws?.id as string | null;
    },
    retry: 1,
  });

  const { data: links = [] } = useLinkedUsers();
  const { data: pendingOTPs = [] } = usePendingOTPs();

  const activeLinks = links.filter((l) => l.status === 'active').length;

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Mod4 Integration</h1>
        <p className="text-muted-foreground">
          Link users to the Mod4 driver execution system via email or OTP.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Link2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Links</p>
                <p className="text-2xl font-bold">{links.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/10">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Drivers</p>
                <p className="text-2xl font-bold">{activeLinks}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending OTPs</p>
                <p className="text-2xl font-bold">{pendingOTPs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {workspaceId && (
          <>
            <LinkByEmailDialog workspaceId={workspaceId} />
            <GenerateOTPDialog workspaceId={workspaceId} />
          </>
        )}
      </div>

      {/* Linked Users Table */}
      <div>
        <h2 className="text-lg font-medium mb-3">Linked Users</h2>
        <div className="border rounded-lg bg-card">
          <LinkedUsersTable />
        </div>
      </div>

      {/* Pending OTPs */}
      {pendingOTPs.length > 0 && (
        <div>
          <h2 className="text-lg font-medium mb-3">Pending OTP Codes</h2>
          <div className="border rounded-lg bg-card divide-y">
            {pendingOTPs.map((otp) => {
              const expiresAt = new Date(otp.expires_at);
              const isExpired = expiresAt < new Date();
              const minutesLeft = Math.max(
                0,
                Math.round((expiresAt.getTime() - Date.now()) / 60000)
              );

              return (
                <div key={otp.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{otp.target_email}</p>
                    <p className="text-sm text-muted-foreground">
                      Code: <span className="font-mono font-bold">{otp.otp_code}</span>
                      {' · '}
                      Attempts: {otp.attempts}/{otp.max_attempts}
                    </p>
                  </div>
                  <div className="text-right">
                    {isExpired ? (
                      <Badge variant="secondary" className="bg-red-500/10 text-red-600">
                        Expired
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-amber-500/10 text-amber-600">
                        {minutesLeft}m remaining
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
