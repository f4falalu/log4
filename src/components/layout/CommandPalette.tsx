import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Package,
  LayoutDashboard,
  Users,
  Truck,
  MapPin,
  Car,
  GitBranch,
  FileBarChart,
  Home,
  Building2,
  ShoppingCart,
  Calendar,
  CalendarClock,
  Warehouse,
  Search,
} from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';

type CommandItem = {
  id: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  workspace: 'fleetops' | 'storefront' | 'all';
  keywords?: string[];
};

const commands: CommandItem[] = [
  // FleetOps Commands
  {
    id: 'fleetops-dashboard',
    label: 'Dashboard',
    description: 'FleetOps overview and metrics',
    icon: LayoutDashboard,
    href: '/fleetops',
    workspace: 'fleetops',
    keywords: ['home', 'overview', 'metrics'],
  },
  {
    id: 'fleetops-batches',
    label: 'Batches',
    description: 'Manage delivery batches',
    icon: Package,
    href: '/fleetops/batches',
    workspace: 'fleetops',
    keywords: ['deliveries', 'orders', 'shipments'],
  },
  {
    id: 'fleetops-drivers',
    label: 'Drivers',
    description: 'Manage drivers and assignments',
    icon: Users,
    href: '/fleetops/drivers',
    workspace: 'fleetops',
    keywords: ['personnel', 'staff', 'team'],
  },
  {
    id: 'fleetops-dispatch',
    label: 'Dispatch',
    description: 'Coordinate deliveries and routes',
    icon: Truck,
    href: '/fleetops/dispatch',
    workspace: 'fleetops',
    keywords: ['routing', 'coordination', 'assignment'],
  },
  {
    id: 'fleetops-tactical',
    label: 'Tactical Map',
    description: 'Real-time operational map view',
    icon: MapPin,
    href: '/fleetops/tactical',
    workspace: 'fleetops',
    keywords: ['map', 'location', 'tracking', 'gps'],
  },
  {
    id: 'fleetops-vehicles',
    label: 'Vehicles',
    description: 'Fleet vehicle management',
    icon: Car,
    href: '/fleetops/vehicles',
    workspace: 'fleetops',
    keywords: ['fleet', 'cars', 'trucks', 'assets'],
  },
  {
    id: 'fleetops-fleet',
    label: 'Fleet Management',
    description: 'Overall fleet operations',
    icon: GitBranch,
    href: '/fleetops/fleet-management',
    workspace: 'fleetops',
    keywords: ['operations', 'management'],
  },
  {
    id: 'fleetops-reports',
    label: 'Reports',
    description: 'Analytics and reporting',
    icon: FileBarChart,
    href: '/fleetops/reports',
    workspace: 'fleetops',
    keywords: ['analytics', 'statistics', 'insights', 'data'],
  },

  // Storefront Commands
  {
    id: 'storefront-overview',
    label: 'Storefront Overview',
    description: 'Warehouse dashboard',
    icon: Home,
    href: '/storefront',
    workspace: 'storefront',
    keywords: ['home', 'dashboard', 'warehouse'],
  },
  {
    id: 'storefront-facilities',
    label: 'Facilities',
    description: 'Manage warehouse facilities',
    icon: Building2,
    href: '/storefront/facilities',
    workspace: 'storefront',
    keywords: ['warehouse', 'locations', 'sites'],
  },
  {
    id: 'storefront-requisitions',
    label: 'Requisitions',
    description: 'Inventory requests and orders',
    icon: ShoppingCart,
    href: '/storefront/requisitions',
    workspace: 'storefront',
    keywords: ['orders', 'requests', 'procurement'],
  },
  {
    id: 'storefront-payloads',
    label: 'Payloads',
    description: 'Payload configurations',
    icon: Package,
    href: '/storefront/payloads',
    workspace: 'storefront',
    keywords: ['inventory', 'items', 'products'],
  },
  {
    id: 'storefront-scheduler',
    label: 'Scheduler',
    description: 'Schedule and plan operations',
    icon: CalendarClock,
    href: '/storefront/scheduler',
    workspace: 'storefront',
    keywords: ['planning', 'calendar', 'schedule'],
  },
  {
    id: 'storefront-planner',
    label: 'Schedule Planner',
    description: 'Advanced schedule planning',
    icon: Calendar,
    href: '/storefront/schedule-planner',
    workspace: 'storefront',
    keywords: ['planning', 'calendar', 'timeline'],
  },
];

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();
  const { workspace, setWorkspace } = useWorkspace();

  // Cmd+K to open
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSelect = (item: CommandItem) => {
    // Update workspace if needed
    if (item.workspace !== 'all' && item.workspace !== workspace) {
      setWorkspace(item.workspace);
    }
    navigate(item.href);
    setOpen(false);
  };

  const fleetopsCommands = commands.filter((cmd) => cmd.workspace === 'fleetops');
  const storefrontCommands = commands.filter((cmd) => cmd.workspace === 'storefront');
  const globalCommands = commands.filter((cmd) => cmd.workspace === 'all');

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search commands and pages..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {globalCommands.length > 0 && (
          <>
            <CommandGroup heading="Global">
              {globalCommands.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.id}
                    value={`${item.label} ${item.keywords?.join(' ')}`}
                    onSelect={() => handleSelect(item)}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span>{item.label}</span>
                      {item.description && (
                        <span className="text-xs text-muted-foreground">{item.description}</span>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="FleetOps">
          {fleetopsCommands.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.id}
                value={`${item.label} ${item.keywords?.join(' ')}`}
                onSelect={() => handleSelect(item)}
              >
                <Icon className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>{item.label}</span>
                  {item.description && (
                    <span className="text-xs text-muted-foreground">{item.description}</span>
                  )}
                </div>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Storefront">
          {storefrontCommands.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.id}
                value={`${item.label} ${item.keywords?.join(' ')}`}
                onSelect={() => handleSelect(item)}
              >
                <Icon className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>{item.label}</span>
                  {item.description && (
                    <span className="text-xs text-muted-foreground">{item.description}</span>
                  )}
                </div>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
