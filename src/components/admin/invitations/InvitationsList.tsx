/**
 * Invitations List Component
 *
 * Displays a list of pending and past invitations for a workspace.
 */

import { usePendingInvitations, useRevokeInvitation, useResendInvitation, getTimeUntilExpiry, buildInvitationUrl } from '@/hooks/useInvitations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  MoreHorizontal,
  Copy,
  RefreshCw,
  XCircle,
  Clock,
  Mail,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';
import type { PendingInvitation, WorkspaceRole } from '@/types/onboarding';

interface InvitationsListProps {
  workspaceId: string;
}

export function InvitationsList({ workspaceId }: InvitationsListProps) {
  const { data: invitations, isLoading, error } = usePendingInvitations(workspaceId);
  const revokeInvitation = useRevokeInvitation();
  const resendInvitation = useResendInvitation();

  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<PendingInvitation | null>(null);

  const handleCopyLink = async (invitation: PendingInvitation) => {
    const url = buildInvitationUrl(invitation.invitation_token);
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link Copied', {
        description: 'Invitation link copied to clipboard',
      });
    } catch {
      toast.error('Copy Failed', {
        description: 'Could not copy link to clipboard',
      });
    }
  };

  const handleResend = async (invitation: PendingInvitation) => {
    await resendInvitation.mutateAsync({
      invitationId: invitation.id,
      workspaceId: invitation.workspace_id,
      email: invitation.email,
      appRole: invitation.pre_assigned_role,
      workspaceRole: invitation.workspace_role as WorkspaceRole,
    });
  };

  const handleRevoke = async () => {
    if (!selectedInvitation) return;

    await revokeInvitation.mutateAsync({
      invitationId: selectedInvitation.id,
      workspaceId: selectedInvitation.workspace_id,
    });

    setRevokeDialogOpen(false);
    setSelectedInvitation(null);
  };

  const openRevokeDialog = (invitation: PendingInvitation) => {
    setSelectedInvitation(invitation);
    setRevokeDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
          <CardDescription>Loading invitations...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
          <CardDescription className="text-destructive">Failed to load invitations</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!invitations || invitations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
          <CardDescription>No pending invitations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Mail className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              No pending invitations. Use the &quot;Invite User&quot; button to invite team members.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
          <CardDescription>{invitations.length} invitation{invitations.length !== 1 ? 's' : ''} pending</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Invited By</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((invitation) => (
                <TableRow key={invitation.id}>
                  <TableCell className="font-medium">{invitation.email}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge variant="outline">{invitation.pre_assigned_role.replace('_', ' ')}</Badge>
                      <Badge variant="secondary" className="text-xs">
                        {invitation.workspace_role}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>{invitation.invited_by_name || 'Unknown'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className={invitation.hours_until_expiry < 24 ? 'text-warning' : ''}>
                        {getTimeUntilExpiry(invitation.expires_at)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleCopyLink(invitation)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Link
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleResend(invitation)}
                          disabled={resendInvitation.isPending}
                        >
                          {resendInvitation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                          )}
                          Resend
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => openRevokeDialog(invitation)}
                          className="text-destructive focus:text-destructive"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Revoke
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Revoke Confirmation Dialog */}
      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke the invitation sent to{' '}
              <strong>{selectedInvitation?.email}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revokeInvitation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
