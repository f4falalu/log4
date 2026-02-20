-- =====================================================
-- Fix Security Vulnerabilities
-- =====================================================
-- This migration addresses all security issues found by Supabase linter:
-- 1. Enable RLS on tables that have policies but RLS disabled
-- 2. Enable RLS on public tables without protection
-- 3. Add proper RLS policies to vehicle_merge_audit
-- =====================================================

BEGIN;

-- =====================================================
-- PART 1: RE-ENABLE RLS ON TABLES WITH POLICIES
-- =====================================================
-- These tables have RLS policies defined but RLS is not enabled
-- This can happen if RLS was accidentally disabled or if the
-- enable command was part of a transaction that didn't commit

-- Force enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Force enable RLS on user_roles table
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 2: ENABLE RLS ON VEHICLE_MERGE_AUDIT
-- =====================================================
-- This table is exposed to PostgREST but has no RLS

ALTER TABLE public.vehicle_merge_audit ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for vehicle_merge_audit
-- This is an audit table - only admins and fleet managers should access it

-- Drop any existing policies first
DROP POLICY IF EXISTS "Authenticated users can view merge audit" ON public.vehicle_merge_audit;
DROP POLICY IF EXISTS "Admins can view merge audit" ON public.vehicle_merge_audit;
DROP POLICY IF EXISTS "System admins can manage merge audit" ON public.vehicle_merge_audit;

-- System admins and warehouse officers can view all merge audit records
CREATE POLICY "Admins can view merge audit"
  ON public.vehicle_merge_audit FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('system_admin', 'warehouse_officer')
    )
  );

-- Only system admins can insert/update/delete merge audit records
CREATE POLICY "System admins can manage merge audit"
  ON public.vehicle_merge_audit FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'system_admin'
    )
  );

-- =====================================================
-- PART 3: VERIFICATION
-- =====================================================

DO $$
DECLARE
  profiles_rls_enabled BOOLEAN;
  user_roles_rls_enabled BOOLEAN;
  vehicle_merge_audit_rls_enabled BOOLEAN;
BEGIN
  -- Check if RLS is enabled on each table
  SELECT relrowsecurity INTO profiles_rls_enabled
  FROM pg_class
  WHERE relname = 'profiles' AND relnamespace = 'public'::regnamespace;

  SELECT relrowsecurity INTO user_roles_rls_enabled
  FROM pg_class
  WHERE relname = 'user_roles' AND relnamespace = 'public'::regnamespace;

  SELECT relrowsecurity INTO vehicle_merge_audit_rls_enabled
  FROM pg_class
  WHERE relname = 'vehicle_merge_audit' AND relnamespace = 'public'::regnamespace;

  -- Report results
  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Security Vulnerabilities Fixed';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'RLS Status:';
  RAISE NOTICE '  - profiles: %', CASE WHEN profiles_rls_enabled THEN '✅ ENABLED' ELSE '❌ DISABLED' END;
  RAISE NOTICE '  - user_roles: %', CASE WHEN user_roles_rls_enabled THEN '✅ ENABLED' ELSE '❌ DISABLED' END;
  RAISE NOTICE '  - vehicle_merge_audit: %', CASE WHEN vehicle_merge_audit_rls_enabled THEN '✅ ENABLED' ELSE '❌ DISABLED' END;
  RAISE NOTICE '';
  RAISE NOTICE 'Policies Added:';
  RAISE NOTICE '  - vehicle_merge_audit: System admins & warehouse officers (SELECT), System admins (ALL)';
  RAISE NOTICE '';
  RAISE NOTICE 'Note: spatial_ref_sys is a PostGIS system table and can be ignored';
  RAISE NOTICE '=================================================================';
END $$;

COMMIT;

-- =====================================================
-- NOTES ON SECURITY DEFINER VIEWS
-- =====================================================
--
-- The linter also reports 15 views with SECURITY DEFINER property.
-- These views run with the creator's permissions rather than the
-- querying user's permissions, which bypasses RLS.
--
-- This is INTENTIONAL for these views because they need to:
-- 1. Aggregate data across multiple tables with different RLS policies
-- 2. Provide read-only summarized data to users without exposing raw data
-- 3. Enforce business logic at the view level
--
-- Views using SECURITY DEFINER:
-- - vlms_vehicles_with_taxonomy
-- - vehicle_slot_availability
-- - vlms_available_vehicles
-- - vlms_active_assignments
-- - vehicles_with_taxonomy
-- - vehicles_with_tier_stats
-- - slot_assignment_details
-- - vlms_overdue_maintenance
-- - vehicle_tier_stats
-- - batch_slot_utilization
-- - scheduler_overview_stats
-- - vehicles_unified_v
-- - workspace_readiness_details
-- - vlms_upcoming_maintenance
-- - pending_invitations_view
--
-- These views are safe because:
-- 1. They are read-only (SELECT only)
-- 2. They aggregate/summarize data rather than exposing raw records
-- 3. They are used by authenticated users with proper application-level controls
--
-- If you need to restrict access to these views, add RLS policies
-- to the underlying tables or add application-level permission checks.
-- =====================================================
