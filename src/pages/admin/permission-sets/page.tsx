import { useState } from 'react';
import { Plus, Shield, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePermissionSets, useIsSystemAdmin } from '@/hooks/rbac';
import { CreatePermissionSetDialog } from './components/CreatePermissionSetDialog';
import { PermissionSetDetails } from './components/PermissionSetDetails';
import { cn } from '@/lib/utils';

export default function PermissionSetsPage() {
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const isAdmin = useIsSystemAdmin();
  const { data: permissionSets, isLoading } = usePermissionSets();

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertDescription>
            You do not have permission to manage permission sets.
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
            <h1 className="text-3xl font-bold tracking-tight">Permission Sets</h1>
            <p className="text-muted-foreground mt-2">
              Grant additional permissions without changing user roles
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Permission Set
          </Button>
        </div>
      </div>

      {/* Info Alert */}
      <Alert className="mb-6">
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Salesforce-style permission grants:</strong> Permission sets allow you to grant
          additional permissions to users without changing their role. Perfect for temporary access
          or special privileges.
        </AlertDescription>
      </Alert>

      {/* Main Content */}
      {isLoading ? (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-4">
            <Skeleton className="h-[600px]" />
          </div>
          <div className="col-span-8">
            <Skeleton className="h-[600px]" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          {/* Left: Permission Sets List */}
          <div className="col-span-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Available Sets</CardTitle>
                <CardDescription>
                  {permissionSets?.length || 0} permission {permissionSets?.length === 1 ? 'set' : 'sets'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-2">
                <div className="space-y-2">
                  {permissionSets?.map((set) => {
                    const isSelected = set.id === selectedSetId;

                    return (
                      <button
                        key={set.id}
                        onClick={() => setSelectedSetId(set.id)}
                        className={cn(
                          'w-full text-left px-4 py-3 rounded-md transition-colors',
                          'hover:bg-accent',
                          isSelected && 'bg-accent border border-border'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{set.name}</p>
                            {set.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                {set.description}
                              </p>
                            )}
                            <code className="text-xs text-muted-foreground mt-1 block">
                              {set.code}
                            </code>
                          </div>
                          <Badge
                            variant={set.is_active ? 'default' : 'secondary'}
                            className="text-xs shrink-0"
                          >
                            {set.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </button>
                    );
                  })}

                  {permissionSets?.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <p className="text-sm">No permission sets yet</p>
                      <p className="text-xs mt-1">Create one to get started</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Permission Set Details */}
          <div className="col-span-8">
            {selectedSetId ? (
              <PermissionSetDetails permissionSetId={selectedSetId} />
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Select a permission set from the list to view and manage its permissions
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <CreatePermissionSetDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={(setId) => {
          setSelectedSetId(setId);
          setShowCreateDialog(false);
        }}
      />
    </div>
  );
}
