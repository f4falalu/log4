import { Warehouse, Truck, Users as UsersIcon, LayoutDashboard, Settings } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

type WorkspaceConfig = {
  id: 'fleetops' | 'storefront' | 'admin' | 'dashboard' | 'mod4';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  available: boolean;
};

const workspaces: WorkspaceConfig[] = [
  {
    id: 'storefront',
    label: 'Storefront',
    icon: Warehouse,
    path: '/storefront',
    available: true,
  },
  {
    id: 'fleetops',
    label: 'FleetOps',
    icon: Truck,
    path: '/fleetops',
    available: true,
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: UsersIcon,
    path: '/admin',
    available: false,
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/dashboard',
    available: false,
  },
  {
    id: 'mod4',
    label: 'Mod4',
    icon: Settings,
    path: '/mod4',
    available: false,
  },
];

export function MobileNav() {
  const { workspace, setWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();

  const handleWorkspaceClick = (ws: WorkspaceConfig) => {
    if (!ws.available) return;
    if (ws.id === 'fleetops' || ws.id === 'storefront') {
      setWorkspace(ws.id);
    }
    navigate(ws.path);
  };

  const isWorkspaceActive = (ws: WorkspaceConfig) => {
    return location.pathname.startsWith(ws.path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {workspaces
          .filter((ws) => ws.available) // Only show available workspaces on mobile
          .map((ws) => {
            const Icon = ws.icon;
            const isActive = isWorkspaceActive(ws);

            return (
              <button
                key={ws.id}
                onClick={() => handleWorkspaceClick(ws)}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[4rem]',
                  'hover:bg-sidebar-accent active:bg-sidebar-accent/80',
                  isActive && 'bg-sidebar-accent text-sidebar-accent-foreground'
                )}
                aria-label={ws.label}
              >
                <Icon className={cn('h-5 w-5', isActive ? 'text-primary' : 'text-muted-foreground')} />
                <span className={cn('text-xs font-medium', isActive ? 'text-primary' : 'text-muted-foreground')}>
                  {ws.label}
                </span>
              </button>
            );
          })}
      </div>
    </nav>
  );
}
