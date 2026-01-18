import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WorkspaceTable } from '@/components/admin/workspaces/WorkspaceTable';

export default function WorkspacesPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Workspace Management</h1>
        <p className="text-muted-foreground">
          Manage workspaces and their members
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Workspaces</CardTitle>
          <CardDescription>
            View and manage all workspaces in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkspaceTable />
        </CardContent>
      </Card>
    </div>
  );
}
