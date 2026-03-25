import { useEffect, useState } from 'react';
import { Shield, Check, X, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { getEffectivePermissions } from '@/services/authorization';
import type { Permission } from '@/rbac/types';

interface PermissionView {
  code: string;
  module: string;
  description: string;
  granted: boolean;
  source: 'role' | 'override' | 'none';
}

export function PermissionInspector() {
  const { workspaceName, workspaceId } = useWorkspace();
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<PermissionView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId || !user) return;
    fetchPermissions();
  }, [workspaceId, user]);

  async function fetchPermissions() {
    setLoading(true);
    setError(null);

    try {
      const data = await getEffectivePermissions(user.id, workspaceId);

      // Transform data to match our interface
      const transformedPermissions: PermissionView[] = Array.isArray(data)
        ? data.map((item: any) => ({
            code: item.permission_code || item.code,
            module: item.category || item.module || extractModuleFromPermission(item.permission_code || item.code),
            description: item.description || generateDescription(item.permission_code || item.code),
            granted: item.granted || false,
            source: item.source === 'none' ? 'none' : (item.source || 'none'),
          }))
        : [];

      setPermissions(transformedPermissions);
    } catch (err) {
      console.error('Failed to fetch permissions:', err);
      setError('Failed to load permissions. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function extractModuleFromPermission(code: string): string {
    const parts = code.split('.');
    return parts[0] || 'unknown';
  }

  function generateDescription(code: string): string {
    const parts = code.split('.');
    if (parts.length < 2) return code;
    
    const action = parts[1];
    const resource = parts[0];
    
    const actionMap: Record<string, string> = {
      read: 'View and read',
      write: 'Create and edit',
      approve: 'Approve and authorize',
      dispatch: 'Dispatch and send',
      assign: 'Assign to users',
      manage: 'Full management',
      delete: 'Delete and remove',
      process: 'Process and handle',
      cancel: 'Cancel and void',
      adjust: 'Modify and adjust',
      transfer: 'Transfer between locations',
      create: 'Create new',
      review: 'Review and audit',
      view: 'View and access',
      confirm: 'Confirm and verify',
      record: 'Record and log',
    };
    
    const resourceMap: Record<string, string> = {
      requisitions: 'Requisitions',
      batches: 'Delivery Batches',
      drivers: 'Drivers',
      inventory: 'Inventory',
      schedule: 'Schedule',
      invoice: 'Invoices',
      item: 'Items',
      program: 'Programs',
      facility: 'Facilities',
      zone: 'Zones',
      reports: 'Reports',
      admin: 'Admin Functions',
      workspace: 'Workspace Settings',
    };
    
    const actionText = actionMap[action] || action;
    const resourceText = resourceMap[resource] || resource;
    
    return `${actionText} ${resourceText}`;
  }

  function groupPermissionsByModule(perms: PermissionView[]) {
    return perms.reduce((acc, perm) => {
      if (!acc[perm.module]) {
        acc[perm.module] = [];
      }
      acc[perm.module].push(perm);
      return acc;
    }, {} as Record<string, PermissionView[]>);
  }

  function StatusIcon({ granted, source }: { granted: boolean; source: string }) {
    if (!granted) return <X className="h-4 w-4 text-destructive" />;
    if (source === 'override') return <Star className="h-4 w-4 text-yellow-500" />;
    return <Check className="h-4 w-4 text-success" />;
  }

  function SourceBadge({ source }: { source: string }) {
    const variant = source === 'override' ? 'default' : 'secondary';
    const label = source === 'override' ? 'override' : 'role';
    return <Badge variant={variant} className="text-xs">{label}</Badge>;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-2">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const groupedPermissions = groupPermissionsByModule(permissions);
  const moduleOrder = ['REQUISITION', 'BATCH', 'DRIVER', 'INVENTORY', 'SCHEDULER', 'INVOICE', 'REPORTING', 'SYSTEM', 'MASTER_DATA', 'Storefront', 'FleetOps', 'Admin', 'Reports', 'Inventory', 'Schedule'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">My Permissions</h1>
        </div>
        <div className="text-sm text-muted-foreground space-y-1">
          <div>Workspace: <span className="font-medium">{workspaceName || 'Unknown'}</span></div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Check className="h-3 w-3 text-success" />
              <span>Granted via role</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 text-yellow-500" />
              <span>Granted via override</span>
            </div>
            <div className="flex items-center gap-1">
              <X className="h-3 w-3 text-destructive" />
              <span>Not granted</span>
            </div>
          </div>
        </div>
      </div>

      {/* Permissions by Module */}
      <ScrollArea className="h-[600px]">
        <div className="space-y-4">
          {moduleOrder.map((module) => {
            const modulePerms = groupedPermissions[module];
            if (!modulePerms || modulePerms.length === 0) return null;

            return (
              <Card key={module}>
                <CardHeader>
                  <CardTitle className="text-lg">{module}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {modulePerms
                    .sort((a, b) => a.code.localeCompare(b.code))
                    .map((perm) => (
                      <div
                        key={perm.code}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <StatusIcon granted={perm.granted} source={perm.source} />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{perm.code}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {perm.description}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {perm.granted && <SourceBadge source={perm.source} />}
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>
            );
          })}

          {/* Show modules not in standard order */}
          {Object.keys(groupedPermissions)
            .filter((module) => !moduleOrder.includes(module))
            .sort()
            .map((module) => {
              const modulePerms = groupedPermissions[module];
              if (!modulePerms || modulePerms.length === 0) return null;

              return (
                <Card key={module}>
                  <CardHeader>
                    <CardTitle className="text-lg">{module}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {modulePerms
                      .sort((a, b) => a.code.localeCompare(b.code))
                      .map((perm) => (
                        <div
                          key={perm.code}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <StatusIcon granted={perm.granted} source={perm.source} />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">{perm.code}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {perm.description}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {perm.granted && <SourceBadge source={perm.source} />}
                          </div>
                        </div>
                      ))}
                  </CardContent>
                </Card>
              );
            })}
        </div>
      </ScrollArea>
    </div>
  );
}
