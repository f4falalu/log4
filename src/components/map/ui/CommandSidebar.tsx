import { useState, useRef, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDrivers } from '@/hooks/useDrivers';
import { useVehicles } from '@/hooks/useVehicles';
import { useDeliveryBatches } from '@/hooks/useDeliveryBatches';
import { useDrawerState } from '@/hooks/useDrawerState';
import { Users, Truck, Package, AlertTriangle, Download, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVirtualizer } from '@tanstack/react-virtual';
import type L from 'leaflet';

interface CommandSidebarProps {
  mapInstance?: L.Map | null;
}

export function CommandSidebar({ mapInstance }: CommandSidebarProps) {
  const { data: drivers = [] } = useDrivers();
  const { data: vehicles = [] } = useVehicles();
  const { data: batches = [] } = useDeliveryBatches();
  const { openDrawer } = useDrawerState();
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // Filter drivers
  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = driver.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || driver.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  
  // Virtualization
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: filteredDrivers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 5,
  });

  const handleDriverClick = (driver: typeof drivers[0]) => {
    openDrawer('driver', driver.id);
    
    // Focus map if location available
    if (driver.currentLocation && mapInstance) {
      mapInstance.flyTo(
        [driver.currentLocation.lat, driver.currentLocation.lng],
        15,
        { duration: 0.8, easeLinearity: 0.25 }
      );
    }
  };

  const handleDriverHover = (driverId: string | null) => {
    // Emit custom event for map to listen to
    window.dispatchEvent(new CustomEvent('highlightMarker', {
      detail: { type: 'driver', id: driverId }
    }));
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return; // Skip if typing in input
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => 
          Math.min(prev + 1, filteredDrivers.length - 1)
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && filteredDrivers[selectedIndex]) {
        e.preventDefault();
        handleDriverClick(filteredDrivers[selectedIndex]);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, filteredDrivers]);

  return (
    <div className="w-[420px] bg-card border-l border-border flex flex-col">
      <Tabs defaultValue="drivers" className="flex-1 flex flex-col">
        <div className="border-b border-border px-4 pt-4 pb-2">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="drivers" className="gap-1.5">
              <Users className="h-4 w-4" />
              <span className="hidden lg:inline">Drivers</span>
            </TabsTrigger>
            <TabsTrigger value="vehicles" className="gap-1.5">
              <Truck className="h-4 w-4" />
              <span className="hidden lg:inline">Vehicles</span>
            </TabsTrigger>
            <TabsTrigger value="batches" className="gap-1.5">
              <Package className="h-4 w-4" />
              <span className="hidden lg:inline">Batches</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden lg:inline">Alerts</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Search & Filters */}
        <div className="p-4 border-b space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 pl-9"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="busy">Busy</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ScrollArea ref={parentRef} className="flex-1">
          <TabsContent value="drivers" className="mt-0">
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                position: 'relative',
              }}
            >
              {virtualizer.getVirtualItems().map(virtualItem => {
                const driver = filteredDrivers[virtualItem.index];
                return (
                  <button
                    key={driver.id}
                    onClick={() => handleDriverClick(driver)}
                    onMouseEnter={() => handleDriverHover(driver.id)}
                    onMouseLeave={() => handleDriverHover(null)}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                    className={cn(
                      'px-4 py-3 flex items-center justify-between sidebar-row',
                      'border-b border-border/50 text-left',
                      selectedIndex === virtualItem.index && 'ring-2 ring-primary ring-inset'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-success" />
                      <div>
                        <div className="font-medium text-sm">{driver.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {driver.phone || 'No phone'}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {driver.status}
                    </div>
                  </button>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="vehicles" className="mt-0 space-y-0">
            {vehicles.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No vehicles available
              </div>
            ) : (
              vehicles.map((vehicle) => (
                <button
                  key={vehicle.id}
                  onClick={() => openDrawer('vehicle', vehicle.id)}
                  className={cn(
                    'w-full px-4 py-3 flex items-center justify-between sidebar-row',
                    'border-b border-border/50 text-left'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-sm">{vehicle.plateNumber}</div>
                      <div className="text-xs text-muted-foreground">
                        {vehicle.model || 'No model'}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {vehicle.type || 'N/A'}
                  </div>
                </button>
              ))
            )}
          </TabsContent>

          <TabsContent value="batches" className="mt-0 space-y-0">
            {batches.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No active batches
              </div>
            ) : (
              batches.map((batch) => (
                <button
                  key={batch.id}
                  onClick={() => openDrawer('batch', batch.id)}
                  className={cn(
                    'w-full px-4 py-3 flex items-center justify-between sidebar-row',
                    'border-b border-border/50 text-left'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-sm">Batch: {batch.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {batch.status}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </TabsContent>

          <TabsContent value="alerts" className="mt-0 space-y-0">
            <div className="p-8 text-center text-muted-foreground">
              No alerts
            </div>
          </TabsContent>
        </ScrollArea>

        <div className="border-t border-border p-4 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1">
            <Download className="h-4 w-4 mr-1.5" />
            Export
          </Button>
        </div>
      </Tabs>
    </div>
  );
}
