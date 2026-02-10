import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapUtils } from '@/lib/mapUtils';

export interface ZoneBoundaryData {
  id: string;
  name: string;
  code: string | null;
  geometry: GeoJSON.Polygon;
  color?: string;
}

interface ZoneBoundariesLayerProps {
  map: L.Map | null;
  zones: ZoneBoundaryData[];
  selectedZoneId?: string | null;
  onZoneClick?: (zoneId: string) => void;
}

// Palette for zones without a custom color
const ZONE_COLORS = [
  '#6366f1', '#0891b2', '#059669', '#d97706', '#dc2626',
  '#7c3aed', '#db2777', '#2563eb', '#ca8a04', '#16a34a',
];

/**
 * ZoneBoundariesLayer - Renders zone polygon boundaries from stored GeoJSON geometry.
 * Shaded polygons with dashed outlines, color from metadata or auto-assigned.
 */
export function ZoneBoundariesLayer({
  map,
  zones,
  selectedZoneId,
  onZoneClick,
}: ZoneBoundariesLayerProps) {
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!MapUtils.isMapReady(map)) return;

    const renderZones = () => {
      if (!layerRef.current) return;
      layerRef.current.clearLayers();

      zones.forEach((zone, index) => {
        if (!layerRef.current || !zone.geometry?.coordinates?.[0]) return;

        const color = zone.color || ZONE_COLORS[index % ZONE_COLORS.length];
        const isSelected = selectedZoneId === zone.id;

        // GeoJSON coordinates are [lng, lat], Leaflet expects [lat, lng]
        const coords = zone.geometry.coordinates[0].map(
          (coord) => [coord[1], coord[0]] as [number, number]
        );

        const polygon = L.polygon(coords, {
          color,
          weight: isSelected ? 3 : 2,
          opacity: isSelected ? 0.9 : 0.5,
          fillColor: color,
          fillOpacity: isSelected ? 0.15 : 0.06,
          dashArray: isSelected ? '' : '6, 4',
        });

        polygon.bindPopup(`
          <strong>${zone.name}</strong>
          ${zone.code ? `<br/><span style="font-size:12px">Code: ${zone.code}</span>` : ''}
        `);

        if (onZoneClick) {
          polygon.on('click', () => onZoneClick(zone.id));
        }

        try {
          polygon.addTo(layerRef.current);
        } catch (e) {
          console.error('[ZoneBoundariesLayer] Failed to add polygon:', e);
        }
      });
    };

    if (!layerRef.current) {
      try {
        layerRef.current = L.layerGroup().addTo(map);
      } catch (e) {
        console.error('[ZoneBoundariesLayer] Failed to initialize layer:', e);
        return;
      }
    }

    renderZones();

    return () => {
      layerRef.current?.clearLayers();
    };
  }, [map, zones, selectedZoneId, onZoneClick]);

  useEffect(() => {
    return () => {
      if (layerRef.current) {
        layerRef.current.clearLayers();
        layerRef.current.remove();
        layerRef.current = null;
      }
    };
  }, []);

  return null;
}
