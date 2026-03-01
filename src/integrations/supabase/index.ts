// MOD4 Supabase Integration
// Re-export client and types for easy imports

export { supabase, getCurrentUser, getCurrentSession } from './client';
export type {
  Database,
  Json,
  Driver,
  DriverInsert,
  DriverUpdate,
  DeliveryAssignment,
  DeliveryAssignmentInsert,
  DeliveryAssignmentUpdate,
  DriverLocation,
  DriverLocationInsert,
  DriverEvent,
  DriverEventInsert,
} from './types';
