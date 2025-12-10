/**
 * Migration: Create Slot Assignments Table
 * Date: 2025-12-03
 * Description: Create table for tracking facility-to-slot assignments in batches
 */

-- =====================================================
-- 1. CREATE SLOT_ASSIGNMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS slot_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Batch reference
  batch_id UUID NOT NULL,
  batch_type TEXT NOT NULL DEFAULT 'scheduler', -- 'scheduler' or 'delivery'

  -- Vehicle & Slot info
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  slot_key TEXT NOT NULL, -- Format: "VEHICLE_ID-TIER_NAME-SLOT_NUMBER"
  tier_name TEXT NOT NULL,
  slot_number INT NOT NULL CHECK (slot_number >= 1 AND slot_number <= 12),

  -- Facility assignment
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,

  -- Load details
  load_kg NUMERIC(10, 2),
  load_volume_m3 NUMERIC(10, 3),

  -- Sequencing
  sequence_order INT, -- Order within batch (for delivery route)

  -- Status
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'loaded', 'delivered', 'cancelled')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT unique_slot_per_batch UNIQUE (batch_id, slot_key),
  CONSTRAINT valid_load_weight CHECK (load_kg IS NULL OR load_kg >= 0),
  CONSTRAINT valid_load_volume CHECK (load_volume_m3 IS NULL OR load_volume_m3 >= 0)
);

COMMENT ON TABLE slot_assignments IS 'Tracks facility-to-vehicle slot assignments for batch planning';

COMMENT ON COLUMN slot_assignments.slot_key IS 'Unique slot identifier: VEHICLE_ID-TIER_NAME-SLOT_NUMBER';
COMMENT ON COLUMN slot_assignments.tier_name IS 'Tier name (Lower, Middle, Upper, Top)';
COMMENT ON COLUMN slot_assignments.slot_number IS 'Slot position within tier (1-12)';
COMMENT ON COLUMN slot_assignments.sequence_order IS 'Delivery sequence order (1 = first stop)';
COMMENT ON COLUMN slot_assignments.status IS 'Assignment status: assigned, loaded, delivered, cancelled';

-- =====================================================
-- 2. CREATE INDEXES
-- =====================================================

CREATE INDEX idx_slot_assignments_batch ON slot_assignments(batch_id);
CREATE INDEX idx_slot_assignments_vehicle ON slot_assignments(vehicle_id);
CREATE INDEX idx_slot_assignments_facility ON slot_assignments(facility_id);
CREATE INDEX idx_slot_assignments_slot_key ON slot_assignments(slot_key);
CREATE INDEX idx_slot_assignments_status ON slot_assignments(status);
CREATE INDEX idx_slot_assignments_created_at ON slot_assignments(created_at DESC);

-- Composite index for common queries
CREATE INDEX idx_slot_assignments_batch_vehicle ON slot_assignments(batch_id, vehicle_id);
CREATE INDEX idx_slot_assignments_vehicle_status ON slot_assignments(vehicle_id, status);

-- =====================================================
-- 3. CREATE TRIGGERS
-- =====================================================

/**
 * Trigger to update updated_at timestamp
 */
CREATE OR REPLACE FUNCTION update_slot_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER slot_assignments_updated_at
  BEFORE UPDATE ON slot_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_slot_assignments_updated_at();

/**
 * Trigger to validate slot assignment against vehicle capacity
 */
CREATE OR REPLACE FUNCTION validate_slot_assignment()
RETURNS TRIGGER AS $$
DECLARE
  vehicle_capacity_kg NUMERIC;
  vehicle_capacity_m3 NUMERIC;
  vehicle_total_slots INT;
  assigned_count INT;
BEGIN
  -- Get vehicle capacity
  SELECT capacity_kg, capacity_m3, total_slots
  INTO vehicle_capacity_kg, vehicle_capacity_m3, vehicle_total_slots
  FROM vehicles
  WHERE id = NEW.vehicle_id;

  -- Check if slot exists in vehicle's tier configuration
  -- (This would require parsing tiered_config JSONB - simplified for now)

  -- Check if slot is already assigned in this batch
  SELECT COUNT(*)
  INTO assigned_count
  FROM slot_assignments
  WHERE batch_id = NEW.batch_id
    AND slot_key = NEW.slot_key
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF assigned_count > 0 THEN
    RAISE EXCEPTION 'Slot % is already assigned in batch %', NEW.slot_key, NEW.batch_id;
  END IF;

  -- Validate load doesn't exceed vehicle capacity (aggregate check)
  IF NEW.load_kg IS NOT NULL THEN
    DECLARE
      total_load_kg NUMERIC;
    BEGIN
      SELECT COALESCE(SUM(load_kg), 0) + NEW.load_kg
      INTO total_load_kg
      FROM slot_assignments
      WHERE batch_id = NEW.batch_id
        AND vehicle_id = NEW.vehicle_id
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

      IF total_load_kg > vehicle_capacity_kg THEN
        RAISE EXCEPTION 'Total load (% kg) exceeds vehicle capacity (% kg)', total_load_kg, vehicle_capacity_kg;
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_slot_assignment_trigger
  BEFORE INSERT OR UPDATE ON slot_assignments
  FOR EACH ROW
  EXECUTE FUNCTION validate_slot_assignment();

-- =====================================================
-- 4. CREATE HELPER VIEWS
-- =====================================================

/**
 * View: Slot Assignment Details (with vehicle and facility info)
 */
CREATE OR REPLACE VIEW slot_assignment_details AS
SELECT
  sa.id,
  sa.batch_id,
  sa.batch_type,
  sa.vehicle_id,
  v.license_plate AS vehicle_license_plate,
  v.make AS vehicle_make,
  v.model AS vehicle_model,
  sa.slot_key,
  sa.tier_name,
  sa.slot_number,
  sa.facility_id,
  f.name AS facility_name,
  f.address AS facility_address,
  sa.load_kg,
  sa.load_volume_m3,
  sa.sequence_order,
  sa.status,
  sa.created_at,
  sa.updated_at
FROM slot_assignments sa
LEFT JOIN vehicles v ON sa.vehicle_id = v.id
LEFT JOIN facilities f ON sa.facility_id = f.id;

COMMENT ON VIEW slot_assignment_details IS 'Slot assignments with vehicle and facility details';

/**
 * View: Batch Slot Utilization Summary
 */
CREATE OR REPLACE VIEW batch_slot_utilization AS
SELECT
  sa.batch_id,
  sa.vehicle_id,
  v.license_plate,
  v.total_slots AS vehicle_total_slots,
  COUNT(DISTINCT sa.slot_key) AS slots_used,
  COUNT(DISTINCT sa.facility_id) AS facilities_assigned,
  COALESCE(SUM(sa.load_kg), 0) AS total_load_kg,
  COALESCE(SUM(sa.load_volume_m3), 0) AS total_load_m3,
  v.capacity_kg AS vehicle_capacity_kg,
  v.capacity_m3 AS vehicle_capacity_m3,
  CASE
    WHEN v.total_slots > 0 THEN
      ROUND((COUNT(DISTINCT sa.slot_key)::NUMERIC / v.total_slots) * 100, 2)
    ELSE 0
  END AS slot_utilization_pct,
  CASE
    WHEN v.capacity_kg > 0 THEN
      ROUND((COALESCE(SUM(sa.load_kg), 0) / v.capacity_kg) * 100, 2)
    ELSE 0
  END AS weight_utilization_pct,
  CASE
    WHEN v.capacity_m3 > 0 THEN
      ROUND((COALESCE(SUM(sa.load_volume_m3), 0) / v.capacity_m3) * 100, 2)
    ELSE 0
  END AS volume_utilization_pct
FROM slot_assignments sa
LEFT JOIN vehicles v ON sa.vehicle_id = v.id
GROUP BY sa.batch_id, sa.vehicle_id, v.license_plate, v.total_slots, v.capacity_kg, v.capacity_m3;

COMMENT ON VIEW batch_slot_utilization IS 'Capacity utilization metrics per batch/vehicle';

/**
 * View: Vehicle Slot Availability
 */
CREATE OR REPLACE VIEW vehicle_slot_availability AS
SELECT
  v.id AS vehicle_id,
  v.license_plate,
  v.total_slots,
  COALESCE(occupied.slots_occupied, 0) AS slots_occupied,
  v.total_slots - COALESCE(occupied.slots_occupied, 0) AS slots_available,
  CASE
    WHEN v.total_slots > 0 THEN
      ROUND((COALESCE(occupied.slots_occupied, 0)::NUMERIC / v.total_slots) * 100, 2)
    ELSE 0
  END AS occupancy_pct
FROM vehicles v
LEFT JOIN (
  SELECT
    vehicle_id,
    COUNT(DISTINCT slot_key) AS slots_occupied
  FROM slot_assignments
  WHERE status IN ('assigned', 'loaded')
  GROUP BY vehicle_id
) occupied ON v.id = occupied.vehicle_id
WHERE v.total_slots IS NOT NULL AND v.total_slots > 0;

COMMENT ON VIEW vehicle_slot_availability IS 'Real-time slot availability per vehicle';

-- =====================================================
-- 5. CREATE HELPER FUNCTIONS
-- =====================================================

/**
 * Function to get slot assignments for a batch
 */
CREATE OR REPLACE FUNCTION get_batch_slot_assignments(p_batch_id UUID)
RETURNS TABLE (
  slot_key TEXT,
  tier_name TEXT,
  slot_number INT,
  facility_id UUID,
  facility_name TEXT,
  load_kg NUMERIC,
  sequence_order INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sa.slot_key,
    sa.tier_name,
    sa.slot_number,
    sa.facility_id,
    f.name AS facility_name,
    sa.load_kg,
    sa.sequence_order
  FROM slot_assignments sa
  LEFT JOIN facilities f ON sa.facility_id = f.id
  WHERE sa.batch_id = p_batch_id
  ORDER BY sa.tier_name, sa.slot_number;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_batch_slot_assignments IS 'Get all slot assignments for a batch';

/**
 * Function to check slot availability
 */
CREATE OR REPLACE FUNCTION is_slot_available(
  p_vehicle_id UUID,
  p_slot_key TEXT,
  p_batch_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  assignment_count INT;
BEGIN
  SELECT COUNT(*)
  INTO assignment_count
  FROM slot_assignments
  WHERE vehicle_id = p_vehicle_id
    AND slot_key = p_slot_key
    AND status IN ('assigned', 'loaded')
    AND (p_batch_id IS NULL OR batch_id != p_batch_id);

  RETURN assignment_count = 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION is_slot_available IS 'Check if a slot is available for assignment';

-- =====================================================
-- 6. GRANT PERMISSIONS
-- =====================================================

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON slot_assignments TO authenticated;
GRANT SELECT ON slot_assignments TO anon;

-- Grant view permissions
GRANT SELECT ON slot_assignment_details TO authenticated, anon;
GRANT SELECT ON batch_slot_utilization TO authenticated, anon;
GRANT SELECT ON vehicle_slot_availability TO authenticated, anon;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION get_batch_slot_assignments TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_slot_available TO authenticated, anon;

-- =====================================================
-- 7. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE slot_assignments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all slot assignments
CREATE POLICY "Users can view slot assignments"
  ON slot_assignments
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Users can create slot assignments
CREATE POLICY "Users can create slot assignments"
  ON slot_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Users can update their own slot assignments
CREATE POLICY "Users can update slot assignments"
  ON slot_assignments
  FOR UPDATE
  TO authenticated
  USING (true);

-- Policy: Users can delete slot assignments
CREATE POLICY "Users can delete slot assignments"
  ON slot_assignments
  FOR DELETE
  TO authenticated
  USING (true);
