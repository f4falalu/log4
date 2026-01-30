/**
 * mapStore.ts — Zustand store for Maps-V2 app-level state.
 *
 * This is the ONLY bridge between React UI and the MapKernel.
 * React writes to this store. MapKernel reads from it.
 * One-way data flow. No feedback loops.
 */

import { create } from 'zustand';
import type { MapMode, InteractionState } from '../core/types';
import type { Zone, ZoneTag, AuditLog, H3CellState } from '../contracts';
import type { PlanningTool, ScenarioState, TimeHorizon, PlanningMetricsSummary } from '../contracts/PlanningTypes';

interface MapStoreState {
  // Mode
  mode: MapMode;
  setMode: (mode: MapMode) => void;

  // Interaction
  interactionState: InteractionState;
  setInteractionState: (state: InteractionState) => void;

  // Domain data
  zones: Zone[];
  zoneTags: ZoneTag[];
  auditLog: AuditLog[];
  setZones: (zones: Zone[]) => void;
  addZone: (zone: Zone) => void;
  updateZone: (id: string, patch: Partial<Zone>) => void;
  setZoneTags: (tags: ZoneTag[]) => void;
  addZoneTag: (tag: ZoneTag) => void;
  appendAuditLog: (entry: AuditLog) => void;

  // Selection
  selectedH3Indexes: string[];
  hoveredH3Index: string | null;
  selectedZoneId: string | null;
  setSelectedH3: (indexes: string[]) => void;
  setHoveredH3: (index: string | null) => void;
  setSelectedZone: (id: string | null) => void;

  // Derived cell states (computed by CellStateEngine)
  cellStates: H3CellState[];
  setCellStates: (states: H3CellState[]) => void;

  // Forensic playback
  playbackTime: Date | null;
  isPlaying: boolean;
  playbackSpeed: number;
  setPlaybackTime: (time: Date | null) => void;
  setPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;

  // Drawing state
  drawPoints: [number, number][];
  addDrawPoint: (point: [number, number]) => void;
  clearDrawPoints: () => void;

  // Planning tool state
  activePlanningTool: PlanningTool;
  setActivePlanningTool: (tool: PlanningTool) => void;

  // Scenario state
  activeScenarioId: string | null;
  scenarioState: ScenarioState;
  scenarioTimeHorizon: TimeHorizon;
  setActiveScenario: (id: string | null) => void;
  setScenarioState: (state: ScenarioState) => void;
  setScenarioTimeHorizon: (horizon: TimeHorizon) => void;

  // Planning metrics
  planningMetrics: PlanningMetricsSummary;
  setPlanningMetrics: (metrics: PlanningMetricsSummary) => void;

  // Compare mode
  compareZoneIds: [string, string] | null;
  setCompareZoneIds: (ids: [string, string] | null) => void;

  // Coverage overlay
  coverageLayerVisible: boolean;
  setCoverageLayerVisible: (visible: boolean) => void;
}

export const useMapStore = create<MapStoreState>((set) => ({
  // Mode
  mode: 'operational',
  setMode: (mode) => set({ mode, interactionState: 'IDLE', selectedH3Indexes: [], selectedZoneId: null }),

  // Interaction
  interactionState: 'IDLE',
  setInteractionState: (interactionState) => set({ interactionState }),

  // Domain data
  zones: [],
  zoneTags: [],
  auditLog: [],
  setZones: (zones) => set({ zones }),
  addZone: (zone) => set((s) => ({ zones: [...s.zones, zone] })),
  updateZone: (id, patch) => set((s) => ({
    zones: s.zones.map((z) => z.id === id ? { ...z, ...patch } : z),
  })),
  setZoneTags: (zoneTags) => set({ zoneTags }),
  addZoneTag: (tag) => set((s) => ({ zoneTags: [...s.zoneTags, tag] })),
  appendAuditLog: (entry) => set((s) => ({ auditLog: [...s.auditLog, entry] })),

  // Selection
  selectedH3Indexes: [],
  hoveredH3Index: null,
  selectedZoneId: null,
  setSelectedH3: (selectedH3Indexes) => set({ selectedH3Indexes }),
  setHoveredH3: (hoveredH3Index) => set({ hoveredH3Index }),
  setSelectedZone: (selectedZoneId) => set({ selectedZoneId }),

  // Cell states
  cellStates: [],
  setCellStates: (cellStates) => set({ cellStates }),

  // Forensic
  playbackTime: null,
  isPlaying: false,
  playbackSpeed: 1,
  setPlaybackTime: (playbackTime) => set({ playbackTime }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),

  // Drawing
  drawPoints: [],
  addDrawPoint: (point) => set((s) => ({ drawPoints: [...s.drawPoints, point] })),
  clearDrawPoints: () => set({ drawPoints: [] }),

  // Planning tool
  activePlanningTool: null,
  setActivePlanningTool: (tool) => set((s) => ({
    activePlanningTool: tool,
    selectedH3Indexes: [],
    selectedZoneId: null,
    compareZoneIds: tool !== 'compare' ? null : s.compareZoneIds,
    coverageLayerVisible: tool === 'coverage',
  })),

  // Scenario
  activeScenarioId: null,
  scenarioState: 'draft',
  scenarioTimeHorizon: '90d',
  setActiveScenario: (activeScenarioId) => set({ activeScenarioId }),
  setScenarioState: (scenarioState) => set({ scenarioState }),
  setScenarioTimeHorizon: (scenarioTimeHorizon) => set({ scenarioTimeHorizon }),

  // Planning metrics
  planningMetrics: {
    demandCoveredPct: 0,
    serviceGapPct: 0,
    slaImpactScore: 0,
    riskExposureScore: 0,
    lastUpdated: new Date().toISOString(),
  },
  setPlanningMetrics: (planningMetrics) => set({ planningMetrics }),

  // Compare
  compareZoneIds: null,
  setCompareZoneIds: (compareZoneIds) => set({ compareZoneIds }),

  // Coverage
  coverageLayerVisible: false,
  setCoverageLayerVisible: (coverageLayerVisible) => set({ coverageLayerVisible }),
}));
