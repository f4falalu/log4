-- =====================================================
-- Migration: Platform Readiness
-- =====================================================
-- Creates workspace readiness tracking to enforce setup gates.
-- Platform is not usable for planning until all gates pass:
-- - Admin exists
-- - RBAC configured
-- - At least one warehouse
-- - At least one vehicle
-- - Packaging rules present
-- =====================================================

-- Step 1: Create workspace readiness table
CREATE TABLE IF NOT EXISTS public.workspace_readiness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE UNIQUE,

  -- Readiness gates
  has_admin BOOLEAN NOT NULL DEFAULT FALSE,
  has_rbac_configured BOOLEAN NOT NULL DEFAULT FALSE,
  has_warehouse BOOLEAN NOT NULL DEFAULT FALSE,
  has_vehicle BOOLEAN NOT NULL DEFAULT FALSE,
  has_packaging_rules BOOLEAN NOT NULL DEFAULT FALSE,

  -- Computed readiness status (all gates must pass)
  is_ready BOOLEAN GENERATED ALWAYS AS (
    has_admin AND has_rbac_configured AND has_warehouse AND has_vehicle AND has_packaging_rules
  ) STORED,

  -- Gate completion timestamps
  admin_configured_at TIMESTAMPTZ,
  rbac_configured_at TIMESTAMPTZ,
  first_warehouse_at TIMESTAMPTZ,
  first_vehicle_at TIMESTAMPTZ,
  packaging_configured_at TIMESTAMPTZ,
  became_ready_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_workspace_readiness_workspace
  ON public.workspace_readiness(workspace_id);

CREATE INDEX IF NOT EXISTS idx_workspace_readiness_is_ready
  ON public.workspace_readiness(is_ready);

-- Step 3: Create trigger to track readiness transitions
CREATE OR REPLACE FUNCTION check_workspace_readiness()
RETURNS TRIGGER AS $$
BEGIN
  -- Update timestamps when gates are satisfied
  IF NEW.has_admin = TRUE AND OLD.has_admin = FALSE THEN
    NEW.admin_configured_at := COALESCE(NEW.admin_configured_at, NOW());
  END IF;

  IF NEW.has_rbac_configured = TRUE AND OLD.has_rbac_configured = FALSE THEN
    NEW.rbac_configured_at := COALESCE(NEW.rbac_configured_at, NOW());
  END IF;

  IF NEW.has_warehouse = TRUE AND OLD.has_warehouse = FALSE THEN
    NEW.first_warehouse_at := COALESCE(NEW.first_warehouse_at, NOW());
  END IF;

  IF NEW.has_vehicle = TRUE AND OLD.has_vehicle = FALSE THEN
    NEW.first_vehicle_at := COALESCE(NEW.first_vehicle_at, NOW());
  END IF;

  IF NEW.has_packaging_rules = TRUE AND OLD.has_packaging_rules = FALSE THEN
    NEW.packaging_configured_at := COALESCE(NEW.packaging_configured_at, NOW());
  END IF;

  -- Check if all gates now pass (became ready)
  IF NEW.is_ready = TRUE AND (OLD IS NULL OR OLD.is_ready = FALSE) THEN
    NEW.became_ready_at := NOW();

    -- Also update workspace org_status to active
    UPDATE public.workspaces
    SET
      org_status = 'active',
      onboarding_completed_at = NOW()
    WHERE id = NEW.workspace_id
    AND org_status != 'active';
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS workspace_readiness_check_trigger ON public.workspace_readiness;
CREATE TRIGGER workspace_readiness_check_trigger
  BEFORE INSERT OR UPDATE ON public.workspace_readiness
  FOR EACH ROW
  EXECUTE FUNCTION check_workspace_readiness();

-- Step 4: Create trigger for vehicle additions
CREATE OR REPLACE FUNCTION update_readiness_on_vehicle_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_workspace_id UUID;
BEGIN
  -- Try to find workspace from vehicle's facility or use default active workspace
  SELECT COALESCE(
    (SELECT workspace_id FROM public.facilities WHERE id = NEW.current_location_id LIMIT 1),
    (SELECT id FROM public.workspaces WHERE is_active = TRUE ORDER BY created_at LIMIT 1)
  ) INTO v_workspace_id;

  IF v_workspace_id IS NOT NULL THEN
    -- Insert or update readiness record
    INSERT INTO public.workspace_readiness (workspace_id, has_vehicle, first_vehicle_at)
    VALUES (v_workspace_id, TRUE, NOW())
    ON CONFLICT (workspace_id) DO UPDATE
    SET
      has_vehicle = TRUE,
      first_vehicle_at = COALESCE(workspace_readiness.first_vehicle_at, NOW()),
      updated_at = NOW()
    WHERE workspace_readiness.has_vehicle = FALSE;

    -- Update workspace timestamp
    UPDATE public.workspaces
    SET first_vehicle_added_at = COALESCE(first_vehicle_added_at, NOW())
    WHERE id = v_workspace_id AND first_vehicle_added_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create trigger for facility (warehouse) additions
CREATE OR REPLACE FUNCTION update_readiness_on_facility_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track warehouses
  IF NEW.type IN ('warehouse', 'central_warehouse', 'zonal_warehouse', 'state_warehouse') THEN
    IF NEW.workspace_id IS NOT NULL THEN
      -- Insert or update readiness record
      INSERT INTO public.workspace_readiness (workspace_id, has_warehouse, first_warehouse_at)
      VALUES (NEW.workspace_id, TRUE, NOW())
      ON CONFLICT (workspace_id) DO UPDATE
      SET
        has_warehouse = TRUE,
        first_warehouse_at = COALESCE(workspace_readiness.first_warehouse_at, NOW()),
        updated_at = NOW()
      WHERE workspace_readiness.has_warehouse = FALSE;

      -- Update workspace timestamp
      UPDATE public.workspaces
      SET first_warehouse_added_at = COALESCE(first_warehouse_added_at, NOW())
      WHERE id = NEW.workspace_id AND first_warehouse_added_at IS NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create trigger for workspace member additions (admin check)
CREATE OR REPLACE FUNCTION update_readiness_on_member_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is an owner or admin being added
  IF NEW.role IN ('owner', 'admin') THEN
    -- Insert or update readiness record
    INSERT INTO public.workspace_readiness (workspace_id, has_admin, has_rbac_configured, admin_configured_at, rbac_configured_at)
    VALUES (NEW.workspace_id, TRUE, TRUE, NOW(), NOW())
    ON CONFLICT (workspace_id) DO UPDATE
    SET
      has_admin = TRUE,
      has_rbac_configured = TRUE,
      admin_configured_at = COALESCE(workspace_readiness.admin_configured_at, NOW()),
      rbac_configured_at = COALESCE(workspace_readiness.rbac_configured_at, NOW()),
      updated_at = NOW()
    WHERE workspace_readiness.has_admin = FALSE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Apply triggers to relevant tables
-- Note: Only create if not exists to avoid duplicate triggers

DO $$
BEGIN
  -- Vehicle trigger (check if vlms_vehicles or vehicles table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vlms_vehicles') THEN
    DROP TRIGGER IF EXISTS vehicle_readiness_trigger ON public.vlms_vehicles;
    CREATE TRIGGER vehicle_readiness_trigger
      AFTER INSERT ON public.vlms_vehicles
      FOR EACH ROW
      EXECUTE FUNCTION update_readiness_on_vehicle_insert();
  END IF;

  -- Facility trigger
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'facilities') THEN
    DROP TRIGGER IF EXISTS facility_readiness_trigger ON public.facilities;
    CREATE TRIGGER facility_readiness_trigger
      AFTER INSERT ON public.facilities
      FOR EACH ROW
      EXECUTE FUNCTION update_readiness_on_facility_insert();
  END IF;

  -- Workspace member trigger
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workspace_members') THEN
    DROP TRIGGER IF EXISTS member_readiness_trigger ON public.workspace_members;
    CREATE TRIGGER member_readiness_trigger
      AFTER INSERT ON public.workspace_members
      FOR EACH ROW
      EXECUTE FUNCTION update_readiness_on_member_insert();
  END IF;
END $$;

-- Step 8: Enable RLS
ALTER TABLE public.workspace_readiness ENABLE ROW LEVEL SECURITY;

-- Step 9: RLS policies for readiness table
DROP POLICY IF EXISTS "Users can view readiness for their workspaces" ON public.workspace_readiness;
CREATE POLICY "Users can view readiness for their workspaces"
  ON public.workspace_readiness FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can manage readiness" ON public.workspace_readiness;
CREATE POLICY "System can manage readiness"
  ON public.workspace_readiness FOR ALL
  USING (TRUE)
  WITH CHECK (TRUE);

-- Step 10: Create view for readiness status with details
CREATE OR REPLACE VIEW public.workspace_readiness_details AS
SELECT
  wr.workspace_id,
  w.name AS workspace_name,
  w.org_status,
  wr.has_admin,
  wr.has_rbac_configured,
  wr.has_warehouse,
  wr.has_vehicle,
  wr.has_packaging_rules,
  wr.is_ready,
  -- Missing items array
  ARRAY_REMOVE(ARRAY[
    CASE WHEN NOT wr.has_admin THEN 'admin' END,
    CASE WHEN NOT wr.has_rbac_configured THEN 'rbac' END,
    CASE WHEN NOT wr.has_warehouse THEN 'warehouse' END,
    CASE WHEN NOT wr.has_vehicle THEN 'vehicle' END,
    CASE WHEN NOT wr.has_packaging_rules THEN 'packaging_rules' END
  ], NULL) AS missing_items,
  -- Progress percentage
  (
    (CASE WHEN wr.has_admin THEN 1 ELSE 0 END) +
    (CASE WHEN wr.has_rbac_configured THEN 1 ELSE 0 END) +
    (CASE WHEN wr.has_warehouse THEN 1 ELSE 0 END) +
    (CASE WHEN wr.has_vehicle THEN 1 ELSE 0 END) +
    (CASE WHEN wr.has_packaging_rules THEN 1 ELSE 0 END)
  ) * 20 AS progress_percentage,
  wr.admin_configured_at,
  wr.first_warehouse_at,
  wr.first_vehicle_at,
  wr.became_ready_at,
  wr.updated_at
FROM public.workspace_readiness wr
JOIN public.workspaces w ON w.id = wr.workspace_id;

-- Step 11: Add comments for documentation
COMMENT ON TABLE public.workspace_readiness IS
'Tracks platform readiness for each workspace. All gates must pass for is_ready = TRUE.
Gates: has_admin, has_rbac_configured, has_warehouse, has_vehicle, has_packaging_rules';

COMMENT ON COLUMN public.workspace_readiness.is_ready IS
'Generated column: TRUE only when all readiness gates pass. Used to block planning features.';

COMMENT ON COLUMN public.workspace_readiness.became_ready_at IS
'Timestamp when the workspace first achieved full readiness (all gates passed).';

-- Step 12: Verification
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'workspace_readiness'
  ) THEN
    RAISE EXCEPTION 'Migration verification failed: workspace_readiness table not created';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Platform Readiness Migration Complete';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Created table: workspace_readiness';
  RAISE NOTICE 'Created view: workspace_readiness_details';
  RAISE NOTICE 'Readiness gates:';
  RAISE NOTICE '  - has_admin (auto-detected on workspace_member insert)';
  RAISE NOTICE '  - has_rbac_configured (auto-detected)';
  RAISE NOTICE '  - has_warehouse (auto-detected on facility insert)';
  RAISE NOTICE '  - has_vehicle (auto-detected on vehicle insert)';
  RAISE NOTICE '  - has_packaging_rules (from packaging_slot_costs)';
  RAISE NOTICE '=================================================================';
END $$;
