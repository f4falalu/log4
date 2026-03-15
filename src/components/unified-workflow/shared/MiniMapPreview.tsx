/**
 * =====================================================
 * Mini Map Preview
 * =====================================================
 * Real MapLibre map preview for the unified workflow.
 * Shows facility markers, warehouse marker, and road route line.
 * Uses Geoapify/OSRM road routing (same as SandboxRouteBuilder).
 */

import * as React from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Route, Maximize2, Minimize2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tw } from '@/lib/colors';
import { useTheme } from 'next-themes';
import { getMapLibreStyle, MAP_CONFIG } from '@/lib/mapConfig';
import { getRoadRoute, type RoadRouteResult } from '@/lib/geoapify';

interface MiniMapPreviewProps {
  points?: Array<{ lat: number; lng: number; name?: string }>;
  /** Optional warehouse/depot point shown as blue marker */
  depot?: { lat: number; lng: number; name?: string } | null;
  className?: string;
}

export function MiniMapPreview({ points = [], depot, className }: MiniMapPreviewProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<maplibregl.Map | null>(null);
  const markersRef = React.useRef<maplibregl.Marker[]>([]);
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [roadRoute, setRoadRoute] = React.useState<RoadRouteResult | null>(null);
  const [isFetchingRoute, setIsFetchingRoute] = React.useState(false);
  const routeKeyRef = React.useRef<string>('');

  // Compute bounds
  const allCoords = React.useMemo(() => {
    const coords: [number, number][] = [];
    if (depot) coords.push([depot.lng, depot.lat]);
    points.forEach(p => {
      if (p.lat && p.lng) coords.push([p.lng, p.lat]);
    });
    return coords;
  }, [points, depot]);

  // Fetch road route when points/depot change
  React.useEffect(() => {
    if (!depot || points.length === 0) {
      setRoadRoute(null);
      return;
    }

    const validPoints = points.filter(p => p.lat && p.lng);
    if (validPoints.length === 0) {
      setRoadRoute(null);
      return;
    }

    // Build a key to avoid duplicate fetches
    const key = `${depot.lat},${depot.lng}|${validPoints.map(p => `${p.lat},${p.lng}`).join('|')}`;
    if (key === routeKeyRef.current) return;
    routeKeyRef.current = key;

    setIsFetchingRoute(true);

    // Build waypoints: depot → facilities → depot (round trip)
    const waypoints = [
      { lat: depot.lat, lng: depot.lng },
      ...validPoints.map(p => ({ lat: p.lat, lng: p.lng })),
      { lat: depot.lat, lng: depot.lng }, // return to depot
    ];

    getRoadRoute(waypoints)
      .then(route => {
        setRoadRoute(route);
      })
      .catch(err => {
        console.error('MiniMap road route fetch failed:', err);
        setRoadRoute(null);
      })
      .finally(() => setIsFetchingRoute(false));
  }, [depot, points]);

  // Initialize map
  React.useEffect(() => {
    if (!containerRef.current || allCoords.length === 0) return;

    const lngs = allCoords.map(c => c[0]);
    const lats = allCoords.map(c => c[1]);
    const center: [number, number] =
      allCoords.length > 0
        ? [(Math.min(...lngs) + Math.max(...lngs)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2]
        : MAP_CONFIG.defaultCenter;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getMapLibreStyle(theme as 'light' | 'dark' | 'system' | undefined),
      center,
      zoom: 10,
      attributionControl: false,
      interactive: true,
    });

    // Add navigation control (zoom buttons)
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    mapRef.current = map;

    map.on('load', () => {
      // Fit bounds
      if (allCoords.length > 1) {
        const sw: [number, number] = [Math.min(...lngs), Math.min(...lats)];
        const ne: [number, number] = [Math.max(...lngs), Math.max(...lats)];
        map.fitBounds([sw, ne], { padding: 30, maxZoom: 13 });
      }

      // Add route line — prefer road route, fallback to straight line
      const lineCoords: [number, number][] = roadRoute
        ? roadRoute.geometry
        : (() => {
            const straight: [number, number][] = [];
            if (depot) straight.push([depot.lng, depot.lat]);
            points.forEach(p => {
              if (p.lat && p.lng) straight.push([p.lng, p.lat]);
            });
            return straight;
          })();

      if (lineCoords.length > 1) {
        map.addSource('preview-route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: lineCoords },
          },
        });
        map.addLayer({
          id: 'preview-route-line',
          type: 'line',
          source: 'preview-route',
          paint: {
            'line-color': roadRoute ? tw.blue[600] : tw.blue[500],
            'line-width': roadRoute ? 3 : 2,
            'line-opacity': roadRoute ? 0.8 : 0.5,
            ...(roadRoute ? {} : { 'line-dasharray': [2, 2] as number[] }),
          },
        });
      }

      // Add snapped waypoint connectors (thin dashed lines from marker to road snap)
      if (roadRoute?.snappedWaypoints && roadRoute.snappedWaypoints.length > 0) {
        const connectorFeatures: GeoJSON.Feature[] = [];
        const allWaypoints = [
          ...(depot ? [{ lat: depot.lat, lng: depot.lng }] : []),
          ...points.filter(p => p.lat && p.lng),
        ];

        allWaypoints.forEach((wp, idx) => {
          if (idx < roadRoute.snappedWaypoints.length) {
            const snapped = roadRoute.snappedWaypoints[idx];
            connectorFeatures.push({
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: [[wp.lng, wp.lat], snapped],
              },
            });
          }
        });

        if (connectorFeatures.length > 0) {
          map.addSource('snap-connectors', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: connectorFeatures },
          });
          map.addLayer({
            id: 'snap-connector-lines',
            type: 'line',
            source: 'snap-connectors',
            paint: {
              'line-color': tw.emerald[400],
              'line-width': 1,
              'line-opacity': 0.6,
              'line-dasharray': [3, 3],
            },
          });
        }
      }

      // Depot marker
      if (depot) {
        const el = document.createElement('div');
        el.innerHTML = `<div style="
          width:24px;height:24px;background:${tw.blue[500]};
          border:2px solid white;border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 1px 4px rgba(0,0,0,0.3);font-size:10px;
        ">🏭</div>`;
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([depot.lng, depot.lat])
          .addTo(map);

        if (depot.name) {
          marker.setPopup(new maplibregl.Popup({ offset: 15 }).setHTML(
            `<div style="font-size:12px;font-weight:600;">${depot.name}</div><div style="font-size:11px;color:#666;">Depot</div>`
          ));
        }
        markersRef.current.push(marker);
      }

      // Facility markers with popups
      points.forEach((p, i) => {
        if (!p.lat || !p.lng) return;
        const el = document.createElement('div');
        el.innerHTML = `<div style="
          width:20px;height:20px;background:${tw.emerald[500]};
          border:2px solid white;border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 1px 4px rgba(0,0,0,0.2);
          color:white;font-weight:bold;font-size:9px;
          cursor:pointer;
        ">${i + 1}</div>`;
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([p.lng, p.lat])
          .addTo(map);

        if (p.name) {
          marker.setPopup(new maplibregl.Popup({ offset: 15 }).setHTML(
            `<div style="font-size:12px;font-weight:600;">${p.name}</div><div style="font-size:11px;color:#666;">Stop ${i + 1}</div>`
          ));
        }
        markersRef.current.push(marker);
      });

      // Show route info overlay if road route is available
      if (roadRoute) {
        const infoEl = document.createElement('div');
        infoEl.style.cssText = 'position:absolute;bottom:8px;left:8px;background:rgba(255,255,255,0.92);padding:4px 8px;border-radius:4px;font-size:11px;box-shadow:0 1px 3px rgba(0,0,0,0.15);pointer-events:none;z-index:1;';
        infoEl.innerHTML = `<span style="font-weight:600;">${roadRoute.roadDistanceKm} km</span> · <span style="color:#666;">${roadRoute.roadTimeMinutes} min</span>`;
        containerRef.current?.appendChild(infoEl);
      }
    });

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [theme, allCoords, depot, points, roadRoute]);

  // Handle expand/collapse - resize map
  React.useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => mapRef.current?.resize(), 100);
    }
  }, [isExpanded]);

  if (allCoords.length === 0) {
    return (
      <div
        className={cn(
          'aspect-[4/3] bg-muted rounded-lg flex items-center justify-center border border-dashed',
          className
        )}
      >
        <div className="text-center text-muted-foreground">
          <Route className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-xs">Add facilities to see route preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative', isExpanded ? 'fixed inset-4 z-50 rounded-lg shadow-2xl' : '', className)}>
      {/* Loading indicator for road route */}
      {isFetchingRoute && (
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-white/90 rounded px-2 py-1 text-xs text-muted-foreground shadow-sm">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading road path...
        </div>
      )}

      {/* Expand/collapse control */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute top-2 left-2 z-10 flex items-center justify-center w-7 h-7 bg-white rounded shadow-sm hover:bg-gray-50 transition-colors"
        style={{ boxShadow: '0 0 0 2px rgba(0,0,0,0.1)' }}
        title={isExpanded ? 'Collapse map' : 'Expand map'}
      >
        {isExpanded ? (
          <Minimize2 className="h-3.5 w-3.5 text-gray-700" />
        ) : (
          <Maximize2 className="h-3.5 w-3.5 text-gray-700" />
        )}
      </button>

      {/* Backdrop when expanded */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/40 z-[-1]"
          onClick={() => setIsExpanded(false)}
        />
      )}

      <div
        ref={containerRef}
        className={cn(
          'rounded-lg overflow-hidden border',
          isExpanded ? 'w-full h-full' : 'aspect-[4/3]'
        )}
      />
    </div>
  );
}

export default MiniMapPreview;
