-- =====================================================
-- 🚨 EMERGENCY FIX: Disable Default Workspace Auto-Add
-- =====================================================
--
-- CRITICAL SECURITY ISSUE IDENTIFIED:
--
-- Migration 20260218000001_setup_default_workspace.sql created a
-- "Default Workspace" and added ALL users to it via a trigger.
-- This COMPLETELY BREAKS multi-tenancy isolation!
--
-- IMPACT:
-- - All users from ALL organizations can see each other's data
-- - Organizations A, B, C all share the same workspace
-- - Workspace scoping (from 20260202000001) works correctly,
--   but is useless because everyone is in the same workspace
--
-- EVIDENCE:
-- - User admin@example.com (only system_admin in their org)
--   can see 2 system_admins in analytics
-- - This proves cross-organization data leakage
--
-- ROOT CAUSE:
-- - Trigger "trigger_add_user_to_default_workspace" auto-adds
--   ALL new users to workspace 00000000-0000-0000-0000-000000000001
-- - This treats the platform as single-tenant instead of multi-tenant
--
-- THIS MIGRATION:
-- 1. IMMEDIATELY disables the auto-add trigger
-- 2. Marks the default workspace as inactive
-- 3. Preserves existing data for audit/migration
-- 4. Documents the required architecture
--
-- =====================================================

-- =====================================================
-- 1. DISABLE THE AUTO-ADD TRIGGER
-- =====================================================

DROP TRIGGER IF EXISTS trigger_add_user_to_default_workspace ON auth.users;

DO $$
BEGIN
  RAISE NOTICE '🚨 EMERGENCY: Auto-add trigger DISABLED';
END $$;

-- =====================================================
-- 2. MARK DEFAULT WORKSPACE AS INACTIVE
-- =====================================================

UPDATE public.workspaces
SET
  is_active = false,
  description = '[DEPRECATED] Default workspace - DO NOT USE. Created by broken migration. All organizations must have separate workspaces.'
WHERE id = '00000000-0000-0000-0000-000000000001';

DO $$
BEGIN
  RAISE NOTICE '⚠️  Default workspace marked as INACTIVE';
END $$;

-- =====================================================
-- 3. AUDIT: Log current state
-- =====================================================

DO $$
DECLARE
  total_users INTEGER;
  users_in_default INTEGER;
  total_workspaces INTEGER;
  active_workspaces INTEGER;
BEGIN
  -- Count totals
  SELECT COUNT(*) INTO total_users FROM auth.users;

  SELECT COUNT(*) INTO users_in_default
  FROM workspace_members
  WHERE workspace_id = '00000000-0000-0000-0000-000000000001';

  SELECT COUNT(*) INTO total_workspaces FROM workspaces;

  SELECT COUNT(*) INTO active_workspaces FROM workspaces WHERE is_active = true;

  -- Log the audit
  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE '🔒 EMERGENCY SECURITY FIX APPLIED';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Total users in system: %', total_users;
  RAISE NOTICE 'Users in default workspace: %', users_in_default;
  RAISE NOTICE 'Total workspaces: %', total_workspaces;
  RAISE NOTICE 'Active workspaces: %', active_workspaces;
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  ACTION REQUIRED:';
  RAISE NOTICE '1. Run diagnose-workspace-isolation.sql to audit current state';
  RAISE NOTICE '2. Create organization-specific workspaces';
  RAISE NOTICE '3. Migrate users to their proper organization workspaces';
  RAISE NOTICE '4. Remove users from default workspace';
  RAISE NOTICE '';
  RAISE NOTICE 'ARCHITECTURE REQUIREMENT:';
  RAISE NOTICE '- Each organization MUST have its own workspace';
  RAISE NOTICE '- Users MUST only be members of their org workspace';
  RAISE NOTICE '- NO shared "default" workspace for all users';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- 4. COMMENT THE BROKEN FUNCTION
-- =====================================================

COMMENT ON FUNCTION public.add_user_to_default_workspace IS
'[DEPRECATED - SECURITY RISK] This function was adding all users to a shared workspace, breaking multi-tenancy. DO NOT RE-ENABLE. Each organization needs its own workspace.';

-- =====================================================
-- 5. CREATE HELPER VIEW FOR MIGRATION
-- =====================================================

-- View to help identify which users need to be migrated
CREATE OR REPLACE VIEW workspace_isolation_audit AS
SELECT
  w.id as workspace_id,
  w.name as workspace_name,
  w.is_active,
  COUNT(DISTINCT wm.user_id) as user_count,
  COUNT(DISTINCT CASE WHEN ur.role = 'system_admin' THEN ur.user_id END) as system_admin_count,
  array_agg(DISTINCT au.email ORDER BY au.email) FILTER (WHERE au.email IS NOT NULL) as user_emails
FROM workspaces w
LEFT JOIN workspace_members wm ON wm.workspace_id = w.id
LEFT JOIN auth.users au ON au.id = wm.user_id
LEFT JOIN user_roles ur ON ur.user_id = wm.user_id AND ur.role = 'system_admin'
GROUP BY w.id, w.name, w.is_active
ORDER BY w.created_at;

COMMENT ON VIEW workspace_isolation_audit IS
'Audit view showing user distribution across workspaces. Use this to identify multi-tenancy isolation issues.';

-- =====================================================
-- COMPLETE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Emergency fix complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. SELECT * FROM workspace_isolation_audit;';
  RAISE NOTICE '2. Identify organizations and create separate workspaces';
  RAISE NOTICE '3. Migrate users to correct workspaces';
  RAISE NOTICE '';
END $$;
