/**
 * Map Access Control
 *
 * Role-based access control for map features
 * Phase 8: Governance & Scale
 *
 * Features:
 * - Role-based feature visibility
 * - Action permissions
 * - Map mode access control
 * - Layer visibility controls
 * - Audit logging integration
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * User roles
 */
export type UserRole = 'admin' | 'dispatcher' | 'planner' | 'analyst' | 'driver' | 'viewer';

/**
 * Map modes
 */
export type MapMode = 'planning' | 'operational' | 'forensic';

/**
 * Map actions
 */
export type MapAction =
  | 'view_map'
  | 'create_batch'
  | 'assign_vehicle'
  | 'approve_tradeoff'
  | 'reject_tradeoff'
  | 'draw_zone'
  | 'edit_zone'
  | 'delete_zone'
  | 'export_data'
  | 'view_analytics'
  | 'playback_history';

/**
 * Map layers
 */
export type MapLayerType =
  | 'vehicles'
  | 'drivers'
  | 'facilities'
  | 'warehouses'
  | 'zones'
  | 'routes'
  | 'batches'
  | 'alerts'
  | 'heatmap'
  | 'anomalies'
  | 'patterns';

/**
 * Access control entry
 */
export interface AccessControlEntry {
  role: UserRole;
  mapMode: MapMode;
  action: MapAction;
  allowed: boolean;
}

/**
 * Layer visibility entry
 */
export interface LayerVisibilityEntry {
  role: UserRole;
  layerType: MapLayerType;
  visible: boolean;
}

/**
 * User permissions
 */
export interface UserPermissions {
  role: UserRole;
  allowedModes: MapMode[];
  allowedActions: Record<MapMode, MapAction[]>;
  visibleLayers: Record<MapMode, MapLayerType[]>;
}

/**
 * Access control matrix
 * Defines what each role can do in each map mode
 */
const ACCESS_CONTROL_MATRIX: AccessControlEntry[] = [
  // Admin - Full access to everything
  { role: 'admin', mapMode: 'planning', action: 'view_map', allowed: true },
  { role: 'admin', mapMode: 'planning', action: 'create_batch', allowed: true },
  { role: 'admin', mapMode: 'planning', action: 'assign_vehicle', allowed: true },
  { role: 'admin', mapMode: 'planning', action: 'draw_zone', allowed: true },
  { role: 'admin', mapMode: 'planning', action: 'edit_zone', allowed: true },
  { role: 'admin', mapMode: 'planning', action: 'delete_zone', allowed: true },
  { role: 'admin', mapMode: 'planning', action: 'export_data', allowed: true },
  { role: 'admin', mapMode: 'operational', action: 'view_map', allowed: true },
  { role: 'admin', mapMode: 'operational', action: 'approve_tradeoff', allowed: true },
  { role: 'admin', mapMode: 'operational', action: 'reject_tradeoff', allowed: true },
  { role: 'admin', mapMode: 'operational', action: 'view_analytics', allowed: true },
  { role: 'admin', mapMode: 'operational', action: 'export_data', allowed: true },
  { role: 'admin', mapMode: 'forensic', action: 'view_map', allowed: true },
  { role: 'admin', mapMode: 'forensic', action: 'playback_history', allowed: true },
  { role: 'admin', mapMode: 'forensic', action: 'view_analytics', allowed: true },
  { role: 'admin', mapMode: 'forensic', action: 'export_data', allowed: true },

  // Dispatcher - Operational focus
  { role: 'dispatcher', mapMode: 'operational', action: 'view_map', allowed: true },
  { role: 'dispatcher', mapMode: 'operational', action: 'approve_tradeoff', allowed: true },
  { role: 'dispatcher', mapMode: 'operational', action: 'reject_tradeoff', allowed: true },
  { role: 'dispatcher', mapMode: 'operational', action: 'view_analytics', allowed: true },
  { role: 'dispatcher', mapMode: 'planning', action: 'view_map', allowed: true },
  { role: 'dispatcher', mapMode: 'planning', action: 'create_batch', allowed: false },
  { role: 'dispatcher', mapMode: 'forensic', action: 'view_map', allowed: true },
  { role: 'dispatcher', mapMode: 'forensic', action: 'playback_history', allowed: true },

  // Planner - Planning focus
  { role: 'planner', mapMode: 'planning', action: 'view_map', allowed: true },
  { role: 'planner', mapMode: 'planning', action: 'create_batch', allowed: true },
  { role: 'planner', mapMode: 'planning', action: 'assign_vehicle', allowed: true },
  { role: 'planner', mapMode: 'planning', action: 'draw_zone', allowed: true },
  { role: 'planner', mapMode: 'planning', action: 'edit_zone', allowed: true },
  { role: 'planner', mapMode: 'planning', action: 'export_data', allowed: true },
  { role: 'planner', mapMode: 'operational', action: 'view_map', allowed: true },
  { role: 'planner', mapMode: 'operational', action: 'approve_tradeoff', allowed: false },
  { role: 'planner', mapMode: 'forensic', action: 'view_map', allowed: true },

  // Analyst - Forensic focus
  { role: 'analyst', mapMode: 'forensic', action: 'view_map', allowed: true },
  { role: 'analyst', mapMode: 'forensic', action: 'playback_history', allowed: true },
  { role: 'analyst', mapMode: 'forensic', action: 'view_analytics', allowed: true },
  { role: 'analyst', mapMode: 'forensic', action: 'export_data', allowed: true },
  { role: 'analyst', mapMode: 'operational', action: 'view_map', allowed: true },
  { role: 'analyst', mapMode: 'operational', action: 'view_analytics', allowed: true },
  { role: 'analyst', mapMode: 'planning', action: 'view_map', allowed: true },

  // Driver - Limited operational view
  { role: 'driver', mapMode: 'operational', action: 'view_map', allowed: true },
  { role: 'driver', mapMode: 'operational', action: 'approve_tradeoff', allowed: false },
  { role: 'driver', mapMode: 'planning', action: 'view_map', allowed: false },
  { role: 'driver', mapMode: 'forensic', action: 'view_map', allowed: false },

  // Viewer - Read-only access to all modes
  { role: 'viewer', mapMode: 'planning', action: 'view_map', allowed: true },
  { role: 'viewer', mapMode: 'operational', action: 'view_map', allowed: true },
  { role: 'viewer', mapMode: 'forensic', action: 'view_map', allowed: true },
  { role: 'viewer', mapMode: 'forensic', action: 'playback_history', allowed: true },
  { role: 'viewer', mapMode: 'planning', action: 'create_batch', allowed: false },
  { role: 'viewer', mapMode: 'operational', action: 'approve_tradeoff', allowed: false },
];

/**
 * Layer visibility matrix
 * Defines which layers each role can see in each mode
 */
const LAYER_VISIBILITY_MATRIX: Record<UserRole, Record<MapMode, MapLayerType[]>> = {
  admin: {
    planning: ['facilities', 'warehouses', 'zones', 'batches', 'vehicles'],
    operational: ['vehicles', 'drivers', 'facilities', 'routes', 'batches', 'alerts', 'zones'],
    forensic: ['facilities', 'routes', 'heatmap', 'anomalies', 'patterns', 'zones'],
  },
  dispatcher: {
    planning: ['facilities', 'warehouses', 'batches'],
    operational: ['vehicles', 'drivers', 'facilities', 'routes', 'batches', 'alerts'],
    forensic: ['facilities', 'routes', 'heatmap'],
  },
  planner: {
    planning: ['facilities', 'warehouses', 'zones', 'batches', 'vehicles'],
    operational: ['vehicles', 'batches', 'facilities'],
    forensic: ['facilities', 'routes', 'heatmap'],
  },
  analyst: {
    planning: ['facilities', 'zones', 'batches'],
    operational: ['vehicles', 'routes', 'batches', 'alerts'],
    forensic: ['facilities', 'routes', 'heatmap', 'anomalies', 'patterns'],
  },
  driver: {
    planning: [],
    operational: ['facilities', 'routes'],
    forensic: [],
  },
  viewer: {
    planning: ['facilities', 'warehouses', 'zones'],
    operational: ['vehicles', 'facilities', 'routes'],
    forensic: ['facilities', 'routes', 'heatmap'],
  },
};

/**
 * Map Access Control Manager
 */
export class MapAccessControl {
  private currentUser: { id: string; role: UserRole } | null = null;

  /**
   * Set current user
   */
  async setCurrentUser(userId: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, role')
        .eq('id', userId)
        .single();

      if (error) throw error;

      this.currentUser = {
        id: data.id,
        role: data.role as UserRole,
      };
    } catch (err) {
      console.error('[MapAccessControl] Error setting current user:', err);
      this.currentUser = null;
    }
  }

  /**
   * Check if user can access a map mode
   */
  canAccessMode(mode: MapMode): boolean {
    if (!this.currentUser) return false;

    const entry = ACCESS_CONTROL_MATRIX.find(
      (e) => e.role === this.currentUser!.role && e.mapMode === mode && e.action === 'view_map'
    );

    return entry?.allowed || false;
  }

  /**
   * Check if user can perform an action
   */
  canPerformAction(mode: MapMode, action: MapAction): boolean {
    if (!this.currentUser) return false;

    const entry = ACCESS_CONTROL_MATRIX.find(
      (e) => e.role === this.currentUser!.role && e.mapMode === mode && e.action === action
    );

    return entry?.allowed || false;
  }

  /**
   * Get visible layers for user in a mode
   */
  getVisibleLayers(mode: MapMode): MapLayerType[] {
    if (!this.currentUser) return [];

    return LAYER_VISIBILITY_MATRIX[this.currentUser.role]?.[mode] || [];
  }

  /**
   * Check if layer is visible for user
   */
  isLayerVisible(mode: MapMode, layerType: MapLayerType): boolean {
    const visibleLayers = this.getVisibleLayers(mode);
    return visibleLayers.includes(layerType);
  }

  /**
   * Get user permissions
   */
  getUserPermissions(): UserPermissions | null {
    if (!this.currentUser) return null;

    const allowedModes: MapMode[] = [];
    const allowedActions: Record<MapMode, MapAction[]> = {
      planning: [],
      operational: [],
      forensic: [],
    };
    const visibleLayers = LAYER_VISIBILITY_MATRIX[this.currentUser.role];

    // Find allowed modes
    (['planning', 'operational', 'forensic'] as MapMode[]).forEach((mode) => {
      if (this.canAccessMode(mode)) {
        allowedModes.push(mode);

        // Find allowed actions for this mode
        ACCESS_CONTROL_MATRIX.forEach((entry) => {
          if (
            entry.role === this.currentUser!.role &&
            entry.mapMode === mode &&
            entry.allowed &&
            entry.action !== 'view_map'
          ) {
            allowedActions[mode].push(entry.action);
          }
        });
      }
    });

    return {
      role: this.currentUser.role,
      allowedModes,
      allowedActions,
      visibleLayers,
    };
  }

  /**
   * Log access attempt (for audit)
   */
  async logAccessAttempt(
    mode: MapMode,
    action: MapAction,
    allowed: boolean,
    metadata?: Record<string, any>
  ): Promise<void> {
    if (!this.currentUser) return;

    try {
      await supabase.from('map_access_log').insert({
        user_id: this.currentUser.id,
        user_role: this.currentUser.role,
        map_mode: mode,
        action,
        allowed,
        metadata,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[MapAccessControl] Error logging access:', err);
    }
  }

  /**
   * Get current user role
   */
  getCurrentRole(): UserRole | null {
    return this.currentUser?.role || null;
  }

  /**
   * Clear current user
   */
  clearUser(): void {
    this.currentUser = null;
  }
}

/**
 * Singleton instance
 */
export const mapAccessControl = new MapAccessControl();

/**
 * React hook for map access control
 */
export function useMapAccessControl(mode: MapMode) {
  const canAccess = mapAccessControl.canAccessMode(mode);
  const visibleLayers = mapAccessControl.getVisibleLayers(mode);
  const permissions = mapAccessControl.getUserPermissions();

  const canPerformAction = (action: MapAction) => {
    return mapAccessControl.canPerformAction(mode, action);
  };

  const isLayerVisible = (layerType: MapLayerType) => {
    return mapAccessControl.isLayerVisible(mode, layerType);
  };

  return {
    canAccess,
    visibleLayers,
    permissions,
    canPerformAction,
    isLayerVisible,
  };
}
