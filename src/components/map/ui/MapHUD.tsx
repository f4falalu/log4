import { useEffect, useState } from 'react';
import L from 'leaflet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sun, Moon } from 'lucide-react';

interface MapHUDProps {
  map: L.Map | null;
  tileProvider: string;
  onTileProviderToggle: () => void;
}

export function MapHUD({ map, tileProvider, onTileProviderToggle }: MapHUDProps) {
  const [center, setCenter] = useState<L.LatLng | null>(null);
  const [zoom, setZoom] = useState<number>(6);

  useEffect(() => {
    if (!map) return;

    const updateMapInfo = () => {
      try {
        setCenter(map.getCenter());
        setZoom(map.getZoom());
      } catch (error) {
        // Map not fully initialized yet, ignore
        console.debug('MapHUD: Map not ready yet');
      }
    };

    // Wait for map to be fully initialized
    const timer = setTimeout(() => {
      updateMapInfo();
      map.on('move', updateMapInfo);
      map.on('zoom', updateMapInfo);
    }, 100);

    return () => {
      clearTimeout(timer);
      if (map) {
        map.off('move', updateMapInfo);
        map.off('zoom', updateMapInfo);
      }
    };
  }, [map]);

  if (!center) return null;

  return (
    <div className="absolute top-20 left-4 z-floating bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 space-y-1 text-xs font-mono shadow-md">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Lat:</span>
        <span className="font-semibold">{center.lat.toFixed(6)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Lng:</span>
        <span className="font-semibold">{center.lng.toFixed(6)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Zoom:</span>
        <span className="font-semibold">{zoom}</span>
      </div>
      
      <Separator className="my-2" />
      
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start h-8 px-2"
        onClick={onTileProviderToggle}
      >
        {tileProvider === 'cartoDark' ? (
          <>
            <Moon className="h-3.5 w-3.5 mr-2" />
            Dark Mode
          </>
        ) : (
          <>
            <Sun className="h-3.5 w-3.5 mr-2" />
            Light Mode
          </>
        )}
      </Button>
    </div>
  );
}
