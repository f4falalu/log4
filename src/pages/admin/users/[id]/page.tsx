import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Edit, User, Shield, Key, Lock, Bell, Building2, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserRoles, useRoles, useUserGroups, type Role } from '@/hooks/rbac';
import { UserRoleAssignment } from './components/UserRoleAssignment';
import { UserPermissionSetsManagement } from './components/UserPermissionSetsManagement';
import { UserPermissionsEditor } from './components/UserPermissionsEditor';
import { UserScopeBindingsEditor } from './components/UserScopeBindingsEditor';
import { UserNotificationPreferences } from './components/UserNotificationPreferences';
import { UserLoginRights } from './components/UserLoginRights';
import { UserAuditHistory } from './components/UserAuditHistory';
import { CopyPermissionsDialog } from './components/CopyPermissionsDialog';
import { UserGroupMembership } from './components/UserGroupMembership';

export default function UserDetailPageEnhanced() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');

  // Fetch user profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['user-profile', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_users_view')
        .select('*')
        .eq('id', id!)
        .limit(1)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch user's current roles from RBAC system
  const { data: userRoles } = useUserRoles(id);
  const { data: allRoles } = useRoles();

  // Resolve the full Role object from role_code
  const currentRoleCode = userRoles?.[0]?.role_code;
  const currentRole: Role | null = currentRoleCode && allRoles
    ? allRoles.find((r) => r.code === currentRoleCode) || null
    : null;

  if (profileLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading User</CardTitle>
            <CardDescription>Failed to load user details</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/members')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{profile.full_name || profile.email}</h1>
            <p className="text-muted-foreground">User Management</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CopyPermissionsDialog
            targetUserId={id!}
            targetUserName={profile.full_name || profile.email}
          />
          <Button onClick={() => navigate(`/admin/users/${id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="profile" className="flex items-center gap-1.5 text-xs">
            <User className="h-3.5 w-3.5" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-1.5 text-xs">
            <Shield className="h-3.5 w-3.5" />
            Role & Group
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-1.5 text-xs">
            <Key className="h-3.5 w-3.5" />
            Permissions
          </TabsTrigger>
          <TabsTrigger value="scopes" className="flex items-center gap-1.5 text-xs">
            <Lock className="h-3.5 w-3.5" />
            Scopes
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-1.5 text-xs">
            <Bell className="h-3.5 w-3.5" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="login-rights" className="flex items-center gap-1.5 text-xs">
            <Building2 className="h-3.5 w-3.5" />
            Login Rights
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" />
            Audit
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                  <p className="text-base">{profile.full_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-base">{profile.email}</p>
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
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Last Sign In</p>
                  <p className="text-base">
                    {profile.last_sign_in_at
                      ? new Date(profile.last_sign_in_at).toLocaleString()
                      : 'Never'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Roles Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Current Roles</CardTitle>
              <CardDescription>Active roles assigned to this user</CardDescription>
            </CardHeader>
            <CardContent>
              {profile.roles && profile.roles.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.roles.map((roleCode: string) => (
                    <Badge key={roleCode} variant="secondary">
                      {roleCode.replace(/_/g, ' ').toUpperCase()}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No roles assigned</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Role & Group Tab */}
        <TabsContent value="roles" className="space-y-4">
          <UserRoleAssignment userId={id!} currentRole={currentRole} />
          <UserGroupMembership userId={id!} />
          <UserPermissionSetsManagement userId={id!} />
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions">
          <UserPermissionsEditor userId={id!} />
        </TabsContent>

        {/* Scope Bindings Tab */}
        <TabsContent value="scopes">
          <UserScopeBindingsEditor userId={id!} />
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <UserNotificationPreferences userId={id!} />
        </TabsContent>

        {/* Login Rights Tab */}
        <TabsContent value="login-rights">
          <UserLoginRights userId={id!} />
        </TabsContent>

        {/* Audit History Tab */}
        <TabsContent value="audit">
          <UserAuditHistory userId={id!} userName={profile.full_name || profile.email} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
