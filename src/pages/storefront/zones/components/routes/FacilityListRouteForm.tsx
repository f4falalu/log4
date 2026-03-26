import React, { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ArrowLeft, ArrowRight, Check, Loader2, Zap, MapPin, List, Search, TrendingUp, ChevronLeft, ChevronRight, X, Building2 } from 'lucide-react';
import { MapOverlayControls } from '@/components/map/MapOverlayControls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useOperationalZones } from '@/hooks/useOperationalZones';
import { useServiceAreas } from '@/hooks/useServiceAreas';
import { useCreateRoute } from '@/hooks/useRoutes';
import { useFacilities } from '@/hooks/useFacilities';
import { useServiceAreaFacilities } from '@/hooks/useServiceAreas';
import { computeDistanceMatrix, type GeoPoint } from '@/lib/algorithms/distanceMatrix';
import { solveTSP } from '@/lib/algorithms/tsp';
import { getRoadRoute, getAlternativeRoadRoutes, type RoadRouteResult, type AlternativeRoadRoute } from '@/lib/geoapify';
import { LeftColumn, MiddleColumn, RightColumn, ThreeColumnLayout } from '@/components/unified-workflow/schedule/ThreeColumnLayout';
import { MAP_CONFIG, getMapLibreStyle } from '@/lib/mapConfig';
import { useTheme } from 'next-themes';

type Step = 'zone-service-area' | 'facilities' | 'name-review';

const STEP_LABELS = [
  { num: 1, key: 'zone-service-area' as const, label: 'Zone & Service Area' },
  { num: 2, key: 'facilities' as const, label: 'Facilities' },
  { num: 3, key: 'name-review' as const, label: 'Name & Review' },
];

const getCurrentStepNum = (step: Step): number => {
  return STEP_LABELS.find(s => s.key === step)?.num ?? 1;
};

interface FacilityListRouteFormProps {
  onSuccess: () => void;
  isSandbox?: boolean;
}

export function FacilityListRouteForm({ onSuccess, isSandbox = false }: FacilityListRouteFormProps) {
  const [step, setStep] = useState<Step>('zone-service-area');
  const [zoneId, setZoneId] = useState('');
  const [serviceAreaId, setServiceAreaId] = useState('');
  const [facilityIds, setFacilityIds] = useState<string[]>([]);
  const [routeName, setRouteName] = useState('');
  const [facilitySearch, setFacilitySearch] = useState('');
  const [optimizedOrder, setOptimizedOrder] = useState<string[] | null>(null);
  const [optimizedDistance, setOptimizedDistance] = useState<number | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [roadRoute, setRoadRoute] = useState<RoadRouteResult | null>(null);
  const [isFetchingRoad, setIsFetchingRoad] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [focusSelected, setFocusSelected] = useState(false);

  // Per-facility road paths cache: facilityId → array of alternative road paths from warehouse/SA
  interface CardinalPath {
    routeType: string;
    geometry: Array<[number, number]>;
    distanceKm: number;
    timeMinutes: number;
  }
  const [cardinalRoads, setCardinalRoads] = useState<Record<string, CardinalPath[]>>({});
  const cardinalFetchingRef = useRef<Set<string>>(new Set());

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const { theme } = useTheme();

  const zonesQuery = useOperationalZones();
  const zones = zonesQuery.zones;
  const { data: serviceAreas } = useServiceAreas(zoneId ? { zone_id: zoneId } : undefined);
  // When a service area is selected, load only its assigned facilities instead of all 1000+
  const saFacilitiesQuery = useServiceAreaFacilities(serviceAreaId || null);
  const allFacilitiesQuery = useFacilities(serviceAreaId ? undefined : {}, undefined, 50);
  const createMutation = useCreateRoute();

  const selectedZone = zones?.find(z => z.id === zoneId);
  const selectedSA = serviceAreas?.find(sa => sa.id === serviceAreaId);
  // Use service-area-assigned facilities when available, otherwise fall back to workspace facilities
  const facilities = useMemo(() => {
    if (serviceAreaId && saFacilitiesQuery.data) {
      return saFacilitiesQuery.data
        .filter((saf: any) => saf.facilities)
        .map((saf: any) => saf.facilities);
    }
    return allFacilitiesQuery.data?.facilities ?? [];
  }, [serviceAreaId, saFacilitiesQuery.data, allFacilitiesQuery.data]);

  const filteredFacilities = useMemo(() => {
    const q = facilitySearch.trim().toLowerCase();
    if (!q) return facilities;
    return facilities.filter((f: any) => {
      return (
        f.name?.toLowerCase().includes(q) ||
        f.lga?.toLowerCase().includes(q) ||
        f.level_of_care?.toLowerCase().includes(q) ||
        f.warehouse_code?.toLowerCase().includes(q)
      );
    });
  }, [facilities, facilitySearch]);

  useEffect(() => {
    if (step !== 'facilities') return;
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

    mapRef.current = new maplibregl.Map({
      container: mapContainerRef.current,
      style: getMapLibreStyle(theme),
      center: [MAP_CONFIG.defaultCenter[1], MAP_CONFIG.defaultCenter[0]],
      zoom: MAP_CONFIG.defaultZoom,
    });

    mapRef.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Add GeoJSON sources/layers for road tethers and alternatives
    mapRef.current.on('load', () => {
      const m = mapRef.current;
      if (!m) return;
      m.addSource('tethers', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      m.addSource('alt-routes', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      m.addLayer({
        id: 'alt-route-lines',
        type: 'line',
        source: 'alt-routes',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['get', 'width'],
          'line-opacity': ['get', 'opacity'],
        },
      });
      m.addLayer({
        id: 'tether-lines',
        type: 'line',
        source: 'tethers',
        paint: {
          'line-color': '#3b82f6',
          'line-width': 3,
          'line-opacity': 0.8,
        },
      });

      // Click-to-reveal route info popup
      const handleRouteClick = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
        const props = e.features?.[0]?.properties;
        if (!props?.routeLabel) return;
        const timeStr = props.timeMinutes < 60
          ? `${props.timeMinutes} min`
          : `${(props.timeMinutes / 60).toFixed(1)} hrs`;
        new maplibregl.Popup({ closeButton: false, maxWidth: '200px' })
          .setLngLat(e.lngLat)
          .setHTML(`
            <div style="font-size:12px;line-height:1.4">
              <strong style="color:${props.color || '#333'}">${props.routeLabel}</strong><br/>
              ${props.distanceKm} km &middot; ${timeStr}
            </div>
          `)
          .addTo(m);
      };
      m.on('click', 'alt-route-lines', handleRouteClick);
      m.on('click', 'tether-lines', handleRouteClick);
      for (const layerId of ['alt-route-lines', 'tether-lines']) {
        m.on('mouseenter', layerId, () => { m.getCanvas().style.cursor = 'pointer'; });
        m.on('mouseleave', layerId, () => { m.getCanvas().style.cursor = ''; });
      }
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [step, theme]);

  useEffect(() => {
    if (step !== 'facilities') return;
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const points = filteredFacilities
      .filter((f: any) => typeof f.lat === 'number' && typeof f.lng === 'number')
      .filter((f: any) => !focusSelected || facilityIds.includes(f.id))
      .map((f: any) => ({
        id: f.id as string,
        name: f.name as string,
        lat: f.lat as number,
        lng: f.lng as number,
      }));

    if (points.length === 0) return;

    const bounds = new maplibregl.LngLatBounds();
    points.forEach((p) => {
      const isSelected = facilityIds.includes(p.id);
      const el = document.createElement('div');
      el.className = 'facility-marker';
      el.style.width = '12px';
      el.style.height = '12px';
      el.style.borderRadius = '9999px';
      el.style.border = '2px solid white';
      el.style.boxShadow = '0 1px 2px rgba(0,0,0,0.35)';
      el.style.background = isSelected ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))';
      el.style.cursor = 'pointer';

      el.addEventListener('click', () => {
        toggleFacility(p.id);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([p.lng, p.lat])
        .setPopup(new maplibregl.Popup({ offset: 16 }).setText(p.name))
        .addTo(map);

      markersRef.current.push(marker);
      bounds.extend([p.lng, p.lat]);
    });

    if (points.length === 1) {
      map.setCenter([points[0].lng, points[0].lat]);
      map.setZoom(12);
      return;
    }

    map.fitBounds(bounds, { padding: 48, duration: 0 });
  }, [facilityIds, filteredFacilities, step, focusSelected]);

  // Fetch road geometry for each selected facility (warehouse/SA center → facility)
  const warehouseCoords = useMemo(() => {
    if (selectedSA?.warehouses?.lat != null && selectedSA?.warehouses?.lng != null) {
      return { lat: selectedSA.warehouses.lat, lng: selectedSA.warehouses.lng };
    }
    if (selectedZone?.region_center) return selectedZone.region_center;
    return null;
  }, [selectedSA, selectedZone]);

  useEffect(() => {
    if (!warehouseCoords || facilityIds.length === 0) return;

    const needFetch = facilityIds.filter(id => {
      if (cardinalRoads[id]) return false;
      if (cardinalFetchingRef.current.has(id)) return false;
      const f = facilities.find((fac: any) => fac.id === id);
      return f && f.lat && f.lng;
    });

    if (needFetch.length === 0) return;

    needFetch.forEach(id => cardinalFetchingRef.current.add(id));

    const batch = needFetch.slice(0, 3);
    Promise.all(
      batch.map(async (facId) => {
        const f = facilities.find((fac: any) => fac.id === facId);
        if (!f || !f.lat || !f.lng) return null;
        try {
          const waypoints = [
            { lat: warehouseCoords.lat, lng: warehouseCoords.lng },
            { lat: f.lat, lng: f.lng },
          ];
          const alternatives = await getAlternativeRoadRoutes(waypoints);
          if (alternatives.length > 0) {
            const paths: CardinalPath[] = alternatives.map(alt => ({
              routeType: alt.routeType,
              geometry: alt.geometry,
              distanceKm: alt.roadDistanceKm,
              timeMinutes: alt.roadTimeMinutes,
            }));
            return { facId, paths };
          }
        } catch (err) {
          console.error(`[FacilityListRouteForm] Cardinal road fetch failed for ${facId}:`, err);
        }
        return null;
      })
    ).then(results => {
      const newRoads: Record<string, CardinalPath[]> = {};
      let hasNew = false;
      for (const r of results) {
        if (!r) continue;
        hasNew = true;
        newRoads[r.facId] = r.paths;
      }
      if (hasNew) {
        setCardinalRoads(prev => ({ ...prev, ...newRoads }));
      }
      batch.forEach(id => cardinalFetchingRef.current.delete(id));
    });
  }, [facilityIds, warehouseCoords, facilities, cardinalRoads]);

  // Route type labels and colors (matching SandboxRouteBuilder)
  const ROUTE_COLORS: Record<string, string> = {
    balanced: '#3b82f6',
    short: '#22c55e',
    less_maneuvers: '#f97316',
  };
  const ROUTE_TYPE_LABELS: Record<string, string> = {
    balanced: 'Fastest',
    short: 'Shortest',
    less_maneuvers: 'Fewest Turns',
  };

  // Update tether lines with road geometry + alt-routes for alternatives
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !warehouseCoords) return;
    if (!map.getSource('tethers')) return;

    // Use full road route if optimized
    if (roadRoute && roadRoute.geometry.length > 0) {
      (map.getSource('tethers') as maplibregl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: { routeLabel: 'Optimized Route', distanceKm: roadRoute.roadDistanceKm, timeMinutes: roadRoute.roadTimeMinutes, color: '#3b82f6' },
          geometry: { type: 'LineString', coordinates: roadRoute.geometry },
        }],
      });
      // Clear alt-routes when showing optimized route
      if (map.getSource('alt-routes')) {
        (map.getSource('alt-routes') as maplibregl.GeoJSONSource).setData({
          type: 'FeatureCollection', features: [],
        });
      }
      return;
    }

    // Cardinal mode: show primary paths in tethers, alternatives in alt-routes
    const tetherFeatures: any[] = [];
    const altFeatures: any[] = [];

    facilityIds.forEach(id => {
      const f = facilities.find((fac: any) => fac.id === id);
      if (!f || !f.lat || !f.lng) return;

      const paths = cardinalRoads[id];
      if (paths && paths.length > 0) {
        // Primary (first) path goes into tethers
        const primary = paths[0];
        tetherFeatures.push({
          type: 'Feature',
          properties: {
            routeLabel: ROUTE_TYPE_LABELS[primary.routeType] || 'Route',
            distanceKm: primary.distanceKm,
            timeMinutes: primary.timeMinutes,
            color: ROUTE_COLORS[primary.routeType] || '#3b82f6',
          },
          geometry: { type: 'LineString', coordinates: primary.geometry },
        });

        // Additional alternative paths go into alt-routes layer
        for (let i = 1; i < paths.length; i++) {
          const alt = paths[i];
          const color = ROUTE_COLORS[alt.routeType] || '#22c55e';
          altFeatures.push({
            type: 'Feature',
            properties: {
              color,
              width: 3,
              opacity: 0.7,
              routeLabel: ROUTE_TYPE_LABELS[alt.routeType] || 'Alternative',
              distanceKm: alt.distanceKm,
              timeMinutes: alt.timeMinutes,
            },
            geometry: { type: 'LineString', coordinates: alt.geometry },
          });
        }
      } else {
        // Fallback: straight line while road geometry loads
        tetherFeatures.push({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [
              [warehouseCoords.lng, warehouseCoords.lat],
              [f.lng, f.lat],
            ],
          },
        });
      }
    });

    (map.getSource('tethers') as maplibregl.GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: tetherFeatures,
    });

    if (map.getSource('alt-routes')) {
      (map.getSource('alt-routes') as maplibregl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: altFeatures,
      });
    }
  }, [facilityIds, warehouseCoords, facilities, cardinalRoads, roadRoute]);

  // Build a map of facility id -> facility data for quick lookups
  const facilityMap = useMemo(() => {
    const map = new Map<string, any>();
    facilities.forEach((f: any) => map.set(f.id, f));
    return map;
  }, [facilities]);

  const handleOptimize = () => {
    const selectedFacilities = facilityIds
      .map(id => facilityMap.get(id))
      .filter((f): f is any => f && typeof f.lat === 'number' && typeof f.lng === 'number');

    if (selectedFacilities.length < 2) return;

    setIsOptimizing(true);
    setRoadRoute(null);
    // Run in a microtask to allow UI to update
    setTimeout(async () => {
      try {
        const points: GeoPoint[] = selectedFacilities.map(f => ({
          id: f.id,
          lat: f.lat,
          lng: f.lng,
        }));

        const distMatrix = computeDistanceMatrix(points);
        const result = solveTSP(distMatrix, 0);

        const newOrder = result.order.map(idx => points[idx].id);
        setOptimizedOrder(newOrder);
        setOptimizedDistance(Math.round(result.totalDistance * 10) / 10);
        setFacilityIds(newOrder);
        setIsOptimizing(false);

        // Fetch real road route (async, non-blocking)
        const warehouse = selectedSA?.warehouse_id ? facilities.find((f: any) => f.warehouse_id) : null;
        const orderedFacilities = result.order.map(idx => points[idx]);
        // Use first facility as origin if no warehouse coords available
        const origin = orderedFacilities[0];
        const waypoints = [
          origin,
          ...orderedFacilities,
          origin, // round trip
        ];

        setIsFetchingRoad(true);
        const road = await getRoadRoute(waypoints);
        if (road) {
          setRoadRoute(road);
          setOptimizedDistance(road.roadDistanceKm);
        }
        setIsFetchingRoad(false);
      } catch (err) {
        console.error('Route optimization failed:', err);
        setIsOptimizing(false);
        setIsFetchingRoad(false);
      }
    }, 10);
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 'zone-service-area':
        return !!zoneId && !!serviceAreaId;
      case 'facilities':
        return facilityIds.length > 0;
      case 'name-review':
        return !!routeName.trim();
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step === 'zone-service-area') {
      setStep('facilities');
    } else if (step === 'facilities') {
      setStep('name-review');
    }
  };

  const handleBack = () => {
    if (step === 'facilities') {
      setStep('zone-service-area');
    } else if (step === 'name-review') {
      setStep('facilities');
    }
  };

  const toggleFacility = (id: string) => {
    setFacilityIds(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    await createMutation.mutateAsync({
      name: routeName,
      zone_id: zoneId,
      service_area_id: serviceAreaId,
      warehouse_id: selectedSA?.warehouse_id || '',
      creation_mode: isSandbox ? 'sandbox' : 'facility_list',
      facility_ids: optimizedOrder || facilityIds,
      is_sandbox: isSandbox,
      algorithm_used: optimizedOrder ? 'nearest_neighbor_2opt' : undefined,
      total_distance_km: optimizedDistance ?? undefined,
      estimated_duration_min: roadRoute ? roadRoute.roadTimeMinutes : undefined,
      optimized_geometry: roadRoute ? {
        type: 'LineString',
        coordinates: roadRoute.geometry,
      } : undefined,
    });
    onSuccess();
  };

  // Render function for Step 1: Zone & Service Area (consolidated)
  const renderZoneServiceAreaStep = () => (
    <div className="p-6 space-y-6">
      {/* Zone selection */}
      <div>
        <Label className="text-base font-semibold">Select Zone</Label>
        <p className="text-sm text-muted-foreground mb-3">
          Choose the delivery zone for this route
        </p>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {zonesQuery.isLoading ? (
            <div className="col-span-full text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : zonesQuery.error ? (
            <div className="col-span-full text-center py-8 text-destructive">
              <p className="text-sm">
                Failed to load zones{(zonesQuery.error as any)?.message ? `: ${(zonesQuery.error as any).message}` : '.'}
              </p>
            </div>
          ) : zones.length === 0 ? (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              <p>No zones found. Create a zone first.</p>
            </div>
          ) : (
            zones.map((zone) => (
              <Card
                key={zone.id}
                onClick={() => {
                  setZoneId(zone.id);
                  setServiceAreaId('');
                  setFacilityIds([]);
                }}
                className={cn(
                  'cursor-pointer transition-all hover:shadow-md',
                  zoneId === zone.id && 'ring-2 ring-primary bg-primary/5'
                )}
              >
                <CardContent className="p-4">
                  <h4 className="font-medium">{zone.name}</h4>
                  {zone.code && (
                    <Badge variant="outline" className="mt-2">{zone.code}</Badge>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Service area selection (appears after zone selected) */}
      {zoneId && (
        <div className="pt-4 border-t">
          <Label className="text-base font-semibold">Select Service Area</Label>
          <p className="text-sm text-muted-foreground mb-3">
            Choose the service area within {zones.find(z => z.id === zoneId)?.name}
          </p>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {serviceAreas && serviceAreas.length > 0 ? (
              serviceAreas.map((sa) => (
                <Card
                  key={sa.id}
                  onClick={() => {
                    setServiceAreaId(sa.id);
                    setFacilityIds([]);
                  }}
                  className={cn(
                    'cursor-pointer transition-all hover:shadow-md',
                    serviceAreaId === sa.id && 'ring-2 ring-primary bg-primary/5'
                  )}
                >
                  <CardContent className="p-4">
                    <h4 className="font-medium">{sa.name}</h4>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">{sa.service_type.toUpperCase()}</Badge>
                      <Badge variant="secondary">{sa.facility_count || 0} facilities</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                <p className="text-sm">No service areas in this zone. Create one first.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // Render function for Step 2: Facilities (improved 3-column layout)
  const renderFacilitiesStep = () => (
    <div className="flex flex-col h-[calc(90vh-280px)] min-h-[500px]">
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1.6fr_1fr] gap-4 p-4 flex-1 min-h-0">
        {/* Left: Map */}
        <div className={
          isMapFullscreen
            ? 'fixed inset-0 z-50 bg-background flex flex-col'
            : 'flex flex-col border rounded-lg overflow-hidden bg-muted/30'
        }>
          <div className="px-4 py-3 border-b bg-background">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Map View
            </h3>
          </div>
          <div className="flex-1 min-h-0 relative">
            <MapOverlayControls
              isFullscreen={isMapFullscreen}
              onToggleFullscreen={() => {
                setIsMapFullscreen((v) => !v);
                setTimeout(() => mapRef.current?.resize(), 100);
              }}
              isFocusMode={focusSelected}
              onToggleFocusMode={() => setFocusSelected((v) => !v)}
              hasSelection={facilityIds.length > 0}
              className="absolute right-[10px] top-[79px] z-10"
            />
            <div ref={mapContainerRef} className="h-full w-full" />
          </div>
        </div>

        {/* Middle: Facility List */}
        <div className="flex flex-col border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <List className="h-4 w-4" />
                Facilities
                {!facilitiesQuery.isLoading && (
                  <Badge variant="secondary" className="ml-2">
                    {facilityIds.length} selected
                  </Badge>
                )}
              </h3>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search facilities..."
                value={facilitySearch}
                onChange={(e) => setFacilitySearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const allIds = filteredFacilities.map((f: any) => f.id);
                  setFacilityIds(allIds);
                }}
                className="h-8 text-xs"
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFacilityIds([])}
                disabled={facilityIds.length === 0}
                className="h-8 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            </div>
          </div>
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-3 space-y-2">
              {facilitiesQuery.isLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Loading facilities...
                </div>
              ) : facilitiesQuery.error ? (
                <div className="text-center py-8 text-destructive">
                  <p className="text-sm">Failed to load facilities.</p>
                </div>
              ) : filteredFacilities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="mx-auto h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">No facilities found</p>
                </div>
              ) : (
                filteredFacilities.map((facility: any) => (
                  <div
                    key={facility.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                      facilityIds.includes(facility.id)
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    )}
                    onClick={() => toggleFacility(facility.id)}
                  >
                    <Checkbox checked={facilityIds.includes(facility.id)} className="shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{facility.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {facility.lga || 'Unknown LGA'} &middot; {facility.level_of_care || 'N/A'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right: Insights */}
        <div className="flex flex-col border rounded-lg overflow-hidden bg-muted/30">
          <div className="px-4 py-3 border-b bg-background">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Selection Summary
            </h3>
          </div>
          <ScrollArea className="flex-1 min-h-0 p-4">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Zone</span>
                <span className="font-medium">{selectedZone?.name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service Area</span>
                <span className="font-medium">{selectedSA?.name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Selected</span>
                <span className="font-medium">{facilityIds.length}</span>
              </div>
              {optimizedDistance !== null && (
                <>
                  <div className="h-px bg-border my-2" />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Optimized Distance</span>
                    <span className="font-medium text-green-600">{optimizedDistance} km</span>
                  </div>
                </>
              )}
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOptimize}
                  disabled={isOptimizing || facilityIds.length < 2}
                  className="w-full"
                >
                  {isOptimizing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="mr-2 h-4 w-4" />
                  )}
                  Optimize Route
                </Button>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );

  // Render function for Step 3: Name & Review (consolidated)
  const renderNameReviewStep = () => (
    <div className="p-6 space-y-6">
      {/* Route Name Input */}
      <div>
        <Label htmlFor="route-name" className="text-base font-semibold">
          Route Name
        </Label>
        <p className="text-sm text-muted-foreground mb-2">
          Give your route a descriptive name
        </p>
        <Input
          id="route-name"
          placeholder="e.g., Central Zone - North Sector"
          value={routeName}
          onChange={(e) => setRouteName(e.target.value)}
          className="h-10"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Route Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Zone</span>
              <span className="font-medium">{selectedZone?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service Area</span>
              <span className="font-medium">{selectedSA?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Facilities</span>
              <span className="font-medium">{facilityIds.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Route Optimization</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOptimize}
                disabled={facilityIds.length < 2 || isOptimizing}
              >
                {isOptimizing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="mr-2 h-4 w-4" />
                )}
                Optimize
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {optimizedDistance ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {roadRoute ? 'Road Distance' : 'Distance (est.)'}
                  </span>
                  <span className="font-medium text-green-600">
                    {optimizedDistance} km
                  </span>
                </div>
                {isFetchingRoad && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Fetching road route...
                  </div>
                )}
                {roadRoute && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Road Time</span>
                    <span className="font-medium">
                      {Math.floor(roadRoute.roadTimeMinutes / 60)}h {roadRoute.roadTimeMinutes % 60}m
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Algorithm</span>
                  <Badge variant="secondary" className="text-xs">
                    2-opt TSP
                  </Badge>
                </div>
                {roadRoute && (
                  <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                    Road route
                  </Badge>
                )}
              </>
            ) : (
              <p className="text-muted-foreground text-center py-6">
                Optimize route to calculate distance
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Optimized Order Preview */}
      {optimizedOrder && optimizedOrder.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Optimized Visit Order</CardTitle>
            <CardDescription>
              Facilities will be visited in this sequence
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[240px]">
              <div className="space-y-2">
                {optimizedOrder.map((facId, idx) => {
                  const facility = facilities.find(f => f.id === facId);
                  return (
                    <div
                      key={facId}
                      className="flex items-center gap-3 p-2 rounded-md bg-muted/50"
                    >
                      <Badge variant="outline" className="shrink-0">
                        {idx + 1}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {facility?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {facility?.lga || 'Unknown LGA'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const currentStepNum = getCurrentStepNum(step);

  return (
    <div className="flex flex-col h-full">
      {/* Sandbox Warning Banner */}
      {isSandbox && (
        <div className="mx-6 mt-4 rounded-lg border-2 border-dashed border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20 p-3">
          <p className="text-sm text-yellow-700 dark:text-yellow-400 font-medium">
            Sandbox Mode — Routes will not be saved to production
          </p>
        </div>
      )}

      {/* Step Indicator */}
      <div className="px-6 py-4 border-b bg-background">
        <div className="flex items-center gap-2">
          {STEP_LABELS.map((stepInfo, idx) => (
            <React.Fragment key={stepInfo.num}>
              <div className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                currentStepNum === stepInfo.num
                  ? 'bg-primary text-primary-foreground'
                  : currentStepNum > stepInfo.num
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
              )}>
                {currentStepNum > stepInfo.num ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <span>{stepInfo.num}</span>
                )}
                <span className="hidden sm:inline">{stepInfo.label}</span>
              </div>
              {idx < STEP_LABELS.length - 1 && (
                <div className={cn(
                  'flex-1 h-0.5 rounded transition-colors',
                  currentStepNum > stepInfo.num ? 'bg-primary' : 'bg-muted'
                )} />
              )}
            </React.Fragment>
          ))}
        </div>
        <Progress value={(currentStepNum / 3) * 100} className="h-1 mt-3" />
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {step === 'zone-service-area' && renderZoneServiceAreaStep()}
        {step === 'facilities' && renderFacilitiesStep()}
        {step === 'name-review' && renderNameReviewStep()}
      </div>

      {/* Footer Navigation */}
      <div className="border-t bg-muted/30 px-6 py-4 flex justify-between items-center">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={step === 'zone-service-area'}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={step === 'name-review' ? handleSubmit : handleNext}
          disabled={step === 'name-review' ? createMutation.isPending : !canProceed()}
        >
          {step === 'name-review' ? (
            createMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )
          ) : null}
          {step === 'name-review' ? (isSandbox ? 'Create Sandbox Route' : 'Create Route') : 'Next'}
          {step !== 'name-review' && <ChevronRight className="ml-2 h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
