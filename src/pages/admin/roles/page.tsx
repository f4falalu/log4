import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRoles, useIsSystemAdmin } from '@/hooks/rbac';
import { RoleList } from './components/RoleList';
import { PermissionMatrix } from './components/PermissionMatrix';
import { CreateRoleDialog } from './components/CreateRoleDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

export default function RolesPage() {
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const isAdmin = useIsSystemAdmin();
  const { data: roles, isLoading } = useRoles();

  // Auto-select first role
  if (!selectedRoleId && roles && roles.length > 0) {
    setSelectedRoleId(roles[0].id);
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertDescription>
            You do not have permission to manage roles and permissions.
            Only system administrators can access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Roles & Permissions</h1>
            <p className="text-muted-foreground mt-2">
              Manage role definitions and permission assignments
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Role
          </Button>
        </div>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-3">
            <Skeleton className="h-[600px]" />
          </div>
          <div className="col-span-9">
            <Skeleton className="h-[600px]" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          {/* Left: Role List */}
          <div className="col-span-3">
            <RoleList
              roles={roles || []}
              selectedRoleId={selectedRoleId}
              onSelectRole={setSelectedRoleId}
            />
          </div>

          {/* Right: Permission Matrix */}
          <div className="col-span-9">
            {selectedRoleId ? (
              <PermissionMatrix roleId={selectedRoleId} />
            ) : (
              <div className="rounded-lg border border-dashed p-12 text-center">
                <p className="text-muted-foreground">
                  Select a role from the list to view and edit its permissions
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Role Dialog */}
      <CreateRoleDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={(roleId) => {
          setSelectedRoleId(roleId);
          setShowCreateDialog(false);
        }}
      />
    </div>
  );
}
