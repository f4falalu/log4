import { create } from 'zustand';
import type { MapCapability, MapLayout, MapTimeHorizon } from '@/lib/mapCapabilities';

/**
 * Legacy MapMode type - use MapCapability instead
 * @deprecated Use MapCapability from mapCapabilities.ts
 */
export type MapMode = 'live' | 'planning' | 'playback' | 'config';

export type PanelMode = 'analytics' | 'tools';

interface MapContextState {
  // Three-tier mode system
  capability: MapCapability;
  layout: MapLayout;
  timeHorizon: MapTimeHorizon;

  // Legacy mode support (for backward compatibility)
  /** @deprecated Use capability instead */
  mode: MapMode;

  panelMode: PanelMode;
  selectedDate: Date;
  selectedZone: string | null;
  selectedFleet: string | null;
  selectedWarehouse: string | null;
  isPanelExpanded: boolean;

  // Three-tier mode actions
  setCapability: (capability: MapCapability) => void;
  setLayout: (layout: MapLayout) => void;
  setTimeHorizon: (timeHorizon: MapTimeHorizon) => void;

  // Legacy mode action
  /** @deprecated Use setCapability instead */
  setMode: (mode: MapMode) => void;

  setPanelMode: (mode: PanelMode) => void;
  setSelectedDate: (date: Date) => void;
  setSelectedZone: (zone: string | null) => void;
  setSelectedFleet: (fleet: string | null) => void;
  setSelectedWarehouse: (warehouse: string | null) => void;
  togglePanelExpanded: () => void;
}

export const useMapContext = create<MapContextState>((set) => ({
  // Three-tier mode defaults
  capability: 'operational',
  layout: 'fullscreen',
  timeHorizon: 'present',

  // Legacy mode default
  mode: 'live',

  panelMode: 'analytics',
  selectedDate: new Date(),
  selectedZone: null,
  selectedFleet: null,
  selectedWarehouse: null,
  isPanelExpanded: false,

  // Three-tier mode actions
  setCapability: (capability) => set({ capability }),
  setLayout: (layout) => set({ layout }),
  setTimeHorizon: (timeHorizon) => set({ timeHorizon }),

  // Legacy mode action
  setMode: (mode) => set({ mode }),

  setPanelMode: (panelMode) => set({ panelMode }),
  setSelectedDate: (selectedDate) => set({ selectedDate }),
  setSelectedZone: (selectedZone) => set({ selectedZone }),
  setSelectedFleet: (selectedFleet) => set({ selectedFleet }),
  setSelectedWarehouse: (selectedWarehouse) => set({ selectedWarehouse }),
  togglePanelExpanded: () => set((state) => ({ isPanelExpanded: !state.isPanelExpanded })),
}));
