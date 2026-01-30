import { useMemo } from 'react';
import { FilterSidebar, FilterGroup } from '@/components/ui/filter-sidebar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Building2 } from 'lucide-react';
import { useLGAs } from '@/hooks/useLGAs';
import type { FacilityFilters } from '@/lib/facility-validation';
import type { Facility } from '@/types';

interface FacilityMapFilterSidebarProps {
  filters: FacilityFilters;
  onFiltersChange: (filters: FacilityFilters) => void;
  facilities: Facility[];
  facilitiesCount: number;
}

export function FacilityMapFilterSidebar({
  filters,
  onFiltersChange,
  facilities,
  facilitiesCount,
}: FacilityMapFilterSidebarProps) {
  // Fetch all LGAs
  const { data: allLGAs } = useLGAs({});

  // Get unique states from LGAs
  const states = useMemo(() => {
    if (!allLGAs) return ['kano'];
    const uniqueStates = [...new Set(allLGAs.map((l) => l.state))].filter(Boolean);
    return uniqueStates.length > 0 ? uniqueStates : ['kano'];
  }, [allLGAs]);

  // Filter LGAs based on selected state
  const filteredLGAs = useMemo(() => {
    if (!allLGAs || !filters.state) return [];
    return allLGAs.filter(
      (l) => l.state?.toLowerCase() === filters.state?.toLowerCase()
    );
  }, [allLGAs, filters.state]);

  // Extract unique wards from facilities in selected LGA
  const availableWards = useMemo(() => {
    if (!filters.lga) return [];
    return facilities
      .filter((f) => f.lga === filters.lga && f.ward)
      .map((f) => f.ward!)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort();
  }, [facilities, filters.lga]);

  // Calculate active filter count
  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.state ||
      filters.lga ||
      filters.ward ||
      filters.warehouseCodeSearch ||
      (filters.storageCapacityMin !== undefined && filters.storageCapacityMin > 0) ||
      (filters.storageCapacityMax !== undefined && filters.storageCapacityMax < 10000) ||
      (filters.capacityMin !== undefined && filters.capacityMin > 0) ||
      (filters.capacityMax !== undefined && filters.capacityMax < 5000)
    );
  }, [filters]);

  // Handlers
  const handleStateChange = (value: string) => {
    onFiltersChange({
      ...filters,
      state: value === 'all' ? undefined : value,
      lga: undefined,
      ward: undefined,
    });
  };

  const handleLGAChange = (value: string) => {
    onFiltersChange({
      ...filters,
      lga: value === 'all' ? undefined : value,
      ward: undefined,
    });
  };

  const handleWardChange = (value: string) => {
    onFiltersChange({
      ...filters,
      ward: value === 'all' ? undefined : value,
    });
  };

  const handleWarehouseCodeChange = (value: string) => {
    onFiltersChange({
      ...filters,
      warehouseCodeSearch: value || undefined,
    });
  };

  const handleStorageCapacityChange = ([min, max]: number[]) => {
    onFiltersChange({
      ...filters,
      storageCapacityMin: min > 0 ? min : undefined,
      storageCapacityMax: max < 10000 ? max : undefined,
    });
  };

  const handleGeneralCapacityChange = ([min, max]: number[]) => {
    onFiltersChange({
      ...filters,
      capacityMin: min > 0 ? min : undefined,
      capacityMax: max < 5000 ? max : undefined,
    });
  };

  const handleClearFilters = () => {
    onFiltersChange({});
  };

  return (
    <FilterSidebar
      title="Filters"
      hasActiveFilters={hasActiveFilters}
      onClearFilters={handleClearFilters}
      className="h-full border-0 rounded-none"
    >
      {/* State Filter */}
      <FilterGroup label="State">
        <Select
          value={filters.state || 'all'}
          onValueChange={handleStateChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="All States" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All States</SelectItem>
            {states.map((state) => (
              <SelectItem key={state} value={state}>
                {state.charAt(0).toUpperCase() + state.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterGroup>

      {/* LGA Filter */}
      <FilterGroup label="LGA">
        <Select
          value={filters.lga || 'all'}
          onValueChange={handleLGAChange}
          disabled={!filters.state}
        >
          <SelectTrigger>
            <SelectValue placeholder={filters.state ? 'All LGAs' : 'Select State first'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All LGAs</SelectItem>
            {filteredLGAs.map((lga) => (
              <SelectItem key={lga.id} value={lga.name}>
                {lga.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterGroup>

      {/* Ward Filter */}
      <FilterGroup label="Ward">
        <Select
          value={filters.ward || 'all'}
          onValueChange={handleWardChange}
          disabled={!filters.lga || availableWards.length === 0}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={
                !filters.lga
                  ? 'Select LGA first'
                  : availableWards.length === 0
                    ? 'No wards available'
                    : 'All Wards'
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Wards</SelectItem>
            {availableWards.map((ward) => (
              <SelectItem key={ward} value={ward}>
                {ward}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterGroup>

      {/* Warehouse Code Search */}
      <FilterGroup label="Warehouse Code">
        <Input
          placeholder="Search by code..."
          value={filters.warehouseCodeSearch || ''}
          onChange={(e) => handleWarehouseCodeChange(e.target.value)}
        />
      </FilterGroup>

      {/* Storage Capacity Slider */}
      <FilterGroup label="Storage Capacity">
        <Slider
          value={[
            filters.storageCapacityMin ?? 0,
            filters.storageCapacityMax ?? 10000,
          ]}
          min={0}
          max={10000}
          step={100}
          onValueChange={handleStorageCapacityChange}
          className="mt-2"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>{filters.storageCapacityMin ?? 0}</span>
          <span>{filters.storageCapacityMax ?? 10000}</span>
        </div>
      </FilterGroup>

      {/* General Capacity Slider */}
      <FilterGroup label="General Capacity">
        <Slider
          value={[
            filters.capacityMin ?? 0,
            filters.capacityMax ?? 5000,
          ]}
          min={0}
          max={5000}
          step={50}
          onValueChange={handleGeneralCapacityChange}
          className="mt-2"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>{filters.capacityMin ?? 0}</span>
          <span>{filters.capacityMax ?? 5000}</span>
        </div>
      </FilterGroup>

      {/* Facility Count Card */}
      <div className="mt-6 p-4 bg-primary text-primary-foreground rounded-lg">
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8" />
          <div>
            <div className="text-2xl font-bold">{facilitiesCount}</div>
            <div className="text-sm opacity-90">
              {facilitiesCount === 1 ? 'Facility' : 'Facilities'}
            </div>
          </div>
        </div>
      </div>
    </FilterSidebar>
  );
}
