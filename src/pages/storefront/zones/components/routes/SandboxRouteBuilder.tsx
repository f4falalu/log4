import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTheme } from 'next-themes';
import {
  ArrowLeft,
  Search,
  MapPin,
  Zap,
  Check,
  Loader2,
  X,
  TrendingUp,
  Ruler,
  Building2,
  Settings2,
  ChevronDown,
  ChevronUp,
  Fuel,
  Clock,
  Layers,
  Route,
  Radar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useOperationalZones } from '@/hooks/useOperationalZones';
import { useFacilities } from '@/hooks/useFacilities';
import { useCreateRoute } from '@/hooks/useRoutes';
import { calculateDistance } from '@/lib/routeOptimization';
import { computeDistanceMatrix, type GeoPoint } from '@/lib/algorithms/distanceMatrix';
import { solveTSP } from '@/lib/algorithms/tsp';
import { getMapLibreStyle } from '@/lib/mapConfig';
import type { Facility } from '@/types';

// ─── Optimization Config ───

interface OptimizationConfig {
  shortestDistance: boolean;
  fuelEfficiency: boolean;
  timeOptimized: boolean;
  clusterPriority: boolean;
}

const OPTIMIZATION_CRITERIA = [
  {
    key: 'shortestDistance' as const,
    label: 'Shortest Distance',
    description: 'Minimize total route kilometers',
    icon: Route,
  },
  {
    key: 'fuelEfficiency' as const,
    label: 'Fuel Efficiency',
    description: 'Penalize long detours & backtracking',
    icon: Fuel,
  },
  {
    key: 'timeOptimized' as const,
    label: 'Time Optimized',
    description: 'Minimize travel + service time (40 km/h avg)',
    icon: Clock,
  },
  {
    key: 'clusterPriority' as const,
    label: 'Cluster Priority',
    description: 'Group nearby facilities to reduce zig-zagging',
    icon: Layers,
  },
];

const DEFAULT_CONFIG: OptimizationConfig = {
  shortestDistance: true,
  fuelEfficiency: false,
  timeOptimized: false,
  clusterPriority: false,
};

const SERVICE_TIME_HOURS = 0.25; // 15 min per stop
const AVG_SPEED_KMH = 40;

/**
 * Build a weighted distance matrix based on selected optimization criteria.
 * Multiple criteria are combined by averaging normalized matrices.
 */
function buildOptimizedMatrix(
  points: GeoPoint[],
  config: OptimizationConfig
): { matrix: number[][]; algorithmLabel: string } {
  const n = points.length;
  const rawMatrix = computeDistanceMatrix(points);
  const matrices: number[][] [] = [];
  const labels: string[] = [];

  // Shortest Distance: raw haversine distances
  if (config.shortestDistance) {
    matrices.push(rawMatrix);
    labels.push('Shortest Distance');
  }

  // Fuel Efficiency: squared distances (penalizes long legs more)
  if (config.fuelEfficiency) {
    const squared: number[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => rawMatrix[i][j] ** 2)
    );
    matrices.push(squared);
    labels.push('Fuel Efficient');
  }

  // Time Optimized: distance/speed + service time per stop
  if (config.timeOptimized) {
    const timeMatrix: number[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) =>
        i === j ? 0 : rawMatrix[i][j] / AVG_SPEED_KMH + SERVICE_TIME_HOURS
      )
    );
    matrices.push(timeMatrix);
    labels.push('Time Optimized');
  }

  // Cluster Priority: cluster facilities, add inter-cluster penalty
  if (config.clusterPriority) {
    const clusterCount = Math.max(2, Math.ceil(n / 5));
    const assignments = simpleKMeans(points, clusterCount);
    const clusterMatrix: number[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => {
        const base = rawMatrix[i][j];
        // Add 50% penalty for crossing cluster boundaries
        return assignments[i] !== assignments[j] ? base * 1.5 : base;
      })
    );
    matrices.push(clusterMatrix);
    labels.push('Cluster Priority');
  }

  // If nothing selected, fall back to raw
  if (matrices.length === 0) {
    return { matrix: rawMatrix, algorithmLabel: 'Shortest Distance' };
  }

  // Combine by normalizing each matrix and averaging
  if (matrices.length === 1) {
    return { matrix: matrices[0], algorithmLabel: labels[0] };
  }

  // Normalize each matrix to [0,1] range, then average
  const normalized = matrices.map((m) => {
    let maxVal = 0;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        if (m[i][j] > maxVal) maxVal = m[i][j];
    if (maxVal === 0) return m;
    return m.map((row) => row.map((v) => v / maxVal));
  });

  const combined: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      let sum = 0;
      for (const nm of normalized) sum += nm[i][j];
      return sum / normalized.length;
    })
  );

  return { matrix: combined, algorithmLabel: labels.join(' + ') };
}

/**
 * Simple k-means clustering for geo points.
 * Returns an array of cluster assignments (index per point).
 */
function simpleKMeans(points: GeoPoint[], k: number, maxIter = 20): number[] {
  const n = points.length;
  if (n <= k) return points.map((_, i) => i);

  // Initialize centroids by evenly spaced picks
  const centroids: { lat: number; lng: number }[] = [];
  for (let i = 0; i < k; i++) {
    const idx = Math.floor((i * n) / k);
    centroids.push({ lat: points[idx].lat, lng: points[idx].lng });
  }

  let assignments = new Array(n).fill(0);

  for (let iter = 0; iter < maxIter; iter++) {
    // Assign each point to nearest centroid
    const newAssignments = points.map((p) => {
      let minDist = Infinity;
      let closest = 0;
      for (let c = 0; c < k; c++) {
        const d =
          (p.lat - centroids[c].lat) ** 2 + (p.lng - centroids[c].lng) ** 2;
        if (d < minDist) {
          minDist = d;
          closest = c;
        }
      }
      return closest;
    });

    // Check convergence
    const changed = newAssignments.some((a, i) => a !== assignments[i]);
    assignments = newAssignments;
    if (!changed) break;

    // Update centroids
    for (let c = 0; c < k; c++) {
      const members = points.filter((_, i) => assignments[i] === c);
      if (members.length > 0) {
        centroids[c] = {
          lat: members.reduce((s, m) => s + m.lat, 0) / members.length,
          lng: members.reduce((s, m) => s + m.lng, 0) / members.length,
        };
      }
    }
  }

  return assignments;
}

interface SandboxRouteBuilderProps {
  onClose: () => void;
}

type TetherMode = 'cardinal' | 'route';

export function SandboxRouteBuilder({ onClose }: SandboxRouteBuilderProps) {
  const [zoneId, setZoneId] = useState('');
  const [selectedFacilityIds, setSelectedFacilityIds] = useState<string[]>([]);
  const [routeName, setRouteName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [optimizedOrder, setOptimizedOrder] = useState<string[] | null>(null);
  const [optimizedDistance, setOptimizedDistance] = useState<number | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [tetherMode, setTetherMode] = useState<TetherMode>('cardinal');
  const [sortInsightsBy, setSortInsightsBy] = useState<'name' | 'distance'>('distance');
  const [optConfig, setOptConfig] = useState<OptimizationConfig>({ ...DEFAULT_CONFIG });
  const [showOptSettings, setShowOptSettings] = useState(false);
  const [optimizedTime, setOptimizedTime] = useState<number | null>(null);
  const [algorithmLabel, setAlgorithmLabel] = useState<string | null>(null);

  const { theme } = useTheme();
  const { zones } = useOperationalZones();
  const selectedZone = zones?.find((z) => z.id === zoneId);
  const zoneCenter = selectedZone?.region_center ?? null;

  // Sandbox builder should not depend on operational hierarchy (service areas, service_zone naming, etc.).
  // Load facilities broadly once a zone is selected so the user can prototype routes even if
  // facilities are not yet assigned to zones/service areas.
  const facilitiesQuery = useFacilities(zoneId ? {} : undefined, undefined, 1000);
  const facilitiesLoading = facilitiesQuery.isLoading;
  const facilitiesError = facilitiesQuery.error as Error | null;
  const createMutation = useCreateRoute();

  const facilities = (facilitiesQuery.data?.facilities as unknown as Facility[]) ?? [];

  const visitIndexByFacilityId = useMemo(() => {
    const order = optimizedOrder || selectedFacilityIds;
    const map = new Map<string, number>();
    order.forEach((id, idx) => map.set(id, idx + 1));
    return map;
  }, [optimizedOrder, selectedFacilityIds]);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());

  // Reset selections when zone changes
  useEffect(() => {
    setSelectedFacilityIds([]);
    setOptimizedOrder(null);
    setOptimizedDistance(null);
    setSearchQuery('');
    setTetherMode('cardinal');
  }, [zoneId]);

  // Filter facilities by search
  const filteredFacilities = useMemo(() => {
    if (!searchQuery.trim()) return facilities;
    const q = searchQuery.toLowerCase();
    return facilities.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.lga?.toLowerCase().includes(q) ||
        f.level_of_care?.toLowerCase().includes(q) ||
        f.warehouse_code?.toLowerCase().includes(q)
    );
  }, [facilities, searchQuery]);

  // Compute per-facility distances from zone center
  const facilityDistances = useMemo(() => {
    if (!zoneCenter) return new Map<string, number>();
    const map = new Map<string, number>();
    facilities.forEach((f) => {
      if (f.lat && f.lng) {
        const dist = calculateDistance(zoneCenter.lat, zoneCenter.lng, f.lat, f.lng);
        map.set(f.id, Math.round(dist * 10) / 10);
      }
    });
    return map;
  }, [facilities, zoneCenter]);

  // Insights for selected facilities
  const insights = useMemo(() => {
    const selected = facilities.filter((f) => selectedFacilityIds.includes(f.id));
    const distances = selected
      .map((f) => facilityDistances.get(f.id))
      .filter((d): d is number => d !== undefined);

    if (distances.length === 0) {
      return { count: 0, totalDistance: 0, avgDistance: 0, minDistance: 0, maxDistance: 0 };
    }

    const totalDistance = distances.reduce((sum, d) => sum + d, 0);
    return {
      count: distances.length,
      totalDistance: Math.round(totalDistance * 10) / 10,
      avgDistance: Math.round((totalDistance / distances.length) * 10) / 10,
      minDistance: Math.round(Math.min(...distances) * 10) / 10,
      maxDistance: Math.round(Math.max(...distances) * 10) / 10,
    };
  }, [facilities, selectedFacilityIds, facilityDistances]);

  // Sorted insight rows
  const insightRows = useMemo(() => {
    const selected = facilities.filter((f) => selectedFacilityIds.includes(f.id));
    const rows = selected.map((f) => ({
      id: f.id,
      name: f.name,
      lga: f.lga || 'Unknown',
      distance: facilityDistances.get(f.id) ?? 0,
    }));
    if (sortInsightsBy === 'distance') {
      rows.sort((a, b) => a.distance - b.distance);
    } else {
      rows.sort((a, b) => a.name.localeCompare(b.name));
    }
    return rows;
  }, [facilities, selectedFacilityIds, facilityDistances, sortInsightsBy]);

  // Toggle facility selection
  const toggleFacility = useCallback(
    (id: string) => {
      setSelectedFacilityIds((prev) =>
        prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
      );
      setOptimizedOrder(null);
      setOptimizedDistance(null);
    },
    []
  );

  const handleSelectAll = () => {
    const allIds = filteredFacilities.map((f) => f.id);
    setSelectedFacilityIds(allIds);
    setOptimizedOrder(null);
    setOptimizedDistance(null);
  };

  const handleClearAll = () => {
    setSelectedFacilityIds([]);
    setOptimizedOrder(null);
    setOptimizedDistance(null);
  };

  // Optimize route with config
  const handleOptimize = () => {
    const selected = facilities
      .filter((f) => selectedFacilityIds.includes(f.id))
      .filter((f) => typeof f.lat === 'number' && typeof f.lng === 'number');

    if (selected.length < 2) return;

    setIsOptimizing(true);
    setTimeout(() => {
      try {
        const points: GeoPoint[] = selected.map((f) => ({ id: f.id, lat: f.lat, lng: f.lng }));

        // Build matrix based on config
        const { matrix, algorithmLabel: label } = buildOptimizedMatrix(points, optConfig);
        const result = solveTSP(matrix, 0);
        const newOrder = result.order.map((idx) => points[idx].id);

        // Compute real distance for display (always haversine)
        const rawMatrix = computeDistanceMatrix(points);
        let realDistance = 0;
        for (let i = 0; i < result.order.length - 1; i++) {
          realDistance += rawMatrix[result.order[i]][result.order[i + 1]];
        }

        // Compute estimated time
        const estTime = realDistance / AVG_SPEED_KMH + selected.length * SERVICE_TIME_HOURS;

        setOptimizedOrder(newOrder);
        setOptimizedDistance(Math.round(realDistance * 10) / 10);
        setOptimizedTime(Math.round(estTime * 10) / 10);
        setAlgorithmLabel(label);
        setSelectedFacilityIds(newOrder);
      } catch (err) {
        console.error('Route optimization failed:', err);
      } finally {
        setIsOptimizing(false);
      }
    }, 10);
  };

  const toggleOptCriteria = (key: keyof OptimizationConfig) => {
    setOptConfig((prev) => ({ ...prev, [key]: !prev[key] }));
    // Clear previous optimization when config changes
    setOptimizedOrder(null);
    setOptimizedDistance(null);
    setOptimizedTime(null);
    setAlgorithmLabel(null);
  };

  // Save route
  const handleSave = async () => {
    if (!zoneId || !routeName.trim() || selectedFacilityIds.length === 0) return;
    await createMutation.mutateAsync({
      name: routeName,
      zone_id: zoneId,
      service_area_id: '',
      warehouse_id: '',
      creation_mode: 'sandbox',
      facility_ids: optimizedOrder || selectedFacilityIds,
      is_sandbox: true,
      algorithm_used: optimizedOrder ? (algorithmLabel || 'nearest_neighbor_2opt') : undefined,
    });
    onClose();
  };

  // ─── Map Initialization ───
  useEffect(() => {
    if (!mapContainerRef.current || !zoneId) return;

    const center: [number, number] = zoneCenter
      ? [zoneCenter.lng, zoneCenter.lat]
      : [8.52, 12.0];

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: getMapLibreStyle(theme as 'light' | 'dark' | 'system' | undefined),
      center,
      zoom: 10,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;

    // Add line source and layer for tethers
    map.on('load', () => {
      map.addSource('tethers', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'tether-lines',
        type: 'line',
        source: 'tethers',
        paint: {
          'line-color': '#3b82f6',
          'line-width': 2,
          'line-dasharray': [4, 3],
          'line-opacity': 0.7,
        },
      });
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, [zoneId, theme]);

  // ─── Update markers & tethers ───
  useEffect(() => {
    if (!mapRef.current || !zoneId) return;
    const map = mapRef.current;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    // Zone center marker
    if (zoneCenter) {
      const el = document.createElement('div');
      el.innerHTML = `
        <div style="
          width: 40px; height: 40px;
          background: #3b82f6;
          border: 3px solid white;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 0 6px rgba(59,130,246,0.25), 0 2px 8px rgba(0,0,0,0.3);
          font-size: 18px; color: white; font-weight: bold;
        ">Z</div>
      `;
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([zoneCenter.lng, zoneCenter.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 25 }).setHTML(
            `<strong>${selectedZone?.name || 'Zone Center'}</strong><div style="font-size:12px;color:#666;">Zone Center</div>`
          )
        )
        .addTo(map);
      markersRef.current.set('zone-center', marker);
    }

    // Facility markers
    facilities.forEach((f) => {
      if (!f.lat || !f.lng) return;
      const isSelected = selectedFacilityIds.includes(f.id);
      const visitIndex = visitIndexByFacilityId.get(f.id);

      const el = document.createElement('div');
      el.style.cursor = 'pointer';
      el.style.width = '26px';
      el.style.height = '26px';
      el.innerHTML = `
        <div data-marker-inner="true" style="
          width: 26px; height: 26px;
          background: ${isSelected ? '#10b981' : '#6b7280'};
          border: 2px solid ${isSelected ? '#059669' : '#9ca3af'};
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.25);
          color: white; font-size: 11px; font-weight: 700;
          transition: transform 120ms ease, opacity 120ms ease;
          transform-origin: center;
          opacity: ${isSelected ? 1 : 0.35};
        ">${visitIndex ?? ''}</div>
      `;

      const inner = el.querySelector('[data-marker-inner="true"]') as HTMLDivElement | null;

      el.addEventListener('mouseenter', () => {
        if (inner) inner.style.transform = 'scale(1.08)';
      });
      el.addEventListener('mouseleave', () => {
        if (inner) inner.style.transform = 'scale(1)';
      });

      const popup = new maplibregl.Popup({ offset: 18, closeButton: false }).setHTML(
        `<div style="padding:4px;min-width:140px;">
          <strong>${f.name}</strong>
          <div style="font-size:12px;color:#666;">${f.lga || 'Unknown LGA'} &middot; ${f.level_of_care || 'N/A'}</div>
          ${isSelected ? `<div style="font-size:11px;color:#10b981;margin-top:4px;">Stop #${visitIndex ?? ''}</div>` : ''}
        </div>`
      );

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([f.lng, f.lat])
        .setPopup(popup)
        .addTo(map);

      // Click should show info (popup) only — selection is controlled from the facility list.
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        marker.togglePopup();
        if (inner) inner.style.transform = 'scale(1.12)';
        window.setTimeout(() => {
          if (inner) inner.style.transform = 'scale(1)';
        }, 120);
      });

      markersRef.current.set(f.id, marker);
    });

    // Update tether lines
    if (zoneCenter && map.getSource('tethers')) {
      let features: Array<{
        type: 'Feature';
        properties: Record<string, unknown>;
        geometry: { type: 'LineString'; coordinates: [number, number][] };
      }> = [];

      if (tetherMode === 'route') {
        const orderedIds = optimizedOrder || selectedFacilityIds;
        const orderedFacilities = orderedIds
          .map((id) => facilities.find((f) => f.id === id))
          .filter((f): f is Facility => !!f && !!f.lat && !!f.lng);

        if (orderedFacilities.length >= 1) {
          const coords: [number, number][] = [
            [zoneCenter.lng, zoneCenter.lat],
            ...orderedFacilities.map((f) => [f.lng, f.lat] as [number, number]),
            [zoneCenter.lng, zoneCenter.lat],
          ];

          features = [
            {
              type: 'Feature',
              properties: { mode: 'route' },
              geometry: {
                type: 'LineString',
                coordinates: coords,
              },
            },
          ];
        }
      } else {
        // Cardinal mode: zone center radiates to each selected facility
        features = facilities
          .filter((f) => selectedFacilityIds.includes(f.id) && f.lat && f.lng)
          .map((f) => ({
            type: 'Feature' as const,
            properties: { mode: 'cardinal' },
            geometry: {
              type: 'LineString' as const,
              coordinates: [
                [zoneCenter.lng, zoneCenter.lat],
                [f.lng, f.lat],
              ],
            },
          }));
      }

      (map.getSource('tethers') as maplibregl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features,
      });
    }

    // Fit bounds
    const points: [number, number][] = [];
    if (zoneCenter) points.push([zoneCenter.lng, zoneCenter.lat]);
    facilities.forEach((f) => {
      if (f.lat && f.lng) points.push([f.lng, f.lat]);
    });
    if (points.length >= 2) {
      const bounds = new maplibregl.LngLatBounds(points[0], points[0]);
      points.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, { padding: 50, maxZoom: 13 });
    }
  }, [facilities, selectedFacilityIds, zoneCenter, zoneId, toggleFacility, selectedZone?.name, tetherMode, optimizedOrder]);

  const canSave = zoneId && routeName.trim() && selectedFacilityIds.length > 0;

  return (
    <div className="h-[calc(100vh-220px)] flex flex-col gap-4 overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>

        <Separator orientation="vertical" className="h-6" />

        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium shrink-0">Zone</Label>
          <Select
            value={zoneId}
            onValueChange={(v) => setZoneId(v)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select zone" />
            </SelectTrigger>
            <SelectContent>
              {zones?.map((z) => (
                <SelectItem key={z.id} value={z.id}>
                  {z.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Label className="text-sm font-medium shrink-0">Route Name</Label>
          <Input
            placeholder="e.g., SB-Central-01"
            value={routeName}
            onChange={(e) => setRouteName(e.target.value)}
            className="max-w-[250px]"
          />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!canSave || createMutation.isPending}>
            {createMutation.isPending ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-1 h-4 w-4" />
            )}
            Create Sandbox Route
          </Button>
        </div>
      </div>

      {/* Sandbox banner */}
      <div className="rounded-lg border-2 border-dashed border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20 px-4 py-2">
        <p className="text-sm text-yellow-700 dark:text-yellow-400 font-medium">
          Sandbox Mode — Routes will not be saved to production
        </p>
      </div>

      {!zoneId ? (
        <div className="flex-1 min-h-0 flex items-center justify-center text-muted-foreground">
          <div className="text-center space-y-2">
            <MapPin className="mx-auto h-10 w-10 opacity-40" />
            <p className="text-lg font-medium">Select a zone to begin</p>
            <p className="text-sm">Choose an operational zone from the dropdown above</p>
          </div>
        </div>
      ) : (
        /* 3-column layout */
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr_2fr] gap-4 flex-1 min-h-0">
          {/* Left: Map */}
          <div className="rounded-lg border overflow-hidden min-h-0 relative">
            <div className="absolute left-3 top-3 z-10">
              <ToggleGroup
                type="single"
                value={tetherMode}
                onValueChange={(v) => v && setTetherMode(v as TetherMode)}
                className="bg-background border rounded-md p-1 shadow-sm"
              >
                <ToggleGroupItem value="cardinal" className="px-2" aria-label="Cardinal tether">
                  <Radar className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="route" className="px-2" aria-label="Route tether">
                  <Route className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div ref={mapContainerRef} className="h-full w-full" />
          </div>

          {/* Middle: Facility List */}
          <div className="flex flex-col border rounded-lg min-h-0">
            <div className="p-3 border-b space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  Facilities
                  {!facilitiesLoading && (
                    <span className="ml-1 text-muted-foreground font-normal">
                      ({facilities.length})
                    </span>
                  )}
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {selectedFacilityIds.length} selected
                </Badge>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search facilities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-8 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={handleSelectAll}>
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={handleClearAll}
                  disabled={selectedFacilityIds.length === 0}
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <div className="p-2 space-y-1">
                {facilitiesLoading ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Loading facilities...
                  </div>
                ) : facilitiesError ? (
                  <div className="flex items-center justify-center py-8 text-destructive text-center px-3">
                    <p className="text-sm">Error loading facilities: {facilitiesError.message}</p>
                  </div>
                ) : filteredFacilities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="mx-auto h-8 w-8 mb-2 opacity-40" />
                    <p className="text-sm">No facilities found</p>
                  </div>
                ) : (
                  filteredFacilities.map((f) => {
                    const isSelected = selectedFacilityIds.includes(f.id);
                    const dist = facilityDistances.get(f.id);
                    return (
                      <div
                        key={f.id}
                        className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors text-sm ${
                          isSelected
                            ? 'bg-primary/5 border border-primary/30'
                            : 'hover:bg-muted/50 border border-transparent'
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleFacility(f.id)}
                          className="shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{f.name}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span>{f.lga || 'Unknown LGA'}</span>
                            {f.level_of_care && (
                              <>
                                <span>&middot;</span>
                                <span>{f.level_of_care}</span>
                              </>
                            )}
                          </div>
                        </div>
                        {dist !== undefined && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            {dist} km
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right: Insights */}
          <div className="flex flex-col border rounded-lg min-h-0">
            <div className="p-3 border-b">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4" />
                Route Insights
              </h3>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <div className="p-3 space-y-4">
                {selectedFacilityIds.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Ruler className="mx-auto h-8 w-8 mb-2 opacity-40" />
                    <p className="text-sm">Select facilities to see insights</p>
                  </div>
                ) : (
                  <>
                    {/* Summary cards */}
                    <div className="grid grid-cols-2 gap-2">
                      <Card>
                        <CardContent className="p-3 text-center">
                          <p className="text-2xl font-bold">{insights.count}</p>
                          <p className="text-xs text-muted-foreground">Facilities</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-3 text-center">
                          <p className="text-2xl font-bold">{insights.totalDistance}</p>
                          <p className="text-xs text-muted-foreground">Total km (radial)</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-3 text-center">
                          <p className="text-2xl font-bold">{insights.avgDistance}</p>
                          <p className="text-xs text-muted-foreground">Avg km</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-3 text-center">
                          <p className="text-2xl font-bold">
                            {insights.minDistance} - {insights.maxDistance}
                          </p>
                          <p className="text-xs text-muted-foreground">Min - Max km</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Optimization Settings */}
                    <Card>
                      <CardHeader className="p-3 pb-0">
                        <button
                          className="flex items-center justify-between w-full text-left"
                          onClick={() => setShowOptSettings((v) => !v)}
                        >
                          <CardTitle className="text-sm flex items-center gap-1.5">
                            <Settings2 className="h-4 w-4" />
                            Optimization Settings
                          </CardTitle>
                          {showOptSettings ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      </CardHeader>
                      {showOptSettings && (
                        <CardContent className="p-3 pt-2 space-y-2">
                          {OPTIMIZATION_CRITERIA.map((criterion) => {
                            const Icon = criterion.icon;
                            const isChecked = optConfig[criterion.key];
                            return (
                              <div
                                key={criterion.key}
                                className={`flex items-start gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                                  isChecked ? 'bg-primary/5 border border-primary/20' : 'hover:bg-muted/50 border border-transparent'
                                }`}
                                onClick={() => toggleOptCriteria(criterion.key)}
                              >
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={() => toggleOptCriteria(criterion.key)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="mt-0.5 shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-sm font-medium">{criterion.label}</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {criterion.description}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </CardContent>
                      )}
                    </Card>

                    {/* Optimize button */}
                    <Button
                      className="w-full"
                      onClick={handleOptimize}
                      disabled={
                        isOptimizing ||
                        selectedFacilityIds.length < 2 ||
                        !Object.values(optConfig).some(Boolean)
                      }
                    >
                      {isOptimizing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Zap className="mr-2 h-4 w-4" />
                      )}
                      Optimize Route
                    </Button>

                    {optimizedDistance !== null && (
                      <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800">
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Optimized Distance</span>
                            <span className="text-lg font-bold text-green-600">
                              {optimizedDistance} km
                            </span>
                          </div>
                          {optimizedTime !== null && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Est. Time</span>
                              <span className="text-sm font-medium">
                                {Math.floor(optimizedTime)}h {Math.round((optimizedTime % 1) * 60)}m
                              </span>
                            </div>
                          )}
                          {algorithmLabel && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {algorithmLabel.split(' + ').map((l) => (
                                <Badge key={l} variant="secondary" className="text-xs">
                                  {l}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Per-facility distances */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                          Facility Distances
                        </h4>
                        <div className="flex gap-1">
                          <Button
                            variant={sortInsightsBy === 'distance' ? 'secondary' : 'ghost'}
                            size="sm"
                            className="text-xs h-6 px-2"
                            onClick={() => setSortInsightsBy('distance')}
                          >
                            Distance
                          </Button>
                          <Button
                            variant={sortInsightsBy === 'name' ? 'secondary' : 'ghost'}
                            size="sm"
                            className="text-xs h-6 px-2"
                            onClick={() => setSortInsightsBy('name')}
                          >
                            Name
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        {insightRows.map((row, idx) => (
                          <div
                            key={row.id}
                            className="flex items-center gap-2 p-2 rounded-md bg-muted/30 text-sm"
                          >
                            {optimizedOrder && (
                              <span className="text-xs font-mono text-muted-foreground w-5 text-right shrink-0">
                                {idx + 1}.
                              </span>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="truncate font-medium">{row.name}</p>
                              <p className="text-xs text-muted-foreground">{row.lga}</p>
                            </div>
                            <Badge variant="outline" className="shrink-0 text-xs">
                              {row.distance} km
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
}
