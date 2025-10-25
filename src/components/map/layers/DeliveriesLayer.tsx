import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import L from 'leaflet';

interface DeliveriesLayerProps {
  map: L.Map | null;
  visible?: boolean;
  onDeliveryClick?: (deliveryId: string) => void;
}

interface DeliveryStop {
  id: string;
  facilityId: string;
  batchId: string;
  status: string;
  sequenceNumber: number;
  facilityName: string;
  facilityLat: number;
  facilityLng: number;
}

export function DeliveriesLayer({ 
  map, 
  visible = true,
  onDeliveryClick 
}: DeliveriesLayerProps) {
  const { data: routeHistory = [] } = useQuery({
    queryKey: ['route-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('route_history')
        .select(`
          id,
          facility_id,
          batch_id,
          status,
          sequence_number,
          facilities!inner(id, name, lat, lng)
        `)
        .in('status', ['pending', 'in-progress', 'delivered']);
      
      if (error) throw error;
      
      return (data || []).map((stop: any) => ({
        id: stop.id,
        facilityId: stop.facility_id,
        batchId: stop.batch_id,
        status: stop.status,
        sequenceNumber: stop.sequence_number,
        facilityName: stop.facilities.name,
        facilityLat: stop.facilities.lat,
        facilityLng: stop.facilities.lng,
      })) as DeliveryStop[];
    }
  });

  useEffect(() => {
    if (!map || !visible || routeHistory.length === 0) return;
    
    const layerGroup = L.layerGroup().addTo(map);
    
    routeHistory.forEach((stop) => {
      const color = getStatusColor(stop.status);
      const icon = createDeliveryIcon(stop.status, stop.sequenceNumber, color);
      
      const marker = L.marker(
        [stop.facilityLat, stop.facilityLng],
        { icon }
      );
      
      marker.bindPopup(`
        <div class="p-2">
          <h3 class="font-semibold text-sm mb-1">${stop.facilityName}</h3>
          <p class="text-xs text-muted-foreground">Status: <span class="capitalize">${stop.status}</span></p>
          <p class="text-xs text-muted-foreground">Stop #${stop.sequenceNumber}</p>
        </div>
      `);
      
      if (onDeliveryClick) {
        marker.on('click', () => onDeliveryClick(stop.id));
      }
      
      marker.addTo(layerGroup);
    });
    
    return () => {
      layerGroup.clearLayers();
      map.removeLayer(layerGroup);
    };
  }, [map, visible, routeHistory, onDeliveryClick]);

  return null;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'delivered':
      return '#22c55e'; // green
    case 'in-progress':
      return '#3b82f6'; // blue
    case 'pending':
      return '#f59e0b'; // orange
    case 'failed':
      return '#ef4444'; // red
    default:
      return '#94a3b8'; // gray
  }
}

function createDeliveryIcon(status: string, number: number, color: string) {
  return L.divIcon({
    html: `
      <div style="
        width: 28px;
        height: 28px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
        color: white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      ">${number}</div>
    `,
    className: 'delivery-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}
