import { Polygon, Popup } from 'react-leaflet';
import { ServiceZone } from '@/types/zones';

interface ZoneLayerProps {
  zones: ServiceZone[];
  visibleZones: Set<string>;
  selectedZoneId: string | null;
  onZoneClick: (zoneId: string) => void;
}

export function ZoneLayer({ zones, visibleZones, selectedZoneId, onZoneClick }: ZoneLayerProps) {
  return (
    <>
      {zones.map((zone) => {
        if (!visibleZones.has(zone.id)) return null;
        
        const coordinates = zone.geometry.geometry.coordinates[0].map(
          (coord: [number, number]) => [coord[1], coord[0]] as [number, number]
        );

        return (
          <Polygon
            key={zone.id}
            positions={coordinates}
            pathOptions={{
              color: zone.color,
              fillColor: zone.color,
              fillOpacity: selectedZoneId === zone.id ? 0.4 : 0.2,
              weight: selectedZoneId === zone.id ? 3 : 2,
            }}
            eventHandlers={{
              click: () => onZoneClick(zone.id),
            }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold">{zone.name}</h3>
                {zone.description && (
                  <p className="text-sm text-muted-foreground">{zone.description}</p>
                )}
              </div>
            </Popup>
          </Polygon>
        );
      })}
    </>
  );
}
