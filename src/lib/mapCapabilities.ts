/**
 * Map Capability Permission Matrix
 *
 * Defines what each map capability mode can and cannot do.
 * This is the foundation for capability-based access control across all map modes.
 *
 * Core Principle: Same components, different capabilities.
 * No map mode has unique components - modes differ only by enabled tools,
 * allowed actions, and data access patterns.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Layout tier - Visual presentation mode
 */
export type MapLayout = 'fullscreen' | 'embedded' | 'dashboard';

/**
 * Capability tier - What the user can do
 */
export type MapCapability =
  | 'operational'    // Live execution control
  | 'planning'       // Spatial rule definition
  | 'forensics'      // Historical analysis
  | 'overview'       // Executive visibility (Phase 2)
  | 'simulation';    // What-if sandbox (Phase 3)

/**
 * Time tier - Data temporal context
 */
export type MapTimeHorizon = 'past' | 'present' | 'future' | 'sandbox';

/**
 * Data access modes - What can be written
 */
export type DataAccessMode =
  | 'readonly'          // No writes allowed (Forensics, Overview)
  | 'writeExceptions'   // Can write exceptions and initiate Trade-Offs (Operational)
  | 'writeConfig'       // Can write draft configurations (Planning)
  | 'writeSandbox';     // Can write to sandbox only (Simulation)

/**
 * Capability rules definition
 */
export interface CapabilityRules {
  /** Layers that can be displayed */
  allowedLayers: string[];

  /** Tools that can be used */
  allowedTools: string[];

  /** Actions that can be performed */
  allowedActions: string[];

  /** Actions that are explicitly forbidden (non-negotiable) */
  forbiddenActions: string[];

  /** Data access mode */
  dataAccess: DataAccessMode;

  /** Time horizon for data */
  timeHorizon: MapTimeHorizon;

  /** Human-readable description */
  description: string;
}

// ============================================================================
// CAPABILITY PERMISSION MATRIX
// ============================================================================

/**
 * CAPABILITY_MATRIX
 *
 * The single source of truth for what each map capability can and cannot do.
 * All map components must check this matrix before enabling features.
 *
 * CRITICAL PHASE 1 GUARDRAILS:
 * - Trade-Off is the ONLY reassignment mechanism in Operational mode
 * - NO auto-matching, NO optimization, NO AI decisioning
 * - Planning outputs are draft by default (active=false)
 * - Forensics is immutable (NO retroactive edits)
 */
export const CAPABILITY_MATRIX: Record<MapCapability, CapabilityRules> = {
  // ==========================================================================
  // OPERATIONAL MAP - Live Execution Control
  // ==========================================================================
  operational: {
    description: 'Live execution control with Trade-Off workflow',

    allowedLayers: [
      'vehicles',
      'drivers',
      'facilities',
      'routes',
      'batches',
      'alerts',
      'exceptions',
      'tradeoffs',
    ],

    allowedTools: [
      'inspect',              // View entity details
      'exception_handling',   // Exception workflow triggers
      'tradeoff_initiator',   // Trade-Off workflow (ONLY reassignment mechanism)
    ],

    allowedActions: [
      'view_vehicle',
      'view_driver',
      'view_load',
      'view_batch',
      'view_route',
      'trigger_exception',              // Create exception record
      'initiate_tradeoff',              // Start Trade-Off workflow (ONLY reassignment)
      'select_receiving_vehicles',      // Manual selection in Trade-Off
      'allocate_tradeoff_items',        // Item-level allocation in Trade-Off
      'view_tradeoff_status',           // Monitor Trade-Off confirmations
      'confirm_tradeoff',               // Driver confirmation of Trade-Off
      'cancel_tradeoff',                // Cancel pending Trade-Off
      'view_exception_details',
      'escalate_exception',
      'mark_exception_resolved',
    ],

    forbiddenActions: [
      'edit_zones',                     // Planning mode only
      'measure_distance',               // Planning mode only
      'auto_match_vehicles',            // Explicitly forbidden in Phase 1
      'optimize_routes',                // Explicitly forbidden in Phase 1
      'generic_reassignment',           // Trade-Off is the ONLY mechanism
      'edit_routes',                    // Not allowed in operational
      'edit_batches',                   // Not allowed in operational
      'playback_history',               // Forensics mode only
      'edit_historical_data',           // Explicitly forbidden always
      'auto_select_vehicles',           // Explicitly forbidden in Phase 1
      'ai_decisioning',                 // Explicitly forbidden in Phase 1
    ],

    dataAccess: 'writeExceptions',
    timeHorizon: 'present',
  },

  // ==========================================================================
  // PLANNING MAP - Spatial Configuration
  // ==========================================================================
  planning: {
    description: 'Spatial configuration with draft → review → activate workflow',

    allowedLayers: [
      'facilities',
      'zones',
      'routes',
      'warehouses',
      'admin_boundaries',
    ],

    allowedTools: [
      'measure_distance',     // Distance measurement tool
      'geofencing',           // Geofence drawing
      'zone_editor',          // Zone boundary editing
      'route_sketch',         // Non-binding route sketching
      'configuration_review', // Draft review interface
    ],

    allowedActions: [
      'draft_zones',                    // Creates inactive draft (active=false)
      'edit_zone_boundaries',
      'assign_facilities_to_zones',
      'measure',                        // Distance/area measurement
      'sketch_routes',                  // Non-binding route previews
      'save_draft_configuration',       // Saves with active=false
      'review_configuration',           // Review draft before activation
      'activate_configuration',         // Explicit activation (role-gated)
      'version_configuration',          // Create new version
      'set_effective_date',             // Set when config takes effect
      'compare_draft_to_active',        // Diff viewer
    ],

    forbiddenActions: [
      'trigger_dispatch',               // Operational mode only
      'control_vehicles',               // Operational mode only
      'immediate_config_application',   // Explicitly forbidden - must go through activate
      'silent_overwrites',              // Explicitly forbidden - versioning required
      'edit_live_dispatches',           // Explicitly forbidden
      'edit_active_routes',             // Explicitly forbidden
      'auto_optimize',                  // Explicitly forbidden in Phase 1
      'playback_history',               // Forensics mode only
    ],

    dataAccess: 'writeConfig',
    timeHorizon: 'future',
  },

  // ==========================================================================
  // FORENSICS MAP - Historical Analysis
  // ==========================================================================
  forensics: {
    description: 'Immutable historical analysis with audit logging',

    allowedLayers: [
      'vehicles',
      'routes',
      'batches',
      'facilities',
      'zones',
      'tradeoffs',
      'exceptions',
      'performance_heatmaps',
    ],

    allowedTools: [
      'timeline_scrubber',          // Time-based playback
      'overlay_comparison',         // Planned vs actual comparison
      'heatmaps',                   // Performance visualization
      'tradeoff_lineage_viewer',    // Trade-Off history visualization
      'route_comparison',           // Side-by-side route comparison
    ],

    allowedActions: [
      'replay',                         // Playback historical data
      'scrub_timeline',                 // Navigate through time
      'compare_routes',                 // Planned vs actual overlay
      'analyze_performance',            // SLA, metrics analysis
      'view_tradeoff_history',          // Historical Trade-Offs
      'view_tradeoff_lineage',          // Trade-Off dispatch lineage
      'export_forensics_report',        // Export analysis data
      'view_exception_history',
      'generate_heatmap',
      'filter_by_date_range',
    ],

    forbiddenActions: [
      'edit_any_data',                  // Explicitly forbidden - immutable
      'redispatch',                     // Explicitly forbidden - no retroactive changes
      'correct_history',                // Explicitly forbidden - history is truth
      'fix_routes',                     // Explicitly forbidden - accept imperfect data
      'modify_timestamps',              // Explicitly forbidden
      'delete_historical_records',      // Explicitly forbidden
      'trigger_dispatch',               // Operational mode only
      'edit_zones',                     // Planning mode only
    ],

    dataAccess: 'readonly',
    timeHorizon: 'past',
  },

  // ==========================================================================
  // OVERVIEW MAP - Executive Visibility (Phase 2)
  // ==========================================================================
  overview: {
    description: 'Executive and donor visibility - aggregated read-only view',

    allowedLayers: [
      'facilities',
      'zones',
      'heatmaps',
      'coverage_areas',
      'admin_boundaries',
    ],

    allowedTools: [
      'filters',              // Program/state/donor filters
      'aggregations',         // Data aggregation views
    ],

    allowedActions: [
      'view_aggregates',
      'filter_by_program',
      'filter_by_state',
      'filter_by_donor',
      'export_reports',
      'view_coverage_maps',
      'view_delivery_density',
      'view_sla_performance',
    ],

    forbiddenActions: [
      'edit_any_data',                  // Read-only mode
      'trigger_dispatch',               // Not allowed
      'edit_zones',                     // Not allowed
      'drill_down_to_details',          // Explicitly forbidden - aggregates only
    ],

    dataAccess: 'readonly',
    timeHorizon: 'present',
  },

  // ==========================================================================
  // SIMULATION MAP - What-If Sandbox (Phase 3)
  // ==========================================================================
  simulation: {
    description: 'Sandbox environment for what-if scenario testing',

    allowedLayers: [
      'vehicles',
      'routes',
      'zones',
      'facilities',
      'scenarios',
    ],

    allowedTools: [
      'scenario_cloner',      // Clone production scenarios
      'zone_editor',          // Sandbox zone editing
      'vehicle_mixer',        // Test different vehicle mixes
      'route_optimizer',      // Preview optimization (sandbox only)
    ],

    allowedActions: [
      'clone_scenario',
      'edit_sandbox',
      'preview_optimization',
      'test_vehicle_mix',
      'simulate_dispatch',
      'compare_scenarios',
      'export_scenario_results',
    ],

    forbiddenActions: [
      'apply_to_production',            // Explicitly forbidden - sandbox only
      'auto_apply_optimizations',       // Explicitly forbidden
      'silent_production_writes',       // Explicitly forbidden
    ],

    dataAccess: 'writeSandbox',
    timeHorizon: 'sandbox',
  },
};

// ============================================================================
// CAPABILITY METADATA
// ============================================================================

/**
 * Capability icons for UI display
 */
export const CAPABILITY_ICONS: Record<MapCapability, string> = {
  operational: 'radio',
  planning: 'map-pin',
  forensics: 'history',
  overview: 'eye',
  simulation: 'flask',
};

/**
 * Capability labels for UI display
 */
export const CAPABILITY_LABELS: Record<MapCapability, string> = {
  operational: 'Operational',
  planning: 'Planning',
  forensics: 'Forensics',
  overview: 'Overview',
  simulation: 'Simulation',
};

/**
 * Capability colors for UI theming
 */
export const CAPABILITY_COLORS: Record<MapCapability, string> = {
  operational: 'blue',
  planning: 'green',
  forensics: 'purple',
  overview: 'gray',
  simulation: 'orange',
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if an action is allowed for a given capability
 */
export function isActionAllowed(
  capability: MapCapability,
  action: string
): boolean {
  const rules = CAPABILITY_MATRIX[capability];

  // First check if explicitly forbidden
  if (rules.forbiddenActions.includes(action)) {
    return false;
  }

  // Then check if explicitly allowed
  return rules.allowedActions.includes(action);
}

/**
 * Check if a layer is allowed for a given capability
 */
export function isLayerAllowed(
  capability: MapCapability,
  layer: string
): boolean {
  const rules = CAPABILITY_MATRIX[capability];
  return rules.allowedLayers.includes(layer);
}

/**
 * Check if a tool is allowed for a given capability
 */
export function isToolAllowed(
  capability: MapCapability,
  tool: string
): boolean {
  const rules = CAPABILITY_MATRIX[capability];
  return rules.allowedTools.includes(tool);
}

/**
 * Get all forbidden actions for a capability (for debugging/validation)
 */
export function getForbiddenActions(capability: MapCapability): string[] {
  return CAPABILITY_MATRIX[capability].forbiddenActions;
}

/**
 * Get data access mode for a capability
 */
export function getDataAccessMode(capability: MapCapability): DataAccessMode {
  return CAPABILITY_MATRIX[capability].dataAccess;
}

/**
 * Check if capability allows write access
 */
export function canWrite(capability: MapCapability): boolean {
  const mode = getDataAccessMode(capability);
  return mode !== 'readonly';
}

/**
 * Get time horizon for a capability
 */
export function getTimeHorizon(capability: MapCapability): MapTimeHorizon {
  return CAPABILITY_MATRIX[capability].timeHorizon;
}
