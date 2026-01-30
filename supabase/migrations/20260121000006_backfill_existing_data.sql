-- =====================================================
-- Migration: Backfill Existing Data
-- =====================================================
-- Initializes onboarding status for existing workspaces and users.
-- This migration is idempotent and safe to run multiple times.
-- =====================================================

-- =====================================================
-- 1. BACKFILL WORKSPACE READINESS
-- =====================================================

-- Initialize readiness records for all existing workspaces
INSERT INTO public.workspace_readiness (
  workspace_id,
  has_admin,
  has_rbac_configured,
  has_warehouse,
  has_vehicle,
  has_packaging_rules,
  admin_configured_at,
  rbac_configured_at,
  first_warehouse_at,
  first_vehicle_at,
  packaging_configured_at
)
SELECT
  w.id AS workspace_id,
  -- has_admin: check if workspace has an owner
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = w.id AND wm.role = 'owner'
  ) AS has_admin,
  -- has_rbac_configured: true if any user has roles
  TRUE AS has_rbac_configured,
  -- has_warehouse: check for warehouse-type facilities
  EXISTS (
    SELECT 1 FROM facilities f
    WHERE f.workspace_id = w.id
    AND f.type::text IN ('warehouse', 'central_warehouse', 'zonal_warehouse', 'state_warehouse')
  ) AS has_warehouse,
  -- has_vehicle: check for any vehicles (global check since vehicles aren't workspace-scoped yet)
  EXISTS (
    SELECT 1 FROM vlms_vehicles v
    WHERE TRUE
  ) AS has_vehicle,
  -- has_packaging_rules: check for active packaging costs
  EXISTS (
    SELECT 1 FROM packaging_slot_costs
    WHERE is_active = TRUE
  ) AS has_packaging_rules,
  -- Timestamps
  CASE WHEN EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = w.id AND wm.role = 'owner'
  ) THEN w.created_at END AS admin_configured_at,
  w.created_at AS rbac_configured_at,
  (
    SELECT MIN(f.created_at) FROM facilities f
    WHERE f.workspace_id = w.id
    AND f.type::text IN ('warehouse', 'central_warehouse', 'zonal_warehouse', 'state_warehouse')
  ) AS first_warehouse_at,
  (
    SELECT MIN(v.created_at) FROM vlms_vehicles v
    WHERE TRUE
  ) AS first_vehicle_at,
  NOW() AS packaging_configured_at
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM workspace_readiness wr WHERE wr.workspace_id = w.id
)
ON CONFLICT (workspace_id) DO UPDATE
SET
  has_admin = EXCLUDED.has_admin OR workspace_readiness.has_admin,
  has_rbac_configured = TRUE,
  has_warehouse = EXCLUDED.has_warehouse OR workspace_readiness.has_warehouse,
  has_vehicle = EXCLUDED.has_vehicle OR workspace_readiness.has_vehicle,
  has_packaging_rules = EXCLUDED.has_packaging_rules OR workspace_readiness.has_packaging_rules,
  admin_configured_at = COALESCE(workspace_readiness.admin_configured_at, EXCLUDED.admin_configured_at),
  first_warehouse_at = COALESCE(workspace_readiness.first_warehouse_at, EXCLUDED.first_warehouse_at),
  first_vehicle_at = COALESCE(workspace_readiness.first_vehicle_at, EXCLUDED.first_vehicle_at),
  packaging_configured_at = COALESCE(workspace_readiness.packaging_configured_at, EXCLUDED.packaging_configured_at),
  updated_at = NOW();

-- =====================================================
-- 2. UPDATE WORKSPACE ORG STATUS
-- =====================================================

-- Update org_status based on current readiness
-- Use a DO block to bypass the state transition trigger for backfill
DO $$
DECLARE
  v_workspace RECORD;
  v_readiness RECORD;
  v_new_status org_status;
BEGIN
  FOR v_workspace IN SELECT * FROM workspaces LOOP
    SELECT * INTO v_readiness
    FROM workspace_readiness
    WHERE workspace_id = v_workspace.id;

    -- Determine appropriate status
    IF v_readiness IS NULL THEN
      v_new_status := 'org_created';
    ELSIF v_readiness.is_ready THEN
      v_new_status := 'active';
    ELSIF v_readiness.has_warehouse AND v_readiness.has_vehicle THEN
      v_new_status := 'operational_config_complete';
    ELSIF v_workspace.operating_model IS NOT NULL AND v_workspace.primary_contact_email IS NOT NULL THEN
      v_new_status := 'basic_config_complete';
    ELSIF v_readiness.has_admin THEN
      v_new_status := 'admin_assigned';
    ELSE
      v_new_status := 'org_created';
    END IF;

    -- Disable trigger temporarily for this update
    -- Direct update bypassing validation since this is a backfill
    UPDATE workspaces
    SET org_status = v_new_status
    WHERE id = v_workspace.id
    AND org_status IS DISTINCT FROM v_new_status;

  END LOOP;
END $$;

-- =====================================================
-- 3. BACKFILL USER PROFILES
-- =====================================================

-- Disable the status transition trigger during backfill
ALTER TABLE public.profiles DISABLE TRIGGER validate_user_status_transition_trigger;

-- Update user_status based on existing role assignments
UPDATE public.profiles p
SET
  user_status = CASE
    WHEN EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p.id) THEN 'active'::user_status
    ELSE 'registered'::user_status
  END,
  registered_at = COALESCE(p.registered_at, p.created_at),
  role_assigned_at = CASE
    WHEN EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p.id) THEN
      COALESCE(p.role_assigned_at, (
        SELECT MIN(ur.assigned_at) FROM user_roles ur WHERE ur.user_id = p.id
      ))
    ELSE NULL
  END,
  activated_at = CASE
    WHEN EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p.id) THEN
      COALESCE(p.activated_at, p.created_at)
    ELSE NULL
  END
WHERE p.user_status IS NULL OR p.user_status = 'registered';

-- Re-enable the trigger
ALTER TABLE public.profiles ENABLE TRIGGER validate_user_status_transition_trigger;

-- =====================================================
-- 4. ENSURE WORKSPACE OWNERS HAVE SYSTEM_ADMIN ROLE
-- =====================================================

-- All workspace owners should have system_admin role
INSERT INTO public.user_roles (user_id, role, assigned_by, assigned_at)
SELECT
  wm.user_id,
  'system_admin'::app_role,
  wm.user_id,
  wm.created_at
FROM workspace_members wm
WHERE wm.role = 'owner'
AND NOT EXISTS (
  SELECT 1 FROM user_roles ur
  WHERE ur.user_id = wm.user_id
  AND ur.role = 'system_admin'
)
ON CONFLICT (user_id, role) DO NOTHING;

-- =====================================================
-- 5. SET ONBOARDING COMPLETED FOR ACTIVE WORKSPACES
-- =====================================================

UPDATE public.workspaces w
SET onboarding_completed_at = COALESCE(
  onboarding_completed_at,
  (SELECT became_ready_at FROM workspace_readiness WHERE workspace_id = w.id),
  NOW()
)
WHERE org_status = 'active'
AND onboarding_completed_at IS NULL;

-- =====================================================
-- 6. VERIFICATION
-- =====================================================

DO $$
DECLARE
  v_workspace_count INTEGER;
  v_readiness_count INTEGER;
  v_ready_count INTEGER;
  v_user_count INTEGER;
  v_active_users INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_workspace_count FROM workspaces;
  SELECT COUNT(*) INTO v_readiness_count FROM workspace_readiness;
  SELECT COUNT(*) INTO v_ready_count FROM workspace_readiness WHERE is_ready = TRUE;
  SELECT COUNT(*) INTO v_user_count FROM profiles;
  SELECT COUNT(*) INTO v_active_users FROM profiles WHERE user_status = 'active';

  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Data Backfill Migration Complete';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Workspaces:';
  RAISE NOTICE '  Total: %', v_workspace_count;
  RAISE NOTICE '  With readiness records: %', v_readiness_count;
  RAISE NOTICE '  Fully ready: %', v_ready_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Users:';
  RAISE NOTICE '  Total profiles: %', v_user_count;
  RAISE NOTICE '  Active users: %', v_active_users;
  RAISE NOTICE '=================================================================';
END $$;
