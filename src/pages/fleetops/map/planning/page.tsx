import { useState, useCallback, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useMapContext } from '@/hooks/useMapContext';
import { useFacilities } from '@/hooks/useFacilities';
import { useWarehouses } from '@/hooks/useWarehouses';
import { PlanningMap } from '@/map/modes/planning';
import { ModeIndicator } from '@/components/map/ui/ModeIndicator';
import { FacilityAssigner } from '@/components/map/tools/FacilityAssigner';
import { PlanningReviewDialog } from '@/components/map/dialogs/PlanningReviewDialog';
import { ScenarioDialog } from '@/components/map/dialogs/ScenarioDialog';
import { AnalyticsDialog } from '@/components/map/dialogs/AnalyticsDialog';
import { Button } from '@/components/ui/button';
import { Ruler, MapPin, Building2, Route, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
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
  const { facilities = [] } = useFacilities();
  const { data: warehouses = [] } = useWarehouses();

  // UI state
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [scenarioDialogOpen, setScenarioDialogOpen] = useState(false);
  const [analyticsDialogOpen, setAnalyticsDialogOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<'demand' | 'capacity' | 'sla'>('demand');

  const canMeasure = false;
  const canEditZones = false;

  // Theme
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';

  // Zone handler for new map system
  const handleNewZoneCreated = useCallback(
    async (zone: { name: string; h3Cells: string[] }) => {
      try {
        toast.success(`Zone "${zone.name}" created with ${zone.h3Cells.length} cells`);
      } catch (error) {
        console.error('Failed to create zone:', error);
        toast.error('Failed to create zone');
      }
    },
    []
  );

  const handleMetricChange = (metric: typeof selectedMetric) => {
    setSelectedMetric(metric);
  };

  const showUnavailableTool = useCallback(() => {
    toast.info('Tool temporarily unavailable', {
      description: 'MapLibre versions of these tools are being rebuilt.',
    });
  }, []);

  return (
    <div className="h-full relative bg-background">
      {/* Mode Indicator */}
      <ModeIndicator mode="planning" />

      {/* UI Controls */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
        {canMeasure && (
          <Button
            variant="outline"
            size="icon"
            onClick={showUnavailableTool}
            title="Distance Measurement"
            className="bg-card/95 backdrop-blur-sm"
          >
            <Ruler className="h-4 w-4" />
          </Button>
        )}
        {canEditZones && (
          <Button
            variant="outline"
            size="icon"
            onClick={showUnavailableTool}
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
          variant="outline"
          size="icon"
          onClick={showUnavailableTool}
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
      <PlanningMap
        center={[8.6753, 9.082]}
        zoom={6}
        isDarkMode={isDarkMode}
        onZoneCreated={handleNewZoneCreated}
        warehouses={warehouses.map(w => ({
          id: w.id,
          name: w.name,
          lat: w.lat,
          lng: w.lng,
          type: w.type,
        }))}
        onWarehouseClick={(warehouse) => {
          toast.info(`Origin: ${warehouse.name}`, {
            description: `${warehouse.type === 'central' ? 'Central' : 'Zonal'} warehouse`,
          });
        }}
      />

      {/* Planning Tools (MapLibre-only for now) */}
      <FacilityAssigner
        active={activeTool === 'facility'}
        onClose={() => setActiveTool(null)}
      />

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
