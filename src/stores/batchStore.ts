// MOD4 Batch Store
// Current batch and slot state management

import { create } from 'zustand';
import { Batch, Slot, Facility } from '@/lib/db/schema';

interface BatchState {
  currentBatch: Batch | null;
  slots: Slot[];
  facilities: Facility[];
  activeSlotId: string | null;
  
  // Computed
  completedSlots: number;
  totalSlots: number;
  progress: number;
  
  // Actions
  setBatch: (batch: Batch | null) => void;
  setSlots: (slots: Slot[]) => void;
  setActiveSlot: (slotId: string | null) => void;
  updateSlotStatus: (slotId: string, status: Slot['status']) => void;
  getSlotById: (slotId: string) => Slot | undefined;
  getFacilityById: (facilityId: string) => Facility | undefined;
  reorderPendingSlots: (optimizedFacilityOrder: string[]) => void;
}

export const useBatchStore = create<BatchState>()((set, get) => ({
  currentBatch: null,
  slots: [],
  facilities: [],
  activeSlotId: null,
  completedSlots: 0,
  totalSlots: 0,
  progress: 0,

  setBatch: (batch) => {
    if (!batch) {
      set({ 
        currentBatch: null, 
        slots: [], 
        facilities: [],
        completedSlots: 0,
        totalSlots: 0,
        progress: 0
      });
      return;
    }
    
    const completed = batch.slots.filter(s => 
      s.status === 'delivered' || s.status === 'skipped'
    ).length;
    
    set({ 
      currentBatch: batch, 
      slots: batch.slots,
      facilities: batch.facilities,
      completedSlots: completed,
      totalSlots: batch.slots.length,
      progress: batch.slots.length > 0 ? (completed / batch.slots.length) * 100 : 0
    });
  },

  setSlots: (slots) => {
    const completed = slots.filter(s => 
      s.status === 'delivered' || s.status === 'skipped'
    ).length;
    
    set({ 
      slots,
      completedSlots: completed,
      totalSlots: slots.length,
      progress: slots.length > 0 ? (completed / slots.length) * 100 : 0
    });
  },

  setActiveSlot: (slotId) => set({ activeSlotId: slotId }),

  updateSlotStatus: (slotId, status) => {
    const { slots } = get();
    const updatedSlots = slots.map(s => 
      s.id === slotId ? { ...s, status } : s
    );
    get().setSlots(updatedSlots);
  },

  getSlotById: (slotId) => get().slots.find(s => s.id === slotId),
  
  getFacilityById: (facilityId) => get().facilities.find(f => f.id === facilityId),

  reorderPendingSlots: (optimizedFacilityOrder) => {
    const { slots } = get();
    
    // Find the highest sequence among completed/active slots
    const nonPendingSlots = slots.filter(
      s => s.status !== 'pending'
    );
    const maxNonPendingSeq = nonPendingSlots.reduce(
      (max, s) => Math.max(max, s.sequence), 0
    );

    // Create a map of facility_id to new sequence
    const newSequenceMap = new Map<string, number>();
    optimizedFacilityOrder.forEach((facilityId, index) => {
      newSequenceMap.set(facilityId, maxNonPendingSeq + index + 1);
    });

    // Update slots with new sequences
    const updatedSlots = slots.map(slot => {
      const newSeq = newSequenceMap.get(slot.facility_id);
      if (newSeq !== undefined) {
        return { ...slot, sequence: newSeq };
      }
      return slot;
    });

    get().setSlots(updatedSlots);
  },
}));
