import { useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useWorkspaceMembersV2, type WorkspaceMemberV2 } from '@/hooks/settings/useWorkspaceMembers';
import { MemberSelector } from '@/components/settings/access-control/MemberSelector';
import { PermissionEditor } from '@/components/settings/access-control/PermissionEditor';
import { Loader2, Shield } from 'lucide-react';

export default function SettingsAccessControlPage() {
  const { workspaceId } = useWorkspace();
  const { data: members = [], isLoading } = useWorkspaceMembersV2(workspaceId);
  const [selectedMember, setSelectedMember] = useState<WorkspaceMemberV2 | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Access Control</h1>
        <p className="text-muted-foreground">
          Manage per-user permission overrides on top of role-based defaults.
        </p>
      </div>

      <div className="grid grid-cols-[280px_1fr] gap-6">
        {/* Left: Member Selector */}
        <MemberSelector
          members={members}
          selectedUserId={selectedMember?.user_id || null}
          onSelect={setSelectedMember}
        />

        {/* Right: Permission Editor */}
        <div className="border rounded-lg p-4 min-h-[500px]">
          {selectedMember && workspaceId ? (
            <PermissionEditor
              workspaceId={workspaceId}
              member={selectedMember}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Shield className="h-12 w-12 mb-3 opacity-20" />
              <p className="font-medium">Select a member</p>
              <p className="text-sm">Choose a member from the list to view and edit their permissions.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
