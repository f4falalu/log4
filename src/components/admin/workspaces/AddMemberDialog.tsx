import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Search } from 'lucide-react';
import { useUsers, User } from '@/hooks/admin/useUsers';
import { useAddWorkspaceMember } from '@/hooks/admin/useWorkspaces';

interface AddMemberDialogProps {
  workspaceId: string;
  existingMemberIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddMemberDialog({
  workspaceId,
  existingMemberIds,
  open,
  onOpenChange,
}: AddMemberDialogProps) {
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<'owner' | 'admin' | 'member' | 'viewer'>('member');
  const { data: users = [], isLoading } = useUsers({ search });
  const addMember = useAddWorkspaceMember();

  const availableUsers = users.filter((u: User) => !existingMemberIds.includes(u.user_id));
  const selectedUser = users.find((u: User) => u.user_id === selectedUserId);

  const handleAdd = async () => {
    if (!selectedUserId) return;

    await addMember.mutateAsync({
      workspaceId,
      userId: selectedUserId,
      role: selectedRole,
    });

    setSelectedUserId(null);
    setSearch('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Member</DialogTitle>
          <DialogDescription>
            Search for a user and add them to this workspace
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Search Users</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : availableUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {search ? 'No users found' : 'Start typing to search users'}
            </p>
          ) : (
            <div className="max-h-48 overflow-auto border rounded-lg divide-y">
              {availableUsers.slice(0, 10).map((user: User) => (
                <div
                  key={user.user_id}
                  className={`p-3 cursor-pointer hover:bg-muted/50 ${
                    selectedUserId === user.user_id ? 'bg-muted' : ''
                  }`}
                  onClick={() => setSelectedUserId(user.user_id)}
                >
                  <p className="font-medium">{user.full_name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              ))}
            </div>
          )}

          {selectedUser && (
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={selectedRole} onValueChange={(v: any) => setSelectedRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!selectedUserId || addMember.isPending}>
            {addMember.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Member
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
