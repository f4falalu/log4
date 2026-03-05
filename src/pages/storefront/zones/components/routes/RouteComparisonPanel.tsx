import { Check, Route, Clock, Ruler, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ComparisonRoute } from '@/types/routes';

interface RouteComparisonPanelProps {
  routes: ComparisonRoute[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDismiss: () => void;
  title?: string;
  grouped?: boolean;
}

/** Check if two routes have essentially identical distance & time */
function routesAreIdentical(a: ComparisonRoute, b: ComparisonRoute): boolean {
  return Math.abs(a.distanceKm - b.distanceKm) < 0.5 &&
         Math.abs(a.timeMinutes - b.timeMinutes) < 2;
}

/** Deduplicate routes that returned identical results from the API */
function deduplicateRoutes(routes: ComparisonRoute[]): {
  unique: ComparisonRoute[];
  duplicatesRemoved: number;
} {
  const unique: ComparisonRoute[] = [];
  for (const route of routes) {
    const isDuplicate = unique.some(u => routesAreIdentical(u, route));
    if (!isDuplicate) {
      unique.push(route);
    }
  }
  return { unique, duplicatesRemoved: routes.length - unique.length };
}

export function RouteComparisonPanel({
  routes,
  selectedId,
  onSelect,
  onDismiss,
  title = 'Alternative Routes',
  grouped = false,
}: RouteComparisonPanelProps) {
  if (routes.length === 0) return null;

  const { unique: displayRoutes, duplicatesRemoved } = deduplicateRoutes(routes);

  // Find the best route for distance and time to show badges
  const bestDistance = Math.min(...displayRoutes.map(r => r.distanceKm));
  const bestTime = Math.min(...displayRoutes.map(r => r.timeMinutes));

  // Only show badges when values actually differ across routes
  const hasDistanceVariation = displayRoutes.length > 1 &&
    Math.abs(Math.max(...displayRoutes.map(r => r.distanceKm)) - bestDistance) > 0.5;
  const hasTimeVariation = displayRoutes.length > 1 &&
    Math.abs(Math.max(...displayRoutes.map(r => r.timeMinutes)) - bestTime) > 2;

  const renderRouteCard = (route: ComparisonRoute) => {
    const isSelected = selectedId === route.id;
    const isBestDist = hasDistanceVariation && route.distanceKm === bestDistance;
    const isBestTime = hasTimeVariation && route.timeMinutes === bestTime;

    return (
      <button
        key={route.id}
        onClick={() => onSelect(route.id)}
        className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
          isSelected
            ? 'border-primary bg-primary/5'
            : 'border-transparent bg-muted/50 hover:bg-muted'
        }`}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: route.color }}
          />
          <span className="text-sm font-medium truncate">
            {route.routeTypeLabel}
          </span>
          {isSelected && (
            <Check className="w-3.5 h-3.5 text-primary ml-auto shrink-0" />
          )}
        </div>

        {grouped && (
          <div className="mb-1.5">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {route.algorithmLabel}
            </Badge>
          </div>
        )}

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Ruler className="w-3 h-3" />
            {route.distanceKm} km
            {isBestDist && (
              <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-0.5">
                Shortest
              </Badge>
            )}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {route.timeMinutes < 60
              ? `${route.timeMinutes} min`
              : `${(route.timeMinutes / 60).toFixed(1)} hrs`}
            {isBestTime && (
              <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-0.5">
                Fastest
              </Badge>
            )}
          </span>
        </div>
      </button>
    );
  };

  // Group by algorithm label if requested
  const groups = grouped
    ? routes.reduce<Record<string, ComparisonRoute[]>>((acc, r) => {
        const key = r.algorithmLabel;
        (acc[key] ||= []).push(r);
        return acc;
      }, {})
    : { '': routes };

  return (
    <div className="border rounded-lg bg-background shadow-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-1.5">
          <Route className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">{title}</span>
          <Badge variant="outline" className="text-[10px] ml-1">
            {displayRoutes.length} route{displayRoutes.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>

      <div className="p-2 space-y-1">
        {duplicatesRemoved > 0 && (
          <div className="flex items-start gap-1.5 px-2 py-1.5 text-[11px] text-muted-foreground bg-muted/50 rounded">
            <Info className="w-3 h-3 mt-0.5 shrink-0" />
            <span>
              {duplicatesRemoved} duplicate route{duplicatesRemoved > 1 ? 's' : ''} hidden — road
              network returned identical paths for different optimization modes.
            </span>
          </div>
        )}
        {Object.entries(groups).map(([groupLabel, groupRoutes]) => {
          const filteredRoutes = groupRoutes.filter(r =>
            displayRoutes.some(d => d.id === r.id)
          );
          if (filteredRoutes.length === 0) return null;
          return (
            <div key={groupLabel}>
              {grouped && groupLabel && (
                <div className="px-2 pt-2 pb-1">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    {groupLabel}
                  </span>
                </div>
              )}
              <div className="space-y-1">
                {filteredRoutes.map(renderRouteCard)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
