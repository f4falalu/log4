import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Edit } from 'lucide-react';
import { useUserDetail, useAssignRole, useRemoveRole } from '@/hooks/admin/useUserDetail';
import { RoleSelector } from '@/components/admin/users/RoleSelector';
import { AppRole } from '@/types';
import { Badge } from '@/components/ui/badge';

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useUserDetail(id!);
  const assignRole = useAssignRole();
  const removeRole = useRemoveRole();

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
            <CardTitle className="text-destructive">Error Loading User</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : 'Failed to load user details'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { profile, roles, workspaces } = data;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/users')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{profile.full_name}</h1>
            <p className="text-muted-foreground">User Details</p>
          </div>
        </div>
        <Button onClick={() => navigate(`/admin/users/${id}/edit`)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Profile
        </Button>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Full Name</p>
              <p className="text-base">{profile.full_name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Phone</p>
              <p className="text-base">{profile.phone || '-'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">User ID</p>
              <p className="text-base font-mono text-xs">{profile.id}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Created</p>
              <p className="text-base">{new Date(profile.created_at).toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Roles */}
      <Card>
        <CardHeader>
          <CardTitle>App Roles</CardTitle>
          <CardDescription>Manage user's application-level roles</CardDescription>
        </CardHeader>
        <CardContent>
          <RoleSelector
            roles={roles.map((r) => r.role)}
            onAddRole={(role: AppRole) => assignRole.mutate({ userId: id!, role })}
            onRemoveRole={(role: AppRole) => removeRole.mutate({ userId: id!, role })}
            disabled={assignRole.isPending || removeRole.isPending}
          />
        </CardContent>
      </Card>

      {/* Workspaces */}
      <Card>
        <CardHeader>
          <CardTitle>Workspace Memberships</CardTitle>
          <CardDescription>Workspaces this user belongs to</CardDescription>
        </CardHeader>
        <CardContent>
          {workspaces.length === 0 ? (
            <p className="text-sm text-muted-foreground">Not a member of any workspaces</p>
          ) : (
            <div className="space-y-2">
              {workspaces.map((ws: any) => (
                <div
                  key={ws.workspace_id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{ws.workspaces.name}</p>
                    <p className="text-sm text-muted-foreground">/{ws.workspaces.slug}</p>
                  </div>
                  <Badge variant="secondary">{ws.role}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
