-- ============================================================================
-- DROP EXISTING POLICIES - Run this FIRST
-- ============================================================================
-- This script safely drops any existing policies that might conflict
-- Run this before running DEPLOY_ALL_MIGRATIONS.sql
-- ============================================================================

-- Trade-off table policies
DROP POLICY IF EXISTS "Users can view tradeoffs" ON public.tradeoffs;
DROP POLICY IF EXISTS "Users can create tradeoffs" ON public.tradeoffs;
DROP POLICY IF EXISTS "Users can update tradeoffs" ON public.tradeoffs;
DROP POLICY IF EXISTS "Users can view tradeoff items" ON public.tradeoff_items;
DROP POLICY IF EXISTS "Users can manage tradeoff items" ON public.tradeoff_items;
DROP POLICY IF EXISTS "Users can view confirmations" ON public.tradeoff_confirmations;
DROP POLICY IF EXISTS "Users can update confirmations" ON public.tradeoff_confirmations;
DROP POLICY IF EXISTS "Users can view routes" ON public.tradeoff_routes;

-- Planning table policies
DROP POLICY IF EXISTS "Users can view zone configurations" ON public.zone_configurations;
DROP POLICY IF EXISTS "Users can create zone configurations" ON public.zone_configurations;
DROP POLICY IF EXISTS "Users can update zone configurations" ON public.zone_configurations;
DROP POLICY IF EXISTS "Users can view route sketches" ON public.route_sketches;
DROP POLICY IF EXISTS "Users can manage route sketches" ON public.route_sketches;
DROP POLICY IF EXISTS "Users can view facility assignments" ON public.facility_assignments;
DROP POLICY IF EXISTS "Users can manage facility assignments" ON public.facility_assignments;
DROP POLICY IF EXISTS "Users can view audit logs" ON public.map_action_audit;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.map_action_audit;
DROP POLICY IF EXISTS "Users can view query logs" ON public.forensics_query_log;
DROP POLICY IF EXISTS "System can insert query logs" ON public.forensics_query_log;

-- Payloads table policies (skip if table doesn't exist - it will be created)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payloads') THEN
    DROP POLICY IF EXISTS "Enable read access for authenticated users" ON payloads;
    DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON payloads;
  END IF;
END $$;

-- ============================================================================
-- SUCCESS - Now run DEPLOY_ALL_MIGRATIONS.sql
-- ============================================================================
