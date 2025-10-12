import { useUserRole } from '@/hooks/useUserRole';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, CheckCircle } from 'lucide-react';
import { AppRole } from '@/types';

const ROLE_LABELS: Record<AppRole, string> = {
  system_admin: 'System Admin',
  warehouse_officer: 'Warehouse Officer',
  dispatcher: 'Dispatcher',
  driver: 'Driver',
  viewer: 'Viewer',
  zonal_manager: 'Zonal Manager',
};

const ROLE_COLORS: Record<AppRole, string> = {
  system_admin: 'bg-destructive text-destructive-foreground',
  warehouse_officer: 'bg-primary text-primary-foreground',
  dispatcher: 'bg-accent text-accent-foreground',
  driver: 'bg-secondary text-secondary-foreground',
  viewer: 'bg-muted text-muted-foreground',
  zonal_manager: 'bg-[hsl(var(--medical-accent))] text-primary-foreground',
};

export function RoleSwitcher() {
  const { roles, activeRole, switchRole } = useUserRole();

  // Only show role switcher if user has multiple roles
  if (!roles || roles.length <= 1) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Shield className="h-4 w-4" />
          <span className="hidden sm:inline">View as:</span>
          <Badge className={ROLE_COLORS[activeRole || 'viewer']}>
            {ROLE_LABELS[activeRole || 'viewer']}
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Switch Role Perspective</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {roles.map((role) => (
          <DropdownMenuItem
            key={role}
            onClick={() => switchRole(role)}
            className="flex items-center justify-between cursor-pointer"
          >
            <span>{ROLE_LABELS[role]}</span>
            {activeRole === role && (
              <CheckCircle className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
