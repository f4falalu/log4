import { useState } from 'react';
import { Plus, TableIcon, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { Route } from '@/types/routes';
import { RouteStats } from './routes/RouteStats';
import { RouteTable } from './routes/RouteTable';
import { RouteMapView } from './routes/RouteMapView';
import { CreateRouteWizard } from './routes/CreateRouteWizard';
import { RouteDetailDialog } from './routes/RouteDetailDialog';

type ViewMode = 'table' | 'map';

export function RouteManagementTabContent() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [detailRoute, setDetailRoute] = useState<Route | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Route Management</h2>
          <p className="text-muted-foreground mt-1">
            Plan, optimize, and manage delivery routes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as ViewMode)}>
            <ToggleGroupItem value="table" aria-label="Table view">
              <TableIcon className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="map" aria-label="Map view">
              <Map className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Route
          </Button>
        </div>
      </div>

      {/* Stats */}
      <RouteStats />

      {/* Content */}
      {viewMode === 'table' ? (
        <RouteTable onViewDetail={setDetailRoute} />
      ) : (
        <RouteMapView onRouteClick={setDetailRoute} />
      )}

      {/* Dialogs */}
      <CreateRouteWizard
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />

      {detailRoute && (
        <RouteDetailDialog
          route={detailRoute}
          open={!!detailRoute}
          onOpenChange={(open) => !open && setDetailRoute(null)}
        />
      )}
    </div>
  );
}
