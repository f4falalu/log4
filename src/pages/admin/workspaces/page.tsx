import { WorkspaceTable } from '@/components/admin/workspaces/WorkspaceTable';

export default function WorkspacesPage() {
  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Permissions</h1>
        <p className="text-muted-foreground">
          Manage workspaces, roles, and access control permissions.
        </p>
      </div>

      <div className="border rounded-lg bg-card">
        <WorkspaceTable />
      </div>
    </div>
  );
}
