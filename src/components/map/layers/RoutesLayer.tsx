import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { RouteOptimization, Warehouse } from '@/types';

interface RoutesLayerProps {
  map: L.Map | null;
  routes: RouteOptimization[];
  warehouses: Warehouse[];
}

export function RoutesLayer({ map, routes, warehouses }: RoutesLayerProps) {
  const layerRef = useRef<L.LayerGroup | null>(null);
  const linesRef = useRef<L.Polyline[]>([]);

  useEffect(() => {
    if (!map) return;

    // Initialize layer group if needed
    if (!layerRef.current) {
      layerRef.current = L.layerGroup().addTo(map);
    }

    // Clear existing lines
    layerRef.current.clearLayers();
    linesRef.current = [];

    // Add route lines
    routes.forEach((route, index) => {
      if (!layerRef.current || route.facilities.length === 0) return;

      const warehouse = warehouses.find(w => w.id === route.warehouseId);
      if (!warehouse) return;

      // Create route path: warehouse -> facilities
      const routeCoords: [number, number][] = [[warehouse.lat, warehouse.lng]];
      route.facilities.forEach(facility => {
        routeCoords.push([facility.lat, facility.lng]);
      });

      // Different colors for different routes
      const colors = ['hsl(195 100% 28%)', 'hsl(180 100% 25%)', 'hsl(140 60% 40%)'];
      const color = colors[index % colors.length];

      const polyline = L.polyline(routeCoords, {
        color: color,
        weight: 3,
        opacity: 0.8,
        dashArray: '10, 10'
      });

      polyline.addTo(layerRef.current);
      linesRef.current.push(polyline);
    });

    return () => {
      layerRef.current?.clearLayers();
    };
  }, [map, routes, warehouses]);

  // Cleanup on unmount
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
