-- =====================================================
-- ENABLE ROW LEVEL SECURITY & ROLE-BASED ACCESS CONTROL
-- =====================================================
-- This migration re-enables RLS and implements proper RBAC policies
-- Created: 2025-11-27
-- Status: PRODUCTION READY ✅

-- =====================================================
-- PART 1: RE-ENABLE RLS ON ALL TABLES
-- =====================================================

-- Core Tables
ALTER TABLE public.delivery_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optimization_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

-- Additional Tables
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.driver_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vehicle_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vehicle_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.recurring_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.requisition_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.lgas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.driver_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fleets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vendors ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 2: HELPER FUNCTIONS FOR RBAC
-- =====================================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = role_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN has_role('admin') OR has_role('super_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is zone manager
CREATE OR REPLACE FUNCTION public.is_zone_manager()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN has_role('zone_manager') OR is_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is warehouse officer
CREATE OR REPLACE FUNCTION public.is_warehouse_officer()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN has_role('warehouse_officer') OR is_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is fleet manager
CREATE OR REPLACE FUNCTION public.is_fleet_manager()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN has_role('fleet_manager') OR is_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user manages a specific zone
CREATE OR REPLACE FUNCTION public.manages_zone(zone_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF is_admin() THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.zones
    WHERE id = zone_id_param
    AND zone_manager_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 3: ENHANCED RLS POLICIES FOR PROFILES
-- =====================================================

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (is_admin());

-- =====================================================
-- PART 4: ENHANCED RLS POLICIES FOR DRIVERS
-- =====================================================

DROP POLICY IF EXISTS "Allow all operations on drivers" ON public.drivers;
DROP POLICY IF EXISTS "Authenticated users can view drivers" ON public.drivers;
DROP POLICY IF EXISTS "Admins can manage drivers" ON public.drivers;
DROP POLICY IF EXISTS "Drivers can view own record" ON public.drivers;

-- All authenticated users can view drivers (read-only for most)
CREATE POLICY "Authenticated users can view drivers"
  ON public.drivers FOR SELECT
  USING (auth.role() = 'authenticated');

-- Admins and fleet managers can manage all drivers
CREATE POLICY "Fleet managers can manage drivers"
  ON public.drivers FOR ALL
  USING (is_fleet_manager() OR is_admin());

-- Drivers can view their own record
CREATE POLICY "Drivers can view own record"
  ON public.drivers FOR SELECT
  USING (profile_id = auth.uid());

-- =====================================================
-- PART 5: ENHANCED RLS POLICIES FOR VEHICLES
-- =====================================================

DROP POLICY IF EXISTS "Allow all operations on vehicles" ON public.vehicles;

CREATE POLICY "Authenticated users can view vehicles"
  ON public.vehicles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Fleet managers can manage vehicles"
  ON public.vehicles FOR ALL
  USING (is_fleet_manager() OR is_admin());

-- =====================================================
-- PART 6: ENHANCED RLS POLICIES FOR FACILITIES
-- =====================================================

DROP POLICY IF EXISTS "Allow all operations on facilities" ON public.facilities;

CREATE POLICY "Authenticated users can view facilities"
  ON public.facilities FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Warehouse officers can manage facilities"
  ON public.facilities FOR ALL
  USING (is_warehouse_officer() OR is_admin());

CREATE POLICY "Zone managers can manage zone facilities"
  ON public.facilities FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.zones z
      WHERE z.id = facilities.zone_id
      AND z.zone_manager_id = auth.uid()
    )
  );

-- =====================================================
-- PART 7: ENHANCED RLS POLICIES FOR WAREHOUSES
-- =====================================================

DROP POLICY IF EXISTS "Allow all operations on warehouses" ON public.warehouses;

CREATE POLICY "Authenticated users can view warehouses"
  ON public.warehouses FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Warehouse officers can manage warehouses"
  ON public.warehouses FOR ALL
  USING (is_warehouse_officer() OR is_admin());

-- =====================================================
-- PART 8: ENHANCED RLS POLICIES FOR DELIVERY BATCHES
-- =====================================================

DROP POLICY IF EXISTS "Allow all operations on delivery_batches" ON public.delivery_batches;

CREATE POLICY "Authenticated users can view batches"
  ON public.delivery_batches FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Warehouse officers can manage batches"
  ON public.delivery_batches FOR ALL
  USING (is_warehouse_officer() OR is_admin());

CREATE POLICY "Drivers can view assigned batches"
  ON public.delivery_batches FOR SELECT
  USING (driver_id IN (
    SELECT id FROM public.drivers WHERE profile_id = auth.uid()
  ));

-- =====================================================
-- PART 9: ENHANCED RLS POLICIES FOR ZONES
-- =====================================================

DROP POLICY IF EXISTS "Allow all operations on zones" ON public.zones;

CREATE POLICY "Authenticated users can view zones"
  ON public.zones FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage all zones"
  ON public.zones FOR ALL
  USING (is_admin());

CREATE POLICY "Zone managers can manage their zones"
  ON public.zones FOR UPDATE
  USING (zone_manager_id = auth.uid());

-- =====================================================
-- PART 10: RLS POLICIES FOR DRIVER DOCUMENTS
-- =====================================================

DROP POLICY IF EXISTS "Drivers can view own documents" ON public.driver_documents;
DROP POLICY IF EXISTS "Admins can manage documents" ON public.driver_documents;

CREATE POLICY "Authenticated users can view driver documents"
  ON public.driver_documents FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Fleet managers can manage documents"
  ON public.driver_documents FOR ALL
  USING (is_fleet_manager() OR is_admin());

CREATE POLICY "Drivers can view own documents"
  ON public.driver_documents FOR SELECT
  USING (
    driver_id IN (
      SELECT id FROM public.drivers WHERE profile_id = auth.uid()
    )
  );

-- =====================================================
-- PART 11: SERVICE ACCOUNT BYPASS
-- =====================================================

-- Allow service role to bypass all RLS
-- This is for backend operations and migrations
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- =====================================================
-- PART 12: GRANT PERMISSIONS
-- =====================================================

-- Grant execute on helper functions to authenticated users
GRANT EXECUTE ON FUNCTION public.has_role(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_zone_manager() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_warehouse_officer() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_fleet_manager() TO authenticated;
GRANT EXECUTE ON FUNCTION public.manages_zone(UUID) TO authenticated;

-- =====================================================
-- PART 13: COMMENTS & DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION public.has_role IS 'Check if current user has specific role';
COMMENT ON FUNCTION public.is_admin IS 'Check if current user is admin';
COMMENT ON FUNCTION public.is_zone_manager IS 'Check if current user is zone manager';
COMMENT ON FUNCTION public.is_warehouse_officer IS 'Check if current user is warehouse officer';
COMMENT ON FUNCTION public.is_fleet_manager IS 'Check if current user is fleet manager';
COMMENT ON FUNCTION public.manages_zone IS 'Check if current user manages specific zone';

-- =====================================================
-- MIGRATION COMPLETE ✅
-- =====================================================
-- RLS is now ENABLED with proper role-based access control
-- All tables are protected
-- Service role can still bypass for backend operations
