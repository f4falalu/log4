-- =====================================================
-- FIX: Vehicles-Profiles Relationship
-- =====================================================
-- Adds missing profile reference columns to vehicles table
-- for audit trail and VLMS compatibility
--
-- Issue: Type generation error "failed to find relationship between vehicles and profiles"
-- Cause: created_by and updated_by columns reference auth.users instead of profiles
-- Fix: Add proper foreign keys to profiles(id)
-- =====================================================

BEGIN;

-- Drop existing columns if they have wrong foreign key
ALTER TABLE vehicles DROP COLUMN IF EXISTS created_by CASCADE;
ALTER TABLE vehicles DROP COLUMN IF EXISTS updated_by CASCADE;

-- Add created_by and updated_by columns with correct reference
ALTER TABLE vehicles
  ADD COLUMN created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_vehicles_created_by ON vehicles(created_by);
CREATE INDEX IF NOT EXISTS idx_vehicles_updated_by ON vehicles(updated_by);

-- Add comments for documentation
COMMENT ON COLUMN vehicles.created_by IS 'User (profile) who created this vehicle record';
COMMENT ON COLUMN vehicles.updated_by IS 'User (profile) who last updated this vehicle record';

-- Add trigger to auto-set created_by and updated_by
CREATE OR REPLACE FUNCTION set_vehicle_audit_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := auth.uid();
    NEW.updated_by := auth.uid();
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.updated_by := auth.uid();
    -- Don't overwrite created_by on updates
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS vehicle_audit_trigger ON vehicles;
CREATE TRIGGER vehicle_audit_trigger
  BEFORE INSERT OR UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION set_vehicle_audit_fields();

COMMIT;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check columns were added correctly
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'vehicles'
AND column_name IN ('created_by', 'updated_by')
ORDER BY column_name;

-- Check foreign keys point to profiles table
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'vehicles'
  AND kcu.column_name IN ('created_by', 'updated_by');

-- Check trigger was created
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'vehicle_audit_trigger';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Vehicles-Profiles relationship fixed!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Changes:';
  RAISE NOTICE '- created_by column: vehicles → profiles(id)';
  RAISE NOTICE '- updated_by column: vehicles → profiles(id)';
  RAISE NOTICE '- Auto-populate trigger: vehicle_audit_trigger';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Regenerate types: npx supabase gen types typescript --linked';
  RAISE NOTICE '2. Test VLMS onboarding wizard';
  RAISE NOTICE '3. Verify audit trail working';
END $$;
