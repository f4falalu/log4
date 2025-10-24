import { Outlet, NavLink } from 'react-router-dom';
import { WorkspaceSwitcher } from '@/components/shared/WorkspaceSwitcher';
import { UserMenu } from '@/components/layout/UserMenu';
import { NotificationCenter } from '@/components/layout/NotificationCenter';
import { Package, LayoutDashboard, Users, Truck, MapPin, Car, GitBranch, FileBarChart } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', href: '/fleetops', icon: LayoutDashboard, end: true },
  { label: 'Batches', href: '/fleetops/batches', icon: Package },
  { label: 'Drivers', href: '/fleetops/drivers', icon: Users },
  { label: 'Dispatch', href: '/fleetops/dispatch', icon: Truck },
  { label: 'Tactical Map', href: '/fleetops/tactical', icon: MapPin },
  { label: 'Vehicles', href: '/fleetops/vehicles', icon: Car },
  { label: 'Fleet', href: '/fleetops/fleet-management', icon: GitBranch },
  { label: 'Reports', href: '/fleetops/reports', icon: FileBarChart },
];

export function FleetOpsLayout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-[2000px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
                <Package className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-base leading-none">BIKO FleetOps</span>
                <span className="text-xs text-muted-foreground">Operations & Delivery</span>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                      isActive
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
            <WorkspaceSwitcher />
          </div>
          <div className="flex gap-2">
            <NotificationCenter />
            <UserMenu />
          </div>
        </div>
      </header>
      <main className="h-[calc(100vh-3.5rem)]">
        <Outlet />
      </main>
    </div>
  );
}
