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
import { Loader2, Shield, Crown, Truck, User as UserIcon, Eye } from 'lucide-react';
import { useRoles, useAssignRole, useRemoveRole, type Role } from '@/hooks/rbac';
import { useToast } from '@/hooks/use-toast';

interface UserRoleAssignmentProps {
  userId: string;
  currentRole: Role | null;
}

const ROLE_ICONS = {
  system_admin: Crown,
  operations_user: Shield,
  fleetops_user: Truck,
  driver: UserIcon,
  viewer: Eye,
};

const ROLE_COLORS = {
  system_admin: 'destructive',
  operations_user: 'default',
  fleetops_user: 'secondary',
  driver: 'outline',
  viewer: 'outline',
} as const;

export function UserRoleAssignment({ userId, currentRole }: UserRoleAssignmentProps) {
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(currentRole?.id || null);
  const { toast } = useToast();
  const { data: roles, isLoading } = useRoles();
  const assignRole = useAssignRole();
  const removeRole = useRemoveRole();

  const handleAssignRole = async () => {
    if (!selectedRoleId) return;

    try {
      await assignRole.mutateAsync({ userId, roleId: selectedRoleId });
      toast({
        title: 'Role assigned',
        description: 'User role has been updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error assigning role',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveRole = async () => {
    if (!currentRole) return;

    try {
      await removeRole.mutateAsync({ userId, roleId: currentRole.id });
      setSelectedRoleId(null);
      toast({
        title: 'Role removed',
        description: 'User role has been removed successfully',
      });
    } catch (error) {
      toast({
        title: 'Error removing role',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Role Assignment</CardTitle>
          <CardDescription>Assign a primary role to this user</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const Icon = currentRole ? ROLE_ICONS[currentRole.code as keyof typeof ROLE_ICONS] || Shield : Shield;
  const hasChanges = selectedRoleId !== currentRole?.id;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Role Assignment</CardTitle>
        <CardDescription>
          Assign a primary role that defines the user's base permissions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Role */}
        {currentRole && (
          <div className="p-4 border rounded-lg bg-accent/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5" />
                <div>
                  <p className="font-medium">{currentRole.name}</p>
                  <p className="text-sm text-muted-foreground">{currentRole.description}</p>
                </div>
              </div>
              <Badge variant={ROLE_COLORS[currentRole.code as keyof typeof ROLE_COLORS] || 'default'}>
                Current
              </Badge>
            </div>
          </div>
        )}

        {/* Role Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Role</label>
          <Select value={selectedRoleId || undefined} onValueChange={setSelectedRoleId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a role..." />
            </SelectTrigger>
            <SelectContent>
              {roles?.map((role) => {
                const RoleIcon = ROLE_ICONS[role.code as keyof typeof ROLE_ICONS] || Shield;
                return (
                  <SelectItem key={role.id} value={role.id}>
                    <div className="flex items-center gap-2">
                      <RoleIcon className="h-4 w-4" />
                      <span>{role.name}</span>
                      {role.is_system_role && (
                        <Badge variant="outline" className="text-xs ml-2">
                          System
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            onClick={handleAssignRole}
            disabled={!selectedRoleId || !hasChanges || assignRole.isPending}
            className="flex-1"
          >
            {assignRole.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Assigning...
              </>
            ) : (
              'Assign Role'
            )}
          </Button>
          {currentRole && (
            <Button
              variant="outline"
              onClick={handleRemoveRole}
              disabled={removeRole.isPending}
            >
              {removeRole.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Remove Role'
              )}
            </Button>
          )}
        </div>

        {/* Info */}
        {selectedRoleId && roles && (
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm text-muted-foreground">
              {roles.find((r) => r.id === selectedRoleId)?.description || 'No description'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
