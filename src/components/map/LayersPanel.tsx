import { useMapState } from '@/contexts/MapStateContext';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { X, Layers, MapPin, Warehouse, Car, Navigation, Route } from 'lucide-react';

interface LayersPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LayersPanel({ isOpen, onClose }: LayersPanelProps) {
  const { state, toggleLayer } = useMapState();

  if (!isOpen) return null;

  const layers = [
    { key: 'facilities' as const, label: 'Facilities', icon: MapPin },
    { key: 'warehouses' as const, label: 'Warehouses', icon: Warehouse },
    { key: 'drivers' as const, label: 'Drivers', icon: Car },
    { key: 'zones' as const, label: 'Service Zones', icon: Navigation },
    { key: 'batches' as const, label: 'Routes', icon: Route },
  ];

  return (
    <div className="absolute top-20 right-4 z-[1000] w-72 bg-background/95 backdrop-blur border rounded-lg p-4 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Map Layers</h3>
        </div>
        <Button size="sm" variant="ghost" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        {layers.map(({ key, label, icon: Icon }) => (
          <div key={key} className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor={key} className="cursor-pointer">
                {label}
              </Label>
            </div>
            <Switch
              id={key}
              checked={state.visibleLayers[key]}
              onCheckedChange={() => toggleLayer(key)}
            />
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t text-xs text-muted-foreground">
        Toggle layer visibility on the map
      </div>
    </div>
  );
}
