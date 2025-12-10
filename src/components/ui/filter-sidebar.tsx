/**
 * FilterSidebar Component - Standardized Filter Panel
 *
 * This component provides a consistent filter sidebar UI across all list/table views.
 * It standardizes:
 * - Filter panel layout and styling
 * - Clear filters functionality
 * - Collapse/expand behavior
 * - Active filter indicators
 * - Responsive design
 *
 * Usage:
 * ```tsx
 * <FilterSidebar
 *   title="Filters"
 *   hasActiveFilters={activeFilterCount > 0}
 *   onClearFilters={handleClearFilters}
 *   onCollapse={() => setSidebarOpen(false)}
 * >
 *   <FilterGroup label="Status">
 *     <Select ... />
 *   </FilterGroup>
 *   <FilterGroup label="Type">
 *     <Select ... />
 *   </FilterGroup>
 * </FilterSidebar>
 * ```
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { X, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Type Definitions
// ============================================================================

export interface FilterSidebarProps {
  /**
   * Title of the filter sidebar
   */
  title?: string;

  /**
   * Whether there are active filters applied
   */
  hasActiveFilters?: boolean;

  /**
   * Callback when clear filters is clicked
   */
  onClearFilters?: () => void;

  /**
   * Callback when collapse button is clicked
   */
  onCollapse?: () => void;

  /**
   * Filter content (filter groups, inputs, selects, etc.)
   */
  children: React.ReactNode;

  /**
   * Optional custom className for the container
   */
  className?: string;

  /**
   * Optional custom className for the content area
   */
  contentClassName?: string;
}

export interface FilterGroupProps {
  /**
   * Label for the filter group
   */
  label: string;

  /**
   * ID for the filter input (for accessibility)
   */
  htmlFor?: string;

  /**
   * Filter input/select component
   */
  children: React.ReactNode;

  /**
   * Optional custom className
   */
  className?: string;
}

// ============================================================================
// FilterSidebar Component
// ============================================================================

export function FilterSidebar({
  title = 'Filters',
  hasActiveFilters = false,
  onClearFilters,
  onCollapse,
  children,
  className,
  contentClassName,
}: FilterSidebarProps) {
  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <CardTitle>{title}</CardTitle>
          {onCollapse && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onCollapse}
              className="h-7 w-7"
              title="Collapse sidebar"
              aria-label="Collapse filter sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>
        {hasActiveFilters && onClearFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            aria-label="Clear all filters"
          >
            <X className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
      </CardHeader>
      <CardContent className={cn('space-y-4', contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// FilterGroup Component
// ============================================================================

/**
 * FilterGroup Component - Individual filter field wrapper
 *
 * Provides consistent spacing and labeling for filter inputs
 */
export function FilterGroup({
  label,
  htmlFor,
  children,
  className,
}: FilterGroupProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

// ============================================================================
// Utility Hook for Filter State
// ============================================================================

/**
 * Custom hook to manage filter state and active filter counting
 *
 * Usage:
 * ```tsx
 * const filterState = useFilterState({
 *   initialFilters: { status: undefined, type: undefined },
 * });
 *
 * // In your component
 * <FilterSidebar
 *   hasActiveFilters={filterState.hasActiveFilters}
 *   onClearFilters={filterState.clearFilters}
 * >
 *   <FilterGroup label="Status">
 *     <Select
 *       value={filterState.filters.status || 'all'}
 *       onValueChange={(value) =>
 *         filterState.updateFilter('status', value === 'all' ? undefined : value)
 *       }
 *     />
 *   </FilterGroup>
 * </FilterSidebar>
 * ```
 */
export function useFilterState<T extends Record<string, any>>({
  initialFilters,
  onFiltersChange,
}: {
  initialFilters: T;
  onFiltersChange?: (filters: T) => void;
}) {
  const [filters, setFilters] = React.useState<T>(initialFilters);

  // Calculate if there are active filters
  const hasActiveFilters = React.useMemo(() => {
    return Object.values(filters).some((value) => {
      if (value === undefined || value === null || value === '') return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    });
  }, [filters]);

  // Count active filters
  const activeFilterCount = React.useMemo(() => {
    return Object.values(filters).filter((value) => {
      if (value === undefined || value === null || value === '') return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    }).length;
  }, [filters]);

  // Update a single filter
  const updateFilter = React.useCallback(
    (key: keyof T, value: any) => {
      const newFilters = { ...filters, [key]: value };
      setFilters(newFilters);
      onFiltersChange?.(newFilters);
    },
    [filters, onFiltersChange]
  );

  // Update multiple filters
  const updateFilters = React.useCallback(
    (updates: Partial<T>) => {
      const newFilters = { ...filters, ...updates };
      setFilters(newFilters);
      onFiltersChange?.(newFilters);
    },
    [filters, onFiltersChange]
  );

  // Clear all filters
  const clearFilters = React.useCallback(() => {
    const clearedFilters = Object.keys(filters).reduce((acc, key) => {
      acc[key as keyof T] = undefined as any;
      return acc;
    }, {} as T);
    setFilters(clearedFilters);
    onFiltersChange?.(clearedFilters);
  }, [filters, onFiltersChange]);

  // Reset to initial filters
  const resetFilters = React.useCallback(() => {
    setFilters(initialFilters);
    onFiltersChange?.(initialFilters);
  }, [initialFilters, onFiltersChange]);

  return {
    filters,
    hasActiveFilters,
    activeFilterCount,
    updateFilter,
    updateFilters,
    clearFilters,
    resetFilters,
    setFilters,
  };
}

// ============================================================================
// Exports
// ============================================================================

export default FilterSidebar;
