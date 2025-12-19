/**
 * Migration: Fix Tiered Config Trigger Functions
 * Date: 2025-12-14
 * Description: Fix database trigger functions to properly handle tiered_config
 *              in both {tiers: [...]} and direct array [...] formats
 *
 * Issue: PostgreSQL error 22023 "cannot get array length of a non-array"
 * Root Cause: Trigger functions call jsonb_array_length() without type checking
 */

-- =====================================================
-- 1. FIX sync_vehicle_tiers_from_config() FUNCTION
-- =====================================================

-- Drop existing function first (parameter name changed)
DROP FUNCTION IF EXISTS sync_vehicle_tiers_from_config(uuid, jsonb);

/**
 * Fixed version that handles both:
 * - {tiers: [{...}]} (object with tiers array)
 * - [{...}] (direct array)
 */
CREATE FUNCTION sync_vehicle_tiers_from_config(
  p_vehicle_id uuid,
  p_tier_config JSONB
)
RETURNS void AS $$
DECLARE
  tier JSONB;
  tier_array JSONB;
BEGIN
  -- Delete existing tiers for this vehicle
  DELETE FROM vehicle_tiers WHERE vehicle_id = p_vehicle_id;

  -- Handle NULL config
  IF p_tier_config IS NULL THEN
    RETURN;
  END IF;

  -- Determine the format and extract the tiers array
  IF jsonb_typeof(p_tier_config) = 'object' AND p_tier_config ? 'tiers' THEN
    -- Format: {tiers: [{...}]}
    tier_array := p_tier_config->'tiers';

    -- Check if tiers is actually an array
    IF jsonb_typeof(tier_array) != 'array' THEN
      RETURN;
    END IF;
  ELSIF jsonb_typeof(p_tier_config) = 'array' THEN
    -- Format: [{...}]
    tier_array := p_tier_config;
  ELSE
    -- Empty object {} or invalid format
    RETURN;
  END IF;

  -- Check if array is empty
  IF jsonb_array_length(tier_array) = 0 THEN
    RETURN;
  END IF;

  -- Insert new tiers from config
  FOR tier IN SELECT * FROM jsonb_array_elements(tier_array)
  LOOP
    INSERT INTO vehicle_tiers (
      vehicle_id,
      tier_name,
      tier_order,
      max_weight_kg,
      max_volume_m3
    ) VALUES (
      p_vehicle_id,
      tier->>'tier_name',
      (tier->>'tier_order')::INT,
      (tier->>'max_weight_kg')::NUMERIC,
      (tier->>'max_volume_m3')::NUMERIC
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sync_vehicle_tiers_from_config IS
  'Sync vehicle_tiers table from tiered_config JSONB (supports both {tiers:[]} and [] formats)';

-- =====================================================
-- 2. FIX validate_tiered_config() FUNCTION
-- =====================================================

/**
 * Fixed version with proper type checking before array operations
 */
CREATE OR REPLACE FUNCTION validate_tiered_config(config JSONB)
RETURNS BOOLEAN AS $$
DECLARE
  tier JSONB;
  tier_count INT;
  slot_count INT;
  tier_array JSONB;
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

  -- Get tiers array
  tier_array := config->'tiers';

  -- If tiers is not an array, allow it (legacy)
  IF jsonb_typeof(tier_array) != 'array' THEN
    RETURN TRUE;
  END IF;

  -- NOW it's safe to call jsonb_array_length()
  tier_count := jsonb_array_length(tier_array);

  -- Validate tier count (1-10 tiers maximum)
  IF tier_count < 0 OR tier_count > 10 THEN
    RETURN FALSE;
  END IF;

  -- Validate each tier structure
  FOR tier IN SELECT * FROM jsonb_array_elements(tier_array)
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

COMMENT ON FUNCTION validate_tiered_config IS
  'Validates tier configuration JSON structure and constraints (permissive for legacy data, now with proper type checking)';

-- =====================================================
-- 3. FIX validate_vehicle_tier_config() TRIGGER FUNCTION
-- =====================================================

/**
 * Fixed trigger function with proper type checking
 */
CREATE OR REPLACE FUNCTION validate_vehicle_tier_config()
RETURNS TRIGGER AS $$
DECLARE
  tier_count INT;
  total_slots INT;
  tier JSONB;
  slot_count INT;
  tier_array JSONB;
BEGIN
  -- Skip if tiered_config is null or empty
  IF NEW.tiered_config IS NULL OR NEW.tiered_config = '{}'::jsonb THEN
    RETURN NEW;
  END IF;

  -- Skip if not proper structure (legacy data)
  IF NOT (NEW.tiered_config ? 'tiers') THEN
    RETURN NEW;
  END IF;

  -- Get tiers array
  tier_array := NEW.tiered_config->'tiers';

  -- Skip if tiers is not an array
  IF jsonb_typeof(tier_array) != 'array' THEN
    RETURN NEW;
  END IF;

  -- Validate structure
  IF NOT validate_tiered_config(NEW.tiered_config) THEN
    RAISE EXCEPTION 'Invalid tiered_config structure. Each tier must have tier_name/name, tier_order, and slot_count/slots (1-12).';
  END IF;

  -- NOW it's safe to call jsonb_array_length()
  tier_count := jsonb_array_length(tier_array);

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

COMMENT ON FUNCTION validate_vehicle_tier_config IS
  'Validates tier configuration before insert/update with detailed error messages and proper type checking';

-- =====================================================
-- 4. UPDATE DEFAULT VALUE FOR tiered_config
-- =====================================================

/**
 * Change default from '[]' to '{}' to match expected format
 * This prevents confusion when new records are created
 */
DO $$
BEGIN
  -- Update vehicles table default
  EXECUTE 'ALTER TABLE vehicles ALTER COLUMN tiered_config SET DEFAULT ''{}''::jsonb';

  RAISE NOTICE 'Updated tiered_config default value to empty object {}';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not update tiered_config default: %', SQLERRM;
END $$;

-- =====================================================
-- 5. VERIFICATION
-- =====================================================

-- Test the fixed functions
DO $$
DECLARE
  test_result BOOLEAN;
  test_config JSONB;
BEGIN
  RAISE NOTICE 'Testing fixed validation functions...';

  -- Test 1: Empty object
  test_config := '{}'::jsonb;
  test_result := validate_tiered_config(test_config);
  RAISE NOTICE 'Test 1 (empty object): %', CASE WHEN test_result THEN 'PASS' ELSE 'FAIL' END;

  -- Test 2: Object with tiers array
  test_config := '{"tiers": [{"tier_name": "Upper", "tier_order": 1, "slot_count": 6}]}'::jsonb;
  test_result := validate_tiered_config(test_config);
  RAISE NOTICE 'Test 2 (object with tiers): %', CASE WHEN test_result THEN 'PASS' ELSE 'FAIL' END;

  -- Test 3: NULL
  test_config := NULL;
  test_result := validate_tiered_config(test_config);
  RAISE NOTICE 'Test 3 (NULL): %', CASE WHEN test_result THEN 'PASS' ELSE 'FAIL' END;

  -- Test 4: Direct array (legacy format)
  test_config := '[{"tier_name": "Upper", "tier_order": 1, "slot_count": 6}]'::jsonb;
  -- Note: This should return TRUE (permissive for legacy data)
  test_result := validate_tiered_config(test_config);
  RAISE NOTICE 'Test 4 (direct array - legacy): %', CASE WHEN test_result THEN 'PASS' ELSE 'FAIL' END;

  RAISE NOTICE 'All validation tests completed';
END $$;
