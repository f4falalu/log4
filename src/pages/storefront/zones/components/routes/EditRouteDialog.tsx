import { useState, useEffect, useMemo } from 'react';
import { Pencil, Loader2, Zap, Settings2, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useRouteFacilities, useUpdateRoute } from '@/hooks/useRoutes';
import { useFacilities } from '@/hooks/useFacilities';
import { supabase } from '@/integrations/supabase/client';
import { type GeoPoint } from '@/lib/algorithms/distanceMatrix';
import type { Route } from '@/types/routes';
import {
  type OptimizationConfig,
  OPTIMIZATION_CRITERIA,
  solveWithConfig,
} from '@/lib/algorithms/routeOptimizer';

interface EditRouteDialogProps {
  route: Route;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditRouteDialog({ route, open, onOpenChange }: EditRouteDialogProps) {
  const [routeName, setRouteName] = useState('');
  const [selectedFacilityIds, setSelectedFacilityIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showOptSettings, setShowOptSettings] = useState(false);
  const [selectedCriterion, setSelectedCriterion] = useState<keyof OptimizationConfig>('shortestDistance');
  const [showOnlySelected, setShowOnlySelected] = useState(false);

  const { data: currentFacilities, isLoading: facilitiesLoading } = useRouteFacilities(route.id);
  const { data: zoneFacilitiesData } = useFacilities({
    zone_id: route.zone_id || undefined,
  });
  const updateMutation = useUpdateRoute();

  // Merge zone facilities with facilities already in the route
  const allFacilities = useMemo(() => {
    const zoneFacilities = zoneFacilitiesData?.facilities || [];
    const routeFacilities = currentFacilities?.map(rf => rf.facilities).filter(Boolean) || [];

    // Create a map to avoid duplicates
    const facilityMap = new Map();

    // Add zone facilities first
    zoneFacilities.forEach(f => facilityMap.set(f.id, f));

    // Add route facilities (may override or add new ones)
    routeFacilities.forEach(f => {
      if (f) facilityMap.set(f.id, f);
    });

    return Array.from(facilityMap.values());
  }, [zoneFacilitiesData?.facilities, currentFacilities]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setRouteName(route.name);
      setSearchQuery('');
      setShowOnlySelected(false);
      setShowOptSettings(false);
    }
  }, [open, route.name]);

  // Initialize selected facilities when data loads
  useEffect(() => {
    if (open && currentFacilities && currentFacilities.length > 0) {
      const ids = currentFacilities.map(rf => rf.facility_id);
      setSelectedFacilityIds(ids);
    } else if (!currentFacilities || currentFacilities.length === 0) {
      setSelectedFacilityIds([]);
    }
  }, [open, currentFacilities]);

  const filteredFacilities = allFacilities?.filter((f) => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = !showOnlySelected || selectedFacilityIds.includes(f.id);
    return matchesSearch && matchesFilter;
  });

  const toggleFacility = (facilityId: string) => {
    setSelectedFacilityIds((prev) =>
      prev.includes(facilityId)
        ? prev.filter((id) => id !== facilityId)
        : [...prev, facilityId]
    );
  };

  const handleOptimize = async () => {
    if (selectedFacilityIds.length < 2) {
      return;
    }

    if (!route.warehouses?.lat || !route.warehouses?.lng) {
      console.error('Warehouse location is required for optimization');
      return;
    }

    if (!allFacilities || allFacilities.length === 0) {
      console.error('No facilities available for optimization');
      return;
    }

    setIsOptimizing(true);
    try {
      const selectedFacs = allFacilities.filter((f) =>
        selectedFacilityIds.includes(f.id) && f.lat != null && f.lng != null
      );

      if (selectedFacs.length < 2) {
        console.error('Not enough facilities with valid coordinates');
        setIsOptimizing(false);
        return;
      }

      const facilityPoints: GeoPoint[] = selectedFacs.map((f) => ({
        id: f.id,
        lat: f.lat!,
        lng: f.lng!,
      }));

      const depot = {
        lat: route.warehouses.lat,
        lng: route.warehouses.lng,
      };

      // Build config with selected criterion set to true
      const config: OptimizationConfig = {
        shortestDistance: selectedCriterion === 'shortestDistance',
        fuelEfficiency: selectedCriterion === 'fuelEfficiency',
        timeOptimized: selectedCriterion === 'timeOptimized',
        clusterPriority: selectedCriterion === 'clusterPriority',
      };

      const result = solveWithConfig(depot, facilityPoints, config);

      // Update the order of selected facilities
      setSelectedFacilityIds(result.orderedIds);
    } catch (error) {
      console.error('Optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Get the label for the selected criterion
      const criterionLabel = OPTIMIZATION_CRITERIA.find(c => c.key === selectedCriterion)?.label || 'Unknown';

      // First, update the route metadata
      await updateMutation.mutateAsync({
        id: route.id,
        data: {
          name: routeName,
          algorithm_used: criterionLabel,
        } as any,
      });

      // Delete existing route_facilities
      await supabase
        .from('route_facilities')
        .delete()
        .eq('route_id', route.id);

      // Insert new route_facilities with updated sequence
      if (selectedFacilityIds.length > 0) {
        const routeFacilities = selectedFacilityIds.map((fid, idx) => ({
          route_id: route.id,
          facility_id: fid,
          sequence_order: idx + 1,
        }));

        const { error } = await supabase
          .from('route_facilities')
          .insert(routeFacilities);

        if (error) throw error;
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save route:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Edit Route
          </DialogTitle>
          <DialogDescription>
            Modify facilities and routing algorithm for this route
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Route Name */}
          <div className="space-y-2">
            <Label htmlFor="routeName">Route Name</Label>
            <Input
              id="routeName"
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              placeholder="Enter route name"
            />
          </div>

          <Separator />

          {/* Optimization Settings */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Routing Algorithm</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowOptSettings(!showOptSettings)}
              >
                <Settings2 className="mr-2 h-4 w-4" />
                {showOptSettings ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>

            {showOptSettings && (
              <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                <div className="space-y-3">
                  <Label>Optimization Strategy</Label>
                  <RadioGroup
                    value={selectedCriterion}
                    onValueChange={(value) => setSelectedCriterion(value as keyof OptimizationConfig)}
                  >
                    {OPTIMIZATION_CRITERIA.map((criterion) => {
                      const Icon = criterion.icon;
                      return (
                        <div key={criterion.key} className="flex items-start space-x-3">
                          <RadioGroupItem value={criterion.key} id={criterion.key} />
                          <div className="flex-1 cursor-pointer" onClick={() => setSelectedCriterion(criterion.key)}>
                            <Label htmlFor={criterion.key} className="cursor-pointer flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {criterion.label}
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              {criterion.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </RadioGroup>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Facility Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Facilities ({selectedFacilityIds.length} selected)</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedFacilityIds([])}
                  disabled={selectedFacilityIds.length === 0}
                >
                  Clear All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOptimize}
                  disabled={selectedFacilityIds.length < 2 || isOptimizing}
                >
                  {isOptimizing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Optimizing...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Optimize Order
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Search facilities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button
                variant={showOnlySelected ? "default" : "outline"}
                size="sm"
                onClick={() => setShowOnlySelected(!showOnlySelected)}
                className="whitespace-nowrap"
              >
                {showOnlySelected ? "Show All" : "Selected Only"}
              </Button>
            </div>

            {selectedFacilityIds.length > 100 && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-amber-800">
                  <span className="font-medium">Large selection detected:</span> This route has {selectedFacilityIds.length} facilities.
                  Routes with many facilities may be difficult to manage and optimize. Consider using "Clear All" to start fresh.
                </div>
              </div>
            )}

            <div className="h-[400px] border rounded-lg overflow-y-auto">
              <div className="p-2 space-y-1">
                {facilitiesLoading ? (
                  <p className="text-sm text-muted-foreground p-2">Loading facilities...</p>
                ) : filteredFacilities && filteredFacilities.length > 0 ? (
                  <>
                    {filteredFacilities.map((facility) => {
                      const isSelected = selectedFacilityIds.includes(facility.id);
                      const order = selectedFacilityIds.indexOf(facility.id);

                      return (
                        <div
                          key={facility.id}
                          onClick={() => toggleFacility(facility.id)}
                          className={`flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-accent transition-colors ${
                            isSelected ? 'bg-accent' : ''
                          }`}
                        >
                          <Checkbox checked={isSelected} />
                          {isSelected && (
                            <Badge variant="secondary" className="h-5 w-5 flex items-center justify-center p-0 text-xs">
                              {order + 1}
                            </Badge>
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-medium">{facility.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {facility.lga} • {facility.type}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground p-2">No facilities found</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || selectedFacilityIds.length === 0 || !routeName.trim()}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
