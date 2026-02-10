import { useState, useMemo } from 'react';
import { ArrowLeft, ArrowRight, Check, Loader2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useOperationalZones } from '@/hooks/useOperationalZones';
import { useServiceAreas } from '@/hooks/useServiceAreas';
import { useCreateRoute } from '@/hooks/useRoutes';
import { useServiceAreaFacilities } from '@/hooks/useServiceAreas';
import { computeDistanceMatrix, type GeoPoint } from '@/lib/algorithms/distanceMatrix';
import { solveTSP } from '@/lib/algorithms/tsp';

type Step = 'zone' | 'service-area' | 'facilities' | 'name' | 'review';
const STEPS: Step[] = ['zone', 'service-area', 'facilities', 'name', 'review'];

interface FacilityListRouteFormProps {
  onSuccess: () => void;
  isSandbox?: boolean;
}

export function FacilityListRouteForm({ onSuccess, isSandbox = false }: FacilityListRouteFormProps) {
  const [step, setStep] = useState<Step>('zone');
  const [zoneId, setZoneId] = useState('');
  const [serviceAreaId, setServiceAreaId] = useState('');
  const [facilityIds, setFacilityIds] = useState<string[]>([]);
  const [routeName, setRouteName] = useState('');
  const [optimizedOrder, setOptimizedOrder] = useState<string[] | null>(null);
  const [optimizedDistance, setOptimizedDistance] = useState<number | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const { zones } = useOperationalZones();
  const { data: serviceAreas } = useServiceAreas(zoneId ? { zone_id: zoneId } : undefined);
  const { data: saFacilities } = useServiceAreaFacilities(serviceAreaId || undefined);
  const createMutation = useCreateRoute();

  const selectedZone = zones?.find(z => z.id === zoneId);
  const selectedSA = serviceAreas?.find(sa => sa.id === serviceAreaId);
  const facilities = saFacilities?.map(saf => saf.facilities).filter(Boolean) || [];

  const currentIdx = STEPS.indexOf(step);

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
      case 'zone': return !!zoneId;
      case 'service-area': return !!serviceAreaId;
      case 'facilities': return facilityIds.length > 0;
      case 'name': return !!routeName.trim();
      case 'review': return true;
      default: return false;
    }
  };

  const handleNext = () => {
    if (currentIdx < STEPS.length - 1) setStep(STEPS[currentIdx + 1]);
  };

  const handleBack = () => {
    if (currentIdx > 0) setStep(STEPS[currentIdx - 1]);
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

  return (
    <div className="space-y-4 py-2">
      {isSandbox && (
        <div className="rounded-lg border-2 border-dashed border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20 p-3">
          <p className="text-sm text-yellow-700 dark:text-yellow-400 font-medium">
            Sandbox Mode — Routes will not be saved to production
          </p>
        </div>
      )}

      {/* Step: Zone */}
      {step === 'zone' && (
        <div className="space-y-3">
          <Label>Select Zone</Label>
          <Select value={zoneId} onValueChange={(v) => { setZoneId(v); setServiceAreaId(''); setFacilityIds([]); }}>
            <SelectTrigger><SelectValue placeholder="Choose a zone" /></SelectTrigger>
            <SelectContent>
              {zones?.map(z => (
                <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Step: Service Area */}
      {step === 'service-area' && (
        <div className="space-y-3">
          <Label>Select Service Area</Label>
          {serviceAreas && serviceAreas.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {serviceAreas.map(sa => (
                <Card
                  key={sa.id}
                  className={`cursor-pointer transition-all ${
                    serviceAreaId === sa.id ? 'ring-2 ring-primary' : 'hover:shadow-md'
                  }`}
                  onClick={() => { setServiceAreaId(sa.id); setFacilityIds([]); }}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{sa.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Badge variant="outline">{sa.service_type.toUpperCase()}</Badge>
                      <Badge variant="secondary">{sa.facility_count || 0} facilities</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No service areas in this zone. Create one first.
            </p>
          )}
        </div>
      )}

      {/* Step: Facilities */}
      {step === 'facilities' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Select Facilities ({facilityIds.length} selected)</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const allIds = facilities.map((f: any) => f.id);
                setFacilityIds(prev => prev.length === allIds.length ? [] : allIds);
              }}
            >
              {facilityIds.length === facilities.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>

          {facilities.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No facilities assigned to this service area.
            </p>
          ) : (
            <div className="space-y-2 max-h-[350px] overflow-y-auto">
              {facilities.map((facility: any) => (
                <div
                  key={facility.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    facilityIds.includes(facility.id)
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => toggleFacility(facility.id)}
                >
                  <Checkbox checked={facilityIds.includes(facility.id)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{facility.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {facility.lga || 'Unknown LGA'} &middot; {facility.level_of_care || 'N/A'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step: Name */}
      {step === 'name' && (
        <div className="space-y-3">
          <Label htmlFor="route-name">Route Name</Label>
          <Input
            id="route-name"
            placeholder="e.g., R1 - Central Zone North"
            value={routeName}
            onChange={(e) => setRouteName(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Use a meaningful identifier like R1, G1, or a descriptive name.
          </p>
        </div>
      )}

      {/* Step: Review */}
      {step === 'review' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Route Summary</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOptimize}
                  disabled={isOptimizing || facilityIds.length < 2}
                >
                  {isOptimizing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="mr-2 h-4 w-4" />
                  )}
                  Optimize Route
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{routeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Zone</span>
                <span className="font-medium">{selectedZone?.name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service Area</span>
                <span className="font-medium">{selectedSA?.name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Facilities</span>
                <span className="font-medium">{facilityIds.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mode</span>
                <Badge variant="outline">{isSandbox ? 'Sandbox' : 'Facility List'}</Badge>
              </div>
              {optimizedDistance !== null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Optimized Distance</span>
                  <span className="font-medium text-green-600">{optimizedDistance} km</span>
                </div>
              )}
              {optimizedOrder && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Algorithm</span>
                  <Badge variant="secondary">Nearest Neighbor + 2-opt</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {optimizedOrder && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Optimized Facility Order</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {optimizedOrder.map((id, idx) => {
                    const f = facilityMap.get(id);
                    return (
                      <div key={id} className="flex items-center gap-2 text-sm">
                        <span className="font-mono text-xs text-muted-foreground w-6 text-right">{idx + 1}.</span>
                        <span>{f?.name || id}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={handleBack} disabled={currentIdx === 0}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        {step === 'review' ? (
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            {isSandbox ? 'Create Sandbox Route' : 'Create Route'}
          </Button>
        ) : (
          <Button onClick={handleNext} disabled={!canProceed()}>
            Next <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
