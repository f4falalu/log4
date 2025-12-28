-- ============================================================================
-- Vehicle Consolidation Audit - Step 2: Create Audit Table
-- ============================================================================
-- Purpose: Track all vehicle merge operations and conflicts
-- Records: Which vehicles were merged, conflicts found, resolution status
-- ============================================================================

BEGIN;

-- Create audit table for vehicle merge operations
CREATE TABLE IF NOT EXISTS vehicle_merge_audit (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Source identifiers
  vehicles_id uuid,
  vlms_id uuid,

  -- Merge tracking
  merged_at timestamptz DEFAULT now(),
  merged_by text DEFAULT current_user,

  -- Conflict tracking
  conflicts jsonb DEFAULT '{}'::jsonb,
  resolved_conflicts jsonb DEFAULT '{}'::jsonb,

  -- Status tracking
  status text CHECK (status IN ('success', 'conflict', 'skipped', 'pending', 'failed')),

  -- Notes and metadata
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_vehicle_merge_audit_vehicles_id
  ON vehicle_merge_audit(vehicles_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_merge_audit_vlms_id
  ON vehicle_merge_audit(vlms_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_merge_audit_status
  ON vehicle_merge_audit(status);

CREATE INDEX IF NOT EXISTS idx_vehicle_merge_audit_merged_at
  ON vehicle_merge_audit(merged_at DESC);

-- Add table comment
COMMENT ON TABLE vehicle_merge_audit IS 'Audit trail for vehicle data consolidation from vlms_vehicles to vehicles table';

-- Add column comments
COMMENT ON COLUMN vehicle_merge_audit.vehicles_id IS 'Reference to vehicles.id (canonical table)';
COMMENT ON COLUMN vehicle_merge_audit.vlms_id IS 'Reference to vlms_vehicles.id (legacy table)';
COMMENT ON COLUMN vehicle_merge_audit.conflicts IS 'JSON object of detected conflicts: {field: {vehicles_value, vlms_value}}';
COMMENT ON COLUMN vehicle_merge_audit.resolved_conflicts IS 'JSON object showing how conflicts were resolved';
COMMENT ON COLUMN vehicle_merge_audit.status IS 'Merge status: success (no conflicts), conflict (manual review), skipped, pending, failed';
COMMENT ON COLUMN vehicle_merge_audit.metadata IS 'Additional metadata: reconciliation_rules_applied, data_quality_score, etc.';

COMMIT;

-- ============================================================================
-- Rollback Script
-- ============================================================================
--
-- BEGIN;
-- DROP TABLE IF EXISTS vehicle_merge_audit;
-- COMMIT;
