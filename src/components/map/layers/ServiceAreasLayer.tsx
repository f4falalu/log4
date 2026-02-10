import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapUtils } from '@/lib/mapUtils';

interface ServiceAreaPoint {
  id: string;
  name: string;
  service_type: string;
  color?: string;
  warehouse: { lat: number; lng: number; name: string } | null;
  facilities: Array<{ lat: number; lng: number; name: string }>;
}

export interface ServiceAreaPolygon {
  id: string;
  name: string;
  color?: string;
  hull: Array<{ lat: number; lng: number }>;
  facilityCount: number;
}

interface ServiceAreasLayerProps {
  map: L.Map | null;
  serviceAreas: ServiceAreaPoint[];
  serviceAreaPolygons?: ServiceAreaPolygon[];
  selectedId?: string | null;
  onServiceAreaClick?: (id: string) => void;
}

// Distinct palette for per-service-area coloring
const AREA_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#a855f7',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#8b5cf6',
  '#14b8a6', '#e11d48', '#65a30d', '#0ea5e9', '#d946ef',
];

/**
 * ServiceAreasLayer - Renders warehouse-to-facility connection lines and shaded boundary polygons.
 * Each service area gets its own color (from metadata.color or auto-assigned palette).
 */
export function ServiceAreasLayer({
  map,
  serviceAreas,
  serviceAreaPolygons,
  selectedId,
  onServiceAreaClick,
}: ServiceAreasLayerProps) {
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!MapUtils.isMapReady(map)) return;

    const renderServiceAreas = () => {
      if (!layerRef.current) return;
      layerRef.current.clearLayers();

      // Render convex hull boundary polygons (behind everything else)
      serviceAreaPolygons?.forEach((saPoly, index) => {
        if (!layerRef.current || saPoly.hull.length < 3) return;

        const color = saPoly.color || AREA_COLORS[index % AREA_COLORS.length];
        const isSelected = selectedId === saPoly.id;

        const polygon = L.polygon(
          saPoly.hull.map(p => [p.lat, p.lng] as [number, number]),
          {
            color,
            weight: isSelected ? 3 : 1.5,
            opacity: isSelected ? 0.8 : 0.4,
            fillColor: color,
            fillOpacity: isSelected ? 0.2 : 0.08,
            dashArray: '4, 4',
          }
        );

        polygon.bindPopup(`
          <strong>${saPoly.name}</strong><br/>
          <span style="font-size:12px">Facilities: ${saPoly.facilityCount}</span>
        `);

        if (onServiceAreaClick) {
          polygon.on('click', () => onServiceAreaClick(saPoly.id));
        }

        try {
          polygon.addTo(layerRef.current);
        } catch (e) {
          console.error('[ServiceAreasLayer] Failed to add polygon:', e);
        }
      });

      // Render spoke lines from warehouse to each facility
      serviceAreas.forEach((sa, index) => {
        if (!layerRef.current || !sa.warehouse) return;

        const color = sa.color || AREA_COLORS[index % AREA_COLORS.length];
        const isSelected = selectedId === sa.id;
        const weight = isSelected ? 4 : 2;
        const opacity = isSelected ? 1 : 0.6;

        sa.facilities.forEach((facility) => {
          if (!layerRef.current) return;

          const line = L.polyline(
            [
              [sa.warehouse!.lat, sa.warehouse!.lng],
              [facility.lat, facility.lng],
            ],
            {
              color,
              weight,
              opacity,
              dashArray: '6, 4',
            }
          );

          line.bindPopup(`
            <strong>${sa.name}</strong><br/>
            <span style="font-size:12px">${sa.warehouse!.name} → ${facility.name}</span>
          `);

          if (onServiceAreaClick) {
            line.on('click', () => onServiceAreaClick(sa.id));
          }

          try {
            line.addTo(layerRef.current!);
          } catch (e) {
            console.error('[ServiceAreasLayer] Failed to add line:', e);
          }
        });

        // Warehouse marker for this service area
        const warehouseMarker = L.circleMarker(
          [sa.warehouse.lat, sa.warehouse.lng],
          {
            radius: isSelected ? 10 : 7,
            fillColor: color,
            color: '#fff',
            weight: 2,
            fillOpacity: 0.9,
          }
        );

        warehouseMarker.bindPopup(`
          <strong>${sa.warehouse.name}</strong><br/>
          <span style="font-size:12px">Service Area: ${sa.name}</span><br/>
          <span style="font-size:12px">Facilities: ${sa.facilities.length}</span>
        `);

        try {
          warehouseMarker.addTo(layerRef.current);
        } catch (e) {
          console.error('[ServiceAreasLayer] Failed to add warehouse marker:', e);
        }
      });
    };

    if (!layerRef.current) {
      try {
        layerRef.current = L.layerGroup().addTo(map);
      } catch (e) {
        console.error('[ServiceAreasLayer] Failed to initialize layer:', e);
        return;
      }
    }

    renderServiceAreas();

    return () => {
      layerRef.current?.clearLayers();
    };
  }, [map, serviceAreas, serviceAreaPolygons, selectedId, onServiceAreaClick]);

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
