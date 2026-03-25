import { Outlet, useLocation, NavLink } from 'react-router-dom';
import {
  Radio,
  Shield,
  BarChart3,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { SecondarySidebar, NavigationGroup } from '@/components/layout/SecondarySidebar';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useActiveSessionsCount } from '@/hooks/admin';

// Tab definitions — system operations only
const adminTabs = [
  { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/admin/analytics' },
  { id: 'sessions', label: 'Sessions', icon: Radio, path: '/admin/sessions' },
];

// Sidebar navigation groups per tab
const sidebarByTab: Record<string, NavigationGroup[]> = {
  sessions: [
    {
      label: 'MONITORING',
      items: [
        { label: 'Active Sessions', href: '/admin/sessions', icon: Radio, end: true },
      ],
    },
  ],
  analytics: [
    {
      label: 'ANALYTICS',
      items: [
        { label: 'Dashboard', href: '/admin/analytics', icon: BarChart3, end: true },
      ],
    },
  ],
};

function AdminTabs({ activeTab }: { activeTab: string }) {
  const { data: activeSessions } = useActiveSessionsCount();

  return (
    <div className="border-b bg-background">
      <div className="flex items-center gap-1 px-4">
        {adminTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <NavLink
              key={tab.id}
              to={tab.path}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative',
                'hover:text-foreground',
                isActive
                  ? 'text-foreground'
                  : 'text-muted-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.id === 'sessions' && activeSessions !== undefined && activeSessions > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-green-500/10 text-green-600">
                  {activeSessions}
                </span>
              )}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}

export function AdminLayout() {
  const location = useLocation();

  // Determine active tab based on path
  const activeTab = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith('/admin/sessions')) return 'sessions';
    return 'analytics';
  }, [location.pathname]);

  // Generate breadcrumbs based on current path
  const breadcrumbs = useMemo(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const crumbs: Array<{ label: string; href?: string }> = [];

    crumbs.push({ label: 'System Admin', href: '/admin/analytics' });

    if (pathSegments.length > 1) {
      const pageName = pathSegments[1]
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      crumbs.push({ label: pageName });
    }

    return crumbs;
  }, [location.pathname]);

  const sidebarGroups = sidebarByTab[activeTab] || sidebarByTab.analytics;

  const sidebar = (
    <SecondarySidebar
      title="System"
      subtitle="System Operations"
      groups={sidebarGroups}
      searchPlaceholder="Search..."
      footer={
        <div className="flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <Shield className="h-4 w-4" />
          <span>System Admin Only</span>
        </div>
      }
    />
  );

  return (
    <AppLayout sidebar={sidebar} breadcrumbs={breadcrumbs}>
      <div className="flex flex-col h-full">
        {/* Tab Navigation */}
        <AdminTabs activeTab={activeTab} />

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </div>
    </AppLayout>
  );
}
