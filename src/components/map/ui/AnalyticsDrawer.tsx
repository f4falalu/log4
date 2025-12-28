import { useState, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useDrivers } from '@/hooks/useDrivers';
import { useVehicles } from '@/hooks/useVehicles';
import { useDeliveryBatches } from '@/hooks/useDeliveryBatches';
import { Users, Truck, Package, AlertTriangle, X, Search, Download, BarChart3 } from 'lucide-react';
import { CONTAINER, Z_INDEX, SHADOW, TRANSITION } from '@/lib/mapDesignSystem';
import { getStatusColors, combineColorClasses } from '@/lib/designTokens';
import { cn } from '@/lib/utils';
import { useVirtualizer } from '@tanstack/react-virtual';

interface AnalyticsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'drivers' | 'vehicles' | 'batches' | 'analytics' | 'alerts';
  onEntityClick?: (type: 'driver' | 'vehicle' | 'batch', id: string) => void;
}

export function AnalyticsDrawer({
  isOpen,
  onClose,
  defaultTab = 'drivers',
  onEntityClick,
}: AnalyticsDrawerProps) {
  const { data: drivers = [] } = useDrivers();
  const { data: vehicles = [] } = useVehicles();
  const { data: batches = [] } = useDeliveryBatches();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Filter data
  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = driver.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || driver.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = vehicle.plateNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredBatches = batches.filter(batch => {
    const matchesSearch = batch.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || batch.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Virtualization for drivers list
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: filteredDrivers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
      case 'active':
        return combineColorClasses(getStatusColors('active'));
      case 'busy':
      case 'in-progress':
        return combineColorClasses(getStatusColors('in_progress'));
      case 'offline':
      case 'maintenance':
        return combineColorClasses(getStatusColors('inactive'));
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm"
          style={{ zIndex: Z_INDEX.drawer - 1 }}
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          'fixed top-0 right-0 bottom-0 bg-card border-l border-border flex flex-col',
          SHADOW.drawer,
          TRANSITION.drawer,
          CONTAINER.drawer,
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        style={{ zIndex: Z_INDEX.drawer }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-lg font-semibold">Command Center</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue={defaultTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b border-border px-6 pt-3 pb-0 flex-shrink-0">
            <TabsList className="w-full grid grid-cols-5 gap-1">
              <TabsTrigger value="drivers" className="gap-1.5 text-xs">
                <Users className="h-3.5 w-3.5" />
                <span>Drivers</span>
              </TabsTrigger>
              <TabsTrigger value="vehicles" className="gap-1.5 text-xs">
                <Truck className="h-3.5 w-3.5" />
                <span>Vehicles</span>
              </TabsTrigger>
              <TabsTrigger value="batches" className="gap-1.5 text-xs">
                <Package className="h-3.5 w-3.5" />
                <span>Batches</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-1.5 text-xs">
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Analytics</span>
              </TabsTrigger>
              <TabsTrigger value="alerts" className="gap-1.5 text-xs">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Alerts</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Search & Filters */}
          <div className="px-6 py-3 space-y-3 border-b border-border flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="busy">Busy</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-8 px-3">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            <TabsContent value="drivers" className="h-full mt-0">
              <div ref={parentRef} className="h-full overflow-auto">
                <div
                  style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                  }}
                >
                  {virtualizer.getVirtualItems().map((virtualRow) => {
                    const driver = filteredDrivers[virtualRow.index];
                    return (
                      <div
                        key={driver.id}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        <button
                          onClick={() => onEntityClick?.('driver', driver.id)}
                          className="w-full px-6 py-3 hover:bg-muted/50 transition-colors text-left border-b border-border/50"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-sm">{driver.name}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {driver.phone}
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className={cn('text-xs', getStatusColor(driver.status))}
                            >
                              {driver.status}
                            </Badge>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="vehicles" className="h-full mt-0">
              <ScrollArea className="h-full">
                <div className="divide-y divide-border/50">
                  {filteredVehicles.map((vehicle) => (
                    <button
                      key={vehicle.id}
                      onClick={() => onEntityClick?.('vehicle', vehicle.id)}
                      className="w-full px-6 py-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {vehicle.make} {vehicle.model}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {vehicle.plateNumber}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn('text-xs', getStatusColor(vehicle.status))}
                        >
                          {vehicle.status}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="batches" className="h-full mt-0">
              <ScrollArea className="h-full">
                <div className="divide-y divide-border/50">
                  {filteredBatches.map((batch) => (
                    <button
                      key={batch.id}
                      onClick={() => onEntityClick?.('batch', batch.id)}
                      className="w-full px-6 py-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{batch.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {batch.facilities?.length || 0} stops
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn('text-xs', getStatusColor(batch.status))}
                        >
                          {batch.status}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="analytics" className="h-full mt-0 p-6">
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Analytics dashboard coming soon
                </div>
              </div>
            </TabsContent>

            <TabsContent value="alerts" className="h-full mt-0 p-6">
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  No active alerts
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </>
  );
}
