import { z } from 'zod';
import type { 
  VehicleType, 
  FuelType, 
  TransmissionType, 
  VehicleStatus, 
  AcquisitionType,
  AssignmentType
} from '@/types/vlms';

// Define string literals for validation
const VEHICLE_TYPES = ['sedan', 'suv', 'truck', 'van', 'motorcycle', 'bus', 'other'] as const;
const FUEL_TYPES = ['gasoline', 'diesel', 'electric', 'hybrid', 'cng', 'lpg'] as const;
const TRANSMISSION_TYPES = ['automatic', 'manual', 'cvt', 'dct'] as const;
const VEHICLE_STATUSES = ['available', 'in_use', 'maintenance', 'out_of_service', 'disposed'] as const;
const ACQUISITION_TYPES = ['purchase', 'lease', 'donation', 'transfer'] as const;
const ASSIGNMENT_TYPES = ['permanent', 'temporary', 'pool', 'project'] as const;

// Base vehicle schema
export const vehicleSchema = z.object({
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  year: z.number().min(1900).max(new Date().getFullYear() + 1),
  vin: z.string().optional(),
  license_plate: z.string().min(1, 'License plate is required'),
  vehicle_type: z.enum(VEHICLE_TYPES, {
    errorMap: () => ({ message: 'Please select a valid vehicle type' }),
  }),
  fuel_type: z.enum(FUEL_TYPES, {
    errorMap: () => ({ message: 'Please select a valid fuel type' }),
  }),
  transmission: z.enum(TRANSMISSION_TYPES, {
    errorMap: () => ({ message: 'Please select a valid transmission type' }),
  }).optional(),
  engine_capacity: z.number().positive().optional(),
  color: z.string().optional(),
  seating_capacity: z.number().int().positive().optional(),
  cargo_capacity: z.number().positive().optional(),
  acquisition_date: z.string().min(1, 'Acquisition date is required'),
  acquisition_type: z.enum(ACQUISITION_TYPES, {
    errorMap: () => ({ message: 'Please select a valid acquisition type' }),
  }),
  purchase_price: z.number().nonnegative().optional(),
  vendor_name: z.string().optional(),
  warranty_expiry: z.string().optional(),
  status: z.enum(VEHICLE_STATUSES, {
    errorMap: () => ({ message: 'Please select a valid status' }),
  }),
  current_location_id: z.string().optional(),
  current_driver_id: z.string().optional(),
  current_mileage: z.number().nonnegative().optional(),
  insurance_provider: z.string().optional(),
  insurance_policy_number: z.string().optional(),
  insurance_expiry: z.string().optional(),
  registration_expiry: z.string().optional(),
  depreciation_rate: z.number().min(0).max(100).optional(),
  current_book_value: z.number().nonnegative().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// Assignment schema
export const assignmentSchema = z.object({
  vehicle_id: z.string().min(1, 'Vehicle is required'),
  assigned_to_id: z.string().optional(),
  assigned_location_id: z.string().optional(),
  assignment_type: z.enum(ASSIGNMENT_TYPES, {
    errorMap: () => ({ message: 'Please select a valid assignment type' }),
  }),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional(),
  purpose: z.string().min(1, 'Purpose is required'),
  project_name: z.string().optional(),
  authorization_number: z.string().optional(),
  authorized_by_id: z.string().optional(),
  odometer_start: z.number().nonnegative().optional(),
  fuel_level_start: z.number().min(0).max(100).optional(),
  condition_start: z.string().optional(),
  notes: z.string().optional(),
});

// Type exports
export type VehicleFormData = z.infer<typeof vehicleSchema>;
export type AssignmentFormData = z.infer<typeof assignmentSchema>;
