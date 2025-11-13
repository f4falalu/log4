import { Outlet, useLocation } from 'react-router-dom';
import { Home, Building2, Package, ShoppingCart, Calendar, CalendarClock, Layers } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { SecondarySidebar, NavigationGroup } from '@/components/layout/SecondarySidebar';
import { useMemo } from 'react';

const navigationGroups: NavigationGroup[] = [
  {
    label: 'OVERVIEW',
    items: [
      {
        label: 'Overview',
        href: '/storefront',
        icon: Home,
        end: true
      },
    ],
  },
  {
    label: 'PLANNING',
    items: [
      {
        label: 'Requisitions',
        href: '/storefront/requisitions',
        icon: ShoppingCart
      },
      {
        label: 'Scheduler',
        href: '/storefront/scheduler',
        icon: CalendarClock
      },
      {
        label: 'Schedule Planner',
        href: '/storefront/schedule-planner',
        icon: Calendar
      },
    ],
  },
  {
    label: 'RESOURCES',
    items: [
      {
        label: 'Zones',
        href: '/storefront/zones',
        icon: Layers
      },
      {
        label: 'Facilities',
        href: '/storefront/facilities',
        icon: Building2
      },
      {
        label: 'Payloads',
        href: '/storefront/payloads',
        icon: Package
      },
    ],
  },
];

export function StorefrontLayout() {
  const location = useLocation();

  // Generate breadcrumbs based on current path
  const breadcrumbs = useMemo(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const crumbs: Array<{ label: string; href?: string }> = [];

    if (pathSegments.length === 1 && pathSegments[0] === 'storefront') {
      return [{ label: 'Overview' }];
    }

    // Add workspace
    crumbs.push({ label: 'Storefront', href: '/storefront' });

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
      title="Storefront"
      subtitle="Warehouse & Inventory"
      groups={navigationGroups}
      searchPlaceholder="Search Storefront..."
    />
  );

  return (
    <AppLayout sidebar={sidebar} breadcrumbs={breadcrumbs}>
      <Outlet />
    </AppLayout>
  );
}
