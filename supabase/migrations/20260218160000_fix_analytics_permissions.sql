-- =====================================================
-- Fix Analytics Materialized View Permissions
-- =====================================================
-- Problem: refresh_* trigger functions lack SECURITY DEFINER,
-- causing permission errors when regular users insert batches.
--
-- Solution: Add SECURITY DEFINER to all refresh functions so
-- they can refresh materialized views regardless of caller.
-- =====================================================

-- =====================================================
-- 1. DROP AND RECREATE REFRESH FUNCTIONS WITH SECURITY DEFINER
-- =====================================================

-- Drop existing functions
DROP FUNCTION IF EXISTS refresh_delivery_performance() CASCADE;
DROP FUNCTION IF EXISTS refresh_driver_efficiency() CASCADE;
DROP FUNCTION IF EXISTS refresh_vehicle_utilization() CASCADE;
DROP FUNCTION IF EXISTS refresh_cost_analysis() CASCADE;

-- Recreate refresh_delivery_performance with SECURITY DEFINER
CREATE OR REPLACE FUNCTION refresh_delivery_performance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, analytics
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.delivery_performance;
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION refresh_delivery_performance() IS
'Refreshes delivery_performance materialized view. SECURITY DEFINER allows regular users to trigger refresh via INSERT/UPDATE on delivery_batches.';

-- Recreate refresh_driver_efficiency with SECURITY DEFINER
CREATE OR REPLACE FUNCTION refresh_driver_efficiency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, analytics
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.driver_efficiency;
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION refresh_driver_efficiency() IS
'Refreshes driver_efficiency materialized view. SECURITY DEFINER allows regular users to trigger refresh.';

-- Recreate refresh_vehicle_utilization with SECURITY DEFINER
CREATE OR REPLACE FUNCTION refresh_vehicle_utilization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, analytics
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.vehicle_utilization;
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION refresh_vehicle_utilization() IS
'Refreshes vehicle_utilization materialized view. SECURITY DEFINER allows regular users to trigger refresh.';

-- Recreate refresh_cost_analysis with SECURITY DEFINER
CREATE OR REPLACE FUNCTION refresh_cost_analysis()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, analytics
AS $$
BEGIN
  -- Note: cost_analysis doesn't have a unique index, so we can't use CONCURRENTLY
  REFRESH MATERIALIZED VIEW analytics.cost_analysis;
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION refresh_cost_analysis() IS
'Refreshes cost_analysis materialized view. SECURITY DEFINER allows regular users to trigger refresh via INSERT on delivery_batches.';

-- =====================================================
-- 2. RECREATE TRIGGERS (in case CASCADE dropped them)
-- =====================================================

-- Delivery Performance Triggers
DROP TRIGGER IF EXISTS trg_refresh_delivery_perf ON public.delivery_batches;
CREATE TRIGGER trg_refresh_delivery_perf
AFTER INSERT OR UPDATE OR DELETE ON public.delivery_batches
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_delivery_performance();

-- Driver Efficiency Triggers
DROP TRIGGER IF EXISTS trg_refresh_driver_efficiency_drivers ON public.drivers;
CREATE TRIGGER trg_refresh_driver_efficiency_drivers
AFTER INSERT OR UPDATE OR DELETE ON public.drivers
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_driver_efficiency();

DROP TRIGGER IF EXISTS trg_refresh_driver_efficiency_batches ON public.delivery_batches;
CREATE TRIGGER trg_refresh_driver_efficiency_batches
AFTER INSERT OR UPDATE OR DELETE ON public.delivery_batches
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_driver_efficiency();

DROP TRIGGER IF EXISTS trg_refresh_driver_efficiency_trips ON public.vehicle_trips;
CREATE TRIGGER trg_refresh_driver_efficiency_trips
AFTER INSERT OR UPDATE OR DELETE ON public.vehicle_trips
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_driver_efficiency();

DROP TRIGGER IF EXISTS trg_refresh_driver_efficiency_notifications ON public.notifications;
CREATE TRIGGER trg_refresh_driver_efficiency_notifications
AFTER INSERT OR UPDATE OR DELETE ON public.notifications
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_driver_efficiency();

-- Vehicle Utilization Triggers
DROP TRIGGER IF EXISTS trg_refresh_vehicle_utilization_vehicles ON public.vehicles;
CREATE TRIGGER trg_refresh_vehicle_utilization_vehicles
AFTER INSERT OR UPDATE OR DELETE ON public.vehicles
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_vehicle_utilization();

DROP TRIGGER IF EXISTS trg_refresh_vehicle_utilization_batches ON public.delivery_batches;
CREATE TRIGGER trg_refresh_vehicle_utilization_batches
AFTER INSERT OR UPDATE OR DELETE ON public.delivery_batches
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_vehicle_utilization();

DROP TRIGGER IF EXISTS trg_refresh_vehicle_utilization_trips ON public.vehicle_trips;
CREATE TRIGGER trg_refresh_vehicle_utilization_trips
AFTER INSERT OR UPDATE OR DELETE ON public.vehicle_trips
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_vehicle_utilization();

DROP TRIGGER IF EXISTS trg_refresh_vehicle_utilization_maintenance ON public.vehicle_maintenance;
CREATE TRIGGER trg_refresh_vehicle_utilization_maintenance
AFTER INSERT OR UPDATE OR DELETE ON public.vehicle_maintenance
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_vehicle_utilization();

-- Cost Analysis Triggers
DROP TRIGGER IF EXISTS trg_refresh_cost_analysis_maintenance ON public.vehicle_maintenance;
CREATE TRIGGER trg_refresh_cost_analysis_maintenance
AFTER INSERT OR UPDATE OR DELETE ON public.vehicle_maintenance
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_cost_analysis();

DROP TRIGGER IF EXISTS trg_refresh_cost_analysis_trips ON public.vehicle_trips;
CREATE TRIGGER trg_refresh_cost_analysis_trips
AFTER INSERT OR UPDATE OR DELETE ON public.vehicle_trips
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_cost_analysis();

DROP TRIGGER IF EXISTS trg_refresh_cost_analysis_batches ON public.delivery_batches;
CREATE TRIGGER trg_refresh_cost_analysis_batches
AFTER INSERT OR UPDATE OR DELETE ON public.delivery_batches
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_cost_analysis();

DROP TRIGGER IF EXISTS trg_refresh_cost_analysis_settings ON public.system_settings;
CREATE TRIGGER trg_refresh_cost_analysis_settings
AFTER INSERT OR UPDATE OR DELETE ON public.system_settings
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_cost_analysis();

-- =====================================================
-- 3. GRANT PERMISSIONS ON ANALYTICS SCHEMA
-- =====================================================

-- Grant usage on analytics schema to authenticated users
GRANT USAGE ON SCHEMA analytics TO authenticated, anon;

-- Grant select on all existing materialized views
GRANT SELECT ON analytics.delivery_performance TO authenticated, anon;
GRANT SELECT ON analytics.driver_efficiency TO authenticated, anon;
GRANT SELECT ON analytics.vehicle_utilization TO authenticated, anon;
GRANT SELECT ON analytics.cost_analysis TO authenticated, anon;

-- Grant select on all future materialized views in analytics schema
ALTER DEFAULT PRIVILEGES IN SCHEMA analytics
GRANT SELECT ON TABLES TO authenticated, anon;

-- =====================================================
-- COMPLETE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=============================================================';
  RAISE NOTICE 'Analytics permissions fixed!';
  RAISE NOTICE 'All refresh functions now have SECURITY DEFINER';
  RAISE NOTICE 'Users can now insert batches without permission errors';
  RAISE NOTICE '=============================================================';
END $$;
