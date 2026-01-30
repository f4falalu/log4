/**
 * =====================================================
 * @deprecated - Use @/fleetops/payload instead
 * =====================================================
 *
 * This file is deprecated and will be removed in a future version.
 * All slot-related logic has been moved to the FleetOps Payload module.
 *
 * Migration:
 *   import { ... } from '@/fleetops/payload';
 */

// Re-export from new location for backward compatibility
export {
  // Types
  type VehicleSlot,
  type SlotAssignment,
  type VehicleCapacity as Vehicle,
  type SlotUtilization,
  type SlotValidationResult as ValidationResult,

  // Functions
  generateVehicleSlotMap,
  getAvailableSlots,
  getOccupiedSlots,
  getSlotsByTier,
  getSlotUtilization,
  validateSlotAssignment,
  validateBatchCapacity,
  findSlotConflicts,
  generateSlotKey,
  parseSlotKey,
  getTierNameFromSlotKey,
  getVehicleIdFromSlotKey,
} from '@/fleetops/payload';
