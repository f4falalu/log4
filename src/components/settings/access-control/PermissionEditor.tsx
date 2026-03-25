import { useState, useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Check, Star, RotateCcw, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useMemberEffectivePermissions,
  useSaveMemberOverrides,
  useResetMemberOverrides,
  type EffectivePermission,
} from '@/hooks/settings/useAccessControl';
import {
  ROLE_LABELS,
  ROLE_COLORS,
  type WorkspaceMemberV2,
} from '@/hooks/settings/useWorkspaceMembers';

interface PermissionEditorProps {
  workspaceId: string;
  member: WorkspaceMemberV2;
}

// Category display names
const CATEGORY_LABELS: Record<string, string> = {
  REQUISITION: 'Requisitions',
  BATCH: 'Batches & Dispatch',
  DRIVER: 'Driver Operations',
  REPORTING: 'Reports & Analytics',
  SYSTEM: 'System & Admin',
  INVENTORY: 'Inventory',
  INVOICE: 'Invoices',
  SCHEDULER: 'Scheduler',
  MASTER_DATA: 'Master Data',
  storefront: 'Storefront',
  fleetops: 'FleetOps',
  driver: 'Driver',
  analytics: 'Analytics',
  admin: 'Admin',
};

export function PermissionEditor({ workspaceId, member }: PermissionEditorProps) {
  const { data: permissions = [], isLoading } = useMemberEffectivePermissions(
    workspaceId,
    member.user_id
  );
  const saveOverrides = useSaveMemberOverrides();
  const resetOverrides = useResetMemberOverrides();

  // Local state for pending changes (override permission IDs that should be granted)
  const [pendingOverrides, setPendingOverrides] = useState<Set<string>>(new Set());
  const [isDirty, setIsDirty] = useState(false);

  // Initialize pending overrides from server data
  useEffect(() => {
    const overrideIds = new Set(
      permissions
        .filter((p) => p.source === 'override' && p.granted)
        .map((p) => p.permission_id)
    );
    setPendingOverrides(overrideIds);
    setIsDirty(false);
  }, [permissions]);

  // Group permissions by category
  const grouped = useMemo(() => {
    const groups: Record<string, EffectivePermission[]> = {};
    for (const perm of permissions) {
      const cat = perm.category || 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(perm);
    }
    // Sort permissions within each group
    for (const cat of Object.keys(groups)) {
      groups[cat].sort((a, b) => a.permission_code.localeCompare(b.permission_code));
    }
    return groups;
  }, [permissions]);

  const handleToggle = (perm: EffectivePermission) => {
    // Role permissions are read-only (can't uncheck)
    if (perm.source === 'role') return;

    const newOverrides = new Set(pendingOverrides);
    if (newOverrides.has(perm.permission_id)) {
      newOverrides.delete(perm.permission_id);
    } else {
      newOverrides.add(perm.permission_id);
    }
    setPendingOverrides(newOverrides);
    setIsDirty(true);
  };

  const handleSave = () => {
    saveOverrides.mutate({
      workspaceId,
      memberUserId: member.user_id,
      grantIds: Array.from(pendingOverrides),
    });
    setIsDirty(false);
  };

  const handleReset = () => {
    resetOverrides.mutate({
      workspaceId,
      memberUserId: member.user_id,
    });
  };

  const isChecked = (perm: EffectivePermission) => {
    if (perm.source === 'role') return true;
    return pendingOverrides.has(perm.permission_id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">{member.profile.full_name}</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Role:</span>
            <Badge
              className={cn(ROLE_COLORS[member.role_code] || ROLE_COLORS.viewer)}
              variant="secondary"
            >
              {ROLE_LABELS[member.role_code] || member.role_code}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={resetOverrides.isPending}
            className="gap-1"
          >
            {resetOverrides.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RotateCcw className="h-3 w-3" />
            )}
            Reset to Role
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || saveOverrides.isPending}
            className="gap-1"
          >
            {saveOverrides.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Save className="h-3 w-3" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground border-b pb-3">
        <div className="flex items-center gap-1">
          <Check className="h-3 w-3 text-green-600" />
          <span>From role</span>
        </div>
        <div className="flex items-center gap-1">
          <Star className="h-3 w-3 text-yellow-500" />
          <span>Override</span>
        </div>
      </div>

      {/* Permission Groups */}
      <div className="space-y-6">
        {Object.entries(grouped).map(([category, perms]) => (
          <div key={category}>
            <h4 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wider">
              {CATEGORY_LABELS[category] || category}
            </h4>
            <div className="space-y-1 ml-1">
              {perms.map((perm) => {
                const checked = isChecked(perm);
                const isFromRole = perm.source === 'role';
                const isOverride = pendingOverrides.has(perm.permission_id) && !isFromRole;

                return (
                  <label
                    key={perm.permission_id}
                    className={cn(
                      'flex items-center gap-3 p-2 rounded-md transition-colors cursor-pointer',
                      'hover:bg-muted/50',
                      isFromRole && 'cursor-default opacity-80'
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={isFromRole}
                      onCheckedChange={() => handleToggle(perm)}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm">{perm.description || perm.permission_code}</span>
                      <span className="text-xs text-muted-foreground ml-2 font-mono">
                        {perm.permission_code}
                      </span>
                    </div>
                    {checked && (
                      <span className="flex-shrink-0">
                        {isOverride ? (
                          <Star className="h-3.5 w-3.5 text-yellow-500" />
                        ) : (
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        )}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
