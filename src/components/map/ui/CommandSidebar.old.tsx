import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useDrivers } from '@/hooks/useDrivers';
import { useVehicles } from '@/hooks/useVehicles';
import { useDeliveryBatches } from '@/hooks/useDeliveryBatches';
import { useDrawerState } from '@/hooks/useDrawerState';
import { Users, Truck, Package, AlertTriangle, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CommandSidebar() {
  const { data: drivers = [] } = useDrivers();
  const { data: vehicles = [] } = useVehicles();
  const { data: batches = [] } = useDeliveryBatches();
  const { openDrawer } = useDrawerState();

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

        <ScrollArea className="flex-1">
          <TabsContent value="drivers" className="mt-0 space-y-0">
            {drivers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No drivers available
              </div>
            ) : (
              drivers.map((driver) => (
                <button
                  key={driver.id}
                  onClick={() => openDrawer('driver', driver.id)}
                  className={cn(
                    'w-full px-4 py-3 flex items-center justify-between',
                    'hover:bg-muted/50 transition-colors border-b border-border/50',
                    'text-left'
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
                  <div className="text-xs text-muted-foreground">
                    Available
                  </div>
                </button>
              ))
            )}
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
                    'w-full px-4 py-3 flex items-center justify-between',
                    'hover:bg-muted/50 transition-colors border-b border-border/50',
                    'text-left'
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
                    'w-full px-4 py-3 flex items-center justify-between',
                    'hover:bg-muted/50 transition-colors border-b border-border/50',
                    'text-left'
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
