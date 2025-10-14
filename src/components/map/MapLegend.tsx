import { Card } from '@/components/ui/card';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MapLegendProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MapLegend({ isOpen, onClose }: MapLegendProps) {
  if (!isOpen) return null;

  return (
    <Card className="absolute bottom-64 right-4 z-[1000] w-72 bg-background/95 backdrop-blur border shadow-lg">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Map Legend</h3>
          <Button size="sm" variant="ghost" onClick={onClose} className="h-6 w-6 p-0">
            <X className="h-3 w-3" />
          </Button>
        </div>

        <div className="space-y-4 text-xs">
          {/* Driver Status */}
          <div>
            <h4 className="font-medium mb-2 text-muted-foreground">Driver Status</h4>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow-sm" />
                <span>Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-yellow-500 border-2 border-white shadow-sm" />
                <span>Busy / En Route</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-gray-500 border-2 border-white shadow-sm" />
                <span>Offline</span>
              </div>
            </div>
          </div>

          {/* Facilities */}
          <div>
            <h4 className="font-medium mb-2 text-muted-foreground">Locations</h4>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-sm" />
                <span>Facilities</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-red-500 border-2 border-white shadow-sm flex items-center justify-center text-white font-bold" style={{ fontSize: '10px' }}>
                  W
                </div>
                <span>Warehouses</span>
              </div>
            </div>
          </div>

          {/* Service Zones */}
          <div>
            <h4 className="font-medium mb-2 text-muted-foreground">Service Zones</h4>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-3 border-2 border-primary" style={{ backgroundColor: 'rgba(29, 106, 255, 0.2)' }} />
                <span>Zone boundaries</span>
              </div>
            </div>
          </div>

          {/* Routes */}
          <div>
            <h4 className="font-medium mb-2 text-muted-foreground">Routes</h4>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-blue-600" />
                <span>Planned route</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-green-600" style={{ borderTop: '2px dashed' }} />
                <span>Active route</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t text-[10px] text-muted-foreground">
          Click on map elements for more details
        </div>
      </div>
    </Card>
  );
}
