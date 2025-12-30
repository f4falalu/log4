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
    });
    console.groupEnd();
  }
}

// Log feature flags on module load in development
if (import.meta.env.DEV) {
  logFeatureFlagStatus();
}
