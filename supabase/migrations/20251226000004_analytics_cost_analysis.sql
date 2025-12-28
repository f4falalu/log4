-- Phase 2: Analytics Backend - Ticket A4
-- System Settings Table + Cost Analysis Materialized View
--
-- Purpose:
--   1. Create system_settings table for admin-controlled configuration
--   2. Pre-aggregate cost metrics using dynamic pricing from system_settings
--   3. Eliminate hardcoded prices and enable admin control
--
-- Performance Target: < 100ms for queries
-- Refresh Target: < 5 seconds even with 100K+ records
--
-- NOTE: Currency support is DEFERRED to a future phase.
--       All costs are unitless numeric values.
--       Workspace isolation will be added when workspaces table is implemented.

-- ============================================================================
-- 1. CREATE SYSTEM_SETTINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value_numeric NUMERIC(10,4),
  value_text TEXT,
  workspace_id UUID,  -- NULL = global default
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for workspace-specific lookups
CREATE INDEX idx_system_settings_workspace ON public.system_settings(workspace_id, key)
  WHERE workspace_id IS NOT NULL;

-- Insert required default cost settings (global defaults with workspace_id = NULL)
INSERT INTO public.system_settings (key, value_numeric, description, workspace_id) VALUES
  ('fuel_price_per_liter', 1.50, 'Default fuel price per liter (unitless numeric)', NULL),
  ('operational_cost_per_km', 0.50, 'Default operational cost per kilometer (unitless numeric)', NULL)
ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Everyone can read settings (required for cost calculations)
CREATE POLICY "All authenticated users can view system settings"
  ON public.system_settings FOR SELECT
  USING (auth.role() = 'authenticated');

-- RLS Policy: Only system_admin can update settings
CREATE POLICY "Only system admins can update system settings"
  ON public.system_settings FOR UPDATE
  USING (has_role(auth.uid(), 'system_admin'));

-- RLS Policy: Only system_admin can insert settings
CREATE POLICY "Only system admins can insert system settings"
  ON public.system_settings FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'system_admin'));

-- RLS Policy: Only system_admin can delete settings
CREATE POLICY "Only system admins can delete system settings"
  ON public.system_settings FOR DELETE
  USING (has_role(auth.uid(), 'system_admin'));

-- Trigger to auto-update metadata on changes
CREATE OR REPLACE FUNCTION update_system_settings_metadata()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_system_settings_metadata
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_system_settings_metadata();

COMMENT ON TABLE public.system_settings IS
  'System-wide configuration settings managed by system_admin.
   Used by analytics and other features for dynamic configuration.
   workspace_id = NULL for global defaults.
   Future: workspace-specific overrides when workspaces table is implemented.';

-- ============================================================================
-- 2. CREATE MATERIALIZED VIEW: cost_analysis
-- ============================================================================

CREATE MATERIALIZED VIEW analytics.cost_analysis AS
WITH cost_rates AS (
  -- Fetch current cost rates from system_settings (global defaults)
  SELECT
    (SELECT value_numeric FROM public.system_settings
     WHERE key = 'fuel_price_per_liter' AND workspace_id IS NULL
     LIMIT 1) as fuel_price_per_liter,
    (SELECT value_numeric FROM public.system_settings
     WHERE key = 'operational_cost_per_km' AND workspace_id IS NULL
     LIMIT 1) as operational_cost_per_km
),
fuel_costs AS (
  -- Calculate fuel costs from vehicle trips using dynamic pricing
  SELECT
    vt.id as trip_id,
    vt.vehicle_id,
    vt.driver_id,
    vt.batch_id,
    vt.fuel_consumed,
    ROUND(vt.fuel_consumed * COALESCE(cr.fuel_price_per_liter, 1.50), 2) as fuel_cost,
    vt.start_time,
    vt.end_time
  FROM public.vehicle_trips vt
  CROSS JOIN cost_rates cr
  WHERE vt.fuel_consumed IS NOT NULL
),
batch_costs AS (
  -- Aggregate costs per delivery batch
  SELECT
    db.id as batch_id,
    db.scheduled_date,
    db.warehouse_id,
    db.vehicle_id,
    db.driver_id,
    db.status::text,
    db.total_distance,
    db.total_quantity,

    -- Fuel costs for this batch
    COALESCE(SUM(fc.fuel_cost), 0) as batch_fuel_cost,
    COALESCE(SUM(fc.fuel_consumed), 0) as batch_fuel_consumed,

    -- Distance-based operational cost using dynamic pricing
    ROUND(db.total_distance * COALESCE(cr.operational_cost_per_km, 0.50), 2) as operational_cost_estimate,

    -- Cost per item
    CASE
      WHEN db.total_quantity > 0
      THEN ROUND(
        (COALESCE(SUM(fc.fuel_cost), 0) + (db.total_distance * COALESCE(cr.operational_cost_per_km, 0.50)))
        / db.total_quantity,
        2
      )
      ELSE 0
    END as cost_per_item,

    -- Cost per kilometer
    CASE
      WHEN db.total_distance > 0
      THEN ROUND(COALESCE(SUM(fc.fuel_cost), 0) / db.total_distance, 2)
      ELSE 0
    END as fuel_cost_per_km

  FROM public.delivery_batches db
  CROSS JOIN cost_rates cr
  LEFT JOIN fuel_costs fc ON fc.batch_id = db.id
  GROUP BY db.id, db.scheduled_date, db.warehouse_id, db.vehicle_id, db.driver_id,
           db.status, db.total_distance, db.total_quantity, cr.operational_cost_per_km
),
vehicle_costs AS (
  -- Aggregate costs per vehicle
  SELECT
    v.id as vehicle_id,

    -- Maintenance costs
    COALESCE(SUM(vm.cost), 0) as total_maintenance_cost,
    COUNT(vm.id) as maintenance_event_count,

    -- Fuel costs
    COALESCE(SUM(fc.fuel_cost), 0) as total_fuel_cost,
    COALESCE(SUM(fc.fuel_consumed), 0) as total_fuel_consumed,

    -- Total vehicle costs
    COALESCE(SUM(vm.cost), 0) + COALESCE(SUM(fc.fuel_cost), 0) as total_vehicle_cost

  FROM public.vehicles v
  LEFT JOIN public.vehicle_maintenance vm ON vm.vehicle_id = v.id
  LEFT JOIN fuel_costs fc ON fc.vehicle_id = v.id
  GROUP BY v.id
),
driver_costs AS (
  -- Aggregate costs per driver (fuel consumed during their trips)
  SELECT
    d.id as driver_id,

    -- Fuel costs for this driver's trips
    COALESCE(SUM(fc.fuel_cost), 0) as driver_fuel_cost,
    COALESCE(SUM(fc.fuel_consumed), 0) as driver_fuel_consumed,

    -- Operational costs for batches assigned to this driver
    COALESCE(SUM(bc.operational_cost_estimate), 0) as driver_operational_cost,

    -- Total driver-related costs
    COALESCE(SUM(fc.fuel_cost), 0) + COALESCE(SUM(bc.operational_cost_estimate), 0) as total_driver_cost,

    -- Items delivered by this driver
    COALESCE(SUM(bc.total_quantity), 0) as items_delivered,

    -- Distance covered by this driver
    COALESCE(SUM(bc.total_distance), 0) as distance_covered

  FROM public.drivers d
  LEFT JOIN fuel_costs fc ON fc.driver_id = d.id
  LEFT JOIN batch_costs bc ON bc.driver_id = d.id AND bc.status = 'completed'
  GROUP BY d.id
),
warehouse_costs AS (
  -- Aggregate costs per warehouse (batches originating from warehouse)
  SELECT
    w.id as warehouse_id,

    -- Fuel costs for batches from this warehouse
    COALESCE(SUM(bc.batch_fuel_cost), 0) as warehouse_fuel_cost,

    -- Operational costs for batches from this warehouse
    COALESCE(SUM(bc.operational_cost_estimate), 0) as warehouse_operational_cost,

    -- Total warehouse-related costs
    COALESCE(SUM(bc.batch_fuel_cost), 0) + COALESCE(SUM(bc.operational_cost_estimate), 0) as total_warehouse_cost,

    -- Batches from this warehouse
    COUNT(bc.batch_id) as batch_count,

    -- Items delivered from this warehouse
    COALESCE(SUM(bc.total_quantity), 0) as items_delivered,

    -- Distance covered from this warehouse
    COALESCE(SUM(bc.total_distance), 0) as distance_covered

  FROM public.warehouses w
  LEFT JOIN batch_costs bc ON bc.warehouse_id = w.id AND bc.status = 'completed'
  GROUP BY w.id
)
-- Main aggregated cost analysis view
SELECT
  -- Overall system costs
  COALESCE(SUM(vc.total_vehicle_cost), 0) as total_system_cost,
  COALESCE(SUM(vc.total_maintenance_cost), 0) as total_maintenance_cost,
  COALESCE(SUM(vc.total_fuel_cost), 0) as total_fuel_cost,

  -- Vehicle cost breakdown
  jsonb_agg(
    DISTINCT jsonb_build_object(
      'vehicle_id', vc.vehicle_id,
      'total_cost', vc.total_vehicle_cost,
      'maintenance_cost', vc.total_maintenance_cost,
      'fuel_cost', vc.total_fuel_cost,
      'fuel_consumed_liters', vc.total_fuel_consumed,
      'maintenance_events', vc.maintenance_event_count
    )
  ) FILTER (WHERE vc.vehicle_id IS NOT NULL) as vehicle_costs,

  -- Driver cost breakdown
  jsonb_agg(
    DISTINCT jsonb_build_object(
      'driver_id', dc.driver_id,
      'total_cost', dc.total_driver_cost,
      'fuel_cost', dc.driver_fuel_cost,
      'operational_cost', dc.driver_operational_cost,
      'items_delivered', dc.items_delivered,
      'distance_covered', dc.distance_covered,
      'cost_per_item', CASE
        WHEN dc.items_delivered > 0
        THEN ROUND(dc.total_driver_cost / dc.items_delivered, 2)
        ELSE 0
      END
    )
  ) FILTER (WHERE dc.driver_id IS NOT NULL) as driver_costs,

  -- Warehouse cost breakdown
  jsonb_agg(
    DISTINCT jsonb_build_object(
      'warehouse_id', wc.warehouse_id,
      'total_cost', wc.total_warehouse_cost,
      'fuel_cost', wc.warehouse_fuel_cost,
      'operational_cost', wc.warehouse_operational_cost,
      'batch_count', wc.batch_count,
      'items_delivered', wc.items_delivered,
      'distance_covered', wc.distance_covered,
      'cost_per_batch', CASE
        WHEN wc.batch_count > 0
        THEN ROUND(wc.total_warehouse_cost / wc.batch_count, 2)
        ELSE 0
      END
    )
  ) FILTER (WHERE wc.warehouse_id IS NOT NULL) as warehouse_costs,

  -- Aggregate metrics
  COUNT(DISTINCT vc.vehicle_id) as active_vehicles,
  COUNT(DISTINCT dc.driver_id) as active_drivers,
  COUNT(DISTINCT wc.warehouse_id) as active_warehouses,

  -- Total operational metrics
  COALESCE(SUM(dc.items_delivered), 0) as total_items_delivered,
  COALESCE(SUM(dc.distance_covered), 0) as total_distance_covered,
  COALESCE(SUM(vc.total_fuel_consumed), 0) as total_fuel_consumed_liters,

  -- Average costs
  ROUND(
    CASE
      WHEN SUM(dc.items_delivered) > 0
      THEN SUM(vc.total_vehicle_cost) / SUM(dc.items_delivered)
      ELSE 0
    END,
    2
  ) as avg_cost_per_item,

  ROUND(
    CASE
      WHEN SUM(dc.distance_covered) > 0
      THEN SUM(vc.total_vehicle_cost) / SUM(dc.distance_covered)
      ELSE 0
    END,
    2
  ) as avg_cost_per_km,

  -- Timestamp
  NOW() as metrics_calculated_at

FROM vehicle_costs vc
FULL OUTER JOIN driver_costs dc ON true
FULL OUTER JOIN warehouse_costs wc ON true;

-- ============================================================================
-- 3. CREATE REFRESH FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_cost_analysis()
RETURNS trigger AS $$
BEGIN
  -- Regular refresh (not CONCURRENTLY since there's no unique index)
  REFRESH MATERIALIZED VIEW analytics.cost_analysis;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_cost_analysis() IS
  'Refreshes cost_analysis materialized view when related tables change';

-- ============================================================================
-- 4. CREATE TRIGGERS
-- ============================================================================

-- Trigger on vehicle_maintenance table (when maintenance costs change)
CREATE TRIGGER trg_refresh_cost_analysis_maintenance
AFTER INSERT OR UPDATE OR DELETE ON public.vehicle_maintenance
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_cost_analysis();

-- Trigger on vehicle_trips table (when fuel data changes)
CREATE TRIGGER trg_refresh_cost_analysis_trips
AFTER INSERT OR UPDATE OR DELETE ON public.vehicle_trips
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_cost_analysis();

-- Trigger on delivery_batches table (when batch data changes)
CREATE TRIGGER trg_refresh_cost_analysis_batches
AFTER INSERT OR UPDATE OR DELETE ON public.delivery_batches
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_cost_analysis();

-- Trigger on system_settings table (when cost rates change)
CREATE TRIGGER trg_refresh_cost_analysis_settings
AFTER INSERT OR UPDATE OR DELETE ON public.system_settings
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_cost_analysis();

-- ============================================================================
-- 5. GRANT PERMISSIONS
-- ============================================================================

-- Grant read access to authenticated users
GRANT SELECT ON analytics.cost_analysis TO authenticated, anon;
GRANT SELECT ON public.system_settings TO authenticated, anon;

-- ============================================================================
-- 6. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON MATERIALIZED VIEW analytics.cost_analysis IS
  'Phase 2 Analytics: Pre-aggregated cost analysis across the system.
   Eliminates client-side aggregation for cost analytics dashboards.
   Target query performance: < 100ms for queries.
   Refresh time target: < 5 seconds.

   IMPORTANT: Uses dynamic pricing from system_settings table.
   - fuel_price_per_liter: Configurable by system_admin
   - operational_cost_per_km: Configurable by system_admin

   NOTE: All costs are unitless numeric values.
   Currency support is DEFERRED to a future phase.

   NOTE: Currently does not include workspace isolation. Will be added
   when workspaces table is implemented in the schema.

   Includes:
   - Total system costs (maintenance + fuel + operational)
   - Vehicle-level cost breakdowns (JSONB aggregates)
   - Driver-level cost breakdowns (JSONB aggregates)
   - Warehouse-level cost breakdowns (JSONB aggregates)
   - Average cost per item and per kilometer

   Admin can update cost rates via system_settings table.
   View auto-refreshes when settings change.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
