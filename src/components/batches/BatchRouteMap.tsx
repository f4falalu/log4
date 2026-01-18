import { useEffect, useRef, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTheme } from 'next-themes';
import { MAP_CONFIG, getMapLibreStyle } from '@/lib/mapConfig';
import type { Facility, Warehouse } from '@/types';

interface BatchRouteMapProps {
  facilities: Facility[];
  warehouse?: Warehouse | null;
  optimizedRoute?: [number, number][];
  className?: string;
}

export function BatchRouteMap({
  facilities,
  warehouse,
  optimizedRoute,
  className = '',
}: BatchRouteMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const { theme } = useTheme();

  // Calculate map bounds to fit all points
  const bounds = useMemo(() => {
    const points: [number, number][] = [];

    if (warehouse) {
      points.push([warehouse.lng, warehouse.lat]);
    }

    facilities.forEach((f) => {
      if (f.lng && f.lat) {
        points.push([f.lng, f.lat]);
      }
    });

    if (points.length === 0) {
      return null;
    }

    const lngs = points.map((p) => p[0]);
    const lats = points.map((p) => p[1]);

    return {
      sw: [Math.min(...lngs), Math.min(...lats)] as [number, number],
      ne: [Math.max(...lngs), Math.max(...lats)] as [number, number],
    };
  }, [facilities, warehouse]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: getMapLibreStyle(theme as 'light' | 'dark' | 'system' | undefined),
      center: bounds
        ? [(bounds.sw[0] + bounds.ne[0]) / 2, (bounds.sw[1] + bounds.ne[1]) / 2]
        : MAP_CONFIG.defaultCenter,
      zoom: 10,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [theme]);

  // Fit bounds when data changes
  useEffect(() => {
    if (!mapRef.current || !bounds) return;

    const map = mapRef.current;

    // Add padding for better view
    map.fitBounds([bounds.sw, bounds.ne], {
      padding: { top: 40, bottom: 40, left: 40, right: 40 },
      maxZoom: 14,
    });
  }, [bounds]);

  // Add markers and route line
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Wait for map to be loaded
    const addMarkersAndRoute = () => {
      // Add warehouse marker
      if (warehouse) {
        const el = document.createElement('div');
        el.className = 'warehouse-marker';
        el.innerHTML = `
          <div style="
            width: 32px;
            height: 32px;
            background: #3b82f6;
            border: 3px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            font-size: 14px;
          ">🏭</div>
        `;

        const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 4px;">
            <strong>${warehouse.name}</strong>
            <div style="font-size: 12px; color: #666;">Origin Warehouse</div>
          </div>
        `);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([warehouse.lng, warehouse.lat])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.push(marker);
      }

      // Add facility markers with numbers
      facilities.forEach((facility, index) => {
        if (!facility.lng || !facility.lat) return;

        const el = document.createElement('div');
        el.className = 'facility-marker';
        el.innerHTML = `
          <div style="
            width: 28px;
            height: 28px;
            background: #10b981;
            border: 2px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 6px rgba(0,0,0,0.25);
            color: white;
            font-weight: bold;
            font-size: 12px;
          ">${index + 1}</div>
        `;

        const popup = new maplibregl.Popup({ offset: 20 }).setHTML(`
          <div style="padding: 4px;">
            <strong>${facility.name}</strong>
            <div style="font-size: 12px; color: #666;">${facility.address || 'No address'}</div>
            <div style="font-size: 11px; color: #888; margin-top: 2px;">Stop #${index + 1}</div>
          </div>
        `);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([facility.lng, facility.lat])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.push(marker);
      });

      // Add route line if available
      if (optimizedRoute && optimizedRoute.length > 1) {
        // Remove existing route layer/source
        if (map.getLayer('route-line')) {
          map.removeLayer('route-line');
        }
        if (map.getSource('route')) {
          map.removeSource('route');
        }

        map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: optimizedRoute,
            },
          },
        });

        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#3b82f6',
            'line-width': 3,
            'line-opacity': 0.7,
          },
        });
      } else if (facilities.length > 0 || warehouse) {
        // Create a simple line connecting all points in order
        const lineCoordinates: [number, number][] = [];

        if (warehouse) {
          lineCoordinates.push([warehouse.lng, warehouse.lat]);
        }

        facilities.forEach((f) => {
          if (f.lng && f.lat) {
            lineCoordinates.push([f.lng, f.lat]);
          }
        });

        if (lineCoordinates.length > 1) {
          // Remove existing route layer/source
          if (map.getLayer('route-line')) {
            map.removeLayer('route-line');
          }
          if (map.getSource('route')) {
            map.removeSource('route');
          }

          map.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: lineCoordinates,
              },
            },
          });

          map.addLayer({
            id: 'route-line',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#3b82f6',
              'line-width': 2,
              'line-opacity': 0.5,
              'line-dasharray': [2, 2],
            },
          });
        }
      }
    };

    if (map.isStyleLoaded()) {
      addMarkersAndRoute();
    } else {
      map.on('load', addMarkersAndRoute);
    }
  }, [facilities, warehouse, optimizedRoute]);

  return (
    <div
      ref={mapContainerRef}
      className={`w-full h-full min-h-[200px] rounded-lg overflow-hidden ${className}`}
    />
  );
}

export default BatchRouteMap;
