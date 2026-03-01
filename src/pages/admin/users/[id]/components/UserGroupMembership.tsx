import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, X, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useGroups,
  useUserGroups,
  useAddGroupMember,
  useRemoveGroupMember,
} from '@/hooks/rbac';

interface UserGroupMembershipProps {
  userId: string;
}

export function UserGroupMembership({ userId }: UserGroupMembershipProps) {
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const { toast } = useToast();

  const { data: allGroups, isLoading: groupsLoading } = useGroups();
  const { data: userGroups, isLoading: userGroupsLoading } = useUserGroups(userId);
  const addMember = useAddGroupMember();
  const removeMember = useRemoveGroupMember();

  const handleAdd = async () => {
    if (!selectedGroupId) return;

    try {
      await addMember.mutateAsync({ groupId: selectedGroupId, userId });
      setSelectedGroupId('');
      toast({ title: 'Added to group' });
    } catch (error) {
      toast({
        title: 'Error adding to group',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleRemove = async (membershipId: string, groupId: string) => {
    try {
      await removeMember.mutateAsync({ membershipId, groupId, userId });
      toast({ title: 'Removed from group' });
    } catch (error) {
      toast({
        title: 'Error removing from group',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  if (groupsLoading || userGroupsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Group Membership</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const memberGroupIds = new Set(userGroups?.map((g) => g.group_id) || []);
  const availableGroups = allGroups?.filter((g) => !memberGroupIds.has(g.id)) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Group Membership</CardTitle>
        <CardDescription>
          Groups provide shared permissions to all members. Permissions from groups are not individually editable.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current groups */}
        {userGroups && userGroups.length > 0 ? (
          <div className="space-y-2">
            {userGroups.map((group) => (
              <div
                key={group.membership_id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{group.name}</p>
                    {group.description && (
                      <p className="text-sm text-muted-foreground">{group.description}</p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(group.membership_id, group.group_id)}
                  disabled={removeMember.isPending}
                >
                  {removeMember.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 border rounded-lg border-dashed">
            <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Not a member of any groups</p>
          </div>
        )}

        {/* Add to group */}
        {availableGroups.length > 0 && (
          <div className="flex gap-2 pt-2">
            <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Add to group..." />
              </SelectTrigger>
              <SelectContent>
                {availableGroups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    <div>
                      <span className="font-medium">{group.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {group.member_count} members, {group.permission_count} permissions
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAdd}
              disabled={!selectedGroupId || addMember.isPending}
            >
              {addMember.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
