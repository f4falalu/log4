/**
 * Planning Map Page
 *
 * Spatial configuration with draft → review → activate workflow
 *
 * Features:
 * - Distance measurement tool
 * - Geo-fencing controls
 * - Zone editor (drawing, editing boundaries)
 * - Facility-to-zone assignment
 * - Route sketching (non-binding previews)
 * - Configuration review and activation
 *
 * Forbidden:
 * - Dispatch actions
 * - Vehicle control
 * - Live exception handling
 * - Historical playback
 * - Immediate application of planning changes
 *
 * Critical Workflow: Draft → Review → Activate
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useMapContext } from '@/hooks/useMapContext';
import { useServiceZones } from '@/hooks/useServiceZones';
import { useFacilities } from '@/hooks/useFacilities';
import { useWarehouses } from '@/hooks/useWarehouses';
import { useCreateZoneConfiguration } from '@/hooks/useZoneConfigurations';
import { UnifiedMapContainer } from '@/components/map/UnifiedMapContainer';
import { DistanceMeasureTool } from '@/components/map/tools/DistanceMeasureTool';
import { ZoneEditor } from '@/components/map/tools/ZoneEditor';
import { FacilityAssigner } from '@/components/map/tools/FacilityAssigner';
import { RouteSketchTool } from '@/components/map/tools/RouteSketchTool';
import { PlanningReviewDialog } from '@/components/map/dialogs/PlanningReviewDialog';
import { Button } from '@/components/ui/button';
import { Ruler, MapPin, Building2, Route, CheckCircle2 } from 'lucide-react';
import { isToolAllowed } from '@/lib/mapCapabilities';
import { logZoneAction } from '@/lib/mapAuditLogger';
import L from 'leaflet';
import { toast } from 'sonner';

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

  const mapInstanceRef = useRef<L.Map | null>(null);

  const handleMapCapture = useCallback((map: L.Map) => {
    mapInstanceRef.current = map;
  }, []);

  const handleSaveDraft = useCallback(
    async (zoneData: any) => {
      try {
        // TODO: Get actual workspace_id from context when workspace system is implemented
        const workspaceId = '00000000-0000-0000-0000-000000000000';

        await createZone.mutateAsync({
          workspace_id: workspaceId,
          name: zoneData.name,
          description: zoneData.description,
          boundary: zoneData.geometry,
          zone_type: 'service',
          priority: 0,
        });

        // Log the action for audit
        await logZoneAction({
          workspaceId,
          actionType: 'create_zone',
          newData: {
            name: zoneData.name,
            zone_type: 'service',
          },
        });
      } catch (error) {
        console.error('Failed to save zone:', error);
        // Error toast is handled by the mutation hook
      }
    },
    [createZone]
  );

  // Check if tools are allowed
  const canMeasure = isToolAllowed('planning', 'measure_distance');
  const canEditZones = isToolAllowed('planning', 'zone_editor');

  return (
    <div className="h-full relative bg-background">
      {/* Map Container */}
      <UnifiedMapContainer
        mode="fullscreen"
        center={[9.082, 8.6753]} // Nigeria center
        zoom={6}
        zones={zones}
        facilities={facilities}
        warehouses={warehouses}
        drivers={[]}
        vehicles={[]}
        batches={[]}
        onMapReady={handleMapCapture}
      />

      {/* Planning Tools Toolbar */}
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

      {/* Planning Tools */}
      <DistanceMeasureTool
        map={mapInstanceRef.current}
        active={activeTool === 'measure'}
        onClose={() => setActiveTool(null)}
      />

      <ZoneEditor
        map={mapInstanceRef.current}
        active={activeTool === 'zone'}
        onClose={() => setActiveTool(null)}
        onSaveDraft={handleSaveDraft}
      />

      <FacilityAssigner
        active={activeTool === 'facility'}
        onClose={() => setActiveTool(null)}
      />

      <RouteSketchTool
        map={mapInstanceRef.current}
        active={activeTool === 'route'}
        onClose={() => setActiveTool(null)}
      />

      {/* Review Dialog */}
      <PlanningReviewDialog open={reviewDialogOpen} onClose={() => setReviewDialogOpen(false)} />

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
