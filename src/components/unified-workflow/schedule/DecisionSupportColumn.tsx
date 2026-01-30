/**
 * =====================================================
 * Decision Support Column (Right Column)
 * =====================================================
 * Displays mini map, route insights, AI optimization
 * options, and vehicle suggestions.
 */

import * as React from 'react';
import {
  Map,
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

interface DecisionSupportColumnProps {
  workingSet: WorkingSetItem[];
  startLocation?: { id: string; name: string; lat?: number; lng?: number } | null;
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
  aiOptions,
  onAiOptionsChange,
  suggestedVehicleId,
  onSuggestedVehicleChange,
  vehicleSuggestions = [],
  sourceSubOption,
  className,
}: DecisionSupportColumnProps) {
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

  return (
    <ScrollArea className={cn('h-full', className)}>
      <div className="space-y-4 p-4">
        {/* Mini Map Preview */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Map className="h-4 w-4" />
              Route Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-[4/3] bg-muted rounded-lg flex items-center justify-center border border-dashed">
              {workingSet.length === 0 ? (
                <div className="text-center text-muted-foreground">
                  <Route className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Add facilities to see route preview</p>
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  <Map className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Map preview</p>
                  <p className="text-xs font-medium mt-1">
                    {workingSet.length} stops
                  </p>
                </div>
              )}
            </div>
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
