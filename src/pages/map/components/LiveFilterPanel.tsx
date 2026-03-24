/**
 * LiveFilterPanel - Vehicle-focused filter sidebar for Live Map
 * Shows vehicles on route with search, status tabs, and entity toggles
 */

import { useState, useMemo } from 'react';
import {
  Search,
  X,
  Truck,
  Users,
  Building2,
  Warehouse,
  MapPin,
  Route,
  Package,
  AlertTriangle,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';
import { useLiveMapStore } from '@/stores/liveMapStore';
import { useLiveTracking } from '@/hooks/useLiveTracking';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { LiveVehicle, LiveDriver } from '@/types/live-map';

type VehicleTab = 'all' | 'driving' | 'parked';

// Combine vehicle + driver into a unified card model
interface VehicleCardData {
  id: string;
  type: 'vehicle' | 'driver';
  label: string;
  sublabel: string;
  status: 'driving' | 'idle' | 'parked' | 'delayed';
  vehicleType: string;
  hasWarning: boolean;
  position: [number, number];
  batchName?: string;
  lastUpdate: Date;
}

function getVehicleStatus(v: LiveVehicle): VehicleCardData['status'] {
  if (!v.isActive) return 'parked';
  if (v.speed > 0.5) return 'driving';
  return 'idle';
}

function getDriverStatus(d: LiveDriver): VehicleCardData['status'] {
  if (d.status === 'DELAYED') return 'delayed';
  if (d.status === 'EN_ROUTE') return 'driving';
  if (d.status === 'AT_STOP') return 'idle';
  if (d.status === 'INACTIVE' || d.status === 'COMPLETED') return 'parked';
  return d.isOnline ? 'idle' : 'parked';
}

const statusConfig = {
  driving: {
    dot: 'bg-emerald-500',
    pulse: true,
    label: 'Driving',
    labelClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  },
  idle: {
    dot: 'bg-amber-500',
    pulse: false,
    label: 'Idle',
    labelClass: 'text-amber-700 bg-amber-50 border-amber-200',
  },
  parked: {
    dot: 'bg-gray-400',
    pulse: false,
    label: 'Parked',
    labelClass: 'text-gray-600 bg-gray-50 border-gray-200',
  },
  delayed: {
    dot: 'bg-red-500',
    pulse: true,
    label: 'Delayed',
    labelClass: 'text-red-700 bg-red-50 border-red-200',
  },
};

export function LiveFilterPanel() {
  const filters = useLiveMapStore((s) => s.filters);
  const toggleFilter = useLiveMapStore((s) => s.toggleFilter);
  const selectEntity = useLiveMapStore((s) => s.selectEntity);

  const {
    vehicles,
    drivers,
    counts,
  } = useLiveTracking();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<VehicleTab>('all');
  const [collapsed, setCollapsed] = useState(false);

  // Build unified card list from vehicles and drivers
  const cards = useMemo((): VehicleCardData[] => {
    const vehicleCards: VehicleCardData[] = vehicles.map((v) => ({
      id: v.id,
      type: 'vehicle',
      label: v.plate,
      sublabel: v.driverName || `${v.make || ''} ${v.model || ''}`.trim() || v.type,
      status: getVehicleStatus(v),
      vehicleType: v.type,
      hasWarning: false,
      position: v.position,
      batchName: v.batchId ? `Batch ${v.batchId.slice(0, 8)}` : undefined,
      lastUpdate: v.lastUpdate,
    }));

    const driverCards: VehicleCardData[] = drivers
      .filter((d) => d.position[0] !== 0 && d.position[1] !== 0)
      .map((d) => ({
        id: d.id,
        type: 'driver',
        label: d.name,
        sublabel: d.phone || 'Driver',
        status: getDriverStatus(d),
        vehicleType: 'driver',
        hasWarning: d.status === 'DELAYED',
        position: d.position,
        batchName: d.batchId ? `Batch ${d.batchId.slice(0, 8)}` : undefined,
        lastUpdate: d.lastUpdate,
      }));

    return [...vehicleCards, ...driverCards];
  }, [vehicles, drivers]);

  // Filter and tab
  const filteredCards = useMemo(() => {
    let result = cards;

    // Tab filter
    if (activeTab === 'driving') {
      result = result.filter((c) => c.status === 'driving' || c.status === 'delayed');
    } else if (activeTab === 'parked') {
      result = result.filter((c) => c.status === 'parked' || c.status === 'idle');
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.label.toLowerCase().includes(q) ||
          c.sublabel.toLowerCase().includes(q) ||
          c.batchName?.toLowerCase().includes(q)
      );
    }

    // Sort: driving first, then delayed, idle, parked
    const order = { delayed: 0, driving: 1, idle: 2, parked: 3 };
    result.sort((a, b) => order[a.status] - order[b.status]);

    return result;
  }, [cards, activeTab, searchQuery]);

  const tabCounts = useMemo(() => ({
    all: cards.length,
    driving: cards.filter((c) => c.status === 'driving' || c.status === 'delayed').length,
    parked: cards.filter((c) => c.status === 'parked' || c.status === 'idle').length,
  }), [cards]);

  const handleCardClick = (card: VehicleCardData) => {
    selectEntity(card.id, card.type === 'vehicle' ? 'vehicle' : 'driver');
  };

  if (collapsed) {
    return (
      <div className="w-12 border-r bg-card flex flex-col items-center py-3 gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setCollapsed(false)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Separator className="my-1 w-6" />
        <EntityToggleButton
          icon={Truck}
          active={filters.showVehicles}
          count={counts.vehicles}
          color="text-violet-500"
          onClick={() => toggleFilter('showVehicles')}
          vertical
        />
        <EntityToggleButton
          icon={Users}
          active={filters.showDrivers}
          count={counts.drivers}
          color="text-blue-500"
          onClick={() => toggleFilter('showDrivers')}
          vertical
        />
        <EntityToggleButton
          icon={Building2}
          active={filters.showFacilities}
          count={counts.facilities}
          color="text-emerald-500"
          onClick={() => toggleFilter('showFacilities')}
          vertical
        />
        <EntityToggleButton
          icon={Warehouse}
          active={filters.showWarehouses}
          count={counts.warehouses}
          color="text-violet-400"
          onClick={() => toggleFilter('showWarehouses')}
          vertical
        />
        <EntityToggleButton
          icon={Route}
          active={filters.showRoutes}
          color="text-orange-500"
          onClick={() => toggleFilter('showRoutes')}
          vertical
        />
      </div>
    );
  }

  return (
    <div className="w-80 border-r bg-card flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Truck className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-semibold text-sm leading-tight">Vehicles on route</h2>
              <p className="text-[11px] text-muted-foreground">{tabCounts.driving} active of {tabCounts.all} total</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={() => setCollapsed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by Name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm bg-muted/40 border-transparent focus:border-border focus:bg-background"
            />
          </div>
          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0">
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-3 py-2 border-b">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as VehicleTab)}>
          <TabsList className="w-full h-8 bg-muted/50 p-0.5">
            <TabsTrigger value="all" className="flex-1 h-7 text-xs font-medium data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm">
              ALL
              <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px] bg-background/60">
                {tabCounts.all}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="driving" className="flex-1 h-7 text-xs font-medium data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm">
              DRIVING
              <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px] bg-background/60">
                {tabCounts.driving}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="parked" className="flex-1 h-7 text-xs font-medium data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm">
              PARKED
              <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px] bg-background/60">
                {tabCounts.parked}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Vehicle Cards List */}
      <ScrollArea className="flex-1">
        <div className="divide-y">
          {filteredCards.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Truck className="h-8 w-8 mx-auto mb-2 opacity-30" />
              No vehicles found
            </div>
          )}
          {filteredCards.map((card) => (
            <VehicleCard
              key={`${card.type}-${card.id}`}
              card={card}
              onClick={() => handleCardClick(card)}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Entity Toggle Footer */}
      <div className="border-t px-2 py-2">
        <div className="flex items-center justify-between">
          <div className="flex gap-0.5">
            <EntityToggleButton
              icon={Truck}
              active={filters.showVehicles}
              count={counts.vehicles}
              color="text-violet-500"
              onClick={() => toggleFilter('showVehicles')}
              label="Vehicles"
            />
            <EntityToggleButton
              icon={Users}
              active={filters.showDrivers}
              count={counts.drivers}
              color="text-blue-500"
              onClick={() => toggleFilter('showDrivers')}
              label="Drivers"
            />
            <EntityToggleButton
              icon={Package}
              active={filters.showDeliveries}
              count={counts.deliveries}
              color="text-green-500"
              onClick={() => toggleFilter('showDeliveries')}
              label="Deliveries"
            />
            <EntityToggleButton
              icon={Building2}
              active={filters.showFacilities}
              count={counts.facilities}
              color="text-emerald-500"
              onClick={() => toggleFilter('showFacilities')}
              label="Facilities"
            />
            <EntityToggleButton
              icon={Warehouse}
              active={filters.showWarehouses}
              count={counts.warehouses}
              color="text-violet-400"
              onClick={() => toggleFilter('showWarehouses')}
              label="Warehouses"
            />
            <EntityToggleButton
              icon={Route}
              active={filters.showRoutes}
              color="text-orange-500"
              onClick={() => toggleFilter('showRoutes')}
              label="Routes"
            />
            <EntityToggleButton
              icon={MapPin}
              active={filters.showZones}
              count={counts.zones}
              color="text-amber-500"
              onClick={() => toggleFilter('showZones')}
              label="Zones"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Vehicle Card ────────────────────────────────────── */

function VehicleCard({
  card,
  onClick,
}: {
  card: VehicleCardData;
  onClick: () => void;
}) {
  const cfg = statusConfig[card.status];

  const formatTime = (date: Date) => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return '';
    }
  };

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors group"
    >
      {/* Vehicle icon with status indicator */}
      <div className="relative shrink-0">
        <div className={cn(
          'h-10 w-10 rounded-lg flex items-center justify-center',
          card.status === 'driving' || card.status === 'delayed'
            ? 'bg-emerald-50 border border-emerald-200'
            : 'bg-muted/60 border border-border'
        )}>
          {card.type === 'vehicle' ? (
            <Truck className={cn(
              'h-5 w-5',
              card.status === 'driving' ? 'text-emerald-600' : 'text-muted-foreground'
            )} />
          ) : (
            <Users className={cn(
              'h-5 w-5',
              card.status === 'driving' ? 'text-emerald-600' : 'text-muted-foreground'
            )} />
          )}
        </div>
        {/* Status dot */}
        <span className={cn(
          'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card',
          cfg.dot,
        )}>
          {cfg.pulse && (
            <span className={cn(
              'absolute inset-0 rounded-full animate-ping opacity-75',
              cfg.dot,
            )} />
          )}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={cn(
            'font-semibold text-sm truncate',
            card.status === 'driving' && 'text-emerald-700'
          )}>
            {card.label}
          </span>
          {card.hasWarning && (
            <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
          )}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {card.batchName || card.sublabel}
        </div>
        <div className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">
          {formatTime(card.lastUpdate)}
        </div>
      </div>

      {/* Trip action */}
      <div className="shrink-0 flex flex-col items-end gap-1">
        <Badge
          variant="outline"
          className={cn('text-[10px] h-5 px-1.5 border font-medium', cfg.labelClass)}
        >
          {cfg.label}
        </Badge>
        <span className="text-[10px] text-emerald-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
          TRIP <ChevronRight className="h-3 w-3" />
        </span>
      </div>
    </button>
  );
}

/* ── Entity Toggle Button ────────────────────────────── */

function EntityToggleButton({
  icon: Icon,
  active,
  count,
  color,
  onClick,
  label,
  vertical,
}: {
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  count?: number;
  color: string;
  onClick: () => void;
  label?: string;
  vertical?: boolean;
}) {
  const btn = (
    <button
      onClick={onClick}
      className={cn(
        'relative flex items-center justify-center rounded-md transition-all',
        vertical ? 'h-8 w-8' : 'h-7 w-7',
        active
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent/50',
      )}
    >
      <Icon className={cn('h-3.5 w-3.5', active && color)} />
      {count !== undefined && active && (
        <span className="absolute -top-1 -right-1 h-3.5 min-w-[14px] rounded-full bg-foreground text-background text-[8px] font-bold flex items-center justify-center px-0.5">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );

  if (label) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{btn}</TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {label} {count !== undefined ? `(${count})` : ''}
        </TooltipContent>
      </Tooltip>
    );
  }

  return btn;
}
