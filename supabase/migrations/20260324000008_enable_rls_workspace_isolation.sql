-- ============================================================================
-- PHASE 5: ENABLE RLS WORKSPACE ISOLATION
-- ============================================================================
-- Creates workspace isolation policies on operational tables.
-- Users can only see/modify data belonging to workspaces they are members of.
--
-- CRITICAL: This migration must only go live AFTER:
-- - Phase 3.4 (NOT NULL constraints on workspace_id) is verified
-- - Phase 4.5 (frontend hooks scope by workspace_id) is deployed
-- ============================================================================

BEGIN;

-- ============================================================
-- 1. HELPER FUNCTION: is_workspace_member_v2
-- ============================================================
-- SECURITY DEFINER so it can check workspace_members without
-- needing RLS on workspace_members itself.

CREATE OR REPLACE FUNCTION public.is_workspace_member_v2(p_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = auth.uid()
      AND workspace_id = p_workspace_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_workspace_member_v2(UUID) TO authenticated;

-- ============================================================
-- 2. REQUISITIONS
-- ============================================================

ALTER TABLE public.requisitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_isolation" ON public.requisitions;
CREATE POLICY "workspace_isolation" ON public.requisitions
  FOR ALL TO authenticated
  USING (is_workspace_member_v2(workspace_id))
  WITH CHECK (is_workspace_member_v2(workspace_id));

-- ============================================================
-- 3. DELIVERY_BATCHES
-- ============================================================

ALTER TABLE public.delivery_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_isolation" ON public.delivery_batches;
CREATE POLICY "workspace_isolation" ON public.delivery_batches
  FOR ALL TO authenticated
  USING (is_workspace_member_v2(workspace_id))
  WITH CHECK (is_workspace_member_v2(workspace_id));

-- ============================================================
-- 4. INVOICES
-- ============================================================

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_isolation" ON public.invoices;
CREATE POLICY "workspace_isolation" ON public.invoices
  FOR ALL TO authenticated
  USING (is_workspace_member_v2(workspace_id))
  WITH CHECK (is_workspace_member_v2(workspace_id));

-- ============================================================
-- 5. DRIVERS
-- ============================================================

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_isolation" ON public.drivers;
CREATE POLICY "workspace_isolation" ON public.drivers
  FOR ALL TO authenticated
  USING (is_workspace_member_v2(workspace_id))
  WITH CHECK (is_workspace_member_v2(workspace_id));

-- ============================================================
-- 6. VEHICLES
-- ============================================================

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_isolation" ON public.vehicles;
CREATE POLICY "workspace_isolation" ON public.vehicles
  FOR ALL TO authenticated
  USING (is_workspace_member_v2(workspace_id))
  WITH CHECK (is_workspace_member_v2(workspace_id));

-- ============================================================
-- 7. PRE_BATCHES (scheduler_batches)
-- ============================================================

ALTER TABLE public.scheduler_pre_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_isolation" ON public.scheduler_pre_batches;
CREATE POLICY "workspace_isolation" ON public.scheduler_pre_batches
  FOR ALL TO authenticated
  USING (is_workspace_member_v2(workspace_id))
  WITH CHECK (is_workspace_member_v2(workspace_id));

-- ============================================================
-- 8. ZONES
-- ============================================================

ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_isolation" ON public.zones;
CREATE POLICY "workspace_isolation" ON public.zones
  FOR ALL TO authenticated
  USING (is_workspace_member_v2(workspace_id))
  WITH CHECK (is_workspace_member_v2(workspace_id));

-- ============================================================
-- 9. FACILITIES
-- ============================================================

ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;

-- Drop old open policies if they exist
DROP POLICY IF EXISTS "Authenticated users can insert facilities" ON public.facilities;
DROP POLICY IF EXISTS "workspace_isolation" ON public.facilities;

CREATE POLICY "workspace_isolation" ON public.facilities
  FOR ALL TO authenticated
  USING (is_workspace_member_v2(workspace_id))
  WITH CHECK (is_workspace_member_v2(workspace_id));

-- ============================================================
-- 10. DRIVER ISOLATION POLICY
-- ============================================================
-- Drivers (MOD4 users) can only see batches assigned to them,
-- in addition to the workspace isolation.

DROP POLICY IF EXISTS "driver_own_batches" ON public.delivery_batches;
CREATE POLICY "driver_own_batches" ON public.delivery_batches
  FOR SELECT TO authenticated
  USING (
    -- Drivers can see batches assigned to them via mod4_driver_links
    EXISTS (
      SELECT 1 FROM public.mod4_driver_links ml
      JOIN public.drivers d ON d.id = ml.driver_id
      WHERE d.id = delivery_batches.driver_id
        AND ml.user_id = auth.uid()
        AND ml.status = 'active'
    )
  );

COMMIT;

-- ============================================================================
-- DONE: RLS workspace isolation is enabled.
--
-- Tables with workspace isolation:
-- - requisitions, delivery_batches, invoices, drivers, vehicles
-- - scheduler_pre_batches, zones, facilities
--
-- Additional policies:
-- - Drivers can see their own assigned batches
--
-- SECURITY DEFINER views (14 analytics views) are unaffected —
-- they bypass RLS by design and provide read-only dashboard data.
-- ============================================================================
