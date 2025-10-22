import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  MapPin, 
  Building, 
  BarChart3,
  Truck,
  Route,
  Package,
  User,
  FileText,
  Map
} from 'lucide-react';
import { UserMenu } from './UserMenu';
import { NotificationCenter } from './NotificationCenter';
import { RoleSwitcher } from './RoleSwitcher';
import { usePermissions, Permission } from '@/hooks/usePermissions';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { hasPermission } = usePermissions();
  const location = useLocation();

  // Define all navigation items with their routes and permissions
  const navigationItems = [
    { 
      path: '/', 
      label: 'Dashboard', 
      icon: BarChart3,
      permission: null
    },
    { 
      path: '/command-center', 
      label: 'Command Center', 
      icon: MapPin,
      permission: 'view_batches' as Permission
    },
    { 
      path: '/tactical', 
      label: 'Tactical Map', 
      icon: Map,
      permission: 'view_tactical_map' as Permission
    },
    { 
      path: '/facilities', 
      label: 'Facilities', 
      icon: Building,
      permission: 'manage_facilities' as Permission
    },
    { 
      path: '/dispatch', 
      label: 'Dispatch', 
      icon: Route,
      permission: 'assign_drivers' as Permission
    },
    { 
      path: '/drivers', 
      label: 'Drivers', 
      icon: User,
      permission: null
    },
    { 
      path: '/vehicles', 
      label: 'Vehicles', 
      icon: Truck,
      permission: 'manage_vehicles' as Permission
    },
    { 
      path: '/reports', 
      label: 'Reports', 
      icon: FileText,
      permission: 'view_reports' as Permission
    },
  ];

  // Filter navigation items based on user permissions
  const visibleNavItems = navigationItems.filter(item => 
    !item.permission || hasPermission(item.permission)
  );

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal CRM Header */}
      <header className="border-b border-border/50 bg-card">
        <div className="mx-auto max-w-[1400px] px-6">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground">
                  <Truck className="h-4 w-4 text-background" />
                </div>
                <span className="text-sm font-semibold tracking-tight">BIKO</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <RoleSwitcher />
              <NotificationCenter />
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Minimal Navigation */}
      <nav className="border-b border-border/30 bg-card">
        <div className="mx-auto max-w-[1400px] px-6">
          <div className="flex gap-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
                    isActive(item.path)
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  )}
                >
                  <Icon className="h-[15px] w-[15px]" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="mx-auto max-w-[1400px] px-6 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;