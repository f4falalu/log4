import * as React from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronLeft, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePrefetch } from '@/hooks/usePrefetch';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

export type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

export type NavigationItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
  badge?: string | number;
};

// Route prefetching map
const routePrefetchMap: Record<string, () => Promise<any>> = {
  '/fleetops': () => import('@/pages/fleetops/page'),
  '/fleetops/drivers': () => import('@/pages/DriverManagement'),
  '/fleetops/dispatch': () => import('@/pages/DispatchPage'),
  '/fleetops/batches': () => import('@/pages/BatchManagement'),
  '/fleetops/tactical': () => import('@/pages/TacticalMap'),
  '/fleetops/vehicles': () => import('@/pages/VehicleManagementPage'),
  '/fleetops/fleet-management': () => import('@/pages/fleetops/fleet-management/page'),
  '/fleetops/reports': () => import('@/pages/ReportsPageWrapper'),
  '/fleetops/vlms': () => import('@/pages/fleetops/vlms/page'),
  '/storefront': () => import('@/pages/storefront/page'),
  '/storefront/zones': () => import('@/pages/storefront/zones/page'),
  '/storefront/lgas': () => import('@/pages/storefront/lgas/page'),
  '/storefront/facilities': () => import('@/pages/storefront/facilities/page'),
  '/storefront/requisitions': () => import('@/pages/storefront/requisitions/page'),
  '/storefront/payloads': () => import('@/pages/storefront/payloads/page'),
  '/storefront/schedule-planner': () => import('@/pages/storefront/schedule-planner/page'),
  '/storefront/scheduler': () => import('@/pages/storefront/scheduler/page'),
  '/storefront/stock-reports': () => import('@/pages/storefront/stock-reports/page'),
};

// Menu item with prefetching
function SidebarMenuItemWithPrefetch({
  item,
  Icon,
}: {
  item: NavigationItem;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  const loader = routePrefetchMap[item.href];
  const { prefetch } = usePrefetch(loader, !!loader);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip={item.label} className="h-9">
        <NavLink
          to={item.href}
          end={item.end}
          onMouseEnter={prefetch}
          onFocus={prefetch}
          className={({ isActive }) =>
            cn(
              'px-3 py-2 transition-colors duration-150',
              isActive && 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
            )
          }
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="truncate">{item.label}</span>
          {item.badge && (
            <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full group-data-[collapsible=icon]:hidden font-medium">
              {item.badge}
            </span>
          )}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

interface SecondarySidebarProps {
  title: string;
  subtitle?: string;
  groups: NavigationGroup[];
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  footer?: React.ReactNode;
}

export function SecondarySidebar({
  title,
  subtitle,
  groups,
  searchPlaceholder = 'Search...',
  onSearchChange,
  footer,
}: SecondarySidebarProps) {
  const { state } = useSidebar();
  const [searchValue, setSearchValue] = React.useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    onSearchChange?.(value);
  };

  // Filter items based on search
  const filteredGroups = React.useMemo(() => {
    if (!searchValue.trim()) return groups;

    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          item.label.toLowerCase().includes(searchValue.toLowerCase())
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, searchValue]);

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border/60"
    >
      <SidebarHeader>
        <div className="flex items-center justify-between px-4 py-6">
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <span className="font-semibold text-base truncate group-data-[collapsible=icon]:hidden">
              {title}
            </span>
            {subtitle && (
              <span className="text-xs text-muted-foreground/80 truncate group-data-[collapsible=icon]:hidden">
                {subtitle}
              </span>
            )}
          </div>
        </div>

        {/* Search Input */}
        <div className="px-4 pb-4 group-data-[collapsible=icon]:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <SidebarInput
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={handleSearchChange}
              className="pl-9 h-9"
            />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {filteredGroups.map((group, index) => (
          <SidebarGroup key={index} className="py-2">
            <SidebarGroupLabel className="px-3 mb-2 text-xs font-semibold tracking-wider">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItemWithPrefetch
                      key={item.href}
                      item={item}
                      Icon={Icon}
                    />
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        {filteredGroups.length === 0 && searchValue && (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground/70 group-data-[collapsible=icon]:hidden">
            No results found
          </div>
        )}
      </SidebarContent>

      {footer && (
        <SidebarFooter className="group-data-[collapsible=icon]:hidden px-4 py-4">
          {footer}
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
