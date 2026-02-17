/**
 * =====================================================
 * Step 4: Route Optimization
 * =====================================================
 * Route preview and optimization step.
 */

import * as React from 'react';
import {
  Route,
  Map,
  Play,
  RefreshCw,
  Clock,
  MapPin,
  ArrowRight,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { WorkingSetItem } from '@/types/unified-workflow';
import type { RoutePoint } from '@/types/scheduler';

interface Step4RouteProps {
  facilities: WorkingSetItem[];
  startLocationName: string | null;
  optimizedRoute: RoutePoint[];
  totalDistanceKm: number | null;
  estimatedDurationMin: number | null;
  isOptimizing: boolean;
  onOptimize: () => Promise<void>;
}

export function Step4Route({
  facilities,
  startLocationName,
  optimizedRoute,
  totalDistanceKm,
  estimatedDurationMin,
  isOptimizing,
  onOptimize,
}: Step4RouteProps) {
  const hasRoute = optimizedRoute.length > 0;

  // Format duration
  const durationLabel = React.useMemo(() => {
    if (!estimatedDurationMin) return '-';
    const hours = Math.floor(estimatedDurationMin / 60);
    const mins = estimatedDurationMin % 60;
    if (hours === 0) return `${mins} min`;
    if (mins === 0) return `${hours} hr`;
    return `${hours} hr ${mins} min`;
  }, [estimatedDurationMin]);

  return (
    <div className="flex flex-col min-h-[65vh] p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Route Optimization</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Preview and optimize your delivery route
        </p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        {/* Left: Map Preview */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Map className="h-4 w-4" />
              Route Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="h-full min-h-[300px] bg-muted rounded-lg flex items-center justify-center border border-dashed">
              {hasRoute ? (
                <div className="text-center">
                  <Map className="h-12 w-12 mx-auto mb-3 text-primary opacity-50" />
                  <p className="text-sm font-medium">Route optimized</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {facilities.length} stops • {totalDistanceKm?.toFixed(1)} km
                  </p>
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  <Route className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Click "Optimize Route" to generate route</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right: Route Details */}
        <div className="space-y-4">
          {/* Optimize Button */}
          <Card>
            <CardContent className="pt-4">
              <Button
                onClick={onOptimize}
                disabled={isOptimizing || facilities.length === 0}
                className="w-full"
                size="lg"
              >
                {isOptimizing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Optimizing...
                  </>
                ) : hasRoute ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Re-optimize Route
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Optimize Route
                  </>
                )}
              </Button>

              {hasRoute && (
                <div className="flex items-center gap-2 mt-3 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>Route optimized successfully</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Route Stats */}
          {hasRoute && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Route Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Route className="h-4 w-4" />
                      <span className="text-xs">Total Distance</span>
                    </div>
                    <p className="text-xl font-semibold">
                      {totalDistanceKm?.toFixed(1)} km
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Clock className="h-4 w-4" />
                      <span className="text-xs">Est. Duration</span>
                    </div>
                    <p className="text-xl font-semibold">{durationLabel}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Route Sequence */}
          <Card className="flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Stop Sequence
              </CardTitle>
              <CardDescription className="text-xs">
                {facilities.length} stops in optimized order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {/* Start */}
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-primary/5">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                      S
                    </div>
                    <span className="text-sm font-medium">
                      {startLocationName || 'Start'}
                    </span>
                    <Badge variant="secondary" className="text-xs ml-auto">
                      Origin
                    </Badge>
                  </div>

                  {/* Stops */}
                  {facilities.map((facility, idx) => (
                    <div
                      key={facility.facility_id}
                      className="flex items-center gap-3 p-2 rounded-lg border"
                    >
                      <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center">
                        {idx + 1}
                      </div>
                      <span className="text-sm truncate flex-1">
                        {facility.facility_name}
                      </span>
                      {facility.slot_demand > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {facility.slot_demand}
                        </Badge>
                      )}
                    </div>
                  ))}

                  {/* Return */}
                  <div className="flex items-center gap-3 p-2 rounded-lg border border-dashed opacity-50">
                    <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center">
                      R
                    </div>
                    <span className="text-sm">
                      {startLocationName || 'Start'}
                    </span>
                    <Badge variant="outline" className="text-xs ml-auto">
                      Return
                    </Badge>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Step4Route;
