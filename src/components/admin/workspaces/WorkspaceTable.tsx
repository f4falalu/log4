import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users } from 'lucide-react';
import { useWorkspaces, Workspace } from '@/hooks/admin/useWorkspaces';

export function WorkspaceTable() {
  const navigate = useNavigate();
  const { data: workspaces = [], isLoading } = useWorkspaces();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (workspaces.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <p className="text-muted-foreground">No workspaces found</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Members</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {workspaces.map((workspace: Workspace) => (
            <TableRow
              key={workspace.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => navigate(`/admin/workspaces/${workspace.id}`)}
            >
              <TableCell className="font-medium">{workspace.name}</TableCell>
              <TableCell className="font-mono text-sm">/{workspace.slug}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  {workspace.member_count}
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant={workspace.is_active ? 'default' : 'secondary'}
                  className={workspace.is_active ? 'bg-green-500/10 text-green-600' : ''}
                >
                  {workspace.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell>{new Date(workspace.created_at).toLocaleDateString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
