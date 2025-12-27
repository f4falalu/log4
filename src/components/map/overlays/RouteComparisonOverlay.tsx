/**
 * RouteComparisonOverlay Component
 *
 * Forensics mode overlay for comparing routes
 * Displays side-by-side comparison of executed vs. planned routes
 *
 * Features:
 * - Visual route comparison (planned vs. actual)
 * - Deviation highlighting
 * - Metrics comparison (distance, time, fuel)
 * - Deviation statistics
 * - Timeline integration
 *
 * Use Cases:
 * - Post-mortem route analysis
 * - Efficiency evaluation
 * - Driver adherence monitoring
 */

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Route, TrendingDown, TrendingUp, AlertTriangle, X } from 'lucide-react';
import L from 'leaflet';

interface RouteComparisonOverlayProps {
  map: L.Map | null;
  active: boolean;
  batchId?: string;
  timestamp?: Date;
  onClose: () => void;
}

interface RouteMetrics {
  plannedDistance: number;
  actualDistance: number;
  plannedDuration: number;
  actualDuration: number;
  deviationCount: number;
  adherenceScore: number;
}

export function RouteComparisonOverlay({
  map,
  active,
  batchId,
  timestamp,
  onClose,
}: RouteComparisonOverlayProps) {
  const [metrics, setMetrics] = useState<RouteMetrics | null>(null);
  const [layerGroup, setLayerGroup] = useState<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!map || !active || !batchId) {
      // Clean up
      if (layerGroup) {
        layerGroup.clearLayers();
        layerGroup.remove();
        setLayerGroup(null);
      }
      setMetrics(null);
      return;
    }

    // Create layer group for route comparison
    const lg = L.layerGroup().addTo(map);
    setLayerGroup(lg);

    // TODO: Fetch actual route data from database
    // For now, using placeholder data
    const mockPlannedRoute: L.LatLngExpression[] = [
      [9.082, 8.6753],
      [9.092, 8.6853],
      [9.102, 8.6953],
    ];

    const mockActualRoute: L.LatLngExpression[] = [
      [9.082, 8.6753],
      [9.095, 8.6843], // Slight deviation
      [9.102, 8.6953],
    ];

    // Draw planned route (blue dashed)
    L.polyline(mockPlannedRoute, {
      color: '#3b82f6',
      weight: 3,
      opacity: 0.6,
      dashArray: '10, 10',
    })
      .bindPopup('Planned Route')
      .addTo(lg);

    // Draw actual route (green solid)
    L.polyline(mockActualRoute, {
      color: '#10b981',
      weight: 3,
      opacity: 0.8,
    })
      .bindPopup('Actual Route')
      .addTo(lg);

    // Highlight deviation areas (red circles)
    L.circleMarker([9.095, 8.6843], {
      radius: 8,
      fillColor: '#ef4444',
      color: '#ffffff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.6,
    })
      .bindPopup('Deviation Point: 200m off route')
      .addTo(lg);

    // Set mock metrics
    setMetrics({
      plannedDistance: 15.2,
      actualDistance: 15.8,
      plannedDuration: 45,
      actualDuration: 52,
      deviationCount: 3,
      adherenceScore: 87,
    });

    return () => {
      lg.clearLayers();
      lg.remove();
    };
  }, [map, active, batchId, timestamp]);

  const formatDistance = (km: number) => `${km.toFixed(1)} km`;
  const formatDuration = (minutes: number) => `${minutes} min`;

  const getVarianceBadge = (planned: number, actual: number) => {
    const variance = ((actual - planned) / planned) * 100;
    const isNegative = variance < 0;
    const color = Math.abs(variance) > 10 ? 'destructive' : 'secondary';

    return (
      <Badge variant={color} className="ml-2">
        {isNegative ? (
          <TrendingDown className="h-3 w-3 mr-1" />
        ) : (
          <TrendingUp className="h-3 w-3 mr-1" />
        )}
        {variance > 0 ? '+' : ''}
        {variance.toFixed(1)}%
      </Badge>
    );
  };

  if (!active) return null;

  return (
    <Card className="absolute top-24 right-4 z-[1000] p-4 w-96 bg-card/95 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Route className="h-4 w-4 text-purple-600" />
          <h3 className="font-semibold text-sm">Route Comparison</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {!batchId && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-600">
              Select a delivery batch to compare routes
            </p>
          </div>
        </div>
      )}

      {metrics && batchId && (
        <div className="space-y-3">
          {/* Adherence Score */}
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Route Adherence</p>
              <p className="text-2xl font-bold text-primary">{metrics.adherenceScore}%</p>
            </div>
          </div>

          {/* Metrics Comparison */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Distance:</span>
              <div className="flex items-center gap-2">
                <span className="line-through text-muted-foreground text-xs">
                  {formatDistance(metrics.plannedDistance)}
                </span>
                <span className="font-medium">{formatDistance(metrics.actualDistance)}</span>
                {getVarianceBadge(metrics.plannedDistance, metrics.actualDistance)}
              </div>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Duration:</span>
              <div className="flex items-center gap-2">
                <span className="line-through text-muted-foreground text-xs">
                  {formatDuration(metrics.plannedDuration)}
                </span>
                <span className="font-medium">{formatDuration(metrics.actualDuration)}</span>
                {getVarianceBadge(metrics.plannedDuration, metrics.actualDuration)}
              </div>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Deviations:</span>
              <Badge variant="outline">{metrics.deviationCount} locations</Badge>
            </div>
          </div>

          {/* Legend */}
          <div className="pt-3 border-t space-y-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">Map Legend</p>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-8 h-0.5 bg-blue-500 opacity-60" style={{ borderTop: '2px dashed' }} />
              <span className="text-muted-foreground">Planned Route</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-8 h-0.5 bg-green-500" />
              <span className="text-muted-foreground">Actual Route</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-muted-foreground">Deviation Points</span>
            </div>
          </div>

          {/* Implementation Note */}
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground italic">
              Full historical route data integration - Week 2 implementation
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
