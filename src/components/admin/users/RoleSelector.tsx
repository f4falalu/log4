import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, X } from 'lucide-react';
import { AppRole } from '@/types';

const AVAILABLE_ROLES: AppRole[] = [
  'system_admin',
  'warehouse_officer',
  'driver',
  'zonal_manager',
  'viewer',
];

const ROLE_COLORS: Record<AppRole, string> = {
  system_admin: 'bg-red-500/10 text-red-600 dark:text-red-400',
  warehouse_officer: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  driver: 'bg-green-500/10 text-green-600 dark:text-green-400',
  zonal_manager: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  viewer: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
};

const ROLE_LABELS: Record<AppRole, string> = {
  system_admin: 'System Admin',
  warehouse_officer: 'Warehouse Officer',
  driver: 'Driver',
  zonal_manager: 'Zonal Manager',
  viewer: 'Viewer',
};

interface RoleSelectorProps {
  roles: string[];
  onAddRole: (role: AppRole) => void;
  onRemoveRole: (role: AppRole) => void;
  disabled?: boolean;
}

export function RoleSelector({ roles, onAddRole, onRemoveRole, disabled }: RoleSelectorProps) {
  const availableToAdd = AVAILABLE_ROLES.filter((role) => !roles.includes(role));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {roles.map((role) => (
          <Badge
            key={role}
            className={`${ROLE_COLORS[role as AppRole]} flex items-center gap-1`}
          >
            {ROLE_LABELS[role as AppRole]}
            {!disabled && (
              <button
                onClick={() => onRemoveRole(role as AppRole)}
                className="ml-1 hover:bg-black/10 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}
        {roles.length === 0 && (
          <span className="text-sm text-muted-foreground">No roles assigned</span>
        )}
      </div>
      {!disabled && availableToAdd.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <Plus className="h-4 w-4 mr-1" />
              Add Role
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {availableToAdd.map((role) => (
              <DropdownMenuItem key={role} onClick={() => onAddRole(role)}>
                {ROLE_LABELS[role]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
