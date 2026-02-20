/**
 * =====================================================
 * Decision Support Column (Right Column)
 * =====================================================
 * Displays mini map, route insights, AI optimization
 * options, and vehicle suggestions.
 */

import * as React from 'react';
import {
  Map as MapIcon,
  Route,
  Clock,
  Package,
  Weight,
  Truck,
  Brain,
  Zap,
  Target,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { WorkingSetItem, AiOptimizationOptions, VehicleSuggestion } from '@/types/unified-workflow';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTheme } from 'next-themes';
import { getMapLibreStyle } from '@/lib/mapConfig';

export interface FacilityWithCoords {
  id: string;
  name: string;
  lat?: number;
  lng?: number;
}

interface DecisionSupportColumnProps {
  workingSet: WorkingSetItem[];
  startLocation?: { id: string; name: string; lat?: number; lng?: number } | null;
  facilities?: FacilityWithCoords[]; // For looking up coordinates
  aiOptions: AiOptimizationOptions;
  onAiOptionsChange: (options: Partial<AiOptimizationOptions>) => void;
  suggestedVehicleId: string | null;
  onSuggestedVehicleChange: (vehicleId: string | null) => void;
  vehicleSuggestions?: VehicleSuggestion[];
  sourceSubOption?: 'manual_scheduling' | 'ai_optimization' | null;
  className?: string;
}

export function DecisionSupportColumn({
  workingSet,
  startLocation,
  facilities = [],
  aiOptions,
  onAiOptionsChange,
  suggestedVehicleId,
  onSuggestedVehicleChange,
  vehicleSuggestions = [],
  sourceSubOption,
  className,
}: DecisionSupportColumnProps) {
  const { theme } = useTheme();
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<maplibregl.Map | null>(null);
  const markersRef = React.useRef<Map<string, maplibregl.Marker>>(new Map());

  // Create a lookup map for facility coordinates
  const facilityMap = React.useMemo(() => {
    const map = new Map<string, FacilityWithCoords>();
    facilities.forEach(f => map.set(f.id, f));
    return map;
  }, [facilities]);

  // Calculate insights from working set
  const insights = React.useMemo(() => {
    const totalSlots = workingSet.reduce((sum, item) => sum + (item.slot_demand || 0), 0);
    const totalWeight = workingSet.reduce((sum, item) => sum + (item.weight_kg || 0), 0);
    const totalVolume = workingSet.reduce((sum, item) => sum + (item.volume_m3 || 0), 0);
    const facilityCount = workingSet.length;

    // Estimate turnaround (rough: 30min per stop + 15min travel between stops)
    const estimatedMinutes = facilityCount * 30 + (facilityCount - 1) * 15;
    const estimatedHours = Math.round(estimatedMinutes / 60 * 10) / 10;

    return {
      totalSlots,
      totalWeight,
      totalVolume,
      facilityCount,
      estimatedHours,
    };
  }, [workingSet]);

  const isAiMode = sourceSubOption === 'ai_optimization';

  // Calculate map bounds based on locations
  const bounds = React.useMemo(() => {
    const points: [number, number][] = [];

    // Add start location if available
    if (startLocation?.lat && startLocation?.lng) {
      points.push([startLocation.lng, startLocation.lat]);
    }

    // Add working set facilities that have coordinates (look up from facilityMap)
    workingSet.forEach(item => {
      const facility = facilityMap.get(item.facility_id);
      if (facility?.lat && facility?.lng) {
        points.push([facility.lng, facility.lat]);
      }
    });

    if (points.length === 0) {
      // Default to Kano, Nigeria
      return {
        center: [8.52, 12.00] as [number, number],
        zoom: 10,
      };
    }

    if (points.length === 1) {
      // Single point - center on it
      return {
        center: points[0],
        zoom: 12,
      };
    }

    // Multiple points - calculate bounds
    const lngs = points.map(p => p[0]);
    const lats = points.map(p => p[1]);

    return {
      sw: [Math.min(...lngs) - 0.02, Math.min(...lats) - 0.02] as [number, number],
      ne: [Math.max(...lngs) + 0.02, Math.max(...lats) + 0.02] as [number, number],
    };
  }, [startLocation, workingSet, facilityMap]);

  // Initialize map
  React.useEffect(() => {
    if (!mapContainerRef.current || workingSet.length === 0) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: getMapLibreStyle(theme as 'light' | 'dark' | 'system' | undefined),
      center: 'center' in bounds ? bounds.center : [(bounds.sw[0] + bounds.ne[0]) / 2, (bounds.sw[1] + bounds.ne[1]) / 2],
      zoom: 'zoom' in bounds ? bounds.zoom : 10,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    mapRef.current = map;

    // Fit bounds after map loads if we have multiple points
    map.on('load', () => {
      if ('sw' in bounds && 'ne' in bounds) {
        map.fitBounds([bounds.sw, bounds.ne], {
          padding: 20,
          maxZoom: 14,
        });
      }
    });

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, [theme, workingSet.length]);

  // Update markers and route lines when locations change
  React.useEffect(() => {
    if (!mapRef.current || workingSet.length === 0) return;

    const map = mapRef.current;

    const updateMarkersAndRoute = () => {
      // Clear existing markers
      markersRef.current.forEach(m => m.remove());
      markersRef.current.clear();

      // Build route line coordinates
      const routeCoordinates: [number, number][] = [];

      // Start from warehouse
      if (startLocation?.lat && startLocation?.lng) {
        routeCoordinates.push([startLocation.lng, startLocation.lat]);
      }

      // Add each facility in sequence
      workingSet.forEach(item => {
        const facility = facilityMap.get(item.facility_id);
        if (facility?.lat && facility?.lng) {
          routeCoordinates.push([facility.lng, facility.lat]);
        }
      });

      // Add route line to map (only if style is loaded)
      if (routeCoordinates.length >= 2 && map.isStyleLoaded()) {
        // Remove existing route layer and source if they exist
        if (map.getLayer('route-line')) {
          map.removeLayer('route-line');
        }
        if (map.getSource('route')) {
          map.removeSource('route');
        }

        // Add route source and layer
        map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: routeCoordinates,
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
            'line-color': '#10b981',
            'line-width': 3,
            'line-opacity': 0.8,
          },
        });
      }

      // Add start location marker
      if (startLocation?.lat && startLocation?.lng) {
        const el = document.createElement('div');
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

        const popup = new maplibregl.Popup({ offset: 20, closeButton: false }).setHTML(`
          <div style="padding: 4px;">
            <strong>${startLocation.name}</strong>
            <div style="font-size: 11px; color: #666;">Start Location</div>
          </div>
        `);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([startLocation.lng, startLocation.lat])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.set('start', marker);
      }

      // Add facility markers with sequence numbers
      workingSet.forEach((item, index) => {
        const facility = facilityMap.get(item.facility_id);
        if (!facility?.lat || !facility?.lng) return;

        const el = document.createElement('div');
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
            font-size: 11px;
            font-weight: 600;
          ">${index + 1}</div>
        `;

        const popup = new maplibregl.Popup({ offset: 18, closeButton: false }).setHTML(`
          <div style="padding: 4px; min-width: 120px;">
            <div style="font-size: 11px; color: #10b981; font-weight: 600;">Stop ${index + 1}</div>
            <strong style="font-size: 12px;">${item.facility_name}</strong>
            <div style="font-size: 10px; color: #666; margin-top: 2px;">
              ${item.slot_demand || 0} slots
            </div>
          </div>
        `);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([facility.lng, facility.lat])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.set(item.facility_id, marker);
      });

      // Fit bounds when markers change
      if ('sw' in bounds && 'ne' in bounds) {
        map.fitBounds([bounds.sw, bounds.ne], {
          padding: 20,
          maxZoom: 14,
          duration: 500,
        });
      }
    };

    // Wait for style to load before adding layers
    if (map.isStyleLoaded()) {
      updateMarkersAndRoute();
    } else {
      map.once('styledata', updateMarkersAndRoute);
    }
  }, [startLocation, workingSet, bounds, facilityMap]);

  return (
    <ScrollArea className={cn('h-full', className)}>
      <div className="space-y-4 p-4">
        {/* Mini Map Preview */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapIcon className="h-4 w-4" />
              Route Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {workingSet.length === 0 ? (
              <div className="aspect-[4/3] bg-muted rounded-lg flex items-center justify-center border border-dashed">
                <div className="text-center text-muted-foreground">
                  <Route className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Add facilities to see route preview</p>
                </div>
              </div>
            ) : (
              <div
                ref={mapContainerRef}
                className="w-full aspect-[4/3] rounded-lg overflow-hidden border"
              />
            )}
            {startLocation && (
              <p className="text-xs text-muted-foreground mt-2">
                Starting from: {startLocation.name}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Insights Panel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Schedule Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <InsightItem
                icon={<Package className="h-4 w-4" />}
                label="Total Payload"
                value={
                  insights.totalWeight > 0
                    ? `${insights.totalWeight.toLocaleString()} kg`
                    : '-'
                }
              />
              <InsightItem
                icon={<Clock className="h-4 w-4" />}
                label="Est. Turnaround"
                value={
                  insights.facilityCount > 0
                    ? `${insights.estimatedHours} hrs`
                    : '-'
                }
              />
              <InsightItem
                icon={<Target className="h-4 w-4" />}
                label="Facility Count"
                value={`${insights.facilityCount} stops`}
              />
              <InsightItem
                icon={<Route className="h-4 w-4" />}
                label="Total Slots"
                value={`${insights.totalSlots} slots`}
              />
            </div>
          </CardContent>
        </Card>

        {/* AI Optimization Options - Only show in AI mode */}
        {isAiMode && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Brain className="h-4 w-4" />
                AI Optimization
              </CardTitle>
              <CardDescription className="text-xs">
                Select optimization constraints
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <AiOptionCheckbox
                id="shortest_distance"
                label="Shortest Distance"
                description="Minimize total travel distance"
                checked={aiOptions.shortest_distance}
                onCheckedChange={(checked) =>
                  onAiOptionsChange({ shortest_distance: checked })
                }
              />
              <AiOptionCheckbox
                id="fastest_route"
                label="Fastest Route"
                description="Minimize total travel time"
                checked={aiOptions.fastest_route}
                onCheckedChange={(checked) =>
                  onAiOptionsChange({ fastest_route: checked })
                }
              />
              <AiOptionCheckbox
                id="efficiency"
                label="Efficiency"
                description="Optimize fuel and resources"
                checked={aiOptions.efficiency}
                onCheckedChange={(checked) =>
                  onAiOptionsChange({ efficiency: checked })
                }
              />
              <AiOptionCheckbox
                id="priority_complex"
                label="Priority Complex"
                description="Emergency facilities first"
                checked={aiOptions.priority_complex}
                onCheckedChange={(checked) =>
                  onAiOptionsChange({ priority_complex: checked })
                }
              />
            </CardContent>
          </Card>
        )}

        {/* Vehicle Suggestion */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Vehicle Suggestion
            </CardTitle>
            <CardDescription className="text-xs">
              Optional - commitment at batch phase
            </CardDescription>
          </CardHeader>
          <CardContent>
            {insights.facilityCount === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">
                Add facilities to see vehicle suggestions
              </p>
            ) : vehicleSuggestions.length === 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Based on {insights.totalSlots} slots required:
                </p>
                <div className="p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-8 rounded bg-muted flex items-center justify-center">
                      <Truck className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Auto-suggest</p>
                      <p className="text-xs text-muted-foreground">
                        Vehicle will be suggested based on capacity
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {vehicleSuggestions.slice(0, 3).map((suggestion) => (
                  <VehicleSuggestionCard
                    key={suggestion.vehicle_id}
                    suggestion={suggestion}
                    isSelected={suggestedVehicleId === suggestion.vehicle_id}
                    onSelect={() =>
                      onSuggestedVehicleChange(
                        suggestedVehicleId === suggestion.vehicle_id
                          ? null
                          : suggestion.vehicle_id
                      )
                    }
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Warning if over capacity */}
        {insights.totalSlots > 12 && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardContent className="pt-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    High Slot Demand
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {insights.totalSlots} slots may require multiple batches
                    or a larger vehicle.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}

// =====================================================
// Sub-components
// =====================================================

interface InsightItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function InsightItem({ icon, label, value }: InsightItemProps) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
      <div className="text-muted-foreground">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-sm font-semibold truncate">{value}</p>
      </div>
    </div>
  );
}

interface AiOptionCheckboxProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function AiOptionCheckbox({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: AiOptionCheckboxProps) {
  return (
    <div className="flex items-start gap-3">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <Label htmlFor={id} className="text-sm cursor-pointer">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

interface VehicleSuggestionCardProps {
  suggestion: VehicleSuggestion;
  isSelected: boolean;
  onSelect: () => void;
}

function VehicleSuggestionCard({
  suggestion,
  isSelected,
  onSelect,
}: VehicleSuggestionCardProps) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        'p-3 rounded-lg border cursor-pointer transition-all',
        isSelected
          ? 'border-primary bg-primary/5'
          : 'hover:border-primary/50 hover:bg-accent/50'
      )}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-8 rounded bg-muted flex items-center justify-center">
          <Truck className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{suggestion.vehicle_model}</p>
          <p className="text-xs text-muted-foreground">
            {suggestion.total_slots} slots • {suggestion.utilization_pct}% fit
          </p>
        </div>
        {isSelected && (
          <Badge variant="secondary" className="text-xs">
            Selected
          </Badge>
        )}
      </div>
    </div>
  );
}

export default DecisionSupportColumn;
