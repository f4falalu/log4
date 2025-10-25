import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { useDrawerState } from '@/hooks/useDrawerState';
import { useDrivers } from '@/hooks/useDrivers';
import { useVehicles } from '@/hooks/useVehicles';
import { useDeliveryBatches } from '@/hooks/useDeliveryBatches';
import { Button } from '@/components/ui/button';
import { Phone, Map, Package, X } from 'lucide-react';

export function PanelDrawer() {
  const { isOpen, entityType, entityId, closeDrawer } = useDrawerState();
  const { data: drivers = [] } = useDrivers();
  const { data: vehicles = [] } = useVehicles();
  const { data: batches = [] } = useDeliveryBatches();

  let entity = null;
  let title = '';
  let description = '';

  if (entityType === 'driver' && entityId) {
    entity = drivers.find(d => d.id === entityId);
    title = entity?.name || 'Driver Details';
    description = entity?.phone || 'No phone available';
  } else if (entityType === 'vehicle' && entityId) {
    entity = vehicles.find(v => v.id === entityId);
    title = entity?.plateNumber || 'Vehicle Details';
    description = `${entity?.model || 'Unknown model'} • ${entity?.type || 'Unknown type'}`;
  } else if (entityType === 'batch' && entityId) {
    entity = batches.find(b => b.id === entityId);
    title = `Batch: ${entity?.name || 'Unknown'}`;
    description = entity?.status || 'No status';
  }

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && closeDrawer()} direction="right">
      <DrawerContent className="h-full w-[400px] fixed right-0 top-0 bottom-0">
        <DrawerHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle>{title}</DrawerTitle>
              <DrawerDescription>{description}</DrawerDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={closeDrawer}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DrawerHeader>

        <div className="p-6 space-y-6">
          {entityType === 'driver' && entity && (
            <>
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Status</h3>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-success" />
                  <span className="text-sm">Available</span>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Contact</h3>
                <p className="text-sm text-muted-foreground">{entity.phone || 'N/A'}</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Phone className="h-4 w-4 mr-1.5" />
                  Call
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Map className="h-4 w-4 mr-1.5" />
                  Show on Map
                </Button>
              </div>
            </>
          )}

          {entityType === 'vehicle' && entity && (
            <>
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Details</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Model:</span>
                    <span>{entity.model || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span>{entity.type || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Capacity:</span>
                    <span>{entity.capacity || 'N/A'} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fuel:</span>
                    <span>{entity.fuel_type || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Package className="h-4 w-4 mr-1.5" />
                  Assign Batch
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Map className="h-4 w-4 mr-1.5" />
                  Show on Map
                </Button>
              </div>
            </>
          )}

          {entityType === 'batch' && entity && (
            <>
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Status</h3>
                <p className="text-sm text-muted-foreground">{entity.status}</p>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Details</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Batch Name:</span>
                    <span>{entity.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created:</span>
                    <span>{new Date(entity.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
