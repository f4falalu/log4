/**
 * DistanceMeasureTool Component
 *
 * Allows planners to measure distances on the map
 * Used in Planning mode only
 *
 * Features:
 * - Click to add measurement points
 * - Shows total distance
 * - Shows segment distances
 * - Clear/reset measurement
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Ruler, X } from 'lucide-react';
import L from 'leaflet';

interface DistanceMeasureToolProps {
  map: L.Map | null;
  active: boolean;
  onClose: () => void;
}

interface MeasurementPoint {
  lat: number;
  lng: number;
}

export function DistanceMeasureTool({ map, active, onClose }: DistanceMeasureToolProps) {
  const [points, setPoints] = useState<MeasurementPoint[]>([]);
  const [totalDistance, setTotalDistance] = useState(0);
  const [layerGroup, setLayerGroup] = useState<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!map || !active) {
      // Clean up when tool is deactivated
      if (layerGroup) {
        layerGroup.clearLayers();
        layerGroup.remove();
        setLayerGroup(null);
      }
      setPoints([]);
      setTotalDistance(0);
      return;
    }

    // Create layer group for measurements
    const lg = L.layerGroup().addTo(map);
    setLayerGroup(lg);

    // Handle map clicks
    const handleMapClick = (e: L.LeafletMouseEvent) => {
      const newPoint = { lat: e.latlng.lat, lng: e.latlng.lng };
      setPoints((prev) => [...prev, newPoint]);
    };

    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
      lg.clearLayers();
      lg.remove();
    };
  }, [map, active]);

  // Update visualization when points change
  useEffect(() => {
    if (!layerGroup || points.length === 0) return;

    layerGroup.clearLayers();

    // Draw markers for each point
    points.forEach((point, index) => {
      const marker = L.circleMarker([point.lat, point.lng], {
        radius: 6,
        fillColor: '#3b82f6',
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
      }).addTo(layerGroup);

      marker.bindPopup(`Point ${index + 1}`);
    });

    // Draw lines between points and calculate distance
    if (points.length > 1) {
      let total = 0;
      const latLngs = points.map((p) => L.latLng(p.lat, p.lng));

      for (let i = 0; i < latLngs.length - 1; i++) {
        const distance = latLngs[i].distanceTo(latLngs[i + 1]);
        total += distance;

        // Draw line segment
        L.polyline([latLngs[i], latLngs[i + 1]], {
          color: '#3b82f6',
          weight: 3,
          opacity: 0.7,
          dashArray: '10, 5',
        }).addTo(layerGroup);
      }

      setTotalDistance(total);
    }
  }, [points, layerGroup]);

  const handleClear = () => {
    setPoints([]);
    setTotalDistance(0);
    if (layerGroup) {
      layerGroup.clearLayers();
    }
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${meters.toFixed(0)} m`;
    }
    return `${(meters / 1000).toFixed(2)} km`;
  };

  if (!active) return null;

  return (
    <Card className="absolute top-4 right-4 z-[2000] p-4 w-64 bg-card shadow-lg border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Ruler className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Distance Measurement</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Points:</span>
          <span className="font-medium">{points.length}</span>
        </div>

        {totalDistance > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Distance:</span>
            <span className="font-medium text-primary">{formatDistance(totalDistance)}</span>
          </div>
        )}

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-2">
            Click on the map to add measurement points
          </p>
          {points.length > 0 && (
            <Button variant="outline" size="sm" className="w-full" onClick={handleClear}>
              Clear Measurement
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
