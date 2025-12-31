-- Refresh Analytics Materialized Views
--
-- Purpose: Refresh all analytics materialized views to ensure they have current data
--          and to resolve any potential initialization issues

-- Refresh all analytics views (without CONCURRENTLY since they're new/empty)
REFRESH MATERIALIZED VIEW analytics.delivery_performance;
REFRESH MATERIALIZED VIEW analytics.driver_efficiency;
REFRESH MATERIALIZED VIEW analytics.vehicle_utilization;
REFRESH MATERIALIZED VIEW analytics.cost_analysis;

-- Verify views are accessible
DO $$
DECLARE
  dp_count INTEGER;
  de_count INTEGER;
  vu_count INTEGER;
  ca_count INTEGER;
BEGIN
  -- Test that all views can be queried
  SELECT COUNT(*) INTO dp_count FROM analytics.delivery_performance;
  SELECT COUNT(*) INTO de_count FROM analytics.driver_efficiency;
  SELECT COUNT(*) INTO vu_count FROM analytics.vehicle_utilization;
  SELECT COUNT(*) INTO ca_count FROM analytics.cost_analysis;

  RAISE NOTICE 'Analytics views refreshed successfully:';
  RAISE NOTICE '  - delivery_performance: % rows', dp_count;
  RAISE NOTICE '  - driver_efficiency: % rows', de_count;
  RAISE NOTICE '  - vehicle_utilization: % rows', vu_count;
  RAISE NOTICE '  - cost_analysis: % rows', ca_count;
END $$;
