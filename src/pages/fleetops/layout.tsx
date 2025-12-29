import { Outlet, useLocation } from 'react-router-dom';
import { Package, LayoutDashboard, Users, Truck, MapPin, GitBranch, FileBarChart, Wrench, Radio, History } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { SecondarySidebar, NavigationGroup } from '@/components/layout/SecondarySidebar';
import { useMemo } from 'react';

const navigationGroups: NavigationGroup[] = [
  {
    label: 'OVERVIEW',
    items: [
      {
        label: 'Dashboard',
        href: '/fleetops',
        icon: LayoutDashboard,
        end: true
      },
    ],
  },
  {
    label: 'PLANNING',
    items: [
      {
        label: 'Batches',
        href: '/fleetops/batches',
        icon: Package
      },
      {
        label: 'Dispatch',
        href: '/fleetops/dispatch',
        icon: Truck
      },
    ],
  },
  {
    label: 'OPERATIONS',
    items: [
      {
        label: 'Drivers',
        href: '/fleetops/drivers',
        icon: Users
      },
      {
        label: 'Fleet Management',
        href: '/fleetops/fleet-management',
        icon: GitBranch
      },
      {
        label: 'VLMS',
        href: '/fleetops/vlms',
        icon: Wrench
      },
    ],
  },
  {
    label: 'INTELLIGENCE',
    items: [
      {
        label: 'Planning Map',
        href: '/fleetops/map/planning',
        icon: MapPin
      },
      {
        label: 'Operational Map',
        href: '/fleetops/map/operational',
        icon: Radio
      },
      {
        label: 'Forensics Map',
        href: '/fleetops/map/forensics',
        icon: History
      },
      {
        label: 'Reports',
        href: '/fleetops/reports',
        icon: FileBarChart
      },
    ],
  },
];

export function FleetOpsLayout() {
  const location = useLocation();

  // Generate breadcrumbs based on current path
  const breadcrumbs = useMemo(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const crumbs: Array<{ label: string; href?: string }> = [];

    if (pathSegments.length === 1 && pathSegments[0] === 'fleetops') {
      return [{ label: 'Dashboard' }];
    }

    // Add workspace
    crumbs.push({ label: 'FleetOps', href: '/fleetops' });

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
      title="FleetOps"
      subtitle="Operations & Delivery"
      groups={navigationGroups}
      searchPlaceholder="Search FleetOps..."
    />
  );

  return (
    <AppLayout sidebar={sidebar} breadcrumbs={breadcrumbs}>
      <Outlet />
    </AppLayout>
  );
}
