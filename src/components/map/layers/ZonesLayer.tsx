import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { ServiceZone } from '@/types/zones';
import { MapUtils } from '@/lib/mapUtils';

interface ZonesLayerProps {
  map: L.Map | null;
  zones: ServiceZone[];
  visibleZoneIds?: Set<string>;
  selectedZoneId?: string | null;
  onZoneClick?: (zoneId: string) => void;
  editMode?: boolean;
}

/**
 * ZonesLayer - Renders service zone polygons on the map
 * Supports visibility toggling, selection, and click handlers
 */
export function ZonesLayer({
  map,
  zones,
  visibleZoneIds,
  selectedZoneId,
  onZoneClick,
  editMode = false,
}: ZonesLayerProps) {
  const layerRef = useRef<L.LayerGroup | null>(null);
  const polygonsRef = useRef<Map<string, L.Polygon>>(new Map());

  useEffect(() => {
    if (!MapUtils.isMapReady(map)) return;

    const handleZoom = () => {
      if (!layerRef.current) return;
      if (map.getZoom() < 10) {
        layerRef.current.clearLayers();
      } else {
        renderZones();
      }
    };

    const renderZones = () => {
      if (!layerRef.current) return;
      layerRef.current.clearLayers();
      polygonsRef.current.clear();

      zones.forEach((zone) => {
        if (!layerRef.current) return;

        const isVisible = !visibleZoneIds || visibleZoneIds.has(zone.id);
        if (!isVisible) return;

        if (!zone.geometry?.geometry?.coordinates) {
          console.warn(`[ZonesLayer] Zone ${zone.id} has invalid geometry`);
          return;
        }

        const isSelected = selectedZoneId === zone.id;
        const zoneColor = zone.color || 'hsl(var(--primary))';

        try {
          const coordinates = zone.geometry.geometry.coordinates[0].map(
            ([lng, lat]: [number, number]) => [lat, lng] as L.LatLngTuple
          );

          const polygon = L.polygon(coordinates, {
            color: zoneColor,
            weight: isSelected ? 3 : 2,
            opacity: isSelected ? 1 : 0.8,
            fillColor: zoneColor,
            fillOpacity: isSelected ? 0.3 : 0.15,
            className: editMode ? 'cursor-pointer' : '',
          });

          if (onZoneClick) {
            polygon.on('click', () => {
              onZoneClick(zone.id);
            });
          }

          const popupContent = `
            <div class="p-2">
              <h3 class="font-bold text-sm mb-1">${zone.name}</h3>
              ${zone.description ? `<p class="text-xs text-muted-foreground mb-2">${zone.description}</p>` : ''}
              <div class="text-xs space-y-1">
                <div class="flex items-center gap-1">
                  <div class="w-3 h-3 rounded-full" style="background-color: ${zoneColor}"></div>
                  <span>Active Zone</span>
                </div>
                ${zone.metadata?.assigned_fleets?.length ? 
                  `<div>Fleets: ${zone.metadata.assigned_fleets.join(', ')}</div>` : ''}
              </div>
            </div>
          `;

          polygon.bindPopup(popupContent, {
            closeButton: true,
            maxWidth: 250,
          });

          polygon.addTo(layerRef.current);
          polygonsRef.current.set(zone.id, polygon);
        } catch (e) {
          console.error(`[ZonesLayer] Failed to render zone ${zone.id}:`, e);
        }
      });
    };

    if (!layerRef.current) {
      try {
        layerRef.current = L.layerGroup().addTo(map);
      } catch (e) {
        console.error('[ZonesLayer] Failed to initialize layer:', e);
        return;
      }
    }

    map.on('zoomend', handleZoom);
    handleZoom(); // Initial check

    return () => {
      map.off('zoomend', handleZoom);
      layerRef.current?.clearLayers();
    };
  }, [map, zones, visibleZoneIds, selectedZoneId, onZoneClick, editMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (layerRef.current) {
        layerRef.current.clearLayers();
        layerRef.current.remove();
        layerRef.current = null;
      }
      polygonsRef.current.clear();
    };
  }, []);

  return null;
}
