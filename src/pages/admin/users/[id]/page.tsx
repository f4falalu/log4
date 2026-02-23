import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Edit, User, Shield, Lock, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserRoles } from '@/hooks/rbac';
import { UserRoleAssignment } from './components/UserRoleAssignment';
import { UserPermissionSetsManagement } from './components/UserPermissionSetsManagement';
import { UserScopeBindingsEditor } from './components/UserScopeBindingsEditor';
import { UserAuditHistory } from './components/UserAuditHistory';

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
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch user's current role from new RBAC system
  const { data: userRoles } = useUserRoles(id);
  const currentRole = userRoles?.[0] || null;

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
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/users')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{profile.full_name || profile.email}</h1>
            <p className="text-muted-foreground">User Management</p>
          </div>
        </div>
        <Button onClick={() => navigate(`/admin/users/${id}/edit`)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Profile
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Roles & Permissions
          </TabsTrigger>
          <TabsTrigger value="scopes" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Scope Bindings
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Audit History
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

        {/* Roles & Permissions Tab */}
        <TabsContent value="permissions" className="space-y-4">
          <UserRoleAssignment userId={id!} currentRole={currentRole} />
          <UserPermissionSetsManagement userId={id!} />
        </TabsContent>

        {/* Scope Bindings Tab */}
        <TabsContent value="scopes">
          <UserScopeBindingsEditor userId={id!} />
        </TabsContent>

        {/* Audit History Tab */}
        <TabsContent value="audit">
          <UserAuditHistory userId={id!} userName={profile.full_name || profile.email} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
