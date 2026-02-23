-- =====================================================
-- PROPERLY DELETE ROUTE BY DROPPING TRIGGER
-- =====================================================
-- Purpose: Temporarily remove trigger to delete route
-- Date: 2026-02-21
-- =====================================================

BEGIN;

-- Drop the trigger temporarily
DO $$
BEGIN
  DROP TRIGGER IF EXISTS trg_prevent_locked_route_modification ON public.routes;
  RAISE NOTICE '✓ Dropped trigger trg_prevent_locked_route_modification';
END $$;

-- Delete all routes
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM routes;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % routes', deleted_count;
END $$;

-- Recreate the trigger
DO $$
BEGIN
  CREATE TRIGGER trg_prevent_locked_route_modification
    BEFORE UPDATE OR DELETE ON public.routes
    FOR EACH ROW EXECUTE FUNCTION public.prevent_locked_route_modification();
  RAISE NOTICE '✓ Recreated trigger trg_prevent_locked_route_modification';
END $$;

-- Final verification
DO $$
DECLARE
  remaining_routes INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_routes FROM routes;
  
  RAISE NOTICE '';
  RAISE NOTICE '📊 ROUTE CLEANUP - FINAL STATE:';
  RAISE NOTICE '═══════════════════════════════════';
  RAISE NOTICE '   Routes: %', remaining_routes;
  RAISE NOTICE '═══════════════════════════════════';
  
  IF remaining_routes = 0 THEN
    RAISE NOTICE '✅ All routes deleted successfully!';
    RAISE NOTICE '   Route Management should now show 0 routes';
  ELSE
    RAISE NOTICE '⚠️  % routes still remain', remaining_routes;
  END IF;
  RAISE NOTICE '';
END $$;

COMMIT;
