import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Users, Key, Trash2, X, Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  useGroup,
  useDeleteGroup,
  useAddGroupMember,
  useRemoveGroupMember,
  useUpdateGroupPermissions,
  usePermissionsCatalogByCategory,
  PERMISSION_CATEGORIES,
} from '@/hooks/rbac';
import { useUsers } from '@/hooks/admin/useUsers';
import { GroupPermissionMatrix } from './GroupPermissionMatrix';

interface GroupDetailProps {
  groupId: string;
}

export function GroupDetail({ groupId }: GroupDetailProps) {
  const [activeTab, setActiveTab] = useState('members');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const { toast } = useToast();

  const { data: group, isLoading } = useGroup(groupId);
  const deleteGroup = useDeleteGroup();
  const addMember = useAddGroupMember();
  const removeMember = useRemoveGroupMember();
  const { data: usersData } = useUsers();

  const handleAddMember = async () => {
    if (!selectedUserId) return;

    try {
      await addMember.mutateAsync({ groupId, userId: selectedUserId });
      setSelectedUserId('');
      toast({ title: 'Member added to group' });
    } catch (error) {
      toast({
        title: 'Error adding member',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveMember = async (membershipId: string, userId: string) => {
    try {
      await removeMember.mutateAsync({ membershipId, groupId, userId });
      toast({ title: 'Member removed from group' });
    } catch (error) {
      toast({
        title: 'Error removing member',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteGroup = async () => {
    if (!confirm('Are you sure you want to delete this group? This will remove all member associations.')) return;

    try {
      await deleteGroup.mutateAsync(groupId);
      toast({ title: 'Group deleted' });
    } catch (error) {
      toast({
        title: 'Error deleting group',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <Skeleton className="h-[600px]" />;
  }

  if (!group) return null;

  const memberUserIds = new Set(group.members.map((m) => m.user_id));
  const availableUsers = usersData?.users?.filter((u) => !memberUserIds.has(u.id)) || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{group.name}</CardTitle>
            <CardDescription className="mt-1">
              {group.description || 'No description'}
            </CardDescription>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline">
                <Users className="h-3 w-3 mr-1" />
                {group.members.length} members
              </Badge>
              <Badge variant="outline">
                <Key className="h-3 w-3 mr-1" />
                {group.permissions.length} permissions
              </Badge>
              <Badge variant="secondary" className="font-mono text-xs">
                {group.code}
              </Badge>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteGroup}
            disabled={deleteGroup.isPending}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Members
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Permissions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-4 mt-4">
            {/* Members list */}
            {group.members.length > 0 ? (
              <div className="space-y-2">
                {group.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {member.full_name || member.user_id.slice(0, 8) + '...'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Added {new Date(member.added_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(member.id, member.user_id)}
                      disabled={removeMember.isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border rounded-lg border-dashed">
                <p className="text-sm text-muted-foreground">No members yet</p>
              </div>
            )}

            {/* Add member */}
            <div className="flex gap-2">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Add member..." />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleAddMember}
                disabled={!selectedUserId || addMember.isPending}
              >
                {addMember.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="permissions" className="mt-4">
            <GroupPermissionMatrix
              groupId={groupId}
              currentPermissionIds={group.permission_ids || []}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
