import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, X, Building2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UserLoginRightsProps {
  userId: string;
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
};

const ROLE_VARIANTS: Record<string, 'destructive' | 'default' | 'secondary' | 'outline'> = {
  owner: 'destructive',
  admin: 'default',
  member: 'secondary',
  viewer: 'outline',
};

export function UserLoginRights({ userId }: UserLoginRightsProps) {
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('member');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user's current workspace memberships
  const { data: memberships, isLoading: membershipsLoading } = useQuery({
    queryKey: ['user-workspace-memberships', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_members')
        .select(`
          workspace_id,
          role,
          joined_at,
          workspaces (
            id,
            name,
            slug,
            is_active
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;
      return (data || []).map((m: any) => ({
        workspace_id: m.workspace_id,
        role: m.role,
        joined_at: m.joined_at,
        workspace: m.workspaces,
      }));
    },
    enabled: !!userId,
  });

  // Get all available workspaces
  const { data: allWorkspaces, isLoading: workspacesLoading } = useQuery({
    queryKey: ['all-workspaces'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspaces')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    },
  });

  // Add membership
  const addMembership = useMutation({
    mutationFn: async ({ workspaceId, role }: { workspaceId: string; role: string }) => {
      const { error } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspaceId,
          user_id: userId,
          role,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-workspace-memberships', userId] });
      setSelectedWorkspaceId('');
      toast({ title: 'Workspace access granted' });
    },
    onError: (error) => {
      toast({
        title: 'Error adding workspace access',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  // Update role
  const updateRole = useMutation({
    mutationFn: async ({ workspaceId, role }: { workspaceId: string; role: string }) => {
      const { error } = await supabase
        .from('workspace_members')
        .update({ role })
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-workspace-memberships', userId] });
      toast({ title: 'Workspace role updated' });
    },
    onError: (error) => {
      toast({
        title: 'Error updating role',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  // Remove membership
  const removeMembership = useMutation({
    mutationFn: async (workspaceId: string) => {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-workspace-memberships', userId] });
      toast({ title: 'Workspace access removed' });
    },
    onError: (error) => {
      toast({
        title: 'Error removing workspace access',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  if (membershipsLoading || workspacesLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Login Rights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const memberWorkspaceIds = new Set(memberships?.map((m) => m.workspace_id) || []);
  const availableWorkspaces = allWorkspaces?.filter((ws) => !memberWorkspaceIds.has(ws.id)) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Login Rights</CardTitle>
        <CardDescription>
          Control which workspaces this user can access and their role in each
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current memberships */}
        <div className="space-y-2">
          {memberships && memberships.length > 0 ? (
            memberships.map((membership) => (
              <div
                key={membership.workspace_id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{membership.workspace?.name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">
                      Joined {new Date(membership.joined_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={membership.role}
                    onValueChange={(role) =>
                      updateRole.mutate({ workspaceId: membership.workspace_id, role })
                    }
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMembership.mutate(membership.workspace_id)}
                    disabled={removeMembership.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 border rounded-lg border-dashed">
              <Building2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No workspace access</p>
            </div>
          )}
        </div>

        {/* Add workspace */}
        {availableWorkspaces.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <p className="text-sm font-medium">Grant Workspace Access</p>
            <div className="flex gap-2">
              <Select value={selectedWorkspaceId} onValueChange={setSelectedWorkspaceId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select workspace..." />
                </SelectTrigger>
                <SelectContent>
                  {availableWorkspaces.map((ws) => (
                    <SelectItem key={ws.id} value={ws.id}>
                      {ws.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() =>
                  addMembership.mutate({
                    workspaceId: selectedWorkspaceId,
                    role: selectedRole,
                  })
                }
                disabled={!selectedWorkspaceId || addMembership.isPending}
              >
                {addMembership.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
