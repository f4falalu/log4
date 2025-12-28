/**
 * useTradeOff Hook
 *
 * State management for Trade-Off workflow
 * Trade-Off is the ONLY reassignment mechanism in operational mode
 *
 * State Machine:
 * initiated → receivers_selected → allocation_complete →
 * confirmations_pending → [all_confirmed] → executed
 *                       → [any_rejection] → cancelled
 *
 * Critical Rules:
 * - Manual vehicle selection ONLY (NO auto-matching)
 * - Mandatory multi-party confirmations (source + all receivers)
 * - Item-level allocation (not batch-level)
 * - Dotted line rendering for Trade-Off routes
 */

import { create } from 'zustand';

export type TradeOffState =
  | 'initiated'
  | 'receivers_selected'
  | 'allocation_complete'
  | 'confirmations_pending'
  | 'all_confirmed'
  | 'executed'
  | 'cancelled';

export interface TradeOffItem {
  itemId: string;
  itemName: string;
  originalQuantity: number;
  allocatedQuantities: Record<string, number>; // vehicleId -> quantity
  unit: string;
}

export interface TradeOffConfirmation {
  driverId: string;
  driverName: string;
  vehicleId: string;
  role: 'source' | 'receiver';
  confirmed: boolean;
  confirmedAt?: Date;
}

export interface TradeOffWorkflow {
  // Core identifiers
  id: string | null;
  originalDispatchId: string | null;
  sourceVehicleId: string | null;
  sourceDriverId: string | null;

  // Receiver selection (manual only)
  receivingVehicleIds: string[];

  // Handover location
  handoverPoint: { lat: number; lng: number } | null;

  // Item allocation
  items: TradeOffItem[];

  // Confirmations
  confirmations: TradeOffConfirmation[];

  // State
  state: TradeOffState;

  // Metadata
  initiatedBy: string | null;
  initiatedAt: Date | null;
  reason: string | null;

  // UI state
  isDialogOpen: boolean;
}

interface TradeOffStore extends TradeOffWorkflow {
  // Actions
  initiateTradeOff: (dispatchId: string, sourceVehicleId: string, sourceDriverId: string) => void;
  selectReceivingVehicles: (vehicleIds: string[]) => void;
  setHandoverPoint: (point: { lat: number; lng: number }) => void;
  allocateItem: (itemId: string, vehicleId: string, quantity: number) => void;
  confirmTradeOff: (driverId: string, confirmed: boolean) => void;
  executeTradeOff: () => Promise<void>;
  cancelTradeOff: () => void;
  reset: () => void;

  // UI actions
  openDialog: () => void;
  closeDialog: () => void;
}

const initialState: TradeOffWorkflow = {
  id: null,
  originalDispatchId: null,
  sourceVehicleId: null,
  sourceDriverId: null,
  receivingVehicleIds: [],
  handoverPoint: null,
  items: [],
  confirmations: [],
  state: 'initiated',
  initiatedBy: null,
  initiatedAt: null,
  reason: null,
  isDialogOpen: false,
};

export const useTradeOff = create<TradeOffStore>((set, get) => ({
  ...initialState,

  // ========================================================================
  // INITIATE TRADE-OFF
  // ========================================================================
  initiateTradeOff: (dispatchId, sourceVehicleId, sourceDriverId) => {
    set({
      ...initialState,
      id: crypto.randomUUID(),
      originalDispatchId: dispatchId,
      sourceVehicleId,
      sourceDriverId,
      state: 'initiated',
      initiatedAt: new Date(),
      isDialogOpen: true,
    });
  },

  // ========================================================================
  // SELECT RECEIVING VEHICLES (Manual selection ONLY)
  // ========================================================================
  selectReceivingVehicles: (vehicleIds) => {
    set({
      receivingVehicleIds: vehicleIds,
      state: vehicleIds.length > 0 ? 'receivers_selected' : 'initiated',
    });
  },

  // ========================================================================
  // SET HANDOVER POINT
  // ========================================================================
  setHandoverPoint: (point) => {
    set({ handoverPoint: point });
  },

  // ========================================================================
  // ALLOCATE ITEM (Item-level allocation)
  // ========================================================================
  allocateItem: (itemId, vehicleId, quantity) => {
    const { items } = get();

    const updatedItems = items.map((item) => {
      if (item.itemId === itemId) {
        return {
          ...item,
          allocatedQuantities: {
            ...item.allocatedQuantities,
            [vehicleId]: quantity,
          },
        };
      }
      return item;
    });

    // Check if all items are fully allocated
    const allAllocated = updatedItems.every((item) => {
      const totalAllocated = Object.values(item.allocatedQuantities).reduce(
        (sum, qty) => sum + qty,
        0
      );
      return totalAllocated === item.originalQuantity;
    });

    set({
      items: updatedItems,
      state: allAllocated ? 'allocation_complete' : 'receivers_selected',
    });
  },

  // ========================================================================
  // CONFIRM TRADE-OFF (Multi-party confirmation)
  // ========================================================================
  confirmTradeOff: (driverId, confirmed) => {
    const { confirmations } = get();

    const updatedConfirmations = confirmations.map((conf) => {
      if (conf.driverId === driverId) {
        return {
          ...conf,
          confirmed,
          confirmedAt: confirmed ? new Date() : undefined,
        };
      }
      return conf;
    });

    // Check if all confirmed or any rejection
    const allConfirmed = updatedConfirmations.every((conf) => conf.confirmed);
    const anyRejection = updatedConfirmations.some((conf) => !conf.confirmed);

    set({
      confirmations: updatedConfirmations,
      state: anyRejection
        ? 'cancelled'
        : allConfirmed
        ? 'all_confirmed'
        : 'confirmations_pending',
    });
  },

  // ========================================================================
  // EXECUTE TRADE-OFF (Final execution)
  // ========================================================================
  executeTradeOff: async () => {
    const state = get();

    if (state.state !== 'all_confirmed') {
      throw new Error('Cannot execute Trade-Off: not all parties have confirmed');
    }

    // TODO: Implement actual API call to execute Trade-Off
    // This will:
    // 1. Create tradeoff record in database
    // 2. Create tradeoff_items records
    // 3. Create tradeoff_confirmations records
    // 4. Update dispatch state
    // 5. Create audit log entry

    console.log('Executing Trade-Off:', state);

    set({ state: 'executed' });

    // Reset after short delay
    setTimeout(() => {
      get().reset();
    }, 2000);
  },

  // ========================================================================
  // CANCEL TRADE-OFF
  // ========================================================================
  cancelTradeOff: () => {
    set({ state: 'cancelled' });

    // Reset after short delay
    setTimeout(() => {
      get().reset();
    }, 2000);
  },

  // ========================================================================
  // RESET
  // ========================================================================
  reset: () => {
    set(initialState);
  },

  // ========================================================================
  // UI ACTIONS
  // ========================================================================
  openDialog: () => {
    set({ isDialogOpen: true });
  },

  closeDialog: () => {
    set({ isDialogOpen: false });
  },
}));
