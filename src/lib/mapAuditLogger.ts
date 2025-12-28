/**
 * Map Action Audit Logger
 *
 * Centralized logging for all map system actions
 * Logs to map_action_audit table for compliance and forensics
 */

import { supabase } from '@/integrations/supabase/client';

export type MapCapability = 'operational' | 'planning' | 'forensics';
export type MapActionType =
  | 'create_zone'
  | 'edit_zone'
  | 'activate_zone'
  | 'deactivate_zone'
  | 'delete_zone'
  | 'create_route_sketch'
  | 'edit_route_sketch'
  | 'activate_route_sketch'
  | 'delete_route_sketch'
  | 'create_tradeoff'
  | 'confirm_tradeoff'
  | 'reject_tradeoff'
  | 'cancel_tradeoff'
  | 'complete_tradeoff'
  | 'assign_facility'
  | 'measure_distance'
  | 'view_forensics'
  | 'export_data';

export type MapEntityType = 'zone' | 'route' | 'tradeoff' | 'facility_assignment' | 'measurement';

export interface MapAuditLogEntry {
  workspace_id: string;
  user_id: string | null;
  action_type: MapActionType;
  capability: MapCapability;
  entity_type?: MapEntityType;
  entity_id?: string;
  old_data?: Record<string, any>;
  new_data?: Record<string, any>;
  action_location?: { lat: number; lng: number };
  success?: boolean;
  error_message?: string;
  metadata?: Record<string, any>;
}

/**
 * Log a map action to the audit table
 */
export async function logMapAction(entry: MapAuditLogEntry): Promise<void> {
  try {
    // Get current user if not provided
    let userId = entry.user_id;
    if (!userId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    // Convert action_location to PostGIS Point if provided
    const actionLocation = entry.action_location
      ? `POINT(${entry.action_location.lng} ${entry.action_location.lat})`
      : null;

    const { error } = await supabase.from('map_action_audit').insert([
      {
        workspace_id: entry.workspace_id,
        user_id: userId,
        action_type: entry.action_type,
        capability: entry.capability,
        entity_type: entry.entity_type || null,
        entity_id: entry.entity_id || null,
        old_data: entry.old_data || null,
        new_data: entry.new_data || null,
        action_location: actionLocation,
        success: entry.success !== undefined ? entry.success : true,
        error_message: entry.error_message || null,
        metadata: entry.metadata || {},
      },
    ]);

    if (error) {
      console.error('[MapAuditLogger] Failed to log action:', error);
      // Don't throw - audit logging should not block operations
    }
  } catch (error) {
    console.error('[MapAuditLogger] Exception during logging:', error);
    // Silent fail - audit logging should not block operations
  }
}

/**
 * Log a successful zone action
 */
export async function logZoneAction(params: {
  workspaceId: string;
  actionType: 'create_zone' | 'edit_zone' | 'activate_zone' | 'deactivate_zone' | 'delete_zone';
  zoneId?: string;
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  metadata?: Record<string, any>;
}): Promise<void> {
  await logMapAction({
    workspace_id: params.workspaceId,
    user_id: null, // Will be auto-fetched
    action_type: params.actionType,
    capability: 'planning',
    entity_type: 'zone',
    entity_id: params.zoneId,
    old_data: params.oldData,
    new_data: params.newData,
    success: true,
    metadata: params.metadata,
  });
}

/**
 * Log a successful route sketch action
 */
export async function logRouteSketchAction(params: {
  workspaceId: string;
  actionType: 'create_route_sketch' | 'edit_route_sketch' | 'activate_route_sketch' | 'delete_route_sketch';
  routeId?: string;
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  metadata?: Record<string, any>;
}): Promise<void> {
  await logMapAction({
    workspace_id: params.workspaceId,
    user_id: null, // Will be auto-fetched
    action_type: params.actionType,
    capability: 'planning',
    entity_type: 'route',
    entity_id: params.routeId,
    old_data: params.oldData,
    new_data: params.newData,
    success: true,
    metadata: params.metadata,
  });
}

/**
 * Log a Trade-Off action
 */
export async function logTradeOffAction(params: {
  workspaceId: string;
  actionType: 'create_tradeoff' | 'confirm_tradeoff' | 'reject_tradeoff' | 'cancel_tradeoff' | 'complete_tradeoff';
  tradeoffId?: string;
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  handoverLocation?: { lat: number; lng: number };
  metadata?: Record<string, any>;
}): Promise<void> {
  await logMapAction({
    workspace_id: params.workspaceId,
    user_id: null, // Will be auto-fetched
    action_type: params.actionType,
    capability: 'operational',
    entity_type: 'tradeoff',
    entity_id: params.tradeoffId,
    old_data: params.oldData,
    new_data: params.newData,
    action_location: params.handoverLocation,
    success: true,
    metadata: params.metadata,
  });
}

/**
 * Log a facility assignment action
 */
export async function logFacilityAssignmentAction(params: {
  workspaceId: string;
  assignmentId?: string;
  facilityId: string;
  zoneId: string;
  assignmentType: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  await logMapAction({
    workspace_id: params.workspaceId,
    user_id: null, // Will be auto-fetched
    action_type: 'assign_facility',
    capability: 'planning',
    entity_type: 'facility_assignment',
    entity_id: params.assignmentId,
    new_data: {
      facility_id: params.facilityId,
      zone_id: params.zoneId,
      assignment_type: params.assignmentType,
    },
    success: true,
    metadata: params.metadata,
  });
}

/**
 * Log a forensics query action
 */
export async function logForensicsQuery(params: {
  workspaceId: string;
  queryType: 'route_comparison' | 'heatmap' | 'tradeoff_history';
  timeRange?: { start: Date; end: Date };
  filters?: Record<string, any>;
  resultsCount?: number;
  executionTimeMs?: number;
}): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from('forensics_query_log').insert([
      {
        workspace_id: params.workspaceId,
        user_id: user?.id || null,
        query_type: params.queryType,
        time_range_start: params.timeRange?.start.toISOString() || null,
        time_range_end: params.timeRange?.end.toISOString() || null,
        filters: params.filters || {},
        results_count: params.resultsCount || null,
        execution_time_ms: params.executionTimeMs || null,
      },
    ]);

    if (error) {
      console.error('[MapAuditLogger] Failed to log forensics query:', error);
    }
  } catch (error) {
    console.error('[MapAuditLogger] Exception during forensics logging:', error);
  }
}

/**
 * Log an error during a map action
 */
export async function logMapActionError(params: {
  workspaceId: string;
  actionType: MapActionType;
  capability: MapCapability;
  entityType?: MapEntityType;
  entityId?: string;
  errorMessage: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  await logMapAction({
    workspace_id: params.workspaceId,
    user_id: null, // Will be auto-fetched
    action_type: params.actionType,
    capability: params.capability,
    entity_type: params.entityType,
    entity_id: params.entityId,
    success: false,
    error_message: params.errorMessage,
    metadata: params.metadata,
  });
}
