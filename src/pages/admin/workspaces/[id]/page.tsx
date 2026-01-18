import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, UserPlus } from 'lucide-react';
import { useWorkspaceDetail, useUpdateWorkspace } from '@/hooks/admin/useWorkspaces';
import { MemberList } from '@/components/admin/workspaces/MemberList';
import { AddMemberDialog } from '@/components/admin/workspaces/AddMemberDialog';
import { useState } from 'react';

export default function WorkspaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useWorkspaceDetail(id!);
  const updateWorkspace = useUpdateWorkspace();
  const [showAddMember, setShowAddMember] = useState(false);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Workspace</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : 'Failed to load workspace details'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { workspace, members } = data;

  const handleToggleActive = () => {
    updateWorkspace.mutate({
      workspaceId: id!,
      is_active: !workspace.is_active,
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/workspaces')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{workspace.name}</h1>
              <Badge
                variant={workspace.is_active ? 'default' : 'secondary'}
                className={workspace.is_active ? 'bg-green-500/10 text-green-600' : ''}
              >
                {workspace.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-muted-foreground font-mono">/{workspace.slug}</p>
          </div>
        </div>
        <Button onClick={() => setShowAddMember(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Member
        </Button>
      </div>

      {/* Workspace Info */}
      <Card>
        <CardHeader>
          <CardTitle>Workspace Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Description</p>
              <p className="text-base">{workspace.description || 'No description'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Workspace ID</p>
              <p className="text-base font-mono text-xs">{workspace.id}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Created</p>
              <p className="text-base">{new Date(workspace.created_at).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
              <p className="text-base">{new Date(workspace.updated_at).toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-4 border-t">
            <Switch
              id="is_active"
              checked={workspace.is_active}
              onCheckedChange={handleToggleActive}
              disabled={updateWorkspace.isPending}
            />
            <Label htmlFor="is_active">Workspace Active</Label>
          </div>
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle>Members ({members.length})</CardTitle>
          <CardDescription>Users who belong to this workspace</CardDescription>
        </CardHeader>
        <CardContent>
          <MemberList workspaceId={id!} members={members} />
        </CardContent>
      </Card>

      <AddMemberDialog
        workspaceId={id!}
        existingMemberIds={members.map((m) => m.user_id)}
        open={showAddMember}
        onOpenChange={setShowAddMember}
      />
    </div>
  );
}
