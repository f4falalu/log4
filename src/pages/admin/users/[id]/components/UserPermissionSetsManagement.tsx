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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, X, Clock, AlertTriangle } from 'lucide-react';
import {
  usePermissionSets,
  useUserPermissionSets,
  useAssignPermissionSet,
  useRemovePermissionSet,
} from '@/hooks/rbac';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isBefore } from 'date-fns';

interface UserPermissionSetsManagementProps {
  userId: string;
}

export function UserPermissionSetsManagement({ userId }: UserPermissionSetsManagementProps) {
  const [selectedSetId, setSelectedSetId] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const { toast } = useToast();

  const { data: allSets, isLoading: setsLoading } = usePermissionSets();
  const { data: userSets, isLoading: userSetsLoading } = useUserPermissionSets(userId);
  const assignSet = useAssignPermissionSet();
  const removeSet = useRemovePermissionSet();

  const handleAssign = async () => {
    if (!selectedSetId) return;

    try {
      await assignSet.mutateAsync({
        userId,
        permissionSetId: selectedSetId,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });

      toast({
        title: 'Permission set assigned',
        description: 'The permission set has been granted to the user',
      });

      setSelectedSetId('');
      setExpiresAt('');
    } catch (error) {
      toast({
        title: 'Error assigning permission set',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleRemove = async (userSetId: string) => {
    try {
      await removeSet.mutateAsync({ userPermissionSetId: userSetId, userId });

      toast({
        title: 'Permission set removed',
        description: 'The permission set has been revoked from the user',
      });
    } catch (error) {
      toast({
        title: 'Error removing permission set',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  if (setsLoading || userSetsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Permission Sets</CardTitle>
          <CardDescription>Grant additional temporary permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const assignedSetIds = new Set(userSets?.map((us) => us.permission_set_id) || []);
  const availableSets = allSets?.filter((s) => !assignedSetIds.has(s.id) && s.is_active) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permission Sets</CardTitle>
        <CardDescription>
          Grant additional permissions without changing the user's primary role
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Permission Sets */}
        <div className="space-y-2">
          <Label>Active Permission Sets</Label>
          {userSets && userSets.length > 0 ? (
            <div className="space-y-2">
              {userSets.map((userSet) => {
                const set = allSets?.find((s) => s.id === userSet.permission_set_id);
                if (!set) return null;

                const isExpired =
                  userSet.expires_at && isBefore(parseISO(userSet.expires_at), new Date());
                const hasExpiration = !!userSet.expires_at;

                return (
                  <div
                    key={userSet.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{set.name}</p>
                        {isExpired && (
                          <Badge variant="destructive" className="text-xs gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Expired
                          </Badge>
                        )}
                        {hasExpiration && !isExpired && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Clock className="h-3 w-3" />
                            Temporary
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{set.description}</p>
                      {userSet.expires_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {isExpired ? 'Expired on' : 'Expires on'}{' '}
                          {format(parseISO(userSet.expires_at), 'PPP')}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(userSet.id)}
                      disabled={removeSet.isPending}
                    >
                      {removeSet.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 border rounded-lg border-dashed">
              <p className="text-sm text-muted-foreground">No permission sets assigned</p>
            </div>
          )}
        </div>

        {/* Assign New Set */}
        {availableSets.length > 0 && (
          <div className="space-y-4 pt-4 border-t">
            <Label>Assign New Permission Set</Label>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Permission Set</Label>
                <Select value={selectedSetId} onValueChange={setSelectedSetId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a permission set..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSets.map((set) => (
                      <SelectItem key={set.id} value={set.id}>
                        <div>
                          <span className="font-medium">{set.name}</span>
                          <p className="text-xs text-muted-foreground">{set.description}</p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Expiration Date (Optional)</Label>
                <Input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank for permanent assignment
                </p>
              </div>

              <Button
                onClick={handleAssign}
                disabled={!selectedSetId || assignSet.isPending}
                className="w-full"
              >
                {assignSet.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Assign Permission Set
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
