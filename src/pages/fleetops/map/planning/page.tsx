import { useState, useCallback, useEffect } from 'react';
import { useMapContext } from '@/hooks/useMapContext';
import { useServiceZones } from '@/hooks/useServiceZones';
import { useFacilities } from '@/hooks/useFacilities';
import { useWarehouses } from '@/hooks/useWarehouses';
import { useCreateZoneConfiguration } from '@/hooks/useZoneConfigurations';
import { UnifiedMapContainer } from '@/components/map/UnifiedMapContainer';
import { PlanningMapLibre } from '@/components/map/PlanningMapLibre';
import { ModeIndicator } from '@/components/map/ui/ModeIndicator';
import { DistanceMeasureTool } from '@/components/map/tools/DistanceMeasureTool';
import { ZoneEditor } from '@/components/map/tools/ZoneEditor';
import { FacilityAssigner } from '@/components/map/tools/FacilityAssigner';
import { RouteSketchTool } from '@/components/map/tools/RouteSketchTool';
import { PlanningReviewDialog } from '@/components/map/dialogs/PlanningReviewDialog';
import { ScenarioDialog } from '@/components/map/dialogs/ScenarioDialog';
import { AnalyticsDialog } from '@/components/map/dialogs/AnalyticsDialog';
import { Button } from '@/components/ui/button';
import { Ruler, MapPin, Building2, Route, CheckCircle2 } from 'lucide-react';
import { isToolAllowed } from '@/lib/mapCapabilities';
import { logZoneAction } from '@/lib/mapAuditLogger';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import L from 'leaflet';
import { toast } from 'sonner';
import type { Feature, Polygon } from 'geojson';
import { PlanningControlBar } from '@/components/map/ui/PlanningControlBar';
import { KPIRibbon } from '@/components/map/ui/KPIRibbon';

export default function PlanningMapPage() {
  const { setCapability, setTimeHorizon } = useMapContext();

  // Set capability on mount
  useEffect(() => {
    setCapability('planning');
    setTimeHorizon('future');
  }, [setCapability, setTimeHorizon]);

  // Data hooks
  const { data: zones = [] } = useServiceZones();
  const { data: facilities = [] } = useFacilities();
  const { data: warehouses = [] } = useWarehouses();
  const createZone = useCreateZoneConfiguration();

  // UI state
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [scenarioDialogOpen, setScenarioDialogOpen] = useState(false);
  const [analyticsDialogOpen, setAnalyticsDialogOpen] = useState(false);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'demand' | 'capacity' | 'sla'>('demand');

  const handleMapCapture = useCallback((map: L.Map) => {
    setMapInstance(map);
  }, []);

  const handleSaveDraft = useCallback(
    async (zoneData: any) => {
      try {
        const workspaceId = '00000000-0000-0000-0000-000000000000';
        await createZone.mutateAsync({
          workspace_id: workspaceId,
          name: zoneData.name,
          description: zoneData.description,
          boundary: zoneData.geometry,
          zone_type: 'service',
          priority: 0,
        });
        await logZoneAction({
          workspaceId,
          actionType: 'create_zone',
          newData: { name: zoneData.name, zone_type: 'service' },
        });
      } catch (error) {
        console.error('Failed to save zone:', error);
      }
    },
    [createZone]
  );

  // Tool permissions
  const canMeasure = isToolAllowed('planning', 'measure_distance');
  const canEditZones = isToolAllowed('planning', 'zone_editor');

  // Feature flag for MapLibre
  const useMapLibre = FEATURE_FLAGS.ENABLE_MAPLIBRE_MAPS;

  // Zone handlers for MapLibre
  const handleZoneCreate = useCallback(
    async (zone: Feature<Polygon>) => {
      try {
        const workspaceId = '00000000-0000-0000-0000-000000000000';
        await createZone.mutateAsync({
          workspace_id: workspaceId,
          name: `Zone ${Date.now()}`,
          description: 'Created via MapLibre',
          boundary: zone.geometry,
          zone_type: 'service',
          priority: 0,
        });
        await logZoneAction({
          workspaceId,
          actionType: 'create_zone',
          newData: { name: `Zone ${Date.now()}`, zone_type: 'service' },
        });
        toast.success('Zone created successfully');
      } catch (error) {
        console.error('Failed to create zone:', error);
        toast.error('Failed to create zone');
      }
    },
    [createZone]
  );

  const handleZoneUpdate = useCallback((zone: Feature<Polygon>) => {
    console.log('Zone updated:', zone);
    toast.success('Zone updated');
  }, []);

  const handleZoneDelete = useCallback((zoneId: string) => {
    console.log('Zone deleted:', zoneId);
    toast.success('Zone deleted');
  }, []);

  const handleMetricChange = (metric: typeof selectedMetric) => {
    setSelectedMetric(metric);
  };

  return (
    <div className="h-full relative bg-background">
      {/* Mode Indicator */}
      <ModeIndicator mode="planning" />

      {/* UI Controls */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
        {canMeasure && (
          <Button
            variant={activeTool === 'measure' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setActiveTool(activeTool === 'measure' ? null : 'measure')}
            title="Distance Measurement"
            className="bg-card/95 backdrop-blur-sm"
          >
            <Ruler className="h-4 w-4" />
          </Button>
        )}
        {canEditZones && (
          <Button
            variant={activeTool === 'zone' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setActiveTool(activeTool === 'zone' ? null : 'zone')}
            title="Zone Editor"
            className="bg-card/95 backdrop-blur-sm"
          >
            <MapPin className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant={activeTool === 'facility' ? 'default' : 'outline'}
          size="icon"
          onClick={() => setActiveTool(activeTool === 'facility' ? null : 'facility')}
          title="Facility Assigner"
          className="bg-card/95 backdrop-blur-sm"
        >
          <Building2 className="h-4 w-4" />
        </Button>
        <Button
          variant={activeTool === 'route' ? 'default' : 'outline'}
          size="icon"
          onClick={() => setActiveTool(activeTool === 'route' ? null : 'route')}
          title="Route Sketch"
          className="bg-card/95 backdrop-blur-sm"
        >
          <Route className="h-4 w-4" />
        </Button>
        <div className="h-px bg-border my-1" />
        <Button
          variant="outline"
          size="icon"
          onClick={() => setReviewDialogOpen(true)}
          title="Review & Activate"
          className="bg-green-600/10 border-green-600/20 hover:bg-green-600/20"
        >
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        </Button>
      </div>

      {/* Top Control Bar - Horizontally aligned */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-3">
        <KPIRibbon
          activeVehicles={facilities.length}
          inProgress={warehouses.length}
          completed={0}
          alerts={0}
        />
        <PlanningControlBar
          selectedMetric={selectedMetric}
          onMetricChange={handleMetricChange}
          onOpenScenario={() => setScenarioDialogOpen(true)}
          onOpenAnalytics={() => setAnalyticsDialogOpen(true)}
        />
      </div>

      {/* Map Container */}
      {useMapLibre ? (
        <PlanningMapLibre
          facilities={facilities}
          warehouses={warehouses}
          batches={[]}
          center={[8.6753, 9.082]}
          zoom={6}
          enableZoneDrawing={canEditZones}
          zones={zones as Feature<Polygon>[]}
          onZoneCreate={handleZoneCreate}
          onZoneUpdate={handleZoneUpdate}
          onZoneDelete={handleZoneDelete}
          selectedMetric={selectedMetric}
          onMetricChange={handleMetricChange}
        />
      ) : (
        <UnifiedMapContainer
          mode="fullscreen"
          center={[9.082, 8.6753]}
          zoom={6}
          zones={zones}
          facilities={facilities}
          warehouses={warehouses}
          drivers={[]}
          vehicles={[]}
          batches={[]}
          onMapReady={handleMapCapture}
        />
      )}

      {/* Planning Tools Toolbar (Leaflet only) */}
      {!useMapLibre && (
        <>
          <DistanceMeasureTool map={mapInstance} active={activeTool === 'measure'} onClose={() => setActiveTool(null)} />
          <ZoneEditor map={mapInstance} active={activeTool === 'zone'} onClose={() => setActiveTool(null)} onSaveDraft={handleSaveDraft} />
          <FacilityAssigner active={activeTool === 'facility'} onClose={() => setActiveTool(null)} />
          <RouteSketchTool map={mapInstance} active={activeTool === 'route'} onClose={() => setActiveTool(null)} />
        </>
      )}

      {/* Review Dialog */}
      <PlanningReviewDialog open={reviewDialogOpen} onClose={() => setReviewDialogOpen(false)} />

      {/* Scenario Dialog */}
      <ScenarioDialog open={scenarioDialogOpen} onOpenChange={setScenarioDialogOpen} />

      {/* Analytics Dialog */}
      <AnalyticsDialog open={analyticsDialogOpen} onOpenChange={setAnalyticsDialogOpen} />

      {/* Workflow Reminder */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[900]">
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2 shadow-lg">
          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
            Workflow: Draft → Review → Activate (All changes are draft by default)
          </p>
        </div>
      </div>
    </div>
  );
}
