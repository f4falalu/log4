/**
 * =====================================================
 * Zod Validation Schemas for Scheduler Feature
 * =====================================================
 */

import { z } from 'zod';

// =====================================================
// ENUM SCHEMAS
// =====================================================

export const schedulerBatchStatusSchema = z.enum([
  'draft',
  'ready',
  'scheduled',
  'published',
  'cancelled',
]);

export const schedulingModeSchema = z.enum([
  'manual',
  'ai_optimized',
  'uploaded',
  'template',
]);

export const timeWindowSchema = z.enum([
  'morning',
  'afternoon',
  'evening',
  'all_day',
]);

export const prioritySchema = z.enum([
  'low',
  'medium',
  'high',
  'urgent',
]);

export const zoneSchema = z.enum([
  'North',
  'South',
  'East',
  'West',
  'Central',
]);

export const schedulerViewSchema = z.enum([
  'map',
  'calendar',
  'list',
  'kanban',
]);

export const recurrenceTypeSchema = z.enum([
  'daily',
  'weekly',
  'monthly',
  'custom',
]);

export const timeWindowModeSchema = z.enum([
  'strict',
  'flexible',
]);

export const priorityWeightSchema = z.enum([
  'low',
  'medium',
  'high',
]);

// =====================================================
// CORE MODEL SCHEMAS
// =====================================================

export const routePointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  facility_id: z.string().uuid(),
  sequence: z.number().int().min(0),
  eta: z.string().datetime().optional(),
  distance_from_previous: z.number().min(0).optional(),
});

export const priorityWeightsSchema = z.object({
  distance: priorityWeightSchema,
  duration: priorityWeightSchema,
  cost: priorityWeightSchema,
});

export const vehicleConstraintsSchema = z.object({
  type: z.string().optional(),
  capacity_min: z.number().min(0).optional(),
  capacity_max: z.number().min(0).optional(),
});

// =====================================================
// CREATE SCHEDULER BATCH SCHEMA
// =====================================================

export const createSchedulerBatchSchema = z.object({
  name: z.string().min(1, 'Batch name is required').max(255).optional(),
  warehouse_id: z.string().uuid('Valid warehouse is required'),
  facility_ids: z.array(z.string().uuid()).min(1, 'At least one facility is required'),
  planned_date: z.string().refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }, 'Valid date is required'),
  time_window: timeWindowSchema.optional(),
  driver_id: z.string().uuid().nullable().optional(),
  vehicle_id: z.string().uuid().nullable().optional(),
  scheduling_mode: schedulingModeSchema.optional(),
  priority: prioritySchema.default('medium'),
  notes: z.string().max(2000).optional(),
  tags: z.array(z.string().max(50)).optional(),
  zone: zoneSchema.optional(),
});

export type CreateSchedulerBatchInput = z.infer<typeof createSchedulerBatchSchema>;

// =====================================================
// UPDATE SCHEDULER BATCH SCHEMA
// =====================================================

export const updateSchedulerBatchSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  facility_ids: z.array(z.string().uuid()).min(1).optional(),
  planned_date: z.string().optional(),
  time_window: timeWindowSchema.optional(),
  driver_id: z.string().uuid().nullable().optional(),
  vehicle_id: z.string().uuid().nullable().optional(),
  status: schedulerBatchStatusSchema.optional(),
  priority: prioritySchema.optional(),
  notes: z.string().max(2000).optional(),
  tags: z.array(z.string().max(50)).optional(),
});

export type UpdateSchedulerBatchInput = z.infer<typeof updateSchedulerBatchSchema>;

// =====================================================
// OPTIMIZATION PARAMS SCHEMA
// =====================================================

export const optimizationParamsSchema = z.object({
  warehouse_id: z.string().uuid('Valid warehouse is required'),
  facility_ids: z.array(z.string().uuid()).min(1, 'At least one facility is required'),
  capacity_threshold: z.number().min(0).max(150).default(90),
  time_window_mode: timeWindowModeSchema.default('flexible'),
  priority_weights: priorityWeightsSchema.default({
    distance: 'high',
    duration: 'medium',
    cost: 'low',
  }),
  vehicle_constraints: vehicleConstraintsSchema.optional(),
});

export type OptimizationParamsInput = z.infer<typeof optimizationParamsSchema>;

// =====================================================
// SCHEDULE TEMPLATE SCHEMA
// =====================================================

export const createScheduleTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(255),
  description: z.string().max(1000).optional(),
  warehouse_id: z.string().uuid().nullable().optional(),
  facility_ids: z.array(z.string().uuid()).min(1, 'At least one facility is required'),
  recurrence_type: recurrenceTypeSchema.optional(),
  recurrence_days: z.array(z.number().int().min(0).max(6)).optional(),
  time_window: timeWindowSchema.optional(),
  default_driver_id: z.string().uuid().nullable().optional(),
  default_vehicle_id: z.string().uuid().nullable().optional(),
  auto_schedule: z.boolean().default(false),
  active: z.boolean().default(true),
  priority: prioritySchema.default('medium'),
});

export type CreateScheduleTemplateInput = z.infer<typeof createScheduleTemplateSchema>;

// =====================================================
// FILE UPLOAD VALIDATION SCHEMA
// =====================================================

export const dispatchRowSchema = z.object({
  facility_id: z.string().min(1, 'Facility ID is required'),
  address: z.string().min(1, 'Address is required'),
  order_volume: z.number().min(0).nullable().optional(),
  time_window: z.string().regex(/^\d{1,2}(am|pm)\s*-\s*\d{1,2}(am|pm)$/i, 'Invalid time window format (e.g., "9am-12pm")').nullable().optional(),
  priority: prioritySchema.nullable().optional(),
  special_requirements: z.string().max(500).nullable().optional(),
});

export type DispatchRowInput = z.infer<typeof dispatchRowSchema>;

export const uploadedDispatchDataSchema = z.object({
  file_name: z.string(),
  rows: z.array(dispatchRowSchema),
});

export type UploadedDispatchDataInput = z.infer<typeof uploadedDispatchDataSchema>;

// =====================================================
// BATCH ASSIGNMENT SCHEMA (Wizard)
// =====================================================

export const batchAssignmentSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Batch name is required'),
  facility_ids: z.array(z.string().uuid()).min(1, 'At least one facility is required'),
  driver_id: z.string().uuid('Driver is required'),
  vehicle_id: z.string().uuid('Vehicle is required'),
  total_consignments: z.number().int().min(1),
});

export type BatchAssignmentInput = z.infer<typeof batchAssignmentSchema>;

// =====================================================
// PUBLISH TO FLEETOPS SCHEMA
// =====================================================

export const publishToFleetOpsSchema = z.object({
  scheduler_batch_ids: z.array(z.string().uuid()).min(1, 'Select at least one batch to publish'),
});

export type PublishToFleetOpsInput = z.infer<typeof publishToFleetOpsSchema>;

// =====================================================
// SCHEDULER FILTERS SCHEMA
// =====================================================

export const schedulerFiltersSchema = z.object({
  status: z.array(schedulerBatchStatusSchema).optional(),
  warehouse_id: z.string().uuid().optional(),
  zone: z.array(zoneSchema).optional(),
  date_range: z.object({
    from: z.string(),
    to: z.string(),
  }).optional(),
  driver_id: z.string().uuid().optional(),
  vehicle_id: z.string().uuid().optional(),
  search: z.string().optional(),
  priority: z.array(prioritySchema).optional(),
});

export type SchedulerFiltersInput = z.infer<typeof schedulerFiltersSchema>;

// =====================================================
// SCHEDULER SETTINGS SCHEMA
// =====================================================

export const schedulerSettingsSchema = z.object({
  default_warehouse_id: z.string().uuid().nullable().optional(),
  default_capacity_threshold: z.number().min(0).max(150).default(90),
  default_time_window: timeWindowSchema.default('all_day'),
  default_view: schedulerViewSchema.default('map'),
  show_zones: z.boolean().default(true),
  auto_cluster_enabled: z.boolean().default(true),
  notify_on_optimization_complete: z.boolean().default(true),
  notify_on_publish: z.boolean().default(true),
});

export type SchedulerSettingsInput = z.infer<typeof schedulerSettingsSchema>;

// =====================================================
// VALIDATION HELPER FUNCTIONS
// =====================================================

/**
 * Validate data against a schema and return typed result
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Format Zod errors for display
 */
export function formatZodErrors(error: z.ZodError): Array<{ field: string; message: string }> {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));
}

/**
 * Validate date is not in the past
 */
export function validateFutureDate(date: string): boolean {
  const parsed = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parsed >= today;
}

/**
 * Validate time window format
 */
export function parseTimeWindow(timeWindow: string): { start: number; end: number } | null {
  const match = timeWindow.match(/^(\d{1,2})(am|pm)\s*-\s*(\d{1,2})(am|pm)$/i);
  if (!match) return null;

  const startHour = parseInt(match[1]);
  const startPeriod = match[2].toLowerCase();
  const endHour = parseInt(match[3]);
  const endPeriod = match[4].toLowerCase();

  const start = startPeriod === 'pm' && startHour !== 12 ? startHour + 12 : startHour;
  const end = endPeriod === 'pm' && endHour !== 12 ? endHour + 12 : endHour;

  return { start, end };
}
