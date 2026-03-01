import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGroups, useIsSystemAdmin } from '@/hooks/rbac';
import { GroupList } from './components/GroupList';
import { GroupDetail } from './components/GroupDetail';
import { CreateGroupDialog } from './components/CreateGroupDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

export default function GroupsPage() {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const isAdmin = useIsSystemAdmin();
  const { data: groups, isLoading } = useGroups();

  // Auto-select first group
  if (!selectedGroupId && groups && groups.length > 0) {
    setSelectedGroupId(groups[0].id);
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertDescription>
            You do not have permission to manage groups.
            Only system administrators can access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">User Groups</h1>
            <p className="text-muted-foreground mt-2">
              Manage groups of users with shared permissions
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Group
          </Button>
        </div>
      </div>

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
          <div className="col-span-3">
            <GroupList
              groups={groups || []}
              selectedGroupId={selectedGroupId}
              onSelectGroup={setSelectedGroupId}
            />
          </div>
          <div className="col-span-9">
            {selectedGroupId ? (
              <GroupDetail groupId={selectedGroupId} />
            ) : (
              <div className="rounded-lg border border-dashed p-12 text-center">
                <p className="text-muted-foreground">
                  {groups && groups.length > 0
                    ? 'Select a group from the list to view and manage it'
                    : 'Create a group to get started'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <CreateGroupDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={(groupId) => {
          setSelectedGroupId(groupId);
          setShowCreateDialog(false);
        }}
      />
    </div>
  );
}
