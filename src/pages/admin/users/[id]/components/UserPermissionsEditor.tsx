import { useState } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle, Search, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  useUserEffectivePermissions,
  useUserDirectPermissions,
  useSetUserPermission,
  usePermissionsCatalogByCategory,
  PERMISSION_CATEGORIES,
} from '@/hooks/rbac';

interface UserPermissionsEditorProps {
  userId: string;
}

const SOURCE_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  role: { label: 'Role', variant: 'secondary' },
  group: { label: 'Group', variant: 'default' },
  direct: { label: 'Direct', variant: 'outline' },
  permission_set: { label: 'Set', variant: 'secondary' },
};

export function UserPermissionsEditor({ userId }: UserPermissionsEditorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(Object.keys(PERMISSION_CATEGORIES))
  );

  const { toast } = useToast();
  const { data: effectivePermissions, isLoading: effectiveLoading } = useUserEffectivePermissions(userId);
  const { data: directPermissions, isLoading: directLoading } = useUserDirectPermissions(userId);
  const { data: permissionsByCategory, isLoading: catalogLoading } = usePermissionsCatalogByCategory();
  const setPermission = useSetUserPermission();

  // Build lookup maps
  const directPermissionIds = new Set(directPermissions?.map((p) => p.permission_id) || []);

  // Build effective permission map with sources
  const effectiveMap = new Map<string, { sources: { source: string; source_name: string }[] }>();
  (effectivePermissions || []).forEach((ep) => {
    const existing = effectiveMap.get(ep.permission_id);
    if (existing) {
      existing.sources.push({ source: ep.source, source_name: ep.source_name });
    } else {
      effectiveMap.set(ep.permission_id, {
        sources: [{ source: ep.source, source_name: ep.source_name }],
      });
    }
  });

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const togglePermission = async (permissionId: string, currentlyDirect: boolean) => {
    try {
      await setPermission.mutateAsync({
        userId,
        permissionId,
        grant: !currentlyDirect,
      });

      toast({
        title: currentlyDirect ? 'Permission revoked' : 'Permission granted',
        description: `Direct permission ${currentlyDirect ? 'removed from' : 'granted to'} user`,
      });
    } catch (error) {
      toast({
        title: 'Error updating permission',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const selectAllInCategory = async (category: string) => {
    const categoryPermissions = permissionsByCategory?.[category] || [];
    const toGrant = categoryPermissions.filter((p) => !directPermissionIds.has(p.id));

    for (const perm of toGrant) {
      try {
        await setPermission.mutateAsync({
          userId,
          permissionId: perm.id,
          grant: true,
        });
      } catch {
        // Continue with other permissions
      }
    }

    toast({
      title: 'Category permissions granted',
      description: `All ${PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES]?.label} permissions directly granted`,
    });
  };

  const clearAllInCategory = async (category: string) => {
    const categoryPermissions = permissionsByCategory?.[category] || [];
    const toRevoke = categoryPermissions.filter((p) => directPermissionIds.has(p.id));

    for (const perm of toRevoke) {
      try {
        await setPermission.mutateAsync({
          userId,
          permissionId: perm.id,
          grant: false,
        });
      } catch {
        // Continue
      }
    }

    toast({
      title: 'Direct permissions cleared',
      description: `Direct permissions in ${PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES]?.label} cleared`,
    });
  };

  if (effectiveLoading || directLoading || catalogLoading) {
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

  if (!permissionsByCategory) return null;

  // Filter by search
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

    if (filtered.length > 0) {
      acc[category] = filtered;
    }

    return acc;
  }, {} as Record<string, typeof permissionsByCategory[string]>);

  const totalPermissions = Object.values(permissionsByCategory).flat().length;
  const effectiveCount = effectiveMap.size;
  const directCount = directPermissionIds.size;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>User Permissions</CardTitle>
            <CardDescription className="mt-1.5">
              Toggle individual permissions for this user. Permissions from roles and groups are shown but not editable here.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary">
              {effectiveCount} / {totalPermissions} effective
            </Badge>
            <Badge variant="outline">
              {directCount} direct
            </Badge>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex gap-2 text-xs">
            <Badge variant="secondary" className="text-xs">Role</Badge>
            <Badge variant="default" className="text-xs">Group</Badge>
            <Badge variant="outline" className="text-xs">Direct</Badge>
          </div>
        </div>

        <div className="mt-3">
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
            const categoryEffectiveCount = permissions.filter((p) => effectiveMap.has(p.id)).length;
            const categoryDirectCount = permissions.filter((p) => directPermissionIds.has(p.id)).length;

            return (
              <div key={category} className="border rounded-lg">
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
                        <span className="font-semibold text-sm">{meta?.label || category}</span>
                        <Badge variant="outline" className="text-xs">
                          {categoryEffectiveCount} / {permissions.length}
                        </Badge>
                        {categoryDirectCount > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {categoryDirectCount} direct
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {meta?.description || ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        selectAllInCategory(category);
                      }}
                      disabled={setPermission.isPending}
                    >
                      Grant All
                    </Button>
                    {categoryDirectCount > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearAllInCategory(category);
                        }}
                        disabled={setPermission.isPending}
                      >
                        Clear Direct
                      </Button>
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t">
                    <div className="p-2 space-y-1">
                      {permissions.map((permission) => {
                        const isDirect = directPermissionIds.has(permission.id);
                        const effective = effectiveMap.get(permission.id);
                        const isEffective = !!effective;
                        const hasNonDirectSource = effective?.sources.some(
                          (s) => s.source !== 'direct'
                        );

                        return (
                          <div
                            key={permission.id}
                            className={cn(
                              'flex items-start gap-3 p-3 rounded-md hover:bg-accent transition-colors',
                              isEffective && 'bg-accent/50'
                            )}
                          >
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="mt-0.5">
                                    <Checkbox
                                      checked={isDirect}
                                      onCheckedChange={() => togglePermission(permission.id, isDirect)}
                                      disabled={setPermission.isPending}
                                    />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {isDirect ? 'Remove direct grant' : 'Add direct grant'}
                                  {hasNonDirectSource && !isDirect && ' (already granted via role/group)'}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                                  {permission.code}
                                </code>
                                {permission.is_dangerous && (
                                  <Badge variant="destructive" className="text-xs gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    Dangerous
                                  </Badge>
                                )}
                                {effective?.sources.map((s, i) => {
                                  const badge = SOURCE_BADGES[s.source];
                                  return (
                                    <TooltipProvider key={i}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Badge variant={badge?.variant || 'outline'} className="text-xs">
                                            {badge?.label || s.source}
                                          </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>{s.source_name}</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  );
                                })}
                                {!isEffective && hasNonDirectSource === undefined && (
                                  <Badge variant="outline" className="text-xs text-muted-foreground">
                                    Not granted
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
