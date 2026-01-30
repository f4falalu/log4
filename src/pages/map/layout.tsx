import { Outlet, useLocation } from 'react-router-dom';
import { Radio, History, Activity, Package, AlertTriangle } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { SecondarySidebar, NavigationGroup } from '@/components/layout/SecondarySidebar';
import { useMemo } from 'react';

const navigationGroups: NavigationGroup[] = [
  {
    label: 'TRACKING',
    items: [
      {
        label: 'Live',
        href: '/map/live',
        icon: Radio,
      },
      {
        label: 'Playback',
        href: '/map/playback',
        icon: History,
      },
    ],
  },
  {
    label: 'QUICK FILTERS',
    items: [
      {
        label: 'All Active',
        href: '/map/live?filter=active',
        icon: Activity,
      },
      {
        label: 'Deliveries',
        href: '/map/live?filter=deliveries',
        icon: Package,
      },
      {
        label: 'Delayed',
        href: '/map/live?filter=delayed',
        icon: AlertTriangle,
      },
    ],
  },
];

export function MapLayout() {
  const location = useLocation();

  // Generate breadcrumbs based on current path
  const breadcrumbs = useMemo(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const crumbs: Array<{ label: string; href?: string }> = [];

    if (pathSegments.length === 1 && pathSegments[0] === 'map') {
      return [{ label: 'Live Map' }];
    }

    // Add workspace
    crumbs.push({ label: 'Map', href: '/map/live' });

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
      title="Live Map"
      subtitle="Real-time Tracking & Analytics"
      groups={navigationGroups}
      searchPlaceholder="Search map..."
    />
  );

  return (
    <AppLayout sidebar={sidebar} breadcrumbs={breadcrumbs}>
      <Outlet />
    </AppLayout>
  );
}
