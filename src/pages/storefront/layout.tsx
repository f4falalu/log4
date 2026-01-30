import { Outlet, useLocation } from 'react-router-dom';
import {
  Home,
  Building2,
  ShoppingCart,
  CalendarClock,
  Layers,
  BarChart3,
  Package,
  FileText,
  Warehouse
} from 'lucide-react';
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
    label: 'ORDER MANAGEMENT',
    items: [
      {
        label: 'Items',
        href: '/storefront/items',
        icon: Package
      },
      {
        label: 'Requisitions',
        href: '/storefront/requisitions',
        icon: ShoppingCart
      },
      {
        label: 'Invoice',
        href: '/storefront/invoice',
        icon: FileText
      },
    ],
  },
  {
    label: 'PLANNING',
    items: [
      {
        label: 'Scheduler',
        href: '/storefront/scheduler',
        icon: CalendarClock
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
        label: 'Warehouse',
        href: '/storefront/warehouse',
        icon: Warehouse
      },
    ],
  },
  {
    label: 'ANALYTICS',
    items: [
      {
        label: 'Stock Reports',
        href: '/storefront/stock-reports',
        icon: BarChart3
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
