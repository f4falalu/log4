import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapUtils } from '@/lib/mapUtils';
import { MapIcons } from '@/lib/mapIcons';
import { useZoneAlerts, ZoneAlert } from '@/hooks/useZoneAlerts';

interface AlertsLayerProps {
  map: L.Map | null;
  onAlertClick?: (alertId: string) => void;
}

/**
 * AlertsLayer - Renders zone alert markers on the map
 * Shows visual indicators for geofence entry/exit events
 */
export function AlertsLayer({ map, onAlertClick }: AlertsLayerProps) {
  const { alerts = [] } = useZoneAlerts();
  const layerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  useEffect(() => {
    if (!MapUtils.isMapReady(map)) return;

    // Initialize layer group
    if (!layerRef.current) {
      try {
        layerRef.current = L.layerGroup().addTo(map);
      } catch (e) {
        console.error('[AlertsLayer] Failed to initialize layer:', e);
        return;
      }
    }

    // Clear existing markers
    layerRef.current.clearLayers();
    markersRef.current.clear();

    // Filter alerts (show only recent unacknowledged, plus acknowledged from last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const visibleAlerts = alerts.filter((alert) => {
      const alertTime = new Date(alert.timestamp);
      return !alert.acknowledged || alertTime > oneHourAgo;
    });

    // Render alert markers
    visibleAlerts.forEach((alert) => {
      if (!layerRef.current) return;

      try {
        // Determine alert color
        const alertColor = getAlertColor(alert);

        // Create marker icon
        const icon = L.divIcon({
          html: `
            <div class="relative flex items-center justify-center">
              <div class="${alert.acknowledged ? '' : 'animate-ping absolute'} inline-flex h-full w-full rounded-full bg-${alertColor}-400 opacity-75"></div>
              <div class="relative inline-flex rounded-full h-6 w-6 bg-${alertColor}-500 border-2 border-white shadow-lg items-center justify-center">
                <span class="text-white text-xs font-bold">!</span>
              </div>
            </div>
          `,
          className: 'alert-marker',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        // Create marker
        const marker = L.marker([alert.location_lat, alert.location_lng], {
          icon,
          opacity: alert.acknowledged ? 0.5 : 1,
        });

        // Add click handler
        if (onAlertClick) {
          marker.on('click', () => {
            onAlertClick(alert.id);
          });
        }

        // Add popup with alert details
        const popupContent = `
          <div class="p-2 min-w-[200px]">
            <div class="flex items-start justify-between mb-2">
              <h3 class="font-bold text-sm">Zone ${alert.event_type === 'entry' ? 'Entry' : 'Exit'}</h3>
              <span class="text-xs px-2 py-0.5 rounded-full ${
                alert.acknowledged 
                  ? 'bg-muted text-muted-foreground' 
                  : 'bg-warning/20 text-warning'
              }">
                ${alert.acknowledged ? 'Acknowledged' : 'Active'}
              </span>
            </div>
            
            <div class="space-y-1 text-xs">
              ${alert.drivers ? `
                <div class="flex items-center gap-1">
                  <span class="text-muted-foreground">Driver:</span>
                  <span class="font-medium">${alert.drivers.name}</span>
                </div>
              ` : ''}
              
              ${alert.service_zones ? `
                <div class="flex items-center gap-1">
                  <span class="text-muted-foreground">Zone:</span>
                  <span class="font-medium">${alert.service_zones.name}</span>
                </div>
              ` : ''}
              
              <div class="flex items-center gap-1">
                <span class="text-muted-foreground">Time:</span>
                <span>${new Date(alert.timestamp).toLocaleString()}</span>
              </div>
              
              ${alert.notes ? `
                <div class="mt-2 pt-2 border-t">
                  <span class="text-muted-foreground">Notes:</span>
                  <p class="mt-1">${alert.notes}</p>
                </div>
              ` : ''}
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, {
          closeButton: true,
          maxWidth: 300,
        });

        // Add to map
        marker.addTo(layerRef.current);
        markersRef.current.set(alert.id, marker);
      } catch (e) {
        console.error(`[AlertsLayer] Failed to render alert ${alert.id}:`, e);
      }
    });

    return () => {
      layerRef.current?.clearLayers();
    };
  }, [map, alerts, onAlertClick]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (layerRef.current) {
        layerRef.current.clearLayers();
        layerRef.current.remove();
        layerRef.current = null;
      }
      markersRef.current.clear();
    };
  }, []);

  return null;
}

/**
 * Determine alert color based on event type and status
 */
function getAlertColor(alert: ZoneAlert): string {
  if (alert.acknowledged) return 'gray';
  
  switch (alert.event_type) {
    case 'entry':
      return 'blue';
    case 'exit':
      return 'orange';
    case 'violation':
      return 'red';
    default:
      return 'yellow';
  }
}
