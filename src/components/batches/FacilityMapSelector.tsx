import { useState, useMemo, useRef, useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTheme } from 'next-themes';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, MapPin, Building2, List, Map as MapIcon, X } from 'lucide-react';
import { useFacilities } from '@/hooks/useFacilities';
import { MAP_CONFIG, getMapLibreStyle } from '@/lib/mapConfig';
import type { Facility, Warehouse } from '@/types';

interface FacilityMapSelectorProps {
  selectedFacilityIds: string[];
  onSelectionChange: (facilityIds: string[]) => void;
  warehouse?: Warehouse | null;
}

export function FacilityMapSelector({
  selectedFacilityIds,
  onSelectionChange,
  warehouse,
}: FacilityMapSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'split' | 'list' | 'map'>('split');
  const { data, isLoading } = useFacilities();
  const { theme } = useTheme();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());

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
      f.service_zone?.toLowerCase().includes(query) ||
      f.type?.toLowerCase().includes(query)
    );
  }, [facilities, searchQuery]);

  // Calculate map bounds to fit warehouse and facilities
  const bounds = useMemo(() => {
    const points: [number, number][] = [];

    if (warehouse) {
      points.push([warehouse.lng, warehouse.lat]);
    }

    filteredFacilities.forEach(f => {
      if (f.lng && f.lat) {
        points.push([f.lng, f.lat]);
      }
    });

    if (points.length === 0) {
      // Default to Kano, Nigeria
      return {
        sw: [8.4, 11.9] as [number, number],
        ne: [8.7, 12.1] as [number, number],
      };
    }

    const lngs = points.map(p => p[0]);
    const lats = points.map(p => p[1]);

    return {
      sw: [Math.min(...lngs) - 0.05, Math.min(...lats) - 0.05] as [number, number],
      ne: [Math.max(...lngs) + 0.05, Math.max(...lats) + 0.05] as [number, number],
    };
  }, [filteredFacilities, warehouse]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || viewMode === 'list') return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: getMapLibreStyle(theme as 'light' | 'dark' | 'system' | undefined),
      center: [(bounds.sw[0] + bounds.ne[0]) / 2, (bounds.sw[1] + bounds.ne[1]) / 2],
      zoom: 10,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    mapRef.current = map;

    // Fit bounds after map loads
    map.on('load', () => {
      map.fitBounds([bounds.sw, bounds.ne], {
        padding: { top: 40, bottom: 40, left: 40, right: 40 },
        maxZoom: 12,
      });
    });

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, [theme, viewMode]);

  // Update markers when facilities or selection changes
  useEffect(() => {
    if (!mapRef.current || viewMode === 'list') return;

    const map = mapRef.current;

    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current.clear();

    // Add warehouse marker
    if (warehouse) {
      const el = document.createElement('div');
      el.innerHTML = `
        <div style="
          width: 36px;
          height: 36px;
          background: #3b82f6;
          border: 3px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          font-size: 16px;
        ">🏭</div>
      `;

      const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 4px;">
          <strong>${warehouse.name}</strong>
          <div style="font-size: 12px; color: #666;">Origin Warehouse</div>
        </div>
      `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([warehouse.lng, warehouse.lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.set('warehouse', marker);
    }

    // Add facility markers
    filteredFacilities.forEach(facility => {
      if (!facility.lng || !facility.lat) return;

      const isSelected = selectedFacilityIds.includes(facility.id);

      const el = document.createElement('div');
      el.className = 'facility-marker';
      el.style.cursor = 'pointer';
      el.innerHTML = `
        <div style="
          width: 28px;
          height: 28px;
          background: ${isSelected ? '#10b981' : '#6b7280'};
          border: 2px solid ${isSelected ? '#059669' : '#9ca3af'};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.25);
          color: white;
          font-size: 12px;
          transition: all 0.2s;
        ">${isSelected ? '✓' : ''}</div>
      `;

      // Click to toggle selection
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isSelected) {
          onSelectionChange(selectedFacilityIds.filter(id => id !== facility.id));
        } else {
          onSelectionChange([...selectedFacilityIds, facility.id]);
        }
      });

      const popup = new maplibregl.Popup({ offset: 20, closeButton: false }).setHTML(`
        <div style="padding: 4px; min-width: 150px;">
          <strong>${facility.name}</strong>
          <div style="font-size: 12px; color: #666;">${facility.address || 'No address'}</div>
          ${facility.service_zone ? `<div style="font-size: 11px; color: #888; margin-top: 2px;">Zone: ${facility.service_zone}</div>` : ''}
          <div style="font-size: 11px; color: ${isSelected ? '#10b981' : '#888'}; margin-top: 4px;">
            ${isSelected ? '✓ Selected' : 'Click to select'}
          </div>
        </div>
      `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([facility.lng, facility.lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.set(facility.id, marker);
    });
  }, [filteredFacilities, selectedFacilityIds, warehouse, viewMode, onSelectionChange]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = filteredFacilities.map(f => f.id);
      const newSelection = [...new Set([...selectedFacilityIds, ...allIds])];
      onSelectionChange(newSelection);
    } else {
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

  const allFilteredSelected = filteredFacilities.length > 0 &&
    filteredFacilities.every(f => selectedFacilityIds.includes(f.id));

  const someFilteredSelected = filteredFacilities.some(f => selectedFacilityIds.includes(f.id));

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  const renderList = () => (
    <ScrollArea className={viewMode === 'split' ? 'h-[350px]' : 'h-[450px]'}>
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
                    <span className="font-medium truncate text-sm">{facility.name}</span>
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
                  {facility.service_zone && (
                    <Badge variant="secondary" className="text-xs mt-1">
                      {facility.service_zone}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </ScrollArea>
  );

  return (
    <div className="space-y-3">
      {/* Header with search and view toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, zone, LGA..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex border rounded-md">
          <Button
            variant={viewMode === 'split' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('split')}
            className="rounded-r-none"
          >
            Split
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="rounded-none border-x"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'map' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('map')}
            className="rounded-l-none"
          >
            <MapIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Selection summary */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Checkbox
            id="select-all-map"
            checked={allFilteredSelected}
            onCheckedChange={handleSelectAll}
            className={someFilteredSelected && !allFilteredSelected ? 'data-[state=checked]:bg-primary/50' : ''}
          />
          <label htmlFor="select-all-map" className="cursor-pointer text-muted-foreground">
            Select all visible ({filteredFacilities.length})
          </label>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {selectedFacilityIds.length} selected
          </Badge>
          {selectedFacilityIds.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelectionChange([])}
              className="h-6 px-2 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'split' ? (
        <div className="grid grid-cols-2 gap-4">
          {/* Map */}
          <div
            ref={mapContainerRef}
            className="h-[400px] rounded-lg overflow-hidden border"
          />
          {/* List */}
          <div>
            {renderList()}
          </div>
        </div>
      ) : viewMode === 'map' ? (
        <div
          ref={mapContainerRef}
          className="h-[450px] rounded-lg overflow-hidden border"
        />
      ) : (
        renderList()
      )}

      {/* Route coherence hint */}
      {selectedFacilityIds.length > 0 && warehouse && (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          Selected facilities will form a route starting from {warehouse.name}
        </div>
      )}
    </div>
  );
}

export default FacilityMapSelector;
