import { useState } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  usePermissionsCatalogByCategory,
  useUpdateGroupPermissions,
  PERMISSION_CATEGORIES,
} from '@/hooks/rbac';

interface GroupPermissionMatrixProps {
  groupId: string;
  currentPermissionIds: string[];
}

export function GroupPermissionMatrix({ groupId, currentPermissionIds }: GroupPermissionMatrixProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(Object.keys(PERMISSION_CATEGORIES))
  );

  const { toast } = useToast();
  const { data: permissionsByCategory, isLoading } = usePermissionsCatalogByCategory();
  const updatePermissions = useUpdateGroupPermissions();

  const permissionIds = new Set(currentPermissionIds);

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
    const newIds = new Set(permissionIds);
    if (currentlyAssigned) {
      newIds.delete(permissionId);
    } else {
      newIds.add(permissionId);
    }

    try {
      await updatePermissions.mutateAsync({
        groupId,
        permissionIds: Array.from(newIds),
      });
      toast({
        title: 'Group permissions updated',
        description: `Permission ${currentlyAssigned ? 'removed from' : 'added to'} group`,
      });
    } catch (error) {
      toast({
        title: 'Error updating permissions',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const selectAllInCategory = async (category: string) => {
    const categoryPerms = permissionsByCategory?.[category] || [];
    const newIds = new Set(permissionIds);
    categoryPerms.forEach((p) => newIds.add(p.id));

    try {
      await updatePermissions.mutateAsync({
        groupId,
        permissionIds: Array.from(newIds),
      });
      toast({ title: 'Category permissions added' });
    } catch (error) {
      toast({ title: 'Error', description: String(error), variant: 'destructive' });
    }
  };

  const clearCategory = async (category: string) => {
    const categoryPerms = permissionsByCategory?.[category] || [];
    const categoryIds = new Set(categoryPerms.map((p) => p.id));
    const newIds = new Set(Array.from(permissionIds).filter((id) => !categoryIds.has(id)));

    try {
      await updatePermissions.mutateAsync({
        groupId,
        permissionIds: Array.from(newIds),
      });
      toast({ title: 'Category permissions cleared' });
    } catch (error) {
      toast({ title: 'Error', description: String(error), variant: 'destructive' });
    }
  };

  if (isLoading || !permissionsByCategory) {
    return <Skeleton className="h-[400px]" />;
  }

  const filteredCategories = Object.entries(permissionsByCategory).reduce((acc, [category, permissions]) => {
    if (!searchQuery) {
      acc[category] = permissions;
      return acc;
    }
    const filtered = permissions.filter(
      (p) =>
        p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filtered.length > 0) acc[category] = filtered;
    return acc;
  }, {} as Record<string, typeof permissionsByCategory[string]>);

  const totalPermissions = Object.values(permissionsByCategory).flat().length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant="secondary">
          {permissionIds.size} / {totalPermissions} permissions
        </Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search permissions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="space-y-3">
        {Object.entries(filteredCategories).map(([category, permissions]) => {
          const meta = PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES];
          const isExpanded = expandedCategories.has(category);
          const assignedCount = permissions.filter((p) => permissionIds.has(p.id)).length;

          return (
            <div key={category} className="border rounded-lg">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{meta?.label || category}</span>
                      <Badge variant="outline" className="text-xs">
                        {assignedCount} / {permissions.length}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); selectAllInCategory(category); }} disabled={updatePermissions.isPending}>
                    Select All
                  </Button>
                  {assignedCount > 0 && (
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); clearCategory(category); }} disabled={updatePermissions.isPending}>
                      Clear
                    </Button>
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t p-2 space-y-1">
                  {permissions.map((permission) => {
                    const isAssigned = permissionIds.has(permission.id);
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
                          <p className="text-sm text-muted-foreground">{permission.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
