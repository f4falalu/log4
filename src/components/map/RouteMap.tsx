// MOD4 Route Map
// MapLibre-based route visualization with offline support

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Facility } from '@/lib/db/schema';
import { useGpsTelemetry } from '@/lib/gps/telemetry';
import { cn } from '@/lib/utils';
import { getMarkerHtml } from './LocationIcon';

export interface AlternateRoute {
  id: string;
  polyline: string;
  duration: string;
  distance: string;
  isSelected: boolean;
}

interface RouteMapProps {
  facilities: Facility[];
  routePolyline?: string;
  className?: string;
  showUserLocation?: boolean;
  onFacilityClick?: (facility: Facility, position: { x: number; y: number }) => void;
  mapLayer?: string;
  selectedRouteIndex?: number;
  alternateRoutes?: AlternateRoute[];
  activeFacilityId?: string;
  navigationMode?: boolean;
}

// Decode polyline (Google format) to coordinates
function decodePolyline(encoded: string): [number, number][] {
  const coords: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    coords.push([lng / 1e5, lat / 1e5]);
  }

  return coords;
}

// Generate mock route between facilities
function generateMockRoute(facilities: Facility[]): [number, number][] {
  if (facilities.length < 2) return [];
  
  const route: [number, number][] = [];
  
  for (let i = 0; i < facilities.length - 1; i++) {
    const start = facilities[i];
    const end = facilities[i + 1];
    
    // Add start point
    route.push([start.lng, start.lat]);
    
    // Add intermediate points for smoother line
    const steps = 5;
    for (let j = 1; j < steps; j++) {
      const t = j / steps;
      const lat = start.lat + (end.lat - start.lat) * t;
      const lng = start.lng + (end.lng - start.lng) * t;
      // Add small random offset for more natural look
      route.push([lng + (Math.random() - 0.5) * 0.002, lat + (Math.random() - 0.5) * 0.002]);
    }
  }
  
  // Add last facility
  const last = facilities[facilities.length - 1];
  route.push([last.lng, last.lat]);
  
  return route;
}

export function RouteMap({ 
  facilities, 
  routePolyline,
  className,
  showUserLocation = true,
  onFacilityClick,
  mapLayer = 'default',
  selectedRouteIndex = 0,
  alternateRoutes = [],
  activeFacilityId,
  navigationMode = false
}: RouteMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const userMarker = useRef<maplibregl.Marker | null>(null);
  const vehicleMarker = useRef<maplibregl.Marker | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const { position, isTracking, startTracking } = useGpsTelemetry();

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Calculate bounds from facilities
    const bounds = new maplibregl.LngLatBounds();
    facilities.forEach(f => bounds.extend([f.lng, f.lat]));

    // Get map style based on layer
    const getMapStyle = () => {
      switch (mapLayer) {
        case 'satellite':
          return {
            version: 8 as const,
            sources: {
              'satellite': {
                type: 'raster' as const,
                tiles: [
                  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                ],
                tileSize: 256,
                attribution: '© Esri'
              }
            },
            layers: [
              {
                id: 'satellite-layer',
                type: 'raster' as const,
                source: 'satellite',
                minzoom: 0,
                maxzoom: 19
              }
            ]
          };
        case 'terrain':
          return {
            version: 8 as const,
            sources: {
              'terrain': {
                type: 'raster' as const,
                tiles: [
                  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
                ],
                tileSize: 256,
                attribution: '© Esri'
              }
            },
            layers: [
              {
                id: 'terrain-layer',
                type: 'raster' as const,
                source: 'terrain',
                minzoom: 0,
                maxzoom: 19
              }
            ]
          };
        default:
          return {
            version: 8 as const,
            sources: {
              'carto-dark': {
                type: 'raster' as const,
                tiles: [
                  'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'
                ],
                tileSize: 256,
                attribution: '© CARTO'
              }
            },
            layers: [
              {
                id: 'carto-dark-layer',
                type: 'raster' as const,
                source: 'carto-dark',
                minzoom: 0,
                maxzoom: 19
              }
            ]
          };
      }
    };

    // Create map with selected style
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: getMapStyle(),
      bounds: facilities.length > 0 ? bounds : undefined,
      fitBoundsOptions: { padding: 60 },
      center: facilities.length > 0 ? [facilities[0].lng, facilities[0].lat] : [7.49, 9.06],
      zoom: 12,
      attributionControl: false,
    });

    map.current.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      'top-right'
    );

    map.current.on('load', () => {
      setIsLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update map style when layer changes
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    const getMapStyle = () => {
      switch (mapLayer) {
        case 'satellite':
          return {
            version: 8 as const,
            sources: {
              'satellite': {
                type: 'raster' as const,
                tiles: [
                  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                ],
                tileSize: 256,
                attribution: '© Esri'
              }
            },
            layers: [
              {
                id: 'satellite-layer',
                type: 'raster' as const,
                source: 'satellite',
                minzoom: 0,
                maxzoom: 19
              }
            ]
          };
        case 'terrain':
          return {
            version: 8 as const,
            sources: {
              'terrain': {
                type: 'raster' as const,
                tiles: [
                  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
                ],
                tileSize: 256,
                attribution: '© Esri'
              }
            },
            layers: [
              {
                id: 'terrain-layer',
                type: 'raster' as const,
                source: 'terrain',
                minzoom: 0,
                maxzoom: 19
              }
            ]
          };
        default:
          return {
            version: 8 as const,
            sources: {
              'carto-dark': {
                type: 'raster' as const,
                tiles: [
                  'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'
                ],
                tileSize: 256,
                attribution: '© CARTO'
              }
            },
            layers: [
              {
                id: 'carto-dark-layer',
                type: 'raster' as const,
                source: 'carto-dark',
                minzoom: 0,
                maxzoom: 19
              }
            ]
          };
      }
    };

    map.current.setStyle(getMapStyle());
  }, [mapLayer, isLoaded]);

  // Add route and markers when map is loaded
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    // Get route coordinates
    const routeCoords = routePolyline 
      ? decodePolyline(routePolyline)
      : generateMockRoute(facilities);

    // Add route line
    if (routeCoords.length > 0) {
      if (map.current.getSource('route')) {
        (map.current.getSource('route') as maplibregl.GeoJSONSource).setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: routeCoords
          }
        });
      } else {
        map.current.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: routeCoords
            }
          }
        });

        // Route glow effect
        map.current.addLayer({
          id: 'route-glow',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#f97316',
            'line-width': 8,
            'line-opacity': 0.3,
            'line-blur': 3
          }
        });

        // Main route line
        map.current.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#f97316',
            'line-width': 4,
            'line-opacity': 0.9
          }
        });
      }
    }

    // Clear existing markers we created (facility + vehicle)
    if (mapContainer.current) {
      mapContainer.current
        .querySelectorAll('.facility-marker, .vehicle-marker')
        .forEach((el) => el.remove());
    }

    // Add facility markers with type-based icons
    facilities.forEach((facility, index) => {
      const el = document.createElement('div');
      el.className = 'facility-marker';
      
      // Use type-based marker HTML
      el.innerHTML = getMarkerHtml(facility.type, index);
      el.style.cursor = 'pointer';
      
      el.addEventListener('click', (e) => {
        const rect = mapContainer.current?.getBoundingClientRect();
        const x = e.clientX - (rect?.left || 0);
        const y = e.clientY - (rect?.top || 0);
        onFacilityClick?.(facility, { x, y });
      });

      new maplibregl.Marker({ element: el })
        .setLngLat([facility.lng, facility.lat])
        .addTo(map.current!);
    });

  }, [isLoaded, facilities, routePolyline, onFacilityClick, mapLayer, selectedRouteIndex, alternateRoutes]);

  // Vehicle marker & navigation focus
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    // Determine target coordinate for vehicle/destination
    let targetLngLat: [number, number] | null = null;

    if (navigationMode && activeFacilityId) {
      const active = facilities.find((f) => f.id === activeFacilityId);
      if (active) {
        targetLngLat = [active.lng, active.lat];
      }
    } else if (!navigationMode && facilities.length > 0) {
      // Default to first facility when not actively navigating
      targetLngLat = [facilities[0].lng, facilities[0].lat];
    }

    if (!targetLngLat) return;

    // Create or move vehicle marker
    if (!vehicleMarker.current) {
      const vehicleEl = document.createElement('div');
      vehicleEl.className = 'vehicle-marker';
      vehicleEl.innerHTML = `
        <div class="relative">
          <div class="absolute -inset-3 bg-blue-500/40 rounded-full animate-ping"></div>
          <div class="relative w-8 h-8 rounded-full bg-blue-600 border-2 border-white shadow-lg flex items-center justify-center">
            <span class="text-white text-lg">🚚</span>
          </div>
        </div>
      `;

      vehicleMarker.current = new maplibregl.Marker({ element: vehicleEl })
        .setLngLat(targetLngLat)
        .addTo(map.current);
    } else {
      vehicleMarker.current.setLngLat(targetLngLat);
    }

    // If in navigation mode, smoothly fly to destination
    if (navigationMode) {
      map.current.flyTo({
        center: targetLngLat,
        zoom: 15,
        speed: 0.8,
        curve: 1.4,
        essential: true,
      });
    }
  }, [activeFacilityId, navigationMode, facilities, isLoaded]);

  // Update user location marker
  useEffect(() => {
    if (!map.current || !isLoaded || !position) return;

    if (!userMarker.current) {
      const el = document.createElement('div');
      el.innerHTML = `
        <div class="relative">
          <div class="absolute -inset-2 bg-blue-500/40 rounded-full animate-ping"></div>
          <div class="relative w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg"></div>
        </div>
      `;
      
      userMarker.current = new maplibregl.Marker({ element: el })
        .setLngLat([position.lng, position.lat])
        .addTo(map.current);
    } else {
      userMarker.current.setLngLat([position.lng, position.lat]);
    }
  }, [isLoaded, position]);

  // Start tracking when component mounts
  useEffect(() => {
    if (showUserLocation && !isTracking) {
      startTracking();
    }
  }, [showUserLocation, isTracking, startTracking]);

  return (
    <div className={cn("relative w-full h-full", className)}>
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Loading overlay */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Loading map...</span>
          </div>
        </div>
      )}
    </div>
  );
}
