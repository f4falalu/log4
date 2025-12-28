import { useAuth } from '@/contexts/AuthContext';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LogOut, User, Shield } from 'lucide-react';
import { AppRole } from '@/types';
import { cn } from '@/lib/utils';

const ROLE_LABELS: Record<AppRole, string> = {
  system_admin: 'System Admin',
  warehouse_officer: 'Warehouse Officer',
  dispatcher: 'Dispatcher',
  driver: 'Driver',
  viewer: 'Viewer',
  zonal_manager: 'Zonal Manager',
};

interface UserMenuProps {
  compact?: boolean;
}

export function UserMenu({ compact = false }: UserMenuProps) {
  const { user, signOut } = useAuth();
  const { activeRole } = useUserRole();

  if (!user) return null;

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const avatarSize = compact ? 'h-10 w-10' : 'h-10 w-10';
  const buttonSize = compact ? 'h-10 w-10' : 'h-10 w-10';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={cn('relative rounded-full', buttonSize)}>
          <Avatar className={avatarSize}>
            <AvatarFallback className="bg-primary/10 text-xs">
              {getInitials(user.email || 'U')}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            <p className="text-sm font-medium leading-none">Account</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
            {activeRole && (
              <div className="flex items-center gap-2 pt-1">
                <Shield className="h-3 w-3 text-muted-foreground" />
                <Badge variant="secondary" className="text-xs">
                  {ROLE_LABELS[activeRole]}
                </Badge>
              </div>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
