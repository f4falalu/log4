import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, MapPin, Building2 } from 'lucide-react';
import { useFacilities } from '@/hooks/useFacilities';
import type { Facility } from '@/types';

interface FacilitySelectorProps {
  selectedFacilityIds: string[];
  onSelectionChange: (facilityIds: string[]) => void;
  maxHeight?: string;
}

export function FacilitySelector({
  selectedFacilityIds,
  onSelectionChange,
  maxHeight = '400px',
}: FacilitySelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { data, isLoading } = useFacilities();

  const facilities = data?.facilities || [];

  // Filter facilities by search query
  const filteredFacilities = useMemo(() => {
    if (!searchQuery.trim()) return facilities;

    const query = searchQuery.toLowerCase();
    return facilities.filter(f =>
      f.name.toLowerCase().includes(query) ||
      f.address?.toLowerCase().includes(query) ||
      f.warehouse_code?.toLowerCase().includes(query) ||
      f.lga?.toLowerCase().includes(query) ||
      f.type?.toLowerCase().includes(query)
    );
  }, [facilities, searchQuery]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = filteredFacilities.map(f => f.id);
      // Merge with existing selection (in case some are outside filter)
      const newSelection = [...new Set([...selectedFacilityIds, ...allIds])];
      onSelectionChange(newSelection);
    } else {
      // Only deselect the filtered ones
      const filteredIds = new Set(filteredFacilities.map(f => f.id));
      const newSelection = selectedFacilityIds.filter(id => !filteredIds.has(id));
      onSelectionChange(newSelection);
    }
  };

  const handleToggleFacility = (facilityId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedFacilityIds, facilityId]);
    } else {
      onSelectionChange(selectedFacilityIds.filter(id => id !== facilityId));
    }
  };

  // Check if all filtered facilities are selected
  const allFilteredSelected = filteredFacilities.length > 0 &&
    filteredFacilities.every(f => selectedFacilityIds.includes(f.id));

  // Check if some filtered facilities are selected
  const someFilteredSelected = filteredFacilities.some(f => selectedFacilityIds.includes(f.id));

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search facilities by name, address, code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Selection summary */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Checkbox
            id="select-all"
            checked={allFilteredSelected}
            onCheckedChange={handleSelectAll}
            className={someFilteredSelected && !allFilteredSelected ? 'data-[state=checked]:bg-primary/50' : ''}
          />
          <label htmlFor="select-all" className="cursor-pointer text-muted-foreground">
            Select all ({filteredFacilities.length})
          </label>
        </div>
        <Badge variant="secondary">
          {selectedFacilityIds.length} selected
        </Badge>
      </div>

      {/* Facility list */}
      <ScrollArea style={{ height: maxHeight }}>
        <div className="space-y-2 pr-4">
          {filteredFacilities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>No facilities found</p>
              {searchQuery && (
                <p className="text-xs mt-1">Try a different search term</p>
              )}
            </div>
          ) : (
            filteredFacilities.map((facility) => {
              const isSelected = selectedFacilityIds.includes(facility.id);
              return (
                <div
                  key={facility.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-primary/5 border-primary/30'
                      : 'hover:bg-muted/50 border-border'
                  }`}
                  onClick={() => handleToggleFacility(facility.id, !isSelected)}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => handleToggleFacility(facility.id, !!checked)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{facility.name}</span>
                      {facility.type && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          {facility.type}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{facility.address || 'No address'}</span>
                    </div>
                    <div className="flex gap-2 mt-1">
                      {facility.warehouse_code && (
                        <span className="text-xs text-muted-foreground">
                          Code: {facility.warehouse_code}
                        </span>
                      )}
                      {facility.lga && (
                        <span className="text-xs text-muted-foreground">
                          LGA: {facility.lga}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default FacilitySelector;
