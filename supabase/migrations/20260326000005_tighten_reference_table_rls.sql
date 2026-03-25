-- ============================================================================
-- Migration: Tighten Reference Table RLS
-- ============================================================================
-- Ensures shared lookup/taxonomy tables have consistent RLS:
--   SELECT: all authenticated users (shared reference data)
--   INSERT/UPDATE/DELETE: workspace owner/admin only
-- These tables are intentionally NOT workspace-scoped.
-- ============================================================================

-- =====================================================
-- 0. RE-CREATE is_admin() as v2-compatible helper
-- =====================================================
-- Returns TRUE if the current user is owner or admin of any workspace.
-- Used only for shared reference tables that are not workspace-scoped.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND status = 'active'
  );
$$;

-- =====================================================
-- 1. VEHICLE_TIERS — currently allows all authenticated to mutate
-- =====================================================

DROP POLICY IF EXISTS "Allow insert on vehicle_tiers for authenticated users" ON public.vehicle_tiers;
DROP POLICY IF EXISTS "Allow update on vehicle_tiers for authenticated users" ON public.vehicle_tiers;
DROP POLICY IF EXISTS "Allow delete on vehicle_tiers for authenticated users" ON public.vehicle_tiers;

CREATE POLICY "Admins can insert vehicle_tiers"
  ON public.vehicle_tiers FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update vehicle_tiers"
  ON public.vehicle_tiers FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete vehicle_tiers"
  ON public.vehicle_tiers FOR DELETE TO authenticated
  USING (is_admin());

-- =====================================================
-- 2. VEHICLE_TYPES — insert is too permissive
-- =====================================================

DROP POLICY IF EXISTS "Allow insert on vehicle_types for authenticated users" ON public.vehicle_types;

CREATE POLICY "Admins can insert vehicle_types"
  ON public.vehicle_types FOR INSERT TO authenticated
  WITH CHECK (is_admin());

-- update/delete already restricted to creators/admins — OK

-- =====================================================
-- 3. FACILITY_TYPES — no write policies exist, add admin-only
-- =====================================================

CREATE POLICY "Admins can manage facility_types"
  ON public.facility_types FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- =====================================================
-- 4. LEVELS_OF_CARE — no write policies exist, add admin-only
-- =====================================================

CREATE POLICY "Admins can manage levels_of_care"
  ON public.levels_of_care FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- =====================================================
-- 5. VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Reference Table RLS Tightening Complete';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'vehicle_tiers: INSERT/UPDATE/DELETE restricted to admins';
  RAISE NOTICE 'vehicle_types: INSERT restricted to admins';
  RAISE NOTICE 'facility_types: ALL mutations restricted to admins';
  RAISE NOTICE 'levels_of_care: ALL mutations restricted to admins';
  RAISE NOTICE 'vehicle_categories: already admin-restricted (no change)';
  RAISE NOTICE 'funding_sources: already admin-restricted (no change)';
  RAISE NOTICE '=================================================================';
END $$;
