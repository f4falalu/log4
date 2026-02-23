import { Shield, Crown, Truck, User, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Role } from '@/hooks/rbac';

interface RoleListProps {
  roles: Role[];
  selectedRoleId: string | null;
  onSelectRole: (roleId: string) => void;
}

const ROLE_ICONS: Record<string, typeof Shield> = {
  system_admin: Crown,
  operations_user: Shield,
  fleetops_user: Truck,
  driver: User,
  viewer: Eye,
};

const ROLE_COLORS: Record<string, string> = {
  system_admin: 'text-red-600 bg-red-50 border-red-200',
  operations_user: 'text-blue-600 bg-blue-50 border-blue-200',
  fleetops_user: 'text-green-600 bg-green-50 border-green-200',
  driver: 'text-purple-600 bg-purple-50 border-purple-200',
  viewer: 'text-gray-600 bg-gray-50 border-gray-200',
};

export function RoleList({ roles, selectedRoleId, onSelectRole }: RoleListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Roles</CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <div className="space-y-1">
          {roles.map((role) => {
            const Icon = ROLE_ICONS[role.code] || Shield;
            const isSelected = role.id === selectedRoleId;
            const colorClass = ROLE_COLORS[role.code] || 'text-gray-600 bg-gray-50 border-gray-200';

            return (
              <button
                key={role.id}
                onClick={() => onSelectRole(role.id)}
                className={cn(
                  'w-full text-left px-3 py-3 rounded-md transition-colors',
                  'hover:bg-accent',
                  isSelected && 'bg-accent border border-border'
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'p-2 rounded-md border mt-0.5',
                      colorClass
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium truncate">{role.name}</p>
                      {role.is_system_role && (
                        <Badge variant="outline" className="text-xs">
                          System
                        </Badge>
                      )}
                    </div>
                    {role.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {role.description}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
