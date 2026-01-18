/**
 * FilterPopover Component
 *
 * Single source of truth for map visibility and focus controls
 * Opened from ControlRail filter button
 *
 * Design: Black Emerald + Pumpkin accent, operational theme
 */

import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface FilterPopoverProps {
  onClose: () => void;
  onApplyFilters?: (filters: FilterState) => void;
}

export interface FilterState {
  // Visibility (always mounted, visibility toggled)
  showWarehouses: boolean;
  showFacilities: boolean;
  showTrails: boolean;
  showRoutes: boolean;

  // Vehicle state filters
  showEnRoute: boolean;
  showDelayed: boolean;
  showDelivering: boolean;
  showBrokenDown: boolean;

  // Focus filters
  onlySelected: boolean;
  onlyIssues: boolean;
}

interface FilterCheckboxProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function FilterCheckbox({ label, description, checked, onChange }: FilterCheckboxProps) {
  return (
    <label className="flex items-start gap-3 py-2 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 rounded border-2 cursor-pointer"
        style={{
          borderColor: 'var(--operational-bg-tertiary)',
          backgroundColor: checked ? 'var(--operational-accent-primary)' : 'transparent',
          accentColor: 'var(--operational-accent-primary)',
        }}
      />
      <div className="flex-1">
        <div
          className="text-sm font-medium"
          style={{ color: 'var(--operational-text-primary)' }}
        >
          {label}
        </div>
        {description && (
          <div
            className="text-xs mt-0.5"
            style={{ color: 'var(--operational-text-muted)' }}
          >
            {description}
          </div>
        )}
      </div>
    </label>
  );
}

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
}

function FilterSection({ title, children }: FilterSectionProps) {
  return (
    <div className="space-y-1">
      <h4
        className="text-xs font-semibold uppercase tracking-wide mb-2"
        style={{ color: 'var(--operational-text-secondary)' }}
      >
        {title}
      </h4>
      {children}
    </div>
  );
}

export function FilterPopover({ onClose, onApplyFilters }: FilterPopoverProps) {
  const [filters, setFilters] = useState<FilterState>({
    // Visibility defaults (per PRD: warehouses and facilities off by default)
    showWarehouses: false,
    showFacilities: false,
    showTrails: true,
    showRoutes: true,

    // Vehicle state filters (all on by default)
    showEnRoute: true,
    showDelayed: true,
    showDelivering: true,
    showBrokenDown: true,

    // Focus filters (off by default)
    onlySelected: false,
    onlyIssues: false,
  });

  const handleApply = () => {
    onApplyFilters?.(filters);
    onClose();
  };

  const handleReset = () => {
    setFilters({
      showWarehouses: false,
      showFacilities: false,
      showTrails: true,
      showRoutes: true,
      showEnRoute: true,
      showDelayed: true,
      showDelivering: true,
      showBrokenDown: true,
      onlySelected: false,
      onlyIssues: false,
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[950]"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
        onClick={onClose}
      />

      {/* Popover */}
      <div
        className="fixed top-20 left-20 w-80 z-[1000] rounded-lg shadow-xl p-4"
        style={{
          backgroundColor: 'var(--operational-bg-secondary)',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: 'var(--operational-bg-tertiary)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3
            className="font-semibold text-base"
            style={{ color: 'var(--operational-text-primary)' }}
          >
            Filters
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--operational-bg-tertiary)]"
            title="Close"
          >
            <X
              className="w-5 h-5"
              style={{ color: 'var(--operational-text-secondary)' }}
            />
          </button>
        </div>

        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
          {/* Visibility Section */}
          <FilterSection title="Visibility">
            <FilterCheckbox
              label="Warehouses"
              description="Show origin points on map"
              checked={filters.showWarehouses}
              onChange={(checked) => setFilters((prev) => ({ ...prev, showWarehouses: checked }))}
            />
            <FilterCheckbox
              label="Facilities"
              description="Show destination points (PHCs)"
              checked={filters.showFacilities}
              onChange={(checked) => setFilters((prev) => ({ ...prev, showFacilities: checked }))}
            />
            <FilterCheckbox
              label="Vehicle Trails"
              description="Show movement history"
              checked={filters.showTrails}
              onChange={(checked) => setFilters((prev) => ({ ...prev, showTrails: checked }))}
            />
            <FilterCheckbox
              label="Routes"
              description="Show planned routes"
              checked={filters.showRoutes}
              onChange={(checked) => setFilters((prev) => ({ ...prev, showRoutes: checked }))}
            />
          </FilterSection>

          <Separator style={{ backgroundColor: 'var(--operational-bg-tertiary)' }} />

          {/* Vehicle State Section */}
          <FilterSection title="Vehicle State">
            <FilterCheckbox
              label="En-Route"
              checked={filters.showEnRoute}
              onChange={(checked) => setFilters((prev) => ({ ...prev, showEnRoute: checked }))}
            />
            <FilterCheckbox
              label="Delayed"
              checked={filters.showDelayed}
              onChange={(checked) => setFilters((prev) => ({ ...prev, showDelayed: checked }))}
            />
            <FilterCheckbox
              label="Delivering"
              checked={filters.showDelivering}
              onChange={(checked) => setFilters((prev) => ({ ...prev, showDelivering: checked }))}
            />
            <FilterCheckbox
              label="Broken Down"
              checked={filters.showBrokenDown}
              onChange={(checked) => setFilters((prev) => ({ ...prev, showBrokenDown: checked }))}
            />
          </FilterSection>

          <Separator style={{ backgroundColor: 'var(--operational-bg-tertiary)' }} />

          {/* Focus Section */}
          <FilterSection title="Focus">
            <FilterCheckbox
              label="Only selected vehicle"
              description="Dim all other vehicles"
              checked={filters.onlySelected}
              onChange={(checked) => setFilters((prev) => ({ ...prev, onlySelected: checked }))}
            />
            <FilterCheckbox
              label="Only vehicles with issues"
              description="Delays, breakdowns, alerts"
              checked={filters.onlyIssues}
              onChange={(checked) => setFilters((prev) => ({ ...prev, onlyIssues: checked }))}
            />
          </FilterSection>
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-2 pt-4 border-t" style={{ borderColor: 'var(--operational-bg-tertiary)' }}>
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex-1"
            style={{
              borderColor: 'var(--operational-bg-tertiary)',
              color: 'var(--operational-text-primary)',
            }}
          >
            Reset
          </Button>
          <Button
            onClick={handleApply}
            className="flex-1"
            style={{
              backgroundColor: 'var(--operational-accent-primary)',
              color: '#ffffff',
            }}
          >
            Apply
          </Button>
        </div>
      </div>
    </>
  );
}
