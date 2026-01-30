/**
 * =====================================================
 * Facility Schedule List (Left Column - Step 3)
 * =====================================================
 * Displays the route sequence as a list of facility
 * transitions: WH → PHC → BHC → PHC etc.
 */

import * as React from 'react';
import {
  Building2,
  MapPin,
  ArrowDown,
  Package,
  Clock,
  Route,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { WorkingSetItem } from '@/types/unified-workflow';

interface FacilityScheduleListProps {
  facilities: WorkingSetItem[];
  startLocation?: { id: string; name: string; type: 'warehouse' | 'facility' } | null;
  className?: string;
}

export function FacilityScheduleList({
  facilities,
  startLocation,
  className,
}: FacilityScheduleListProps) {
  // Build route segments
  const segments = React.useMemo(() => {
    const result: RouteSegment[] = [];

    // Start from warehouse/facility
    const startName = startLocation?.name || 'Warehouse';
    const startType = startLocation?.type || 'warehouse';

    if (facilities.length === 0) {
      return [];
    }

    // First segment: Start → First Facility
    result.push({
      id: `segment-0`,
      fromName: startName,
      fromType: startType,
      toName: facilities[0].facility_name,
      toType: 'facility',
      sequence: 1,
      slotDemand: facilities[0].slot_demand,
    });

    // Subsequent segments
    for (let i = 1; i < facilities.length; i++) {
      result.push({
        id: `segment-${i}`,
        fromName: facilities[i - 1].facility_name,
        fromType: 'facility',
        toName: facilities[i].facility_name,
        toType: 'facility',
        sequence: i + 1,
        slotDemand: facilities[i].slot_demand,
      });
    }

    return result;
  }, [facilities, startLocation]);

  // Calculate totals
  const totals = React.useMemo(() => {
    return {
      stops: facilities.length,
      slots: facilities.reduce((sum, f) => sum + (f.slot_demand || 0), 0),
      segments: segments.length,
    };
  }, [facilities, segments]);

  if (facilities.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-full text-muted-foreground p-4', className)}>
        <Route className="h-10 w-10 mb-3 opacity-30" />
        <p className="text-sm font-medium">No facilities in schedule</p>
        <p className="text-xs mt-1 text-center">
          Facilities from the schedule phase will appear here
        </p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b bg-muted/50">
        <h3 className="text-sm font-medium">Route Sequence</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {totals.stops} stops • {totals.slots} slots
        </p>
      </div>

      {/* Route List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {/* Start Location */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {startLocation?.name || 'Start Location'}
              </p>
              <p className="text-xs text-muted-foreground">Origin</p>
            </div>
          </div>

          {/* Route Segments */}
          {segments.map((segment, index) => (
            <React.Fragment key={segment.id}>
              {/* Connector */}
              <div className="flex items-center gap-3 pl-4">
                <div className="w-8 flex justify-center">
                  <div className="h-6 w-0.5 bg-border" />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ArrowDown className="h-3 w-3" />
                  <span>Leg {segment.sequence}</span>
                </div>
              </div>

              {/* Destination */}
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
                  {segment.sequence}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{segment.toName}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                      <Package className="h-3 w-3 mr-1" />
                      {segment.slotDemand} slots
                    </Badge>
                  </div>
                </div>
              </div>
            </React.Fragment>
          ))}

          {/* Return to Origin (optional indicator) */}
          <div className="flex items-center gap-3 pl-4 pt-2 opacity-50">
            <div className="w-8 flex justify-center">
              <div className="h-6 w-0.5 bg-border border-dashed" />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ArrowDown className="h-3 w-3" />
              <span>Return</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed bg-muted/30 opacity-50">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground truncate">
                {startLocation?.name || 'Start Location'}
              </p>
              <p className="text-xs text-muted-foreground">Return to origin</p>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// =====================================================
// Types
// =====================================================

interface RouteSegment {
  id: string;
  fromName: string;
  fromType: 'warehouse' | 'facility';
  toName: string;
  toType: 'facility';
  sequence: number;
  slotDemand: number;
  distanceKm?: number;
  durationMin?: number;
}

export default FacilityScheduleList;
