/**
 * ExpandableFilterPanel Component
 *
 * Left-side expandable 3-column filter panel for map controls
 * Reference: Cargo Run expandable sidebar design
 *
 * Features:
 * - 3-column grid layout: Layers | Vehicle States | Focus Modes
 * - shadcn Sheet component (slides from left)
 * - Apply/Reset filter actions
 */

import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

export interface FilterState {
  // Layer Visibility
  showTrails: boolean;
  showRoutes: boolean;
  showFacilities: boolean;
  showWarehouses: boolean;

  // Vehicle State Filters
  showEnRoute: boolean;
  showDelayed: boolean;
  showDelivering: boolean;
  showBrokenDown: boolean;
  showAvailable: boolean;

  // Focus Modes
  onlySelectedVehicle: boolean;
  onlyIssues: boolean;
}

interface ExpandableFilterPanelProps {
  open: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  initialFilters?: Partial<FilterState>;
}

const defaultFilters: FilterState = {
  // All layers visible by default (per PRD)
  showTrails: true,
  showRoutes: true,
  showFacilities: true,
  showWarehouses: true,

  // All vehicle states visible by default
  showEnRoute: true,
  showDelayed: true,
  showDelivering: true,
  showBrokenDown: true,
  showAvailable: true,

  // Focus modes off by default
  onlySelectedVehicle: false,
  onlyIssues: false,
};

/**
 * FilterCheckbox - Reusable checkbox with label
 */
function FilterCheckbox({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start space-x-3 space-y-0 py-2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
      <div className="space-y-1 leading-none">
        <Label
          htmlFor={id}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
        >
          {label}
        </Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}

/**
 * ExpandableFilterPanel Component
 */
export function ExpandableFilterPanel({
  open,
  onClose,
  onApply,
  initialFilters = {},
}: ExpandableFilterPanelProps) {
  const [filters, setFilters] = useState<FilterState>({
    ...defaultFilters,
    ...initialFilters,
  });

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleReset = () => {
    setFilters(defaultFilters);
  };

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="left" className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Map Filters</SheetTitle>
          <SheetDescription>
            Control layer visibility, vehicle states, and focus modes
          </SheetDescription>
        </SheetHeader>

        {/* 3-Column Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {/* Column 1: Layer Visibility */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-foreground">Layers</h4>
            <div className="space-y-1">
              <FilterCheckbox
                id="trails"
                label="Vehicle Trails"
                checked={filters.showTrails}
                onCheckedChange={(checked) => updateFilter('showTrails', checked)}
              />
              <FilterCheckbox
                id="routes"
                label="Routes"
                checked={filters.showRoutes}
                onCheckedChange={(checked) => updateFilter('showRoutes', checked)}
              />
              <FilterCheckbox
                id="facilities"
                label="Facilities"
                checked={filters.showFacilities}
                onCheckedChange={(checked) => updateFilter('showFacilities', checked)}
              />
              <FilterCheckbox
                id="warehouses"
                label="Warehouses"
                checked={filters.showWarehouses}
                onCheckedChange={(checked) => updateFilter('showWarehouses', checked)}
              />
            </div>
          </div>

          {/* Column 2: Vehicle States */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-foreground">Vehicle State</h4>
            <div className="space-y-1">
              <FilterCheckbox
                id="available"
                label="Available"
                checked={filters.showAvailable}
                onCheckedChange={(checked) => updateFilter('showAvailable', checked)}
              />
              <FilterCheckbox
                id="en-route"
                label="En Route"
                checked={filters.showEnRoute}
                onCheckedChange={(checked) => updateFilter('showEnRoute', checked)}
              />
              <FilterCheckbox
                id="delivering"
                label="Delivering"
                checked={filters.showDelivering}
                onCheckedChange={(checked) => updateFilter('showDelivering', checked)}
              />
              <FilterCheckbox
                id="delayed"
                label="Delayed"
                checked={filters.showDelayed}
                onCheckedChange={(checked) => updateFilter('showDelayed', checked)}
              />
              <FilterCheckbox
                id="broken-down"
                label="Broken Down"
                checked={filters.showBrokenDown}
                onCheckedChange={(checked) => updateFilter('showBrokenDown', checked)}
              />
            </div>
          </div>

          {/* Column 3: Focus Modes */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-foreground">Focus</h4>
            <div className="space-y-1">
              <FilterCheckbox
                id="only-selected"
                label="Selected Vehicle Only"
                description="Dim all other vehicles"
                checked={filters.onlySelectedVehicle}
                onCheckedChange={(checked) => updateFilter('onlySelectedVehicle', checked)}
              />
              <FilterCheckbox
                id="only-issues"
                label="Issues Only"
                description="Delays, breakdowns, alerts"
                checked={filters.onlyIssues}
                onCheckedChange={(checked) => updateFilter('onlyIssues', checked)}
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <SheetFooter className="mt-8">
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <Button onClick={handleApply}>
            Apply Filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
