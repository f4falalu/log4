import { create } from 'zustand';

export type EntityType = 'driver' | 'vehicle' | 'batch' | 'zone' | 'facility';

interface DrawerState {
  isOpen: boolean;
  entityType: EntityType | null;
  entityId: string | null;
  openDrawer: (type: EntityType, id: string) => void;
  closeDrawer: () => void;
}

export const useDrawerState = create<DrawerState>((set) => ({
  isOpen: false,
  entityType: null,
  entityId: null,
  openDrawer: (type, id) => set({ isOpen: true, entityType: type, entityId: id }),
  closeDrawer: () => set({ isOpen: false, entityType: null, entityId: null }),
}));
