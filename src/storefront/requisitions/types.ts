/**
 * =====================================================
 * STOREFRONT REQUISITIONS TYPES
 * =====================================================
 *
 * Re-export types from shared types and add module-specific types.
 */

// Re-export shared types
export type {
  Requisition,
  RequisitionStatus,
  RequisitionPriority,
  RequisitionItem,
  RequisitionPackaging,
  RequisitionPackagingItem,
  PackagingType,
  PackagingSlotCost,
  CreateRequisitionData,
} from '@/types/requisitions';

/**
 * State transition result.
 */
export interface StateTransitionResult {
  success: boolean;
  from_status: string;
  to_status: string;
  error?: string;
  timestamp: string;
}

/**
 * Packaging computation result.
 */
export interface PackagingComputationResult {
  success: boolean;
  packaging?: {
    total_slot_demand: number;
    rounded_slot_demand: number;
    total_weight_kg: number;
    total_volume_m3: number;
    item_count: number;
  };
  error?: string;
}

/**
 * Valid state transitions.
 */
export type ValidTransition = {
  from: string;
  to: string;
  requires?: string[];
};
