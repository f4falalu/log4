import React, { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ArrowLeft, ArrowRight, Check, Loader2, Zap, MapPin, List, Search, TrendingUp, ChevronLeft, ChevronRight, X, Building2 } from 'lucide-react';
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
import { computeDistanceMatrix, type GeoPoint } from '@/lib/algorithms/distanceMatrix';
import { solveTSP } from '@/lib/algorithms/tsp';
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

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const { theme } = useTheme();

  const zonesQuery = useOperationalZones();
  const zones = zonesQuery.zones;
  const { data: serviceAreas } = useServiceAreas(zoneId ? { zone_id: zoneId } : undefined);
  const facilitiesQuery = useFacilities(serviceAreaId ? {} : undefined, undefined, 1000);
  const createMutation = useCreateRoute();

  const selectedZone = zones?.find(z => z.id === zoneId);
  const selectedSA = serviceAreas?.find(sa => sa.id === serviceAreaId);
  const facilities = facilitiesQuery.data?.facilities ?? [];

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
  }, [facilityIds, filteredFacilities, step]);

  // Remove old currentIdx logic - no longer needed

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
    // Run in a microtask to allow UI to update
    setTimeout(() => {
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
        // Reorder facilityIds to match optimized order
        setFacilityIds(newOrder);
      } catch (err) {
        console.error('Route optimization failed:', err);
      } finally {
        setIsOptimizing(false);
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
        <div className="flex flex-col border rounded-lg overflow-hidden bg-muted/30">
          <div className="px-4 py-3 border-b bg-background">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Map View
            </h3>
          </div>
          <div className="flex-1 min-h-0 relative">
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
                  <span className="text-muted-foreground">Distance</span>
                  <span className="font-medium text-green-600">
                    {optimizedDistance} km
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Algorithm</span>
                  <Badge variant="secondary" className="text-xs">
                    2-opt TSP
                  </Badge>
                </div>
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
