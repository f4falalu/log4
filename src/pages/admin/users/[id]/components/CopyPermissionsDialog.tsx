import { useState } from 'react';
import { Copy, Loader2, Search, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useCopyPermissions } from '@/hooks/rbac';
import { useUsers } from '@/hooks/admin/useUsers';

interface CopyPermissionsDialogProps {
  targetUserId: string;
  targetUserName: string;
}

export function CopyPermissionsDialog({ targetUserId, targetUserName }: CopyPermissionsDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [copyDirect, setCopyDirect] = useState(true);
  const [copyRole, setCopyRole] = useState(false);
  const [copyGroups, setCopyGroups] = useState(false);
  const [result, setResult] = useState<{
    direct_permissions_copied: number;
    role_copied: string | null;
    groups_copied: number;
  } | null>(null);

  const { toast } = useToast();
  const copyPermissions = useCopyPermissions();
  const { data: usersData } = useUsers({ search: search || undefined });

  const users = usersData?.users?.filter((u) => u.id !== targetUserId) || [];

  const handleCopy = async () => {
    if (!selectedUserId) return;

    try {
      const res = await copyPermissions.mutateAsync({
        sourceUserId: selectedUserId,
        targetUserId,
        copyDirect,
        copyRole,
        copyGroups,
      });

      setResult(res);
      toast({
        title: 'Permissions copied',
        description: `Copied permissions to ${targetUserName}`,
      });
    } catch (error) {
      toast({
        title: 'Error copying permissions',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    setOpen(false);
    setSearch('');
    setSelectedUserId(null);
    setCopyDirect(true);
    setCopyRole(false);
    setCopyGroups(false);
    setResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Copy className="h-4 w-4 mr-2" />
          Copy From User
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Copy Permissions</DialogTitle>
          <DialogDescription>
            Copy permissions from another user to {targetUserName}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Permissions copied successfully</span>
            </div>
            <div className="space-y-2 text-sm">
              {result.direct_permissions_copied > 0 && (
                <p>{result.direct_permissions_copied} direct permissions copied</p>
              )}
              {result.role_copied && (
                <p>Role copied: <Badge variant="secondary">{result.role_copied}</Badge></p>
              )}
              {result.groups_copied > 0 && (
                <p>{result.groups_copied} group memberships copied</p>
              )}
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* User search */}
            <div className="space-y-2">
              <Label>Source User</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="max-h-48 overflow-y-auto border rounded-md">
                {users.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground text-center">No users found</p>
                ) : (
                  users.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUserId(user.id)}
                      className={`w-full text-left px-3 py-2 hover:bg-accent transition-colors flex items-center justify-between ${
                        selectedUserId === user.id ? 'bg-accent' : ''
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium">{user.full_name || user.email}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="flex gap-1">
                        {user.roles?.map((role) => (
                          <Badge key={role} variant="outline" className="text-xs">
                            {role.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Copy options */}
            <div className="space-y-3">
              <Label>What to copy</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="copy-direct"
                    checked={copyDirect}
                    onCheckedChange={(v) => setCopyDirect(v === true)}
                  />
                  <label htmlFor="copy-direct" className="text-sm">
                    Direct permissions
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="copy-role"
                    checked={copyRole}
                    onCheckedChange={(v) => setCopyRole(v === true)}
                  />
                  <label htmlFor="copy-role" className="text-sm">
                    Role assignment
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="copy-groups"
                    checked={copyGroups}
                    onCheckedChange={(v) => setCopyGroups(v === true)}
                  />
                  <label htmlFor="copy-groups" className="text-sm">
                    Group memberships
                  </label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleCopy}
                disabled={!selectedUserId || (!copyDirect && !copyRole && !copyGroups) || copyPermissions.isPending}
              >
                {copyPermissions.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Copying...
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Permissions
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
