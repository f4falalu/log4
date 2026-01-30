/**
 * MapV2PlanningPage.tsx — Dedicated Planning Mode Orchestrator.
 *
 * Owns:
 * - MapContainer (kernel + layers)
 * - PlanningToolsBar (Label 1)
 * - PlanningScenarioBar (Label 2)
 * - PlanningInspector (Label 3)
 * - PlanningSummaryStrip (Label 4)
 * - ConfirmGateOverlay
 *
 * Wires:
 * - PlanningMapController (tool→interaction mediator)
 * - ZoneDrawController (polygon drawing)
 * - ConfirmGate + AuditLogger (mutation safety)
 * - MetricsEngine (aggregate planning metrics)
 * - CoverageOverlayLayer (facility reach visualization)
 *
 * No DemoDataEngine dependency (planning has no live data).
 * No ModeSwitcher (this page IS the planning mode).
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { MapContainer } from './MapContainer';
import { PlanningToolsBar } from './planning/PlanningToolsBar';
import { PlanningScenarioBar } from './planning/PlanningScenarioBar';
import { PlanningInspector } from './planning/PlanningInspector';
import { PlanningSummaryStrip } from './planning/PlanningSummaryStrip';
import { ConfirmGateOverlay } from './planning/ConfirmGateOverlay';
import { usePlanningPanelVisibility } from './planning/usePlanningPanelVisibility';
import { useMapStore } from '../store/mapStore';
import { MapKernel } from '../core/MapKernel';
import { PlanningMapController } from '../planning/PlanningMapController';
import { ZoneDrawController } from '../planning/ZoneDrawController';
import { AuditLogger } from '../planning/AuditLogger';
import { ConfirmGate } from '../planning/ConfirmGate';
import { CoverageOverlayLayer } from '../layers/CoverageOverlayLayer';
import { computePlanningMetrics } from '../planning/MetricsEngine';
import { generateCoverageRingGeoJSON } from '../planning/CoverageEngine';
import { createZone } from '../contracts/Zone';

export default function MapV2PlanningPage() {
  const setMode = useMapStore((s) => s.setMode);
  const interactionState = useMapStore((s) => s.interactionState);
  const setInteractionState = useMapStore((s) => s.setInteractionState);
  const addZone = useMapStore((s) => s.addZone);
  const appendAuditLog = useMapStore((s) => s.appendAuditLog);
  const zones = useMapStore((s) => s.zones);
  const cellStates = useMapStore((s) => s.cellStates);
  const activePlanningTool = useMapStore((s) => s.activePlanningTool);
  const coverageLayerVisible = useMapStore((s) => s.coverageLayerVisible);
  const setPlanningMetrics = useMapStore((s) => s.setPlanningMetrics);

  const kernelRef = useRef<MapKernel | null>(null);
  const planningControllerRef = useRef<PlanningMapController | null>(null);
  const drawControllerRef = useRef<ZoneDrawController | null>(null);
  const auditLoggerRef = useRef(new AuditLogger());
  const confirmGateRef = useRef(new ConfirmGate(auditLoggerRef.current));
  const coverageLayerRef = useRef<CoverageOverlayLayer | null>(null);

  const [pendingDescription, setPendingDescription] = useState<string | undefined>();
  const [inspectorDismissed, setInspectorDismissed] = useState(false);

  const { showScenarioBar, showInspector, showConfirmGate } = usePlanningPanelVisibility();

  // Set mode on mount
  useEffect(() => {
    setMode('planning');
  }, [setMode]);

  // Recompute planning metrics when zones/cells change
  useEffect(() => {
    const metrics = computePlanningMetrics(zones, cellStates);
    setPlanningMetrics(metrics);
  }, [zones, cellStates, setPlanningMetrics]);

  // Handle tool activation → start appropriate controller
  useEffect(() => {
    const controller = planningControllerRef.current;
    if (!controller) return;

    controller.activateTool(activePlanningTool);

    if (activePlanningTool === 'draw') {
      handleStartDraw();
    } else {
      // Cancel any ongoing draw if switching away
      if (drawControllerRef.current) {
        drawControllerRef.current.cancel();
        drawControllerRef.current = null;
      }
    }

    // Reset inspector dismissal when tool changes
    setInspectorDismissed(false);
  }, [activePlanningTool]); // eslint-disable-line react-hooks/exhaustive-deps

  // Coverage layer visibility
  useEffect(() => {
    const layer = coverageLayerRef.current;
    if (!layer || !layer.isAttached()) return;

    if (coverageLayerVisible) {
      layer.setVisible(true);
      // Update coverage data from facilities
      updateCoverageData();
    } else {
      layer.setVisible(false);
    }
  }, [coverageLayerVisible]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleKernelReady = useCallback((kernel: MapKernel) => {
    kernelRef.current = kernel;

    const map = kernel.getMap();
    if (!map) return;

    // Initialize PlanningMapController
    const interactionController = kernel.getInteractionController();
    const planningController = new PlanningMapController(interactionController);
    planningController.setMap(map);
    planningControllerRef.current = planningController;

    // Register and attach coverage layer
    const coverageLayer = new CoverageOverlayLayer();
    kernel.registerLayer('coverage-overlay', coverageLayer);
    coverageLayerRef.current = coverageLayer;
    coverageLayer.setVisible(false); // Hidden by default
  }, []);

  const updateCoverageData = useCallback(() => {
    const layer = coverageLayerRef.current;
    if (!layer || !layer.isAttached()) return;

    // Use demo facility data (can be replaced with real data later)
    const demoFacilities = [
      { id: 'f1', name: 'Facility Alpha', lat: 12.0, lng: 8.52 },
      { id: 'f2', name: 'Facility Beta', lat: 12.05, lng: 8.55 },
      { id: 'f3', name: 'Facility Gamma', lat: 11.95, lng: 8.48 },
    ];

    const geojson = generateCoverageRingGeoJSON(demoFacilities);
    layer.update({ geojson });
  }, []);

  // Zone drawing
  const handleStartDraw = useCallback(() => {
    const kernel = kernelRef.current;
    if (!kernel) return;

    const map = kernel.getMap();
    if (!map) return;

    const controller = kernel.getInteractionController();

    const drawController = new ZoneDrawController(map, controller, (result) => {
      const zone = createZone({
        name: `Zone ${Date.now().toString(36)}`,
        description: 'Created via planning tool',
        h3Indexes: result.h3Cells,
        actorId: 'planning-user',
      });

      confirmGateRef.current.stage(
        {
          type: 'CREATE_ZONE',
          description: `Create zone with ${result.h3Cells.length} cells`,
          payload: { entityId: zone.id, zone },
          before: null,
          after: zone as unknown as Record<string, unknown>,
        },
        (auditEntry) => {
          addZone(zone);
          appendAuditLog(auditEntry);
          setInteractionState('IDLE');
          setPendingDescription(undefined);
        },
        () => {
          setInteractionState('IDLE');
          setPendingDescription(undefined);
        }
      );

      setInteractionState('CONFIRM');
      setPendingDescription(`Create zone with ${result.h3Cells.length} H3 cells`);
    });

    drawController.start();
    drawControllerRef.current = drawController;
    setInteractionState('DRAW_ZONE');
  }, [addZone, appendAuditLog, setInteractionState]);

  const handleConfirm = useCallback((reason: string) => {
    confirmGateRef.current.confirm('planning-user', reason);
  }, []);

  const handleCancel = useCallback(() => {
    confirmGateRef.current.cancel();
    setInteractionState('IDLE');
    setPendingDescription(undefined);
  }, [setInteractionState]);

  const handleInspectorClose = useCallback(() => {
    setInspectorDismissed(true);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-950">
      {/* Minimal header */}
      <header className="h-10 flex items-center px-4 bg-gray-900/80 border-b border-gray-800 z-10 relative shrink-0">
        <button
          onClick={() => window.history.back()}
          className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <span className="text-xs text-gray-400 ml-3 font-medium">Planning Mode</span>
        <span className="text-xs text-gray-600 ml-2 bg-gray-800 px-2 py-0.5 rounded">
          {interactionState}
        </span>
      </header>

      {/* Map + overlays */}
      <main className="flex-1 relative">
        <MapContainer onKernelReady={handleKernelReady} />

        {/* Label 1: Tools Bar (top-right, always visible) */}
        <PlanningToolsBar />

        {/* Label 2: Scenario Bar (bottom-center, hidden during draw/compare) */}
        {showScenarioBar && <PlanningScenarioBar />}

        {/* Label 3: Inspector (right panel, selection-driven) */}
        {showInspector && !inspectorDismissed && (
          <PlanningInspector onClose={handleInspectorClose} />
        )}

        {/* Label 4: Summary Strip (bottom-left, always visible) */}
        <PlanningSummaryStrip />

        {/* Confirm Gate Overlay */}
        {showConfirmGate && (
          <ConfirmGateOverlay
            description={pendingDescription ?? 'Confirm action'}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />
        )}
      </main>
    </div>
  );
}
