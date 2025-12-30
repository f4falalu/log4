/**
 * RouteSketchTool Component
 *
 * Non-binding route sketching for planning purposes
 *
 * Features:
 * - Click-to-draw route polyline
 * - Waypoint markers with drag support
 * - Distance and duration estimation
 * - Route naming and metadata
 * - Save to route_sketches table (active=false by default)
 *
 * Workflow: Click to add waypoints → View metrics → Save as draft
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Route, X, Save, Trash2, AlertCircle, MapPin } from 'lucide-react';
import L from 'leaflet';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useFacilities } from '@/hooks/useFacilities';

interface RouteSketchToolProps {
  map: L.Map | null;
  active: boolean;
  onClose: () => void;
}

interface Waypoint {
  lat: number;
  lng: number;
  type: 'start' | 'waypoint' | 'end';
  notes?: string;
}

export function RouteSketchTool({ map, active, onClose }: RouteSketchToolProps) {
  const { facilities } = useFacilities();

  const [routeName, setRouteName] = useState('');
  const [description, setDescription] = useState('');
  const [routeType, setRouteType] = useState<'delivery' | 'pickup' | 'transfer'>('delivery');
  const [startFacilityId, setStartFacilityId] = useState<string>('');
  const [endFacilityId, setEndFacilityId] = useState<string>('');
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [totalDistance, setTotalDistance] = useState(0);
  const [estimatedDuration, setEstimatedDuration] = useState(0);
  const [saving, setSaving] = useState(false);

  const polylineRef = useRef<L.Polyline | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize layer group
  useEffect(() => {
    if (!active || !map) return;

    const lg = L.layerGroup().addTo(map);
    layerGroupRef.current = lg;

    return () => {
      lg.clearLayers();
      map?.removeLayer(lg);
    };
  }, [active, map]);

  // Handle map clicks to add waypoints
  useEffect(() => {
    if (!active || !map) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      const newWaypoint: Waypoint = {
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        type: waypoints.length === 0 ? 'start' : 'waypoint',
      };

      setWaypoints((prev) => {
        const updated = [...prev];
        if (updated.length > 0) {
          // Update last waypoint to be a waypoint, not end
          updated[updated.length - 1].type = 'waypoint';
        }
        newWaypoint.type = 'end';
        return [...updated, newWaypoint];
      });
    };

    map.on('click', handleMapClick);

    return () => {
      map?.off('click', handleMapClick);
    };
  }, [active, map, waypoints.length]);

  // Render waypoints and route line
  useEffect(() => {
    if (!active || !layerGroupRef.current) return;

    // Clear existing markers and polyline
    layerGroupRef.current.clearLayers();
    markersRef.current = [];

    if (waypoints.length === 0) return;

    // Create markers for each waypoint
    waypoints.forEach((waypoint, index) => {
      const icon = L.divIcon({
        className: 'custom-waypoint-marker',
        html: `<div class="flex items-center justify-center w-8 h-8 rounded-full ${
          waypoint.type === 'start'
            ? 'bg-green-500'
            : waypoint.type === 'end'
            ? 'bg-red-500'
            : 'bg-blue-500'
        } text-white font-bold text-xs shadow-lg">
          ${waypoint.type === 'start' ? 'S' : waypoint.type === 'end' ? 'E' : index}
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([waypoint.lat, waypoint.lng], { icon, draggable: true })
        .bindPopup(
          `<b>${waypoint.type === 'start' ? 'Start' : waypoint.type === 'end' ? 'End' : 'Waypoint ' + index}</b><br/>
          Lat: ${waypoint.lat.toFixed(5)}<br/>
          Lng: ${waypoint.lng.toFixed(5)}`
        )
        .addTo(layerGroupRef.current!);

      // Handle marker drag
      marker.on('dragend', (e) => {
        const newLatLng = (e.target as L.Marker).getLatLng();
        setWaypoints((prev) => {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            lat: newLatLng.lat,
            lng: newLatLng.lng,
          };
          return updated;
        });
      });

      markersRef.current.push(marker);
    });

    // Draw polyline connecting waypoints
    if (waypoints.length >= 2) {
      const latlngs = waypoints.map((wp) => [wp.lat, wp.lng] as L.LatLngTuple);
      const polyline = L.polyline(latlngs, {
        color: '#3b82f6',
        weight: 3,
        opacity: 0.7,
      }).addTo(layerGroupRef.current!);

      polylineRef.current = polyline;

      // Calculate total distance
      let distance = 0;
      for (let i = 0; i < waypoints.length - 1; i++) {
        const point1 = L.latLng(waypoints[i].lat, waypoints[i].lng);
        const point2 = L.latLng(waypoints[i + 1].lat, waypoints[i + 1].lng);
        distance += point1.distanceTo(point2) / 1000; // Convert to km
      }
      setTotalDistance(distance);

      // Estimate duration (assuming 40 km/h average speed)
      const avgSpeed = 40; // km/h
      setEstimatedDuration(Math.round((distance / avgSpeed) * 60)); // minutes
    }
  }, [active, waypoints]);

  // Clear all waypoints
  const handleClear = useCallback(() => {
    setWaypoints([]);
    setTotalDistance(0);
    setEstimatedDuration(0);
  }, []);

  // Save route sketch to database
  const handleSave = useCallback(async () => {
    if (!routeName.trim()) {
      toast.error('Please enter a route name');
      return;
    }

    if (waypoints.length < 2) {
      toast.error('Route must have at least 2 waypoints');
      return;
    }

    try {
      setSaving(true);

      // Get user ID
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create LineString geometry from waypoints
      const coordinates = waypoints.map((wp) => [wp.lng, wp.lat]); // GeoJSON uses [lng, lat]
      const routeGeometry = {
        type: 'LineString',
        coordinates,
      };

      // TODO: Get actual workspace_id from context when workspace system is implemented
      const workspaceId = '00000000-0000-0000-0000-000000000000'; // Mock workspace ID

      // Prepare waypoints data
      const waypointsData = waypoints.map((wp, index) => ({
        lat: wp.lat,
        lng: wp.lng,
        type: wp.type,
        order: index,
        notes: wp.notes,
      }));

      const routeData = {
        workspace_id: workspaceId,
        name: routeName,
        description: description || null,
        route_geometry: routeGeometry,
        waypoints: waypointsData,
        start_facility_id: startFacilityId && startFacilityId !== 'none' ? startFacilityId : null,
        end_facility_id: endFacilityId && endFacilityId !== 'none' ? endFacilityId : null,
        estimated_distance: totalDistance,
        estimated_duration: estimatedDuration,
        route_type: routeType,
        active: false, // NON-BINDING by default
        created_by: user.id,
      };

      const { error } = await supabase.from('route_sketches').insert([routeData]);

      if (error) throw error;

      toast.success(
        'Route sketch saved successfully (non-binding draft - requires activation to take effect)'
      );

      // Clear form
      setRouteName('');
      setDescription('');
      setWaypoints([]);
      setStartFacilityId('');
      setEndFacilityId('');
      onClose();
    } catch (error) {
      console.error('Error saving route sketch:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save route sketch');
    } finally {
      setSaving(false);
    }
  }, [
    routeName,
    description,
    waypoints,
    startFacilityId,
    endFacilityId,
    totalDistance,
    estimatedDuration,
    routeType,
    onClose,
  ]);

  if (!active) return null;

  return (
    <Card className="absolute top-4 right-4 z-[2000] p-4 w-96 bg-card shadow-lg border max-h-[calc(100vh-32px)] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Route className="h-4 w-4 text-blue-600" />
          <h3 className="font-semibold text-sm">Route Sketch</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Instructions */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-2 mb-4">
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-600 dark:text-blue-400">
            Click on the map to add waypoints. Markers can be dragged to adjust positions.
          </p>
        </div>
      </div>

      {/* Route Name */}
      <div className="space-y-2 mb-3">
        <Label className="text-xs font-medium">Route Name *</Label>
        <Input
          placeholder="e.g., Main Distribution Route"
          value={routeName}
          onChange={(e) => setRouteName(e.target.value)}
        />
      </div>

      {/* Description */}
      <div className="space-y-2 mb-3">
        <Label className="text-xs font-medium">Description</Label>
        <Textarea
          placeholder="Optional route description..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="resize-none"
        />
      </div>

      {/* Route Type */}
      <div className="space-y-2 mb-3">
        <Label className="text-xs font-medium">Route Type</Label>
        <Select value={routeType} onValueChange={(v: any) => setRouteType(v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="delivery">Delivery</SelectItem>
            <SelectItem value="pickup">Pickup</SelectItem>
            <SelectItem value="transfer">Transfer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Start Facility */}
      <div className="space-y-2 mb-3">
        <Label className="text-xs font-medium">Start Facility (Optional)</Label>
        <Select value={startFacilityId} onValueChange={setStartFacilityId}>
          <SelectTrigger>
            <SelectValue placeholder="Select start facility..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {facilities.map((facility) => (
              <SelectItem key={facility.id} value={facility.id}>
                {facility.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* End Facility */}
      <div className="space-y-2 mb-3">
        <Label className="text-xs font-medium">End Facility (Optional)</Label>
        <Select value={endFacilityId} onValueChange={setEndFacilityId}>
          <SelectTrigger>
            <SelectValue placeholder="Select end facility..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {facilities.map((facility) => (
              <SelectItem key={facility.id} value={facility.id}>
                {facility.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Route Metrics */}
      <div className="bg-secondary/50 rounded-md p-3 mb-3 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Waypoints:</span>
          <span className="font-medium">{waypoints.length}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Distance:</span>
          <span className="font-medium">{totalDistance.toFixed(2)} km</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Estimated Time:</span>
          <span className="font-medium">{estimatedDuration} min</span>
        </div>
      </div>

      {/* Non-binding Reminder */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-2 mb-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-600 dark:text-blue-400">
            Route sketches are non-binding previews (active=false) and require activation
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleClear}
          disabled={waypoints.length === 0}
          className="flex-1"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Clear
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!routeName.trim() || waypoints.length < 2 || saving}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </Card>
  );
}
