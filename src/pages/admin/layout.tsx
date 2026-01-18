import { Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  Radio,
  FileSearch,
  MapPin,
  Shield,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { SecondarySidebar, NavigationGroup } from '@/components/layout/SecondarySidebar';
import { useMemo } from 'react';

const navigationGroups: NavigationGroup[] = [
  {
    label: 'OVERVIEW',
    items: [
      {
        label: 'Dashboard',
        href: '/admin',
        icon: LayoutDashboard,
        end: true
      },
    ],
  },
  {
    label: 'IDENTITY & ACCESS',
    items: [
      {
        label: 'Users',
        href: '/admin/users',
        icon: Users
      },
      {
        label: 'Workspaces',
        href: '/admin/workspaces',
        icon: Building2
      },
    ],
  },
  {
    label: 'MONITORING',
    items: [
      {
        label: 'Active Sessions',
        href: '/admin/sessions',
        icon: Radio
      },
      {
        label: 'Audit Logs',
        href: '/admin/audit',
        icon: FileSearch
      },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      {
        label: 'Locations',
        href: '/admin/locations',
        icon: MapPin
      },
    ],
  },
];

export function AdminLayout() {
  const location = useLocation();

  // Generate breadcrumbs based on current path
  const breadcrumbs = useMemo(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const crumbs: Array<{ label: string; href?: string }> = [];

    if (pathSegments.length === 1 && pathSegments[0] === 'admin') {
      return [{ label: 'Dashboard' }];
    }

    // Add workspace
    crumbs.push({ label: 'Admin', href: '/admin' });

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
      title="Admin"
      subtitle="System Administration"
      groups={navigationGroups}
      searchPlaceholder="Search Admin..."
      footerContent={
        <div className="flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <Shield className="h-4 w-4" />
          <span>System Admin Only</span>
        </div>
      }
    />
  );

  return (
    <AppLayout sidebar={sidebar} breadcrumbs={breadcrumbs}>
      <Outlet />
    </AppLayout>
  );
}
