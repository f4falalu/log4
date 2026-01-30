/**
 * =====================================================
 * @deprecated - Use @/fleetops/payload instead
 * =====================================================
 *
 * This file is deprecated and will be removed in a future version.
 * All slot assignment logic has been moved to the FleetOps Payload module.
 *
 * Migration:
 *   import { ... } from '@/fleetops/payload';
 */

// Re-export from new location for backward compatibility
export {
  // Types
  type AssignableFacility as Facility,
  type AssignmentRule,
  type AssignmentOptions,
  type AssignmentResult,

  // Functions
  autoAssignFacilitiesToSlots,
  optimizeSlotAssignment,
  detectSlotConflicts,
  suggestOptimalVehicle,
  getAssignmentStats,
} from '@/fleetops/payload';
