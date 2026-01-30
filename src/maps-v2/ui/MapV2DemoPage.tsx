/**
 * MapV2DemoPage.tsx — Full demo page for BIKO Map System v2.
 *
 * Orchestrates:
 * - MapContainer (kernel + layers)
 * - ModeSwitcher
 * - Mode-specific UI (PlanningToolbar, TimelineScrubber)
 * - InspectPanel
 * - DemoDataEngine (simulation)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer } from './MapContainer';
import { ModeSwitcher } from './ModeSwitcher';
import { InspectPanel } from './InspectPanel';
import { PlanningToolbar } from './PlanningToolbar';
import { TimelineScrubber } from './TimelineScrubber';
import { DemoDataEngine } from '../demo/DemoDataEngine';
import { useMapStore } from '../store/mapStore';
import { MapKernel } from '../core/MapKernel';
import { ZoneDrawController } from '../planning/ZoneDrawController';
import { AuditLogger } from '../planning/AuditLogger';
import { ConfirmGate } from '../planning/ConfirmGate';
import { PlaybackClock } from '../forensic/PlaybackClock';
import { createZone } from '../contracts/Zone';

export default function MapV2DemoPage() {
  const mode = useMapStore((s) => s.mode);
  const interactionState = useMapStore((s) => s.interactionState);
  const setInteractionState = useMapStore((s) => s.setInteractionState);
  const addZone = useMapStore((s) => s.addZone);
  const setZones = useMapStore((s) => s.setZones);
  const setZoneTags = useMapStore((s) => s.setZoneTags);
  const appendAuditLog = useMapStore((s) => s.appendAuditLog);

  const demoEngineRef = useRef<DemoDataEngine | null>(null);
  const kernelRef = useRef<MapKernel | null>(null);
  const drawControllerRef = useRef<ZoneDrawController | null>(null);
  const auditLoggerRef = useRef(new AuditLogger());
  const confirmGateRef = useRef(new ConfirmGate(auditLoggerRef.current));
  const playbackClockRef = useRef<PlaybackClock | null>(null);
  const mapContainerDivRef = useRef<HTMLDivElement | null>(null);

  const [pendingDescription, setPendingDescription] = useState<string | undefined>();
  const [replayBounds, setReplayBounds] = useState<{ start: Date; end: Date } | null>(null);

  // Initialize demo engine
  useEffect(() => {
    const engine = new DemoDataEngine();
    demoEngineRef.current = engine;

    // Load initial zones and tags
    const state = engine.getState();
    setZones(state.zones);
    setZoneTags(state.zoneTags);

    // Subscribe to simulation updates (push to map layers)
    const unsub = engine.subscribe((demoState) => {
      if (mapContainerDivRef.current) {
        const pushFn = (mapContainerDivRef.current.querySelector('[class*="w-full"]') as any)?.__pushDemoState
          ?? (mapContainerDivRef.current.firstElementChild as any)?.__pushDemoState;
        pushFn?.(demoState);
      }
    });

    // Start simulation in operational mode
    engine.start(100);

    return () => {
      unsub();
      engine.destroy();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update replay bounds periodically
  useEffect(() => {
    if (mode !== 'forensic') return;

    const engine = demoEngineRef.current;
    if (engine) {
      setReplayBounds(engine.getReplayBounds());
    }
  }, [mode]);

  const handleKernelReady = useCallback((kernel: MapKernel) => {
    kernelRef.current = kernel;

    // Push initial demo state to layers
    const engine = demoEngineRef.current;
    if (engine) {
      const state = engine.getState();
      const mapDiv = mapContainerDivRef.current?.querySelector('[class*="w-full"]') as any;
      mapDiv?.__pushDemoState?.(state);
    }
  }, []);

  // Zone drawing
  const handleStartDraw = useCallback(() => {
    const kernel = kernelRef.current;
    if (!kernel) return;

    const map = kernel.getMap();
    if (!map) return;

    const controller = kernel.getInteractionController();

    const drawController = new ZoneDrawController(map, controller, (result) => {
      // Zone creation via confirm gate
      const zone = createZone({
        name: `Zone ${Date.now().toString(36)}`,
        description: 'Created via planning tool',
        h3Indexes: result.h3Cells,
        actorId: 'demo-user',
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

  const handleCancelDraw = useCallback(() => {
    drawControllerRef.current?.cancel();
    drawControllerRef.current = null;
    setInteractionState('IDLE');
  }, [setInteractionState]);

  const handleConfirm = useCallback((reason: string) => {
    const gate = confirmGateRef.current;
    gate.confirm('demo-user', reason);
  }, []);

  const handleCancel = useCallback(() => {
    confirmGateRef.current.cancel();
    setInteractionState('IDLE');
    setPendingDescription(undefined);
  }, [setInteractionState]);

  // Forensic playback
  const handleTimeChange = useCallback((time: Date) => {
    useMapStore.getState().setPlaybackTime(time);

    // Interpolate vehicle positions from replay data
    const engine = demoEngineRef.current;
    if (!engine) return;

    const replay = engine.getVehicleReplay();
    const state = engine.getState();
    const updatedVehicles = state.vehicles.map((v) => {
      const vehicleReplay = replay.get(v.id);
      if (!vehicleReplay) return v;

      const pos = vehicleReplay.getStateAt(time);
      if (!pos) return v;

      return { ...v, lat: pos.lat, lng: pos.lng, bearing: pos.bearing };
    });

    // Push to map
    const mapDiv = mapContainerDivRef.current?.querySelector('[class*="w-full"]') as any;
    mapDiv?.__pushDemoState?.({
      ...state,
      vehicles: updatedVehicles,
    });
  }, []);

  const handlePlayStateChange = useCallback((playing: boolean) => {
    useMapStore.getState().setPlaying(playing);
    if (playing) {
      setInteractionState('LOCKED');
    } else {
      setInteractionState('IDLE');
    }
  }, [setInteractionState]);

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-950" ref={mapContainerDivRef}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-gray-900/80 border-b border-gray-800 z-10 relative">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-white">BIKO Map v2</h1>
          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
            {interactionState}
          </span>
        </div>
        <ModeSwitcher />
      </header>

      {/* Map area */}
      <main className="flex-1 relative">
        <MapContainer onKernelReady={handleKernelReady} />

        {/* Mode-specific overlays */}
        {mode === 'planning' && (
          <PlanningToolbar
            onStartDraw={handleStartDraw}
            onCancelDraw={handleCancelDraw}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            pendingDescription={pendingDescription}
          />
        )}

        {mode === 'forensic' && replayBounds && (
          <TimelineScrubber
            startTime={replayBounds.start}
            endTime={replayBounds.end}
            onTimeChange={handleTimeChange}
            onPlayStateChange={handlePlayStateChange}
          />
        )}

        {/* Inspect panel (all modes) */}
        <InspectPanel />
      </main>
    </div>
  );
}
