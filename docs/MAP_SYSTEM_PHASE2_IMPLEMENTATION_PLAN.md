# Map System Phase 2 - Advanced Planning Features

## 📋 Implementation Plan

**Start Date:** Week 4 (After Phase 1 production deployment)
**Duration:** 3-4 days development + 2 days testing
**Team Size:** 2-3 developers
**Priority:** HIGH - Highest ROI for planning users

---

## Executive Summary

Phase 2 builds directly on Phase 1's planning infrastructure, adding advanced features that significantly enhance the value proposition for Operations Managers:

1. **Zone Conflict Analyzer** - Automated geometric conflict detection
2. **Route Optimization Engine** - Integration with routing services
3. **Batch Zone Operations** - Import/export and bulk operations
4. **Advanced Facility Assignment** - Constraint-based automated suggestions

**Key Benefits:**
- Reduces zone planning time by 60%
- Prevents geographic conflicts before activation
- Enables data-driven facility assignments
- Supports bulk operations for efficiency

**Technical Approach:**
- Builds on existing `zone_configurations` and `route_sketches` tables
- Leverages PostGIS for geometric operations
- Extends React Query hooks pattern
- Maintains draft → review → activate workflow

---

## Feature 1: Zone Conflict Analyzer

### User Story

**As an** Operations Manager
**I want to** detect conflicts between zone boundaries automatically
**So that** I can resolve overlaps before activating zones

### Technical Design

#### Database Schema Changes

```sql
-- New table for tracking conflicts
CREATE TABLE zone_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),

  zone_a_id UUID NOT NULL REFERENCES zone_configurations(id) ON DELETE CASCADE,
  zone_b_id UUID NOT NULL REFERENCES zone_configurations(id) ON DELETE CASCADE,

  conflict_type VARCHAR(50) NOT NULL, -- 'overlap', 'duplicate_name', 'containment'
  severity VARCHAR(20) NOT NULL, -- 'critical', 'warning', 'info'

  overlap_geometry GEOMETRY(Polygon, 4326), -- PostGIS geometry of overlap area
  overlap_area_km2 DECIMAL(10, 4), -- Size of overlap in square kilometers
  overlap_percentage_a DECIMAL(5, 2), -- % of zone A overlapped
  overlap_percentage_b DECIMAL(5, 2), -- % of zone B overlapped

  resolution_status VARCHAR(20) DEFAULT 'unresolved', -- 'unresolved', 'acknowledged', 'resolved'
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  detected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate conflict records
  CONSTRAINT unique_zone_pair UNIQUE(zone_a_id, zone_b_id),
  -- Ensure zone_a_id < zone_b_id to avoid reverse duplicates
  CONSTRAINT zone_order CHECK (zone_a_id < zone_b_id)
);

-- Indexes
CREATE INDEX idx_zone_conflicts_workspace ON zone_conflicts(workspace_id);
CREATE INDEX idx_zone_conflicts_unresolved ON zone_conflicts(resolution_status) WHERE resolution_status = 'unresolved';
CREATE INDEX idx_zone_conflicts_severity ON zone_conflicts(severity);
CREATE INDEX idx_zone_conflicts_overlap_geom ON zone_conflicts USING GIST(overlap_geometry);

-- RLS
ALTER TABLE zone_conflicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view conflicts in their workspace"
  ON zone_conflicts FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update conflicts in their workspace"
  ON zone_conflicts FOR UPDATE
  USING (auth.role() = 'authenticated');
```

#### Database Function: Detect Zone Conflicts

```sql
CREATE OR REPLACE FUNCTION detect_zone_conflicts(p_workspace_id UUID)
RETURNS TABLE (
  conflict_id UUID,
  zone_a_name VARCHAR,
  zone_b_name VARCHAR,
  conflict_type VARCHAR,
  severity VARCHAR,
  overlap_area_km2 DECIMAL,
  overlap_percentage_a DECIMAL,
  overlap_percentage_b DECIMAL
) AS $$
BEGIN
  -- Delete old conflicts for this workspace
  DELETE FROM zone_conflicts WHERE workspace_id = p_workspace_id;

  -- Detect geometric overlaps using PostGIS ST_Intersects
  INSERT INTO zone_conflicts (
    workspace_id,
    zone_a_id,
    zone_b_id,
    conflict_type,
    severity,
    overlap_geometry,
    overlap_area_km2,
    overlap_percentage_a,
    overlap_percentage_b
  )
  SELECT
    p_workspace_id,
    LEAST(z1.id, z2.id) as zone_a_id,
    GREATEST(z1.id, z2.id) as zone_b_id,
    CASE
      WHEN ST_Contains(z1.boundary, z2.boundary) THEN 'containment'
      WHEN ST_Contains(z2.boundary, z1.boundary) THEN 'containment'
      ELSE 'overlap'
    END as conflict_type,
    CASE
      WHEN ST_Area(ST_Intersection(z1.boundary, z2.boundary)::geography) /
           LEAST(ST_Area(z1.boundary::geography), ST_Area(z2.boundary::geography)) > 0.5
      THEN 'critical'
      WHEN ST_Area(ST_Intersection(z1.boundary, z2.boundary)::geography) /
           LEAST(ST_Area(z1.boundary::geography), ST_Area(z2.boundary::geography)) > 0.1
      THEN 'warning'
      ELSE 'info'
    END as severity,
    ST_Intersection(z1.boundary, z2.boundary) as overlap_geometry,
    ST_Area(ST_Intersection(z1.boundary, z2.boundary)::geography) / 1000000 as overlap_area_km2,
    (ST_Area(ST_Intersection(z1.boundary, z2.boundary)::geography) / ST_Area(z1.boundary::geography)) * 100 as overlap_percentage_a,
    (ST_Area(ST_Intersection(z1.boundary, z2.boundary)::geography) / ST_Area(z2.boundary::geography)) * 100 as overlap_percentage_b
  FROM zone_configurations z1
  CROSS JOIN zone_configurations z2
  WHERE z1.workspace_id = p_workspace_id
    AND z2.workspace_id = p_workspace_id
    AND z1.id < z2.id  -- Prevent duplicate pairs
    AND ST_Intersects(z1.boundary, z2.boundary)
    AND NOT ST_Touches(z1.boundary, z2.boundary); -- Touching boundaries are OK

  -- Detect duplicate names
  INSERT INTO zone_conflicts (
    workspace_id,
    zone_a_id,
    zone_b_id,
    conflict_type,
    severity,
    resolution_status
  )
  SELECT
    p_workspace_id,
    LEAST(z1.id, z2.id),
    GREATEST(z1.id, z2.id),
    'duplicate_name',
    'warning',
    'unresolved'
  FROM zone_configurations z1
  INNER JOIN zone_configurations z2 ON z1.name = z2.name
  WHERE z1.workspace_id = p_workspace_id
    AND z2.workspace_id = p_workspace_id
    AND z1.id < z2.id
  ON CONFLICT (zone_a_id, zone_b_id) DO NOTHING;

  -- Return detected conflicts
  RETURN QUERY
  SELECT
    zc.id,
    z1.name,
    z2.name,
    zc.conflict_type,
    zc.severity,
    zc.overlap_area_km2,
    zc.overlap_percentage_a,
    zc.overlap_percentage_b
  FROM zone_conflicts zc
  JOIN zone_configurations z1 ON zc.zone_a_id = z1.id
  JOIN zone_configurations z2 ON zc.zone_b_id = z2.id
  WHERE zc.workspace_id = p_workspace_id
  ORDER BY
    CASE zc.severity
      WHEN 'critical' THEN 1
      WHEN 'warning' THEN 2
      ELSE 3
    END,
    zc.overlap_area_km2 DESC;
END;
$$ LANGUAGE plpgsql;
```

#### React Hook: useZoneConflicts

```typescript
// src/hooks/useZoneConflicts.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface ZoneConflict {
  id: string;
  workspace_id: string;
  zone_a_id: string;
  zone_b_id: string;
  zone_a_name: string;
  zone_b_name: string;
  conflict_type: 'overlap' | 'duplicate_name' | 'containment';
  severity: 'critical' | 'warning' | 'info';
  overlap_geometry?: any; // GeoJSON
  overlap_area_km2?: number;
  overlap_percentage_a?: number;
  overlap_percentage_b?: number;
  resolution_status: 'unresolved' | 'acknowledged' | 'resolved';
  resolved_by?: string;
  resolved_at?: string;
  resolution_notes?: string;
  detected_at: string;
}

export function useDetectZoneConflicts(workspaceId: string) {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('detect_zone_conflicts', {
        p_workspace_id: workspaceId,
      });

      if (error) throw error;
      return data as ZoneConflict[];
    },
    onSuccess: (conflicts) => {
      const criticalCount = conflicts.filter(c => c.severity === 'critical').length;
      const warningCount = conflicts.filter(c => c.severity === 'warning').length;

      if (criticalCount > 0) {
        toast.error(`Found ${criticalCount} critical zone conflicts!`);
      } else if (warningCount > 0) {
        toast.warning(`Found ${warningCount} zone conflicts to review`);
      } else {
        toast.success('No zone conflicts detected');
      }
    },
    onError: (error) => {
      toast.error('Failed to detect conflicts: ' + error.message);
    },
  });
}

export function useZoneConflicts(workspaceId: string) {
  return useQuery({
    queryKey: ['zone-conflicts', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('zone_conflicts')
        .select(`
          *,
          zone_a:zone_configurations!zone_a_id(id, name),
          zone_b:zone_configurations!zone_b_id(id, name)
        `)
        .eq('workspace_id', workspaceId)
        .order('severity', { ascending: false });

      if (error) throw error;
      return data as ZoneConflict[];
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useResolveZoneConflict() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conflictId,
      notes,
    }: {
      conflictId: string;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('zone_conflicts')
        .update({
          resolution_status: 'resolved',
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
          resolution_notes: notes,
        })
        .eq('id', conflictId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zone-conflicts'] });
      toast.success('Conflict marked as resolved');
    },
  });
}
```

#### UI Component: ZoneConflictPanel

```typescript
// src/components/map/panels/ZoneConflictPanel.tsx

import { useState } from 'react';
import { useDetectZoneConflicts, useZoneConflicts, useResolveZoneConflict } from '@/hooks/useZoneConflicts';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, AlertTriangle, Info, RefreshCw } from 'lucide-react';

interface ZoneConflictPanelProps {
  workspaceId: string;
  onZoomToConflict?: (zoneIds: [string, string]) => void;
}

export function ZoneConflictPanel({ workspaceId, onZoomToConflict }: ZoneConflictPanelProps) {
  const { data: conflicts = [], isLoading } = useZoneConflicts(workspaceId);
  const detectConflicts = useDetectZoneConflicts(workspaceId);
  const resolveConflict = useResolveZoneConflict();

  const unresolvedConflicts = conflicts.filter(c => c.resolution_status === 'unresolved');
  const criticalCount = unresolvedConflicts.filter(c => c.severity === 'critical').length;

  return (
    <Card className="w-96">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Zone Conflicts</CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={() => detectConflicts.mutate()}
          disabled={detectConflicts.isPending}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${detectConflicts.isPending ? 'animate-spin' : ''}`} />
          Scan
        </Button>
      </CardHeader>

      <CardContent>
        {/* Summary */}
        <div className="mb-4 p-3 bg-muted rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Unresolved Conflicts</span>
            <span className="text-2xl font-bold">{unresolvedConflicts.length}</span>
          </div>
          {criticalCount > 0 && (
            <div className="mt-2 flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{criticalCount} critical issues require immediate attention</span>
            </div>
          )}
        </div>

        {/* Conflict List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {unresolvedConflicts.map((conflict) => (
            <div
              key={conflict.id}
              className="p-3 border rounded-lg hover:bg-accent cursor-pointer"
              onClick={() => onZoomToConflict?.([conflict.zone_a_id, conflict.zone_b_id])}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {conflict.severity === 'critical' && (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  )}
                  {conflict.severity === 'warning' && (
                    <AlertTriangle className="h-4 w-4 text-warning" />
                  )}
                  {conflict.severity === 'info' && (
                    <Info className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium">
                    {conflict.conflict_type.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <Badge variant={conflict.severity === 'critical' ? 'destructive' : 'secondary'}>
                  {conflict.severity}
                </Badge>
              </div>

              <div className="text-sm space-y-1">
                <div className="font-medium">
                  {conflict.zone_a_name} ↔ {conflict.zone_b_name}
                </div>

                {conflict.overlap_area_km2 && (
                  <div className="text-muted-foreground">
                    Overlap: {conflict.overlap_area_km2.toFixed(2)} km²
                    ({conflict.overlap_percentage_a?.toFixed(1)}% / {conflict.overlap_percentage_b?.toFixed(1)}%)
                  </div>
                )}
              </div>

              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    resolveConflict.mutate({ conflictId: conflict.id });
                  }}
                >
                  Mark Resolved
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onZoomToConflict?.([conflict.zone_a_id, conflict.zone_b_id]);
                  }}
                >
                  View on Map
                </Button>
              </div>
            </div>
          ))}

          {unresolvedConflicts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Info className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No conflicts detected</p>
              <p className="text-sm">All zones are properly configured</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

### Implementation Tasks

**Day 1: Database & Backend** (6 hours)
- [ ] Create `zone_conflicts` table with RLS
- [ ] Implement `detect_zone_conflicts()` function
- [ ] Write unit tests for conflict detection
- [ ] Create indexes for performance

**Day 2: React Hooks & API** (6 hours)
- [ ] Implement `useZoneConflicts` hook
- [ ] Implement `useDetectZoneConflicts` hook
- [ ] Implement `useResolveZoneConflict` hook
- [ ] Add TypeScript interfaces

**Day 3: UI Components** (6 hours)
- [ ] Build `ZoneConflictPanel` component
- [ ] Add conflict visualization on map (highlight overlap areas)
- [ ] Integrate with Planning Review Dialog
- [ ] Add conflict resolution workflow

**Day 4: Testing & Polish** (4 hours)
- [ ] Manual testing with various conflict scenarios
- [ ] Performance testing with 100+ zones
- [ ] Bug fixes and refinements
- [ ] Documentation updates

---

## Feature 2: Route Optimization Engine

### User Story

**As an** Operations Manager
**I want to** optimize route sketches automatically
**So that** I can plan efficient routes without manual calculations

### Technical Design

#### Integration with OSRM (Open Source Routing Machine)

```typescript
// src/lib/routingService.ts

import { toast } from 'sonner';

export interface Waypoint {
  lat: number;
  lng: number;
  name?: string;
}

export interface OptimizedRoute {
  geometry: {
    type: 'LineString';
    coordinates: number[][]; // [lng, lat][]
  };
  distance: number; // meters
  duration: number; // seconds
  waypoints: Waypoint[];
  legs: Array<{
    distance: number;
    duration: number;
    steps: Array<{
      distance: number;
      duration: number;
      name: string;
      instruction: string;
    }>;
  }>;
}

export async function optimizeRoute(
  waypoints: Waypoint[],
  options: {
    profile?: 'car' | 'truck' | 'bike' | 'foot';
    optimize?: boolean; // Enable waypoint reordering
  } = {}
): Promise<OptimizedRoute> {
  const { profile = 'car', optimize = false } = options;

  // Format waypoints as OSRM expects: lng,lat;lng,lat;...
  const coordinates = waypoints
    .map((w) => `${w.lng},${w.lat}`)
    .join(';');

  // Use public OSRM server (replace with self-hosted for production)
  const osrmUrl = `https://router.project-osrm.org/route/v1/${profile}/${coordinates}`;
  const params = new URLSearchParams({
    overview: 'full',
    geometries: 'geojson',
    steps: 'true',
    annotations: 'true',
  });

  const response = await fetch(`${osrmUrl}?${params}`);

  if (!response.ok) {
    throw new Error('Route optimization failed');
  }

  const data = await response.json();

  if (data.code !== 'Ok') {
    throw new Error(data.message || 'Route optimization failed');
  }

  const route = data.routes[0];

  return {
    geometry: route.geometry,
    distance: route.distance,
    duration: route.duration,
    waypoints: data.waypoints.map((wp: any, index: number) => ({
      lat: wp.location[1],
      lng: wp.location[0],
      name: waypoints[index].name,
    })),
    legs: route.legs.map((leg: any) => ({
      distance: leg.distance,
      duration: leg.duration,
      steps: leg.steps.map((step: any) => ({
        distance: step.distance,
        duration: step.duration,
        name: step.name,
        instruction: step.maneuver.instruction || '',
      })),
    })),
  };
}

// Geocoding helper (for facility address → coordinates)
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
  );

  const data = await response.json();

  if (data.length === 0) return null;

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
  };
}
```

#### Database Schema: Route Optimization Cache

```sql
CREATE TABLE route_optimization_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),

  -- Input parameters (for cache key)
  waypoints JSONB NOT NULL, -- Array of {lat, lng, name}
  profile VARCHAR(20) NOT NULL, -- 'car', 'truck', 'bike', 'foot'

  -- Optimized output
  optimized_geometry GEOMETRY(LineString, 4326) NOT NULL,
  optimized_waypoints JSONB NOT NULL, -- Reordered waypoints if optimized
  distance_meters INTEGER NOT NULL,
  duration_seconds INTEGER NOT NULL,
  turn_by_turn_directions JSONB, -- Detailed step-by-step directions

  -- Metadata
  algorithm VARCHAR(50) DEFAULT 'osrm', -- 'osrm', 'graphhopper', 'google'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',

  -- Cache key index
  waypoints_hash VARCHAR(64) GENERATED ALWAYS AS (
    md5(waypoints::text || profile)
  ) STORED
);

CREATE INDEX idx_route_cache_hash ON route_optimization_cache(waypoints_hash);
CREATE INDEX idx_route_cache_expires ON route_optimization_cache(expires_at) WHERE expires_at > NOW();

-- Clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_route_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM route_optimization_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (run via cron or pg_cron)
-- SELECT cron.schedule('cleanup-route-cache', '0 2 * * *', 'SELECT cleanup_expired_route_cache()');
```

#### UI Component: Route Optimization Button

```typescript
// Add to RouteSketchTool.tsx

import { optimizeRoute } from '@/lib/routingService';

export function RouteSketchTool({ map, active, onClose }: RouteSketchToolProps) {
  // ... existing code ...

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedRoute, setOptimizedRoute] = useState<OptimizedRoute | null>(null);

  const handleOptimizeRoute = useCallback(async () => {
    if (waypoints.length < 2) {
      toast.error('Add at least 2 waypoints to optimize');
      return;
    }

    setIsOptimizing(true);
    try {
      const result = await optimizeRoute(waypoints, {
        profile: 'car',
        optimize: true, // Enable waypoint reordering
      });

      setOptimizedRoute(result);

      // Update waypoints with optimized order
      setWaypoints(result.waypoints);

      // Update distance/duration with accurate values
      setDistance(result.distance / 1000); // Convert to km
      setEstimatedDuration(result.duration / 60); // Convert to minutes

      toast.success('Route optimized successfully!');

      // Log optimization
      await logRouteSketchAction({
        workspaceId,
        actionType: 'optimize_route',
        newData: {
          original_distance: distance,
          optimized_distance: result.distance / 1000,
          savings_km: distance - (result.distance / 1000),
        },
      });
    } catch (error) {
      toast.error('Route optimization failed: ' + error.message);
    } finally {
      setIsOptimizing(false);
    }
  }, [waypoints, distance]);

  return (
    <div className="...">
      {/* ... existing UI ... */}

      <Button
        onClick={handleOptimizeRoute}
        disabled={waypoints.length < 2 || isOptimizing}
        variant="secondary"
      >
        {isOptimizing ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Optimizing...
          </>
        ) : (
          <>
            <Zap className="h-4 w-4 mr-2" />
            Optimize Route
          </>
        )}
      </Button>

      {optimizedRoute && (
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <p className="text-sm font-medium text-green-800 dark:text-green-200">
            Route Optimized!
          </p>
          <ul className="mt-2 space-y-1 text-xs text-green-700 dark:text-green-300">
            <li>Distance: {(optimizedRoute.distance / 1000).toFixed(2)} km</li>
            <li>Duration: {Math.round(optimizedRoute.duration / 60)} min</li>
            {optimizedRoute.distance < distance * 1000 && (
              <li className="font-medium">
                Saved: {((distance - optimizedRoute.distance / 1000)).toFixed(2)} km
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
```

### Implementation Tasks

**Day 1: Routing Service Integration** (4 hours)
- [ ] Create `routingService.ts` with OSRM integration
- [ ] Implement route optimization function
- [ ] Add geocoding helper
- [ ] Test with sample routes

**Day 2: UI Integration** (4 hours)
- [ ] Add "Optimize Route" button to RouteSketchTool
- [ ] Display optimization results
- [ ] Show turn-by-turn directions (optional)
- [ ] Handle errors gracefully

**Day 3: Caching Layer** (4 hours)
- [ ] Create `route_optimization_cache` table
- [ ] Implement cache lookup before API call
- [ ] Add cache cleanup function
- [ ] Test cache performance

---

## Feature 3: Batch Zone Operations

### User Story

**As an** Operations Manager
**I want to** import/export zones in bulk
**So that** I can efficiently manage large service areas

### Technical Design

#### Import from GeoJSON/CSV

```typescript
// src/lib/zoneImporter.ts

import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface ZoneImportRow {
  name: string;
  description?: string;
  zone_type?: string;
  boundary: any; // GeoJSON Polygon
  priority?: number;
}

export async function importZonesFromGeoJSON(
  file: File,
  workspaceId: string
): Promise<{ success: number; failed: number }> {
  const text = await file.text();
  const geojson = JSON.parse(text);

  if (geojson.type !== 'FeatureCollection') {
    throw new Error('Invalid GeoJSON: expected FeatureCollection');
  }

  let success = 0;
  let failed = 0;

  for (const feature of geojson.features) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const zone: ZoneImportRow = {
        name: feature.properties?.name || `Zone ${success + failed + 1}`,
        description: feature.properties?.description,
        zone_type: feature.properties?.zone_type || 'service',
        boundary: feature.geometry,
        priority: feature.properties?.priority || 0,
      };

      const { error } = await supabase.from('zone_configurations').insert([{
        workspace_id: workspaceId,
        name: zone.name,
        description: zone.description,
        zone_type: zone.zone_type,
        boundary: zone.boundary,
        priority: zone.priority,
        active: false, // Import as drafts
        version: 1,
        draft_created_by: user.id,
      }]);

      if (error) throw error;
      success++;
    } catch (error) {
      console.error('Failed to import zone:', error);
      failed++;
    }
  }

  return { success, failed };
}

export function exportZonesToGeoJSON(zones: ZoneConfiguration[]): string {
  const featureCollection = {
    type: 'FeatureCollection',
    features: zones.map((zone) => ({
      type: 'Feature',
      geometry: zone.boundary,
      properties: {
        id: zone.id,
        name: zone.name,
        description: zone.description,
        zone_type: zone.zone_type,
        priority: zone.priority,
        active: zone.active,
        created_at: zone.created_at,
      },
    })),
  };

  return JSON.stringify(featureCollection, null, 2);
}
```

#### UI Component: Zone Import/Export Dialog

```typescript
// src/components/map/dialogs/ZoneImportExportDialog.tsx

import { useState } from 'react';
import { importZonesFromGeoJSON, exportZonesToGeoJSON } from '@/lib/zoneImporter';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Download, Loader2 } from 'lucide-react';

export function ZoneImportExportDialog({ open, onClose, zones }: Props) {
  const [importing, setImporting] = useState(false);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const result = await importZonesFromGeoJSON(file, workspaceId);
      toast.success(`Imported ${result.success} zones (${result.failed} failed)`);
      onClose();
    } catch (error) {
      toast.error('Import failed: ' + error.message);
    } finally {
      setImporting(false);
    }
  };

  const handleExport = () => {
    const geojson = exportZonesToGeoJSON(zones);
    const blob = new Blob([geojson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zones-export-${new Date().toISOString().split('T')[0]}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Zones exported successfully');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import/Export Zones</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="import">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import">Import</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Import zones from a GeoJSON file. All imported zones will be created as drafts.
            </p>

            <div>
              <input
                type="file"
                accept=".geojson,.json"
                onChange={handleImport}
                disabled={importing}
                className="hidden"
                id="zone-import-input"
              />
              <label htmlFor="zone-import-input">
                <Button asChild disabled={importing}>
                  <span>
                    {importing ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing...</>
                    ) : (
                      <><Upload className="h-4 w-4 mr-2" /> Choose GeoJSON File</>
                    )}
                  </span>
                </Button>
              </label>
            </div>
          </TabsContent>

          <TabsContent value="export" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Export {zones.length} zones to a GeoJSON file for backup or sharing.
            </p>

            <Button onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Download GeoJSON
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
```

### Implementation Tasks

**Day 1: Import/Export Functions** (4 hours)
- [ ] Implement GeoJSON import function
- [ ] Implement GeoJSON export function
- [ ] Add CSV import support (optional)
- [ ] Add validation for imported data

**Day 2: UI Components** (3 hours)
- [ ] Build ZoneImportExportDialog
- [ ] Add to Planning Mode toolbar
- [ ] Test with sample GeoJSON files
- [ ] Error handling and progress indicators

---

## Feature 4: Advanced Facility Assignment

### User Story

**As an** Operations Manager
**I want to** get automated facility assignment suggestions
**So that** I can optimize coverage and reduce manual work

### Technical Design

#### Database Function: Suggest Facility Assignments

```sql
CREATE OR REPLACE FUNCTION suggest_facility_assignments(
  p_zone_id UUID,
  p_max_distance_km DECIMAL DEFAULT 50.0,
  p_max_suggestions INTEGER DEFAULT 10
)
RETURNS TABLE (
  facility_id UUID,
  facility_name VARCHAR,
  distance_km DECIMAL,
  is_within_zone BOOLEAN,
  suggested_priority INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.name,
    ROUND((ST_Distance(
      ST_Centroid(z.boundary)::geography,
      ST_SetSRID(ST_MakePoint(f.longitude, f.latitude), 4326)::geography
    ) / 1000)::numeric, 2) as distance_km,
    ST_Contains(z.boundary, ST_SetSRID(ST_MakePoint(f.longitude, f.latitude), 4326)) as is_within_zone,
    ROW_NUMBER() OVER (
      ORDER BY
        CASE WHEN ST_Contains(z.boundary, ST_SetSRID(ST_MakePoint(f.longitude, f.latitude), 4326))
          THEN 0 ELSE 1
        END,
        ST_Distance(
          ST_Centroid(z.boundary)::geography,
          ST_SetSRID(ST_MakePoint(f.longitude, f.latitude), 4326)::geography
        )
    )::integer as suggested_priority
  FROM facilities f
  CROSS JOIN zone_configurations z
  WHERE z.id = p_zone_id
    AND ST_DWithin(
      ST_Centroid(z.boundary)::geography,
      ST_SetSRID(ST_MakePoint(f.longitude, f.latitude), 4326)::geography,
      p_max_distance_km * 1000
    )
  ORDER BY suggested_priority
  LIMIT p_max_suggestions;
END;
$$ LANGUAGE plpgsql;
```

#### React Hook: useSuggestFacilityAssignments

```typescript
// Add to src/hooks/useFacilityAssignments.ts

export function useSuggestFacilityAssignments(zoneId: string) {
  return useQuery({
    queryKey: ['facility-assignment-suggestions', zoneId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('suggest_facility_assignments', {
        p_zone_id: zoneId,
        p_max_distance_km: 50,
        p_max_suggestions: 10,
      });

      if (error) throw error;
      return data;
    },
    enabled: !!zoneId,
  });
}
```

#### UI: Auto-Suggest in FacilityAssigner

```typescript
// Update FacilityAssigner.tsx

import { useSuggestFacilityAssignments } from '@/hooks/useFacilityAssignments';

export function FacilityAssigner({ active, onClose }: Props) {
  // ... existing code ...

  const { data: suggestions = [] } = useSuggestFacilityAssignments(selectedZoneId);

  return (
    <div>
      {/* ... existing UI ... */}

      {selectedZoneId && suggestions.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm font-medium mb-2">Suggested Facilities</p>
          <div className="space-y-1">
            {suggestions.slice(0, 5).map((sug) => (
              <div key={sug.facility_id} className="flex items-center justify-between text-xs">
                <span>{sug.facility_name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{sug.distance_km} km</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedFacilityIds((prev) => new Set([...prev, sug.facility_id]));
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### Implementation Tasks

**Day 1: Database Function** (3 hours)
- [ ] Implement `suggest_facility_assignments()` function
- [ ] Add distance-based sorting
- [ ] Test with various zones

**Day 2: React Hook & UI** (3 hours)
- [ ] Create `useSuggestFacilityAssignments` hook
- [ ] Add suggestions panel to FacilityAssigner
- [ ] Add "Add All Suggestions" button
- [ ] Test user flow

---

## Testing Strategy

### Unit Tests

```typescript
// tests/zoneConflicts.test.ts

describe('Zone Conflict Detection', () => {
  it('detects overlapping zones', async () => {
    const zone1 = createTestZone({ boundary: polygon1 });
    const zone2 = createTestZone({ boundary: polygon2_overlapping });

    const conflicts = await detectZoneConflicts(workspaceId);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].conflict_type).toBe('overlap');
    expect(conflicts[0].severity).toBe('warning');
  });

  it('detects duplicate names', async () => {
    const zone1 = createTestZone({ name: 'Zone A' });
    const zone2 = createTestZone({ name: 'Zone A' });

    const conflicts = await detectZoneConflicts(workspaceId);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].conflict_type).toBe('duplicate_name');
  });
});
```

### Integration Tests

- Import 50 zones from GeoJSON → verify all imported
- Optimize route with 10 waypoints → verify distance reduced
- Detect conflicts between 100+ zones → verify performance <2s
- Suggest facility assignments → verify correct distance calculations

### Performance Benchmarks

- Conflict detection with 500 zones: <5 seconds
- Route optimization: <2 seconds
- GeoJSON import of 100 zones: <10 seconds
- Facility suggestions: <500ms

---

## Deployment Plan

### Database Migration

```sql
-- Phase 2 Migration File: 20251230000001_phase2_advanced_planning.sql

-- Zone Conflicts
CREATE TABLE zone_conflicts (...);
-- ... (full schema from above)

-- Route Optimization Cache
CREATE TABLE route_optimization_cache (...);
-- ... (full schema from above)

-- Functions
CREATE FUNCTION detect_zone_conflicts(...);
CREATE FUNCTION suggest_facility_assignments(...);
CREATE FUNCTION cleanup_expired_route_cache(...);
```

### Rollout Strategy

1. **Week 1:** Deploy to staging, internal testing
2. **Week 2:** UAT with 3 operations managers
3. **Week 3:** Production deployment
4. **Week 4:** Monitor adoption, collect feedback

---

## Success Metrics

**Adoption:**
- 80% of planners using Zone Conflict Analyzer within 2 weeks
- 50+ zones imported via GeoJSON in first month
- 30+ routes optimized in first month

**Efficiency:**
- 60% reduction in time to create zones (target: 5 min → 2 min)
- 40% reduction in route planning errors
- 80% of suggested facility assignments accepted

**Quality:**
- Zero critical zone conflicts activated
- 90% of optimized routes show distance savings
- User satisfaction score >8/10

---

**Document Version:** 1.0
**Status:** Ready for Development
**Priority:** HIGH
**Dependencies:** Phase 1 production deployment
