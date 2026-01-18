import { Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  MapPin,
  Truck,
  Package,
  Users,
  Radio,
  Wifi,
  WifiOff
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { SecondarySidebar, NavigationGroup } from '@/components/layout/SecondarySidebar';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

const navigationGroups: NavigationGroup[] = [
  {
    label: 'OVERVIEW',
    items: [
      {
        label: 'Dashboard',
        href: '/mod4',
        icon: LayoutDashboard,
        end: true
      },
    ],
  },
  {
    label: 'DRIVER',
    items: [
      {
        label: 'My Trips',
        href: '/mod4/driver',
        icon: Truck
      },
      {
        label: 'Active Delivery',
        href: '/mod4/driver/delivery',
        icon: Package
      },
    ],
  },
  {
    label: 'DISPATCH',
    items: [
      {
        label: 'Live Tracking',
        href: '/mod4/dispatcher',
        icon: MapPin
      },
      {
        label: 'Active Sessions',
        href: '/mod4/sessions',
        icon: Users
      },
    ],
  },
];

function ConnectionStatus() {
  const isOnline = navigator.onLine;

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-md text-sm',
      isOnline
        ? 'bg-green-500/10 text-green-600 dark:text-green-400'
        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
    )}>
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4" />
          <span>Online</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          <span>Offline Mode</span>
        </>
      )}
    </div>
  );
}

export function Mod4Layout() {
  const location = useLocation();

  // Generate breadcrumbs based on current path
  const breadcrumbs = useMemo(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const crumbs: Array<{ label: string; href?: string }> = [];

    if (pathSegments.length === 1 && pathSegments[0] === 'mod4') {
      return [{ label: 'Dashboard' }];
    }

    // Add workspace
    crumbs.push({ label: 'Mod4', href: '/mod4' });

    // Add current page
    if (pathSegments.length > 1) {
      const pageName = pathSegments[1]
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      crumbs.push({ label: pageName });
    }

    return crumbs;
  }, [location.pathname]);

  const sidebar = (
    <SecondarySidebar
      title="Mod4"
      subtitle="Driver Execution"
      groups={navigationGroups}
      searchPlaceholder="Search Mod4..."
      footerContent={<ConnectionStatus />}
    />
  );

  return (
    <AppLayout sidebar={sidebar} breadcrumbs={breadcrumbs}>
      <Outlet />
    </AppLayout>
  );
}
