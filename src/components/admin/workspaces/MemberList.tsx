import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreHorizontal, ChevronDown, Trash2 } from 'lucide-react';
import {
  WorkspaceMember,
  useRemoveWorkspaceMember,
} from '@/hooks/admin/useWorkspaces';
import {
  RBAC_ROLES,
  ROLE_LABELS,
  ROLE_COLORS,
  useUpdateMemberRoleV2,
} from '@/hooks/settings/useWorkspaceMembers';

interface MemberListProps {
  workspaceId: string;
  members: WorkspaceMember[];
}

export function MemberList({ workspaceId, members }: MemberListProps) {
  const updateRole = useUpdateMemberRoleV2();
  const removeMember = useRemoveWorkspaceMember();
  const [memberToRemove, setMemberToRemove] = useState<WorkspaceMember | null>(null);

  const handleRoleChange = (userId: string, newRole: string) => {
    updateRole.mutate({ workspaceId, userId, roleCode: newRole });
  };

  const handleRemove = () => {
    if (memberToRemove) {
      removeMember.mutate({ workspaceId, userId: memberToRemove.user_id });
      setMemberToRemove(null);
    }
  };

  if (members.length === 0) {
    return (
      <div className="text-center py-8 border rounded-lg">
        <p className="text-muted-foreground">No members in this workspace</p>
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.user_id}>
                <TableCell className="font-medium">{member.profile.full_name}</TableCell>
                <TableCell>{member.profile.phone || '-'}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 gap-1">
                        <Badge className={ROLE_COLORS[member.role] || ROLE_COLORS.viewer} variant="secondary">
                          {ROLE_LABELS[member.role] || member.role}
                        </Badge>
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {RBAC_ROLES.map((role) => (
                        <DropdownMenuItem
                          key={role}
                          onClick={() => handleRoleChange(member.user_id, role)}
                          disabled={role === member.role}
                        >
                          <Badge className={ROLE_COLORS[role]} variant="secondary">
                            {ROLE_LABELS[role]}
                          </Badge>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
                <TableCell>{new Date(member.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setMemberToRemove(member)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove Member
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {memberToRemove?.profile.full_name} from this
              workspace? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} className="bg-destructive text-destructive-foreground">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
