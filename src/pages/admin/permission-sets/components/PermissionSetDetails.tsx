import { useState } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle, Search, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  usePermissionSet,
  usePermissionsCatalogByCategory,
  useUpdatePermissionSetPermissions,
  useDeactivatePermissionSet,
  PERMISSION_CATEGORIES,
} from '@/hooks/rbac';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface PermissionSetDetailsProps {
  permissionSetId: string;
}

export function PermissionSetDetails({ permissionSetId }: PermissionSetDetailsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(Object.keys(PERMISSION_CATEGORIES))
  );

  const { toast } = useToast();
  const { data: permissionSet, isLoading } = usePermissionSet(permissionSetId);
  const { data: permissionsByCategory } = usePermissionsCatalogByCategory();
  const updatePermissions = useUpdatePermissionSetPermissions();
  const deactivateSet = useDeactivatePermissionSet();

  const setPermissionIds = new Set(permissionSet?.permissions.map((p) => p.id) || []);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const togglePermission = async (permissionId: string, currentlyAssigned: boolean) => {
    const newPermissionIds = new Set(setPermissionIds);

    if (currentlyAssigned) {
      newPermissionIds.delete(permissionId);
    } else {
      newPermissionIds.add(permissionId);
    }

    try {
      await updatePermissions.mutateAsync({
        permissionSetId,
        permissionIds: Array.from(newPermissionIds),
      });

      toast({
        title: 'Permissions updated',
        description: `Permission ${currentlyAssigned ? 'removed from' : 'added to'} set`,
      });
    } catch (error) {
      toast({
        title: 'Error updating permissions',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleDeactivate = async () => {
    try {
      await deactivateSet.mutateAsync(permissionSetId);

      toast({
        title: 'Permission set deactivated',
        description: 'The permission set has been deactivated',
      });
    } catch (error) {
      toast({
        title: 'Error deactivating permission set',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[500px]" />
        </CardContent>
      </Card>
    );
  }

  if (!permissionSet || !permissionsByCategory) {
    return null;
  }

  // Filter permissions by search query
  const filteredCategories = Object.entries(permissionsByCategory).reduce(
    (acc, [category, permissions]) => {
      if (!searchQuery) {
        acc[category] = permissions;
        return acc;
      }

      const filtered = permissions.filter(
        (p) =>
          p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description.toLowerCase().includes(searchQuery.toLowerCase())
      );

      if (filtered.length > 0) {
        acc[category] = filtered;
      }

      return acc;
    },
    {} as Record<string, typeof permissionsByCategory[string]>
  );

  const totalPermissions = Object.values(permissionsByCategory).flat().length;
  const assignedCount = setPermissionIds.size;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle>{permissionSet.name}</CardTitle>
            <CardDescription className="mt-1.5">
              {permissionSet.description || 'No description'}
            </CardDescription>
            <code className="text-xs text-muted-foreground mt-2 block">
              {permissionSet.code}
            </code>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {assignedCount} / {totalPermissions} permissions
            </Badge>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Deactivate
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Deactivate Permission Set?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will deactivate the "{permissionSet.name}" permission set. Users will no
                    longer receive permissions from this set. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeactivate} className="bg-destructive">
                    Deactivate
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search permissions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {Object.entries(filteredCategories).map(([category, permissions]) => {
            const meta = PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES];
            const isExpanded = expandedCategories.has(category);
            const categoryAssignedCount = permissions.filter((p) =>
              setPermissionIds.has(p.id)
            ).length;

            return (
              <div key={category} className="border rounded-lg">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{meta.label}</span>
                        <Badge variant="outline" className="text-xs">
                          {categoryAssignedCount} / {permissions.length}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>
                    </div>
                  </div>
                </button>

                {/* Permissions List */}
                {isExpanded && (
                  <div className="border-t">
                    <div className="p-2 space-y-1">
                      {permissions.map((permission) => {
                        const isAssigned = setPermissionIds.has(permission.id);

                        return (
                          <div
                            key={permission.id}
                            className={cn(
                              'flex items-start gap-3 p-3 rounded-md hover:bg-accent transition-colors',
                              isAssigned && 'bg-accent/50'
                            )}
                          >
                            <Checkbox
                              checked={isAssigned}
                              onCheckedChange={() => togglePermission(permission.id, isAssigned)}
                              disabled={updatePermissions.isPending}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                                  {permission.code}
                                </code>
                                {permission.is_dangerous && (
                                  <Badge variant="destructive" className="text-xs gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    Dangerous
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {permission.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {Object.keys(filteredCategories).length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>No permissions found matching "{searchQuery}"</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
