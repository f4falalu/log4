import { useWorkspaces } from '@/hooks/admin/useWorkspaces';
import { InvitationsList } from '@/components/admin/invitations/InvitationsList';
import { InviteUserDialog } from '@/components/admin/invitations/InviteUserDialog';
import { Loader2 } from 'lucide-react';

export default function AdminInvitationsPage() {
  const { data: workspaces = [], isLoading } = useWorkspaces();
  const primaryWorkspace = workspaces[0];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!primaryWorkspace) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No workspace found. Create a workspace first.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Invitations</h1>
          <p className="text-muted-foreground">
            Track and manage user invitations sent from your workspace.
          </p>
        </div>
        <InviteUserDialog
          workspaceId={primaryWorkspace.id}
          workspaceName={primaryWorkspace.name}
        />
      </div>

      <InvitationsList workspaceId={primaryWorkspace.id} />
    </div>
  );
}
