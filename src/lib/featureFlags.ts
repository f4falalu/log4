/**
 * Feature Flags System
 *
 * Centralized feature flag management for gradual rollouts and A/B testing
 * Use environment variables to control feature availability
 */

export const FEATURE_FLAGS = {
  /**
   * Vehicle Consolidation Migration
   *
   * When enabled: Uses vehicles_unified_v view (consolidated data)
   * When disabled: Uses original vehicles table
   *
   * Enable this flag after:
   * 1. Running all migration scripts successfully
   * 2. Validating data integrity in staging
   * 3. Verifying all vehicle operations work correctly
   *
   * @default false
   */
  VEHICLE_CONSOLIDATION:
    import.meta.env.VITE_VEHICLE_CONSOLIDATION === 'true',

  /**
   * Enhanced Telemetry
   *
   * Use telematics_provider and telematics_id fields from consolidated schema
   *
   * @default false (uses legacy telematics mapping)
   */
  ENHANCED_TELEMETRY:
    import.meta.env.VITE_ENHANCED_TELEMETRY === 'true',

  /**
   * MapLibre Maps (Phase 2)
   *
   * When enabled: Uses MapLibre GL JS (new map engine)
   * When disabled: Uses Leaflet (legacy map engine)
   *
   * Enable this flag for:
   * - Testing MapLibre implementation
   * - A/B testing with pilot users
   * - Gradual rollout during migration
   *
   * Migration plan: Keep both implementations in parallel,
   * then remove Leaflet after 2-week soak period.
   *
   * @default false (uses Leaflet)
   */
  ENABLE_MAPLIBRE_MAPS:
    import.meta.env.VITE_ENABLE_MAPLIBRE_MAPS === 'true',

  /**
   * PWA Features (Phase 3)
   *
   * When enabled: Activates service worker, offline mode, tile caching
   * When disabled: Standard web app mode
   *
   * @default false
   */
  ENABLE_PWA:
    import.meta.env.VITE_ENABLE_PWA === 'true',

  /**
   * Representation Toggle (Phase 4)
   *
   * When enabled: Shows minimal/entity-rich map representation toggle
   * When disabled: Fixed entity-rich representation
   *
   * @default false
   */
  ENABLE_REPRESENTATION_TOGGLE:
    import.meta.env.VITE_ENABLE_REPRESENTATION_TOGGLE === 'true',

  /**
   * Trade-Off Workflow (Phase 5)
   *
   * When enabled: Shows trade-off approval UI in operational map
   * When disabled: Hides trade-off features
   *
   * NOTE: Requires handoffs table governance migration
   *
   * @default false
   */
  ENABLE_TRADEOFF_WORKFLOW:
    import.meta.env.VITE_ENABLE_TRADEOFF_WORKFLOW === 'true',

  /**
   * Map Debug Mode
   *
   * When enabled: Verbose logging for map system (state transitions, layer updates)
   * When disabled: Standard logging
   *
   * @default false
   */
  MAP_DEBUG:
    import.meta.env.VITE_MAP_DEBUG === 'true',

  /**
   * Map Demo System (Phase 8)
   *
   * When enabled: Activates demo simulation with Kano State Nigeria dataset
   * When disabled: Uses real vehicle data from database
   *
   * Demo features:
   * - 7 vehicles moving along routes
   * - 20 PHC facilities across 9 LGAs
   * - Realistic traffic simulation (5 congestion zones)
   * - Time-of-day effects (rush hours, market days)
   * - Deterministic replay with seeded RNG
   *
   * @default false
   */
  ENABLE_MAP_DEMO:
    import.meta.env.VITE_ENABLE_MAP_DEMO === 'true',

  /**
   * Mod4 Mobile Driver Execution (Mod4)
   *
   * When enabled: Activates Mod4 workspace with driver PWA and dispatcher tracking
   * When disabled: Shows "Coming Soon" in navigation
   *
   * Mod4 features:
   * - Mobile-optimized driver delivery execution
   * - Real-time GPS tracking and pinging
   * - Offline-first with background sync
   * - Dispatcher live tracking dashboard
   * - Event-sourced delivery lifecycle
   *
   * @default false
   */
  ENABLE_MOD4:
    import.meta.env.VITE_ENABLE_MOD4 === 'true',
} as const;

/**
 * Feature flag type for type-safe access
 */
export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;

/**
 * Check if a feature flag is enabled
 *
 * @param flag - The feature flag to check
 * @returns boolean indicating if the flag is enabled
 *
 * @example
 * ```typescript
 * if (isFeatureEnabled('VEHICLE_CONSOLIDATION')) {
 *   // Use new consolidated table
 * } else {
 *   // Use legacy table
 * }
 * ```
 */
export function isFeatureEnabled(flag: FeatureFlagKey): boolean {
  return FEATURE_FLAGS[flag];
}

/**
 * Get the appropriate table/view name based on feature flag
 *
 * @returns 'vehicles_unified_v' if consolidation flag is enabled, 'vehicles' otherwise
 *
 * @example
 * ```typescript
 * const tableName = getVehiclesTableName();
 * const { data } = await supabase.from(tableName).select('*');
 * ```
 */
export function getVehiclesTableName(): string {
  return isFeatureEnabled('VEHICLE_CONSOLIDATION')
    ? 'vehicles_unified_v'
    : 'vehicles';
}

/**
 * Development/Debug helper to log feature flag status
 * Only runs in development mode
 */
export function logFeatureFlagStatus(): void {
  if (import.meta.env.DEV) {
    console.group('🚩 Feature Flags Status');
    Object.entries(FEATURE_FLAGS).forEach(([key, value]) => {
      console.log(`${key}: ${value ? '✅ enabled' : '❌ disabled'}`);
    });
    console.groupEnd();
  }
}

// Log feature flags on module load in development
if (import.meta.env.DEV) {
  logFeatureFlagStatus();
}
