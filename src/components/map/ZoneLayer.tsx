import { Polygon, Popup, Marker } from 'react-leaflet';
import { ServiceZone } from '@/types/zones';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import L from 'leaflet';
import { Badge } from '@/components/ui/badge';

interface ZoneLayerProps {
  zones: ServiceZone[];
  visibleZones: Set<string>;
  selectedZoneId: string | null;
  onZoneClick: (zoneId: string) => void;
  showAlerts?: boolean;
}

export function ZoneLayer({ zones, visibleZones, selectedZoneId, onZoneClick, showAlerts = false }: ZoneLayerProps) {
  const { data: recentAlerts = [] } = useQuery({
    queryKey: ['zone-alerts-recent'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('zone_alerts' as any)
          .select('*, zone:service_zones(name)')
          .gte('timestamp', new Date(Date.now() - 3600000).toISOString())
          .eq('acknowledged', false)
          .order('timestamp', { ascending: false });

        if (error) throw error;
        return (data || []) as any[];
      } catch (err) {
        console.error('Error fetching zone alerts:', err);
        return [];
      }
    },
    enabled: showAlerts,
    refetchInterval: 30000,
  });

  const alertIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZjAwMDAiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJtMjEuNzMgMTgtOC0xNGEyIDIgMCAwIDAtMy40OCAwbC04IDE0QTIgMiAwIDAgMCA0IDIxaDE2YTIgMiAwIDAgMCAxLjczLTN6Ij48L3BhdGg+PHBhdGggZD0iTTEyIDl2NCI+PC9wYXRoPjxwYXRoIGQ9Ik0xMiAxN2guMDEiPjwvcGF0aD48L3N2Zz4=',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });

  return (
    <>
      {zones.map((zone) => {
        if (!visibleZones.has(zone.id)) return null;
        
        const coordinates = zone.geometry.geometry.coordinates[0].map(
          (coord: [number, number]) => [coord[1], coord[0]] as [number, number]
        );

        const zoneAlerts = recentAlerts.filter(a => a.zone_id === zone.id);

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
              <div className="p-2 space-y-2">
                <h3 className="font-semibold">{zone.name}</h3>
                {zone.description && (
                  <p className="text-sm text-muted-foreground">{zone.description}</p>
                )}
                {zoneAlerts.length > 0 && (
                  <div className="space-y-1">
                    <Badge variant="destructive" className="text-xs">
                      {zoneAlerts.length} Active Alert{zoneAlerts.length > 1 ? 's' : ''}
                    </Badge>
                    {zoneAlerts.slice(0, 3).map(alert => (
                      <div key={alert.id} className="text-xs text-muted-foreground">
                        {alert.alert_type} alert
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Popup>
          </Polygon>
        );
      })}

      {/* Show alert markers at zone centers */}
      {showAlerts && recentAlerts.map((alert) => {
        const zone = zones.find(z => z.id === alert.zone_id);
        if (!zone || !visibleZones.has(zone.id)) return null;

        // Calculate zone center
        const coords = zone.geometry.geometry.coordinates[0];
        const centerLat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
        const centerLng = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;

        return (
          <Marker
            key={alert.id}
            position={[centerLat, centerLng]}
            icon={alertIcon}
          >
            <Popup>
              <div className="p-2">
                <Badge variant="destructive">{alert.alert_type}</Badge>
                <p className="text-sm mt-1">{zone.name}</p>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}
