import { create } from 'zustand';
import type { MapCapability, TimeHorizon } from '@/lib/mapCapabilities';

export type MapMode = 'live' | 'planning' | 'playback' | 'config';
export type PanelMode = 'analytics' | 'tools';

interface MapContextState {
  mode: MapMode;
  panelMode: PanelMode;
  capability: MapCapability;
  timeHorizon: TimeHorizon;
  selectedDate: Date;
  selectedZone: string | null;
  selectedFleet: string | null;
  selectedWarehouse: string | null;
  isPanelExpanded: boolean;
  setMode: (mode: MapMode) => void;
  setPanelMode: (mode: PanelMode) => void;
  setCapability: (capability: MapCapability) => void;
  setTimeHorizon: (timeHorizon: TimeHorizon) => void;
  setSelectedDate: (date: Date) => void;
  setSelectedZone: (zone: string | null) => void;
  setSelectedFleet: (fleet: string | null) => void;
  setSelectedWarehouse: (warehouse: string | null) => void;
  togglePanelExpanded: () => void;
}

export const useMapContext = create<MapContextState>((set) => ({
  mode: 'live',
  panelMode: 'analytics',
  capability: 'operational',
  timeHorizon: 'present',
  selectedDate: new Date(),
  selectedZone: null,
  selectedFleet: null,
  selectedWarehouse: null,
  isPanelExpanded: false,
  setMode: (mode) => set({ mode }),
  setPanelMode: (panelMode) => set({ panelMode }),
  setCapability: (capability) => set({ capability }),
  setTimeHorizon: (timeHorizon) => set({ timeHorizon }),
  setSelectedDate: (selectedDate) => set({ selectedDate }),
  setSelectedZone: (selectedZone) => set({ selectedZone }),
  setSelectedFleet: (selectedFleet) => set({ selectedFleet }),
  setSelectedWarehouse: (selectedWarehouse) => set({ selectedWarehouse }),
  togglePanelExpanded: () => set((state) => ({ isPanelExpanded: !state.isPanelExpanded })),
}));
