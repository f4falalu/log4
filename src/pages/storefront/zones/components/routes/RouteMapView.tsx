import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Layers, Map as MapIcon } from 'lucide-react';
import { RoutePolylinesLayer } from '@/components/map/layers/RoutePolylinesLayer';
import { ServiceAreasLayer } from '@/components/map/layers/ServiceAreasLayer';
import { ZoneBoundariesLayer, type ZoneBoundaryData } from '@/components/map/layers/ZoneBoundariesLayer';
import { MapInsightsOverlay, type RouteInsightsData } from '@/components/map/overlays/MapInsightsOverlay';
import { useRoutes } from '@/hooks/useRoutes';
import { useServiceAreas } from '@/hooks/useServiceAreas';
import { useOperationalZones } from '@/hooks/useOperationalZones';
import { supabase } from '@/integrations/supabase/client';
import { computeConvexHull } from '@/lib/algorithms/convexHull';
import { calculateDistance } from '@/lib/routeOptimization';
import { getRoadRoute } from '@/lib/geoapify';
import type { Route } from '@/types/routes';
import type { FacilityClickPayload } from '@/components/map/layers/RoutePolylinesLayer';
import type { ServiceAreaPolygon } from '@/components/map/layers/ServiceAreasLayer';

// Default center: Kano, Nigeria
const DEFAULT_CENTER: [number, number] = [12.0, 8.52];
const DEFAULT_ZOOM = 10;

interface RouteMapViewProps {
  onRouteClick?: (route: Route) => void;
}

export function RouteMapView({ onRouteClick }: RouteMapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [showServiceAreas, setShowServiceAreas] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [selectedFacility, setSelectedFacility] = useState<FacilityClickPayload | null>(null);
  const [selectedRouteInsights, setSelectedRouteInsights] = useState<RouteInsightsData | null>(null);

  const { data: routes } = useRoutes();
  const { data: serviceAreas } = useServiceAreas();
  const { data: operationalZones } = useOperationalZones();

  // ── Route facilities batch query ──
  const routeIds = useMemo(() => (routes || []).map(r => r.id), [routes]);

  const { data: allRouteFacilities } = useQuery({
    queryKey: ['route-facilities-batch', routeIds],
    queryFn: async () => {
      if (routeIds.length === 0) return [];
      const { data, error } = await supabase
        .from('route_facilities')
        .select(`
          route_id,
          sequence_order,
          facilities:facility_id (name, lat, lng, type, lga)
        `)
        .in('route_id', routeIds)
        .order('sequence_order', { ascending: true });

      if (error) throw error;
      return data as Array<{
        route_id: string;
        sequence_order: number;
        facilities: { name: string; lat: number; lng: number; type: string; lga: string | null } | null;
      }>;
    },
    enabled: routeIds.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  // ── Service area facilities batch query ──
  const serviceAreaIds = useMemo(() => (serviceAreas || []).map(sa => sa.id), [serviceAreas]);

  const { data: allSAFacilities } = useQuery({
    queryKey: ['service-area-facilities-batch', serviceAreaIds],
    queryFn: async () => {
      if (serviceAreaIds.length === 0) return [];
      const { data, error } = await supabase
        .from('service_area_facilities')
        .select(`
          service_area_id,
          facilities:facility_id (name, lat, lng)
        `)
        .in('service_area_id', serviceAreaIds);

      if (error) throw error;
      return data as Array<{
        service_area_id: string;
        facilities: { name: string; lat: number; lng: number } | null;
      }>;
    },
    enabled: serviceAreaIds.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  // ── Initialize map ──
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  // ── Group route facilities by route_id ──
  const facilitiesByRoute = useMemo(() => {
    const m = new Map<string, Array<{ lat: number; lng: number; name: string; sequence_order: number; type?: string; lga?: string }>>();
    (allRouteFacilities || []).forEach(rf => {
      if (!rf.facilities || rf.facilities.lat == null || rf.facilities.lng == null) return;
      const list = m.get(rf.route_id) || [];
      list.push({
        lat: rf.facilities.lat,
        lng: rf.facilities.lng,
        name: rf.facilities.name,
        sequence_order: rf.sequence_order,
        type: rf.facilities.type,
        lga: rf.facilities.lga ?? undefined,
      });
      m.set(rf.route_id, list);
    });
    return m;
  }, [allRouteFacilities]);

  // ── On-the-fly road geometry fetching for routes that lack it ──
  const [fetchedGeometries, setFetchedGeometries] = useState<
    Record<string, { type: string; coordinates: Array<[number, number]> }>
  >({});
  const handledRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!routes || routes.length === 0) return;

    const routesNeedingGeometry = routes.filter(route => {
      if (route.optimized_geometry) return false;
      if (handledRef.current.has(route.id)) return false;

      const wh = route.warehouses;
      if (!wh || wh.lat == null || wh.lng == null) return false;

      const facilities = facilitiesByRoute.get(route.id) || [];
      return facilities.length >= 1;
    });

    if (routesNeedingGeometry.length === 0) return;

    // Mark all as handled immediately to prevent re-fetching
    routesNeedingGeometry.forEach(r => handledRef.current.add(r.id));

    // Fetch road geometry for each route in parallel (max 3)
    const batch = routesNeedingGeometry.slice(0, 3);

    Promise.all(
      batch.map(async (route) => {
        const wh = route.warehouses!;
        const facilities = facilitiesByRoute.get(route.id) || [];
        const sorted = [...facilities].sort((a, b) => a.sequence_order - b.sequence_order);

        const waypoints = [
          { lat: wh.lat!, lng: wh.lng! },
          ...sorted.map(f => ({ lat: f.lat, lng: f.lng })),
          { lat: wh.lat!, lng: wh.lng! },
        ];

        try {
          const road = await getRoadRoute(waypoints);
          if (road && road.geometry.length > 0) {
            const geometry = { type: 'LineString' as const, coordinates: road.geometry };
            return { routeId: route.id, geometry, road };
          }
        } catch (err) {
          console.error(`[RouteMapView] Road route fetch failed for ${route.id}:`, err);
        }
        return null;
      })
    ).then(results => {
      const newGeometries: Record<string, { type: string; coordinates: Array<[number, number]> }> = {};
      let hasNew = false;

      for (const r of results) {
        if (!r) continue;
        hasNew = true;
        newGeometries[r.routeId] = r.geometry;

        // Persist to DB (fire-and-forget)
        supabase
          .from('routes')
          .update({
            optimized_geometry: r.geometry,
            total_distance_km: r.road.roadDistanceKm,
            estimated_duration_min: r.road.roadTimeMinutes,
          })
          .eq('id', r.routeId)
          .then(({ error }) => {
            if (error) console.error(`[RouteMapView] Failed to persist geometry for ${r.routeId}:`, error);
          });
      }

      if (hasNew) {
        setFetchedGeometries(prev => ({ ...prev, ...newGeometries }));
      }
    });
  }, [routes, facilitiesByRoute]); // no fetchedGeometries dep — use handledRef instead

  const routePolylineData = useMemo(() => (routes || []).map((route) => ({
    id: route.id,
    name: route.name,
    status: route.status,
    is_sandbox: route.is_sandbox,
    warehouse: route.warehouses && route.warehouses.lat != null && route.warehouses.lng != null
      ? { lat: route.warehouses.lat, lng: route.warehouses.lng, name: route.warehouses.name }
      : null,
    facilities: facilitiesByRoute.get(route.id) || [],
    optimized_geometry: (route.optimized_geometry as { type: string; coordinates: Array<[number, number]> } | null)
      || fetchedGeometries[route.id]
      || null,
  })), [routes, facilitiesByRoute, fetchedGeometries]);

  // ── Group SA facilities by service_area_id ──
  const facilitiesBySA = useMemo(() => {
    const m = new Map<string, Array<{ lat: number; lng: number; name: string }>>();
    (allSAFacilities || []).forEach(saf => {
      if (!saf.facilities || saf.facilities.lat == null || saf.facilities.lng == null) return;
      const list = m.get(saf.service_area_id) || [];
      list.push({ lat: saf.facilities.lat, lng: saf.facilities.lng, name: saf.facilities.name });
      m.set(saf.service_area_id, list);
    });
    return m;
  }, [allSAFacilities]);

  // ── Build SA spoke-line data ──
  const serviceAreaLayerData = useMemo(() => (serviceAreas || []).map(sa => ({
    id: sa.id,
    name: sa.name,
    service_type: sa.service_type,
    color: (sa.metadata as Record<string, any>)?.color as string | undefined,
    warehouse: sa.warehouses && sa.warehouses.lat != null && sa.warehouses.lng != null
      ? { lat: sa.warehouses.lat, lng: sa.warehouses.lng, name: sa.warehouses.name }
      : null,
    facilities: facilitiesBySA.get(sa.id) || [],
  })), [serviceAreas, facilitiesBySA]);

  // ── Compute SA convex hulls ──
  const serviceAreaPolygons: ServiceAreaPolygon[] = useMemo(() => {
    return (serviceAreas || [])
      .map(sa => {
        const facilities = facilitiesBySA.get(sa.id) || [];
        const points = [...facilities];
        if (sa.warehouses?.lat != null && sa.warehouses?.lng != null) {
          points.push({ lat: sa.warehouses.lat, lng: sa.warehouses.lng, name: sa.warehouses.name });
        }
        return {
          id: sa.id,
          name: sa.name,
          color: (sa.metadata as Record<string, any>)?.color as string | undefined,
          hull: computeConvexHull(points),
          facilityCount: facilities.length,
        };
      })
      .filter(sa => sa.hull.length >= 3);
  }, [serviceAreas, facilitiesBySA]);

  // ── Extract zone boundaries from metadata.geometry ──
  const zoneBoundaries: ZoneBoundaryData[] = useMemo(() => {
    return (operationalZones || [])
      .filter(z => z.metadata?.geometry?.coordinates)
      .map(z => ({
        id: z.id,
        name: z.name,
        code: z.code,
        geometry: z.metadata.geometry as GeoJSON.Polygon,
        color: z.metadata.color as string | undefined,
      }));
  }, [operationalZones]);

  // ── Handlers ──
  const handleFacilityClick = (payload: FacilityClickPayload) => {
    setSelectedFacility(payload);
    setSelectedRouteInsights(null);
  };

  const handleRouteClick = (routeId: string) => {
    const route = routes?.find(r => r.id === routeId);
    if (!route) return;

    const facilities = facilitiesByRoute.get(route.id) || [];
    const wh = route.warehouses;

    // Compute total distance along route path
    let totalDist: number | null = route.total_distance_km;
    if (totalDist == null && facilities.length > 0 && wh?.lat != null && wh?.lng != null) {
      const sorted = [...facilities].sort((a, b) => a.sequence_order - b.sequence_order);
      let dist = calculateDistance(wh.lat, wh.lng, sorted[0].lat, sorted[0].lng);
      for (let i = 1; i < sorted.length; i++) {
        dist += calculateDistance(sorted[i - 1].lat, sorted[i - 1].lng, sorted[i].lat, sorted[i].lng);
      }
      totalDist = Math.round(dist * 10) / 10;
    }

    setSelectedRouteInsights({
      routeId: route.id,
      routeName: route.name,
      status: route.status,
      isSandbox: route.is_sandbox,
      facilityCount: facilities.length,
      totalDistanceKm: totalDist,
      estimatedDurationMin: route.estimated_duration_min,
      warehouseName: wh?.name || 'Unknown',
      warehouseLat: wh?.lat ?? 0,
      warehouseLng: wh?.lng ?? 0,
      facilities: facilities.map(f => ({ lat: f.lat, lng: f.lng, name: f.name })),
    });
    setSelectedFacility(null);

    if (route && onRouteClick) onRouteClick(route);
  };

  const handleCloseInsights = () => {
    setSelectedFacility(null);
    setSelectedRouteInsights(null);
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="relative">
          <div
            ref={mapContainerRef}
            className="w-full h-[600px] rounded-lg overflow-hidden"
          />

          {/* Layer toggles */}
          <div className="absolute top-3 left-12 z-[1000] flex gap-1.5">
            <Button
              variant={showZones ? 'default' : 'outline'}
              size="sm"
              className="h-8 gap-1.5 shadow-md"
              onClick={() => setShowZones(prev => !prev)}
            >
              <MapIcon className="h-3.5 w-3.5" />
              Zones
            </Button>
            <Button
              variant={showServiceAreas ? 'default' : 'outline'}
              size="sm"
              className="h-8 gap-1.5 shadow-md"
              onClick={() => setShowServiceAreas(prev => !prev)}
            >
              <Layers className="h-3.5 w-3.5" />
              Areas
            </Button>
          </div>

          {/* Insights overlay */}
          {(selectedFacility || selectedRouteInsights) && (
            <div className="absolute top-3 right-3 z-[1000] w-72">
              <MapInsightsOverlay
                selectedFacility={selectedFacility}
                selectedRoute={selectedRouteInsights}
                onClose={handleCloseInsights}
              />
            </div>
          )}

          {/* Zone boundaries layer (bottom-most) */}
          {mapReady && mapRef.current && showZones && zoneBoundaries.length > 0 && (
            <ZoneBoundariesLayer
              map={mapRef.current}
              zones={zoneBoundaries}
            />
          )}

          {/* Service areas layer */}
          {mapReady && mapRef.current && showServiceAreas && serviceAreaLayerData.length > 0 && (
            <ServiceAreasLayer
              map={mapRef.current}
              serviceAreas={serviceAreaLayerData}
              serviceAreaPolygons={serviceAreaPolygons}
            />
          )}

          {/* Route polylines layer (top-most) */}
          {mapReady && mapRef.current && routePolylineData.length > 0 && (
            <RoutePolylinesLayer
              map={mapRef.current}
              routes={routePolylineData}
              onRouteClick={handleRouteClick}
              onFacilityClick={handleFacilityClick}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
