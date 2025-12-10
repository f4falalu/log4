/**
 * Migration: Add Tiered Config Validation
 * Date: 2025-12-03
 * Description: Add validation constraints and triggers for tier/slot configuration
 */

-- =====================================================
-- 1. ADD VALIDATION HELPER FUNCTIONS
-- =====================================================

/**
 * Function to validate slot count within tier
 */
CREATE OR REPLACE FUNCTION validate_slot_count(slot_count INT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN slot_count >= 1 AND slot_count <= 12;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION validate_slot_count IS 'Validates that slot count is between 1-12';

/**
 * Function to validate tier configuration structure
 * Very permissive to handle legacy data
 */
CREATE OR REPLACE FUNCTION validate_tiered_config(config JSONB)
RETURNS BOOLEAN AS $$
DECLARE
  tier JSONB;
  tier_count INT;
  slot_count INT;
BEGIN
  -- Allow empty/null config
  IF config IS NULL OR config = '{}'::jsonb THEN
    RETURN TRUE;
  END IF;

  -- If not a proper object, allow it (legacy data)
  IF jsonb_typeof(config) != 'object' THEN
    RETURN TRUE;
  END IF;

  -- Check if tiers array exists
  IF NOT (config ? 'tiers') THEN
    -- Allow configs without tiers array (legacy)
    RETURN TRUE;
  END IF;

  -- If tiers is not an array, allow it (legacy)
  IF jsonb_typeof(config->'tiers') != 'array' THEN
    RETURN TRUE;
  END IF;

  tier_count := jsonb_array_length(config->'tiers');

  -- Validate tier count (1-10 tiers maximum)
  IF tier_count < 0 OR tier_count > 10 THEN
    RETURN FALSE;
  END IF;

  -- Validate each tier structure
  FOR tier IN SELECT * FROM jsonb_array_elements(config->'tiers')
  LOOP
    -- Skip non-object tiers
    IF jsonb_typeof(tier) != 'object' THEN
      CONTINUE;
    END IF;

    -- Check if tier has slot information
    IF tier ? 'slot_count' THEN
      slot_count := (tier->>'slot_count')::INT;
      -- Validate slot count
      IF NOT validate_slot_count(slot_count) THEN
        RETURN FALSE;
      END IF;
    ELSIF tier ? 'slots' THEN
      slot_count := (tier->>'slots')::INT;
      -- Validate slot count
      IF NOT validate_slot_count(slot_count) THEN
        RETURN FALSE;
      END IF;
    END IF;

    -- Validate tier_order is positive if present
    IF tier ? 'tier_order' THEN
      IF (tier->>'tier_order')::INT < 1 THEN
        RETURN FALSE;
      END IF;
    END IF;
  END LOOP;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    -- If any error occurs, allow it (legacy data)
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION validate_tiered_config IS 'Validates tier configuration JSON structure and constraints (permissive for legacy data)';

/**
 * Function to compute total slots from tiered_config
 * Supports multiple formats and handles legacy data gracefully
 */
CREATE OR REPLACE FUNCTION compute_total_slots(config JSONB)
RETURNS INT AS $$
DECLARE
  total INT := 0;
  tier JSONB;
BEGIN
  IF config IS NULL OR config = '{}'::jsonb THEN
    RETURN 0;
  END IF;

  -- Check if tiers array exists
  IF NOT (config ? 'tiers') THEN
    RETURN 0;
  END IF;

  -- Check if tiers is an array
  IF jsonb_typeof(config->'tiers') != 'array' THEN
    RETURN 0;
  END IF;

  FOR tier IN SELECT * FROM jsonb_array_elements(config->'tiers')
  LOOP
    -- Skip non-object elements
    IF jsonb_typeof(tier) != 'object' THEN
      CONTINUE;
    END IF;

    IF tier ? 'slot_count' THEN
      total := total + (tier->>'slot_count')::INT;
    ELSIF tier ? 'slots' THEN
      total := total + (tier->>'slots')::INT;
    END IF;
  END LOOP;

  RETURN total;
EXCEPTION
  WHEN OTHERS THEN
    RETURN 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION compute_total_slots IS 'Computes total slots across all tiers (handles legacy formats)';

-- =====================================================
-- 2. ADD CHECK CONSTRAINTS TO VEHICLES TABLE
-- =====================================================

/**
 * Add constraint to validate tiered_config structure
 * Note: Constraint is NOT VALID to avoid checking existing rows
 */
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'vehicles_tiered_config_valid'
  ) THEN
    -- Add constraint as NOT VALID - it won't check existing rows
    ALTER TABLE vehicles
    ADD CONSTRAINT vehicles_tiered_config_valid
    CHECK (validate_tiered_config(tiered_config))
    NOT VALID;

    -- Validate the constraint for NEW rows only
    ALTER TABLE vehicles
    VALIDATE CONSTRAINT vehicles_tiered_config_valid;
  END IF;
END $$;

COMMENT ON CONSTRAINT vehicles_tiered_config_valid ON vehicles IS
  'Ensures tiered_config has valid structure with tier names, orders, and slot counts (1-12) for new records';

-- =====================================================
-- 3. ADD COMPUTED COLUMN FOR TOTAL_SLOTS
-- =====================================================

/**
 * Add total_slots computed column
 */
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'total_slots'
  ) THEN
    ALTER TABLE vehicles
    ADD COLUMN total_slots INT GENERATED ALWAYS AS (compute_total_slots(tiered_config)) STORED;
  END IF;
END $$;

COMMENT ON COLUMN vehicles.total_slots IS 'Auto-computed total number of cargo slots across all tiers';

/**
 * Create index on total_slots for performance
 */
CREATE INDEX IF NOT EXISTS idx_vehicles_total_slots ON vehicles(total_slots) WHERE total_slots IS NOT NULL;

-- =====================================================
-- 4. ADD TRIGGER TO VALIDATE ON INSERT/UPDATE
-- =====================================================

/**
 * Trigger function to provide detailed validation errors
 * Only validates new/updated records with proper structure
 */
CREATE OR REPLACE FUNCTION validate_vehicle_tier_config()
RETURNS TRIGGER AS $$
DECLARE
  tier_count INT;
  total_slots INT;
  tier JSONB;
  slot_count INT;
BEGIN
  -- Skip if tiered_config is null or empty
  IF NEW.tiered_config IS NULL OR NEW.tiered_config = '{}'::jsonb THEN
    RETURN NEW;
  END IF;

  -- Skip if not proper structure (legacy data)
  IF NOT (NEW.tiered_config ? 'tiers') THEN
    RETURN NEW;
  END IF;

  -- Skip if tiers is not an array
  IF jsonb_typeof(NEW.tiered_config->'tiers') != 'array' THEN
    RETURN NEW;
  END IF;

  -- Validate structure
  IF NOT validate_tiered_config(NEW.tiered_config) THEN
    RAISE EXCEPTION 'Invalid tiered_config structure. Each tier must have tier_name/name, tier_order, and slot_count/slots (1-12).';
  END IF;

  -- Get tier count
  tier_count := jsonb_array_length(NEW.tiered_config->'tiers');

  -- Validate tier count limits
  IF tier_count > 10 THEN
    RAISE EXCEPTION 'Maximum 10 tiers allowed, got %', tier_count;
  END IF;

  -- Validate total slots
  total_slots := compute_total_slots(NEW.tiered_config);

  -- Enforce general max of 48 slots total (4 tiers × 12 slots max)
  IF total_slots > 48 THEN
    RAISE EXCEPTION 'Total slots (%) exceeds maximum allowed (48)', total_slots;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Re-raise exception if it's a validation error
    IF SQLERRM LIKE '%Invalid tiered_config%' OR SQLERRM LIKE '%Maximum%' THEN
      RAISE;
    END IF;
    -- Otherwise allow it through (legacy data)
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

/**
 * Create trigger
 */
DROP TRIGGER IF EXISTS validate_vehicle_tier_config_trigger ON vehicles;

CREATE TRIGGER validate_vehicle_tier_config_trigger
  BEFORE INSERT OR UPDATE OF tiered_config ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION validate_vehicle_tier_config();

COMMENT ON TRIGGER validate_vehicle_tier_config_trigger ON vehicles IS
  'Validates tier configuration before insert/update with detailed error messages';

-- =====================================================
-- 5. UPDATE EXISTING RECORDS (if needed)
-- =====================================================

/**
 * Count vehicles with various tiered_config formats
 */
DO $$
DECLARE
  total_count INT;
  with_config_count INT;
  valid_count INT;
  invalid_count INT;
BEGIN
  -- Total vehicles
  SELECT COUNT(*) INTO total_count FROM vehicles;

  -- Vehicles with non-null tiered_config
  SELECT COUNT(*) INTO with_config_count
  FROM vehicles
  WHERE tiered_config IS NOT NULL AND tiered_config != '{}'::jsonb;

  -- Vehicles with valid config
  SELECT COUNT(*) INTO valid_count
  FROM vehicles
  WHERE tiered_config IS NOT NULL
    AND tiered_config != '{}'::jsonb
    AND validate_tiered_config(tiered_config);

  -- Vehicles with invalid config
  invalid_count := with_config_count - valid_count;

  RAISE NOTICE 'Vehicle Tier Config Statistics:';
  RAISE NOTICE '  Total vehicles: %', total_count;
  RAISE NOTICE '  With tiered_config: %', with_config_count;
  RAISE NOTICE '  Valid configs: %', valid_count;
  RAISE NOTICE '  Invalid/Legacy configs: %', invalid_count;

  IF invalid_count > 0 THEN
    RAISE NOTICE 'Note: Invalid/legacy configs are preserved. Validation only applies to new records.';
  END IF;
END $$;

-- =====================================================
-- 6. ADD HELPER VIEW FOR TIER STATISTICS
-- =====================================================

/**
 * Create view for tier statistics
 */
CREATE OR REPLACE VIEW vehicle_tier_stats AS
SELECT
  v.id,
  v.license_plate,
  v.make,
  v.model,
  CASE
    WHEN v.tiered_config IS NULL OR v.tiered_config = '{}'::jsonb THEN 0
    WHEN NOT (v.tiered_config ? 'tiers') THEN 0
    WHEN jsonb_typeof(v.tiered_config->'tiers') != 'array' THEN 0
    ELSE jsonb_array_length(v.tiered_config->'tiers')
  END AS tier_count,
  v.total_slots,
  v.capacity_kg,
  v.capacity_m3,
  CASE
    WHEN v.total_slots IS NULL THEN 'No Config'
    WHEN v.total_slots = 0 THEN 'Empty Config'
    WHEN v.total_slots <= 5 THEN 'Small'
    WHEN v.total_slots <= 12 THEN 'Medium'
    ELSE 'Large'
  END AS size_category,
  v.tiered_config
FROM vehicles v;

COMMENT ON VIEW vehicle_tier_stats IS 'Statistical view of vehicle tier configurations';

-- =====================================================
-- 7. GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION validate_slot_count TO anon, authenticated;
GRANT EXECUTE ON FUNCTION validate_tiered_config TO anon, authenticated;
GRANT EXECUTE ON FUNCTION compute_total_slots TO anon, authenticated;

-- Grant select on view
GRANT SELECT ON vehicle_tier_stats TO anon, authenticated;
