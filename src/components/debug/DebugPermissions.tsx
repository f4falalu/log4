import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAbilityContext } from '@/rbac/AbilityProvider';

export function DebugPermissions() {
  const { user } = useAuth();
  const { workspaceId, workspace } = useWorkspace();
  const ability = useAbilityContext();

  if (!user) {
    return <div>Not logged in</div>;
  }

  return (
    <div className="p-4 bg-yellow-100 border border-yellow-300 rounded">
      <h3 className="font-bold mb-2">Debug Info:</h3>
      <div className="text-sm space-y-1">
        <div><strong>User ID:</strong> {user.id}</div>
        <div><strong>Email:</strong> {user.email}</div>
        <div><strong>Workspace ID:</strong> {workspaceId || 'None'}</div>
        <div><strong>Current Workspace:</strong> {workspace}</div>
        <div><strong>Role:</strong> {ability.role || 'None'}</div>
        <div><strong>Loading:</strong> {ability.isLoading ? 'Yes' : 'No'}</div>
        <div><strong>Can admin.users:</strong> {ability.can('admin.users') ? 'Yes' : 'No'}</div>
        <div><strong>Permissions:</strong> {ability.permissions.join(', ') || 'None'}</div>
      </div>
    </div>
  );
}
