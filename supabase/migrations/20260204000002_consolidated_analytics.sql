-- ===========================================================================
-- CONSOLIDATED ANALYTICS MIGRATION
-- ===========================================================================
-- Combines all analytics migrations into a single script for easy deployment
-- Includes: delivery_performance, driver_efficiency, vehicle_utilization,
--           cost_analysis, KPI functions, and public wrappers
-- ===========================================================================

-- ===========================================================================
-- STEP 1: DROP EXISTING OBJECTS (for clean re-run)
-- ===========================================================================

-- Drop public wrappers
DROP FUNCTION IF EXISTS public.get_delivery_kpis(DATE, DATE);
DROP FUNCTION IF EXISTS public.get_top_vehicles_by_ontime(INTEGER);
DROP FUNCTION IF EXISTS public.get_driver_kpis();
DROP FUNCTION IF EXISTS public.get_top_drivers(TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.get_vehicle_kpis();
DROP FUNCTION IF EXISTS public.get_vehicles_needing_maintenance();
DROP FUNCTION IF EXISTS public.get_cost_kpis();
DROP FUNCTION IF EXISTS public.get_vehicle_costs(INTEGER);
DROP FUNCTION IF EXISTS public.get_driver_costs(INTEGER);
DROP FUNCTION IF EXISTS public.get_dashboard_summary(DATE, DATE);

-- Drop analytics KPI functions
DROP FUNCTION IF EXISTS analytics.get_delivery_kpis(DATE, DATE);
DROP FUNCTION IF EXISTS analytics.get_driver_kpis();
DROP FUNCTION IF EXISTS analytics.get_vehicle_kpis();
DROP FUNCTION IF EXISTS analytics.get_cost_kpis();
DROP FUNCTION IF EXISTS analytics.get_dashboard_summary(DATE, DATE);

-- Drop triggers
DROP TRIGGER IF EXISTS trg_refresh_delivery_perf ON public.delivery_batches;
DROP TRIGGER IF EXISTS trg_refresh_driver_efficiency_drivers ON public.drivers;
DROP TRIGGER IF EXISTS trg_refresh_driver_efficiency_batches ON public.delivery_batches;
DROP TRIGGER IF EXISTS trg_refresh_driver_efficiency_trips ON public.vehicle_trips;
DROP TRIGGER IF EXISTS trg_refresh_driver_efficiency_notifications ON public.notifications;
DROP TRIGGER IF EXISTS trg_refresh_vehicle_utilization_vehicles ON public.vehicles;
DROP TRIGGER IF EXISTS trg_refresh_vehicle_utilization_batches ON public.delivery_batches;
DROP TRIGGER IF EXISTS trg_refresh_vehicle_utilization_trips ON public.vehicle_trips;
DROP TRIGGER IF EXISTS trg_refresh_vehicle_utilization_maintenance ON public.vehicle_maintenance;
DROP TRIGGER IF EXISTS trg_refresh_cost_analysis_maintenance ON public.vehicle_maintenance;
DROP TRIGGER IF EXISTS trg_refresh_cost_analysis_trips ON public.vehicle_trips;
DROP TRIGGER IF EXISTS trg_refresh_cost_analysis_batches ON public.delivery_batches;
DROP TRIGGER IF EXISTS trg_refresh_cost_analysis_settings ON public.system_settings;
DROP TRIGGER IF EXISTS trg_system_settings_metadata ON public.system_settings;

-- Drop refresh functions
DROP FUNCTION IF EXISTS refresh_delivery_performance();
DROP FUNCTION IF EXISTS refresh_driver_efficiency();
DROP FUNCTION IF EXISTS refresh_vehicle_utilization();
DROP FUNCTION IF EXISTS refresh_cost_analysis();
DROP FUNCTION IF EXISTS update_system_settings_metadata();

-- Drop views (may exist as regular views from earlier migrations)
DROP VIEW IF EXISTS analytics.delivery_performance CASCADE;
DROP VIEW IF EXISTS analytics.driver_efficiency CASCADE;
DROP VIEW IF EXISTS analytics.vehicle_utilization CASCADE;
DROP VIEW IF EXISTS analytics.cost_analysis CASCADE;

-- Drop materialized views (in case they exist as materialized views)
DROP MATERIALIZED VIEW IF EXISTS analytics.delivery_performance CASCADE;
DROP MATERIALIZED VIEW IF EXISTS analytics.driver_efficiency CASCADE;
DROP MATERIALIZED VIEW IF EXISTS analytics.vehicle_utilization CASCADE;
DROP MATERIALIZED VIEW IF EXISTS analytics.cost_analysis CASCADE;

-- ===========================================================================
-- STEP 2: CREATE ANALYTICS SCHEMA
-- ===========================================================================

CREATE SCHEMA IF NOT EXISTS analytics;
GRANT USAGE ON SCHEMA analytics TO authenticated, anon;

COMMENT ON SCHEMA analytics IS 'Server-side analytics infrastructure for BIKO Platform';

-- ===========================================================================
-- STEP 3: CREATE SYSTEM_SETTINGS TABLE (for cost analysis)
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value_numeric NUMERIC(10,4),
  value_text TEXT,
  workspace_id UUID,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_settings_workspace
  ON public.system_settings(workspace_id, key)
  WHERE workspace_id IS NOT NULL;

-- Insert default cost settings
INSERT INTO public.system_settings (key, value_numeric, description, workspace_id) VALUES
  ('fuel_price_per_liter', 1.50, 'Default fuel price per liter', NULL),
  ('operational_cost_per_km', 0.50, 'Default operational cost per kilometer', NULL)
ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "All authenticated users can view system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Only system admins can update system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Only system admins can insert system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Only system admins can delete system settings" ON public.system_settings;

-- Create RLS policies
CREATE POLICY "All authenticated users can view system settings"
  ON public.system_settings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only system admins can update system settings"
  ON public.system_settings FOR UPDATE
  USING (has_role(auth.uid(), 'system_admin'));

CREATE POLICY "Only system admins can insert system settings"
  ON public.system_settings FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'system_admin'));

CREATE POLICY "Only system admins can delete system settings"
  ON public.system_settings FOR DELETE
  USING (has_role(auth.uid(), 'system_admin'));

GRANT SELECT ON public.system_settings TO authenticated, anon;

-- ===========================================================================
-- STEP 4: CREATE MATERIALIZED VIEWS
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 4.1: delivery_performance
-- ---------------------------------------------------------------------------

CREATE MATERIALIZED VIEW analytics.delivery_performance AS
SELECT
  db.id as batch_id,
  db.scheduled_date,
  (db.scheduled_date::timestamp + db.scheduled_time) as scheduled_datetime,
  db.actual_end_time as completed_date,
  db.status::text,
  v.id as vehicle_id,
  v.plate_number as vehicle_number,
  v.type::text as vehicle_type,
  d.id as driver_id,
  d.name as driver_name,
  COALESCE(array_length(db.facility_ids, 1), 0) as facilities_count,
  db.total_quantity as items_count,
  db.total_quantity as total_quantity,
  CASE
    WHEN db.actual_end_time IS NOT NULL AND db.actual_start_time IS NOT NULL
    THEN EXTRACT(EPOCH FROM (db.actual_end_time - db.actual_start_time)) / 3600
    ELSE NULL
  END as completion_time_hours,
  CASE
    WHEN db.actual_end_time IS NOT NULL
    THEN db.actual_end_time <= (db.scheduled_date::timestamp + db.scheduled_time)
    ELSE NULL
  END as on_time,
  CASE WHEN db.status = 'completed' THEN db.total_quantity ELSE 0 END as completed_items,
  CASE WHEN db.status = 'cancelled' THEN db.total_quantity ELSE 0 END as failed_items,
  db.total_distance,
  db.estimated_duration,
  db.priority::text,
  db.created_at,
  db.updated_at
FROM public.delivery_batches db
LEFT JOIN public.vehicles v ON db.vehicle_id = v.id
LEFT JOIN public.drivers d ON db.driver_id = d.id;

CREATE UNIQUE INDEX idx_delivery_perf_batch_id_unique
  ON analytics.delivery_performance(batch_id);

CREATE INDEX idx_delivery_perf_scheduled
  ON analytics.delivery_performance(scheduled_date DESC);
CREATE INDEX idx_delivery_perf_status
  ON analytics.delivery_performance(status);
CREATE INDEX idx_delivery_perf_vehicle
  ON analytics.delivery_performance(vehicle_id) WHERE vehicle_id IS NOT NULL;
CREATE INDEX idx_delivery_perf_driver
  ON analytics.delivery_performance(driver_id) WHERE driver_id IS NOT NULL;
CREATE INDEX idx_delivery_perf_on_time
  ON analytics.delivery_performance(on_time) WHERE on_time IS NOT NULL;
CREATE INDEX idx_delivery_perf_scheduled_status
  ON analytics.delivery_performance(scheduled_date DESC, status);

-- ---------------------------------------------------------------------------
-- 4.2: driver_efficiency (FIXED - no d.status reference)
-- ---------------------------------------------------------------------------

CREATE MATERIALIZED VIEW analytics.driver_efficiency AS
SELECT
  d.id as driver_id,
  d.name as driver_name,
  d.phone,
  d.license_type::text,
  'available'::text as driver_status,
  d.performance_score,
  d.total_deliveries,
  d.on_time_percentage,
  d.shift_start,
  d.shift_end,
  d.max_hours,
  COUNT(DISTINCT db.id) FILTER (WHERE db.status = 'completed') as completed_batches,
  COUNT(DISTINCT db.id) FILTER (WHERE db.status = 'cancelled') as cancelled_batches,
  COUNT(DISTINCT db.id) as total_batches,
  COUNT(DISTINCT db.id) FILTER (
    WHERE db.status = 'completed'
    AND db.actual_end_time IS NOT NULL
    AND db.actual_end_time <= (db.scheduled_date::timestamp + db.scheduled_time)
  ) as on_time_batches,
  COUNT(DISTINCT db.id) FILTER (
    WHERE db.status = 'completed'
    AND db.actual_end_time IS NOT NULL
    AND db.actual_end_time > (db.scheduled_date::timestamp + db.scheduled_time)
  ) as late_batches,
  ROUND(
    CASE
      WHEN COUNT(DISTINCT db.id) FILTER (WHERE db.status = 'completed' AND db.actual_end_time IS NOT NULL) > 0
      THEN (
        COUNT(DISTINCT db.id) FILTER (
          WHERE db.status = 'completed'
          AND db.actual_end_time IS NOT NULL
          AND db.actual_end_time <= (db.scheduled_date::timestamp + db.scheduled_time)
        )::NUMERIC /
        COUNT(DISTINCT db.id) FILTER (WHERE db.status = 'completed' AND db.actual_end_time IS NOT NULL)::NUMERIC
      ) * 100
      ELSE d.on_time_percentage
    END,
    2
  ) as on_time_rate,
  ROUND(
    AVG(
      EXTRACT(EPOCH FROM (db.actual_end_time - db.actual_start_time)) / 3600
    ) FILTER (
      WHERE db.actual_end_time IS NOT NULL
      AND db.actual_start_time IS NOT NULL
    ),
    2
  ) as avg_completion_time_hours,
  SUM(db.total_quantity) FILTER (WHERE db.status = 'completed') as total_items_delivered,
  SUM(db.total_distance) FILTER (WHERE db.status = 'completed') as total_distance_km,
  COUNT(DISTINCT vt.id) as total_trips,
  ROUND(SUM(vt.fuel_consumed), 2) as total_fuel_consumed_liters,
  ROUND(
    CASE
      WHEN SUM(vt.fuel_consumed) > 0
      THEN SUM(db.total_distance) FILTER (WHERE db.status = 'completed') / SUM(vt.fuel_consumed)
      ELSE NULL
    END,
    2
  ) as fuel_efficiency_km_per_liter,
  ROUND(
    AVG(vt.fuel_consumed) FILTER (WHERE vt.fuel_consumed IS NOT NULL),
    2
  ) as avg_fuel_per_trip_liters,
  COUNT(DISTINCT n.id) FILTER (
    WHERE n.type = 'urgent'
    AND n.related_entity_type = 'driver'
  ) as total_incidents,
  MAX(db.actual_end_time) as last_delivery_date,
  MAX(vt.end_time) as last_trip_date,
  d.created_at as driver_created_at,
  d.updated_at as driver_updated_at,
  NOW() as metrics_calculated_at
FROM public.drivers d
LEFT JOIN public.delivery_batches db ON db.driver_id = d.id
LEFT JOIN public.vehicle_trips vt ON vt.driver_id = d.id
LEFT JOIN public.notifications n ON n.related_entity_id = d.id AND n.related_entity_type = 'driver'
GROUP BY
  d.id, d.name, d.phone, d.license_type,
  d.performance_score, d.total_deliveries, d.on_time_percentage,
  d.shift_start, d.shift_end, d.max_hours,
  d.created_at, d.updated_at;

CREATE UNIQUE INDEX idx_driver_efficiency_driver_id_unique
  ON analytics.driver_efficiency(driver_id);

CREATE INDEX idx_driver_efficiency_status
  ON analytics.driver_efficiency(driver_status);
CREATE INDEX idx_driver_efficiency_on_time_rate
  ON analytics.driver_efficiency(on_time_rate DESC) WHERE on_time_rate IS NOT NULL;
CREATE INDEX idx_driver_efficiency_performance
  ON analytics.driver_efficiency(performance_score DESC) WHERE performance_score IS NOT NULL;
CREATE INDEX idx_driver_efficiency_total_batches
  ON analytics.driver_efficiency(total_batches DESC);
CREATE INDEX idx_driver_efficiency_fuel_efficiency
  ON analytics.driver_efficiency(fuel_efficiency_km_per_liter DESC) WHERE fuel_efficiency_km_per_liter IS NOT NULL;
CREATE INDEX idx_driver_efficiency_incidents
  ON analytics.driver_efficiency(total_incidents DESC) WHERE total_incidents > 0;
CREATE INDEX idx_driver_efficiency_status_ontime
  ON analytics.driver_efficiency(driver_status, on_time_rate DESC) WHERE on_time_rate IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4.3: vehicle_utilization
-- ---------------------------------------------------------------------------

CREATE MATERIALIZED VIEW analytics.vehicle_utilization AS
SELECT
  v.id as vehicle_id,
  v.type::text as vehicle_type,
  v.model,
  v.plate_number,
  v.status::text as vehicle_status,
  v.fuel_type::text,
  v.capacity,
  v.max_weight,
  v.avg_speed,
  v.fuel_efficiency as rated_fuel_efficiency,
  v.current_driver_id,
  d.name as current_driver_name,
  COUNT(DISTINCT db.id) as total_batches_assigned,
  COUNT(DISTINCT db.id) FILTER (WHERE db.status = 'completed') as completed_batches,
  COUNT(DISTINCT db.id) FILTER (WHERE db.status = 'in-progress') as active_batches,
  COUNT(DISTINCT db.id) FILTER (WHERE db.status = 'cancelled') as cancelled_batches,
  ROUND(
    CASE
      WHEN COUNT(DISTINCT db.id) > 0
      THEN (COUNT(DISTINCT db.id) FILTER (WHERE db.status = 'completed')::NUMERIC / COUNT(DISTINCT db.id)::NUMERIC) * 100
      ELSE 0
    END,
    2
  ) as utilization_rate,
  SUM(db.total_distance) FILTER (WHERE db.status = 'completed') as total_distance_km,
  SUM(db.total_quantity) FILTER (WHERE db.status = 'completed') as total_items_delivered,
  ROUND(AVG(db.total_distance) FILTER (WHERE db.status = 'completed'), 2) as avg_distance_per_batch_km,
  ROUND(AVG(db.total_quantity) FILTER (WHERE db.status = 'completed'), 2) as avg_items_per_batch,
  COUNT(DISTINCT vt.id) as total_trips,
  ROUND(SUM(vt.fuel_consumed), 2) as total_fuel_consumed_liters,
  ROUND(
    CASE
      WHEN SUM(vt.fuel_consumed) > 0
      THEN SUM(db.total_distance) FILTER (WHERE db.status = 'completed') / SUM(vt.fuel_consumed)
      ELSE NULL
    END,
    2
  ) as actual_fuel_efficiency_km_per_liter,
  ROUND(
    CASE
      WHEN SUM(vt.fuel_consumed) > 0 AND v.fuel_efficiency > 0
      THEN (
        (SUM(db.total_distance) FILTER (WHERE db.status = 'completed') / SUM(vt.fuel_consumed)) - v.fuel_efficiency
      ) / v.fuel_efficiency * 100
      ELSE NULL
    END,
    2
  ) as fuel_efficiency_variance_percent,
  MIN(vt.start_odometer) FILTER (WHERE vt.start_odometer IS NOT NULL) as first_odometer_reading,
  MAX(vt.end_odometer) FILTER (WHERE vt.end_odometer IS NOT NULL) as last_odometer_reading,
  COALESCE(
    MAX(vt.end_odometer) FILTER (WHERE vt.end_odometer IS NOT NULL) -
    MIN(vt.start_odometer) FILTER (WHERE vt.start_odometer IS NOT NULL),
    0
  ) as total_odometer_distance_km,
  COUNT(DISTINCT vm.id) as total_maintenance_events,
  COUNT(DISTINCT vm.id) FILTER (WHERE vm.maintenance_type = 'routine') as routine_maintenance_count,
  COUNT(DISTINCT vm.id) FILTER (WHERE vm.maintenance_type = 'repair') as repair_count,
  COUNT(DISTINCT vm.id) FILTER (WHERE vm.maintenance_type = 'emergency') as emergency_maintenance_count,
  ROUND(COALESCE(SUM(vm.cost), 0), 2) as total_maintenance_cost,
  ROUND(AVG(vm.cost) FILTER (WHERE vm.cost IS NOT NULL), 2) as avg_maintenance_cost,
  COUNT(DISTINCT vm.id) FILTER (WHERE vm.status = 'scheduled') as scheduled_maintenance_count,
  COUNT(DISTINCT vm.id) FILTER (WHERE vm.status = 'in-progress') as maintenance_in_progress_count,
  CASE
    WHEN v.status = 'maintenance' THEN true
    WHEN COUNT(DISTINCT vm.id) FILTER (WHERE vm.status = 'in-progress') > 0 THEN true
    ELSE false
  END as currently_in_maintenance,
  ROUND(
    CASE
      WHEN SUM(db.total_distance) FILTER (WHERE db.status = 'completed') > 0
      THEN COALESCE(SUM(vm.cost), 0) / SUM(db.total_distance) FILTER (WHERE db.status = 'completed')
      ELSE NULL
    END,
    2
  ) as maintenance_cost_per_km,
  MAX(db.actual_end_time) as last_batch_completion,
  MAX(vt.end_time) as last_trip_date,
  MAX(vm.scheduled_date) as next_maintenance_date,
  v.created_at as vehicle_created_at,
  v.updated_at as vehicle_updated_at,
  NOW() as metrics_calculated_at
FROM public.vehicles v
LEFT JOIN public.drivers d ON v.current_driver_id = d.id
LEFT JOIN public.delivery_batches db ON db.vehicle_id = v.id
LEFT JOIN public.vehicle_trips vt ON vt.vehicle_id = v.id
LEFT JOIN public.vehicle_maintenance vm ON vm.vehicle_id = v.id
GROUP BY
  v.id, v.type, v.model, v.plate_number, v.status, v.fuel_type,
  v.capacity, v.max_weight, v.avg_speed, v.fuel_efficiency,
  v.current_driver_id, d.name, v.created_at, v.updated_at;

CREATE UNIQUE INDEX idx_vehicle_utilization_vehicle_id_unique
  ON analytics.vehicle_utilization(vehicle_id);

CREATE INDEX idx_vehicle_utilization_status
  ON analytics.vehicle_utilization(vehicle_status);
CREATE INDEX idx_vehicle_utilization_type
  ON analytics.vehicle_utilization(vehicle_type);
CREATE INDEX idx_vehicle_utilization_rate
  ON analytics.vehicle_utilization(utilization_rate DESC) WHERE utilization_rate IS NOT NULL;
CREATE INDEX idx_vehicle_utilization_fuel_efficiency
  ON analytics.vehicle_utilization(actual_fuel_efficiency_km_per_liter DESC) WHERE actual_fuel_efficiency_km_per_liter IS NOT NULL;
CREATE INDEX idx_vehicle_utilization_maintenance_cost
  ON analytics.vehicle_utilization(total_maintenance_cost DESC) WHERE total_maintenance_cost > 0;
CREATE INDEX idx_vehicle_utilization_in_maintenance
  ON analytics.vehicle_utilization(currently_in_maintenance) WHERE currently_in_maintenance = true;
CREATE INDEX idx_vehicle_utilization_status_rate
  ON analytics.vehicle_utilization(vehicle_status, utilization_rate DESC) WHERE utilization_rate IS NOT NULL;
CREATE INDEX idx_vehicle_utilization_type_efficiency
  ON analytics.vehicle_utilization(vehicle_type, actual_fuel_efficiency_km_per_liter DESC) WHERE actual_fuel_efficiency_km_per_liter IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4.4: cost_analysis
-- ---------------------------------------------------------------------------

CREATE MATERIALIZED VIEW analytics.cost_analysis AS
WITH cost_rates AS (
  SELECT
    (SELECT value_numeric FROM public.system_settings
     WHERE key = 'fuel_price_per_liter' AND workspace_id IS NULL
     LIMIT 1) as fuel_price_per_liter,
    (SELECT value_numeric FROM public.system_settings
     WHERE key = 'operational_cost_per_km' AND workspace_id IS NULL
     LIMIT 1) as operational_cost_per_km
),
fuel_costs AS (
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
  SELECT
    db.id as batch_id,
    db.scheduled_date,
    db.warehouse_id,
    db.vehicle_id,
    db.driver_id,
    db.status::text,
    db.total_distance,
    db.total_quantity,
    COALESCE(SUM(fc.fuel_cost), 0) as batch_fuel_cost,
    COALESCE(SUM(fc.fuel_consumed), 0) as batch_fuel_consumed,
    ROUND(db.total_distance * COALESCE(cr.operational_cost_per_km, 0.50), 2) as operational_cost_estimate,
    CASE
      WHEN db.total_quantity > 0
      THEN ROUND(
        (COALESCE(SUM(fc.fuel_cost), 0) + (db.total_distance * COALESCE(cr.operational_cost_per_km, 0.50)))
        / db.total_quantity,
        2
      )
      ELSE 0
    END as cost_per_item,
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
  SELECT
    v.id as vehicle_id,
    COALESCE(SUM(vm.cost), 0) as total_maintenance_cost,
    COUNT(vm.id) as maintenance_event_count,
    COALESCE(SUM(fc.fuel_cost), 0) as total_fuel_cost,
    COALESCE(SUM(fc.fuel_consumed), 0) as total_fuel_consumed,
    COALESCE(SUM(vm.cost), 0) + COALESCE(SUM(fc.fuel_cost), 0) as total_vehicle_cost
  FROM public.vehicles v
  LEFT JOIN public.vehicle_maintenance vm ON vm.vehicle_id = v.id
  LEFT JOIN fuel_costs fc ON fc.vehicle_id = v.id
  GROUP BY v.id
),
driver_costs AS (
  SELECT
    d.id as driver_id,
    COALESCE(SUM(fc.fuel_cost), 0) as driver_fuel_cost,
    COALESCE(SUM(fc.fuel_consumed), 0) as driver_fuel_consumed,
    COALESCE(SUM(bc.operational_cost_estimate), 0) as driver_operational_cost,
    COALESCE(SUM(fc.fuel_cost), 0) + COALESCE(SUM(bc.operational_cost_estimate), 0) as total_driver_cost,
    COALESCE(SUM(bc.total_quantity), 0) as items_delivered,
    COALESCE(SUM(bc.total_distance), 0) as distance_covered
  FROM public.drivers d
  LEFT JOIN fuel_costs fc ON fc.driver_id = d.id
  LEFT JOIN batch_costs bc ON bc.driver_id = d.id AND bc.status = 'completed'
  GROUP BY d.id
),
warehouse_costs AS (
  SELECT
    w.id as warehouse_id,
    COALESCE(SUM(bc.batch_fuel_cost), 0) as warehouse_fuel_cost,
    COALESCE(SUM(bc.operational_cost_estimate), 0) as warehouse_operational_cost,
    COALESCE(SUM(bc.batch_fuel_cost), 0) + COALESCE(SUM(bc.operational_cost_estimate), 0) as total_warehouse_cost,
    COUNT(bc.batch_id) as batch_count,
    COALESCE(SUM(bc.total_quantity), 0) as items_delivered,
    COALESCE(SUM(bc.total_distance), 0) as distance_covered
  FROM public.warehouses w
  LEFT JOIN batch_costs bc ON bc.warehouse_id = w.id AND bc.status = 'completed'
  GROUP BY w.id
)
SELECT
  COALESCE(SUM(vc.total_vehicle_cost), 0) as total_system_cost,
  COALESCE(SUM(vc.total_maintenance_cost), 0) as total_maintenance_cost,
  COALESCE(SUM(vc.total_fuel_cost), 0) as total_fuel_cost,
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
  COUNT(DISTINCT vc.vehicle_id) as active_vehicles,
  COUNT(DISTINCT dc.driver_id) as active_drivers,
  COUNT(DISTINCT wc.warehouse_id) as active_warehouses,
  COALESCE(SUM(dc.items_delivered), 0) as total_items_delivered,
  COALESCE(SUM(dc.distance_covered), 0) as total_distance_covered,
  COALESCE(SUM(vc.total_fuel_consumed), 0) as total_fuel_consumed_liters,
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
  NOW() as metrics_calculated_at
FROM vehicle_costs vc
FULL OUTER JOIN driver_costs dc ON true
FULL OUTER JOIN warehouse_costs wc ON true;

-- ===========================================================================
-- STEP 5: CREATE REFRESH FUNCTIONS AND TRIGGERS
-- ===========================================================================

-- system_settings metadata trigger
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

-- delivery_performance refresh
CREATE OR REPLACE FUNCTION refresh_delivery_performance()
RETURNS trigger AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.delivery_performance;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_refresh_delivery_perf
AFTER INSERT OR UPDATE OR DELETE ON public.delivery_batches
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_delivery_performance();

-- driver_efficiency refresh
CREATE OR REPLACE FUNCTION refresh_driver_efficiency()
RETURNS trigger AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.driver_efficiency;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_refresh_driver_efficiency_drivers
AFTER INSERT OR UPDATE OR DELETE ON public.drivers
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_driver_efficiency();

CREATE TRIGGER trg_refresh_driver_efficiency_batches
AFTER INSERT OR UPDATE OR DELETE ON public.delivery_batches
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_driver_efficiency();

CREATE TRIGGER trg_refresh_driver_efficiency_trips
AFTER INSERT OR UPDATE OR DELETE ON public.vehicle_trips
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_driver_efficiency();

CREATE TRIGGER trg_refresh_driver_efficiency_notifications
AFTER INSERT OR UPDATE OR DELETE ON public.notifications
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_driver_efficiency();

-- vehicle_utilization refresh
CREATE OR REPLACE FUNCTION refresh_vehicle_utilization()
RETURNS trigger AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.vehicle_utilization;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_refresh_vehicle_utilization_vehicles
AFTER INSERT OR UPDATE OR DELETE ON public.vehicles
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_vehicle_utilization();

CREATE TRIGGER trg_refresh_vehicle_utilization_batches
AFTER INSERT OR UPDATE OR DELETE ON public.delivery_batches
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_vehicle_utilization();

CREATE TRIGGER trg_refresh_vehicle_utilization_trips
AFTER INSERT OR UPDATE OR DELETE ON public.vehicle_trips
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_vehicle_utilization();

CREATE TRIGGER trg_refresh_vehicle_utilization_maintenance
AFTER INSERT OR UPDATE OR DELETE ON public.vehicle_maintenance
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_vehicle_utilization();

-- cost_analysis refresh
CREATE OR REPLACE FUNCTION refresh_cost_analysis()
RETURNS trigger AS $$
BEGIN
  REFRESH MATERIALIZED VIEW analytics.cost_analysis;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_refresh_cost_analysis_maintenance
AFTER INSERT OR UPDATE OR DELETE ON public.vehicle_maintenance
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_cost_analysis();

CREATE TRIGGER trg_refresh_cost_analysis_trips
AFTER INSERT OR UPDATE OR DELETE ON public.vehicle_trips
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_cost_analysis();

CREATE TRIGGER trg_refresh_cost_analysis_batches
AFTER INSERT OR UPDATE OR DELETE ON public.delivery_batches
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_cost_analysis();

CREATE TRIGGER trg_refresh_cost_analysis_settings
AFTER INSERT OR UPDATE OR DELETE ON public.system_settings
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_cost_analysis();

-- ===========================================================================
-- STEP 6: CREATE ANALYTICS KPI FUNCTIONS
-- ===========================================================================

-- get_delivery_kpis
CREATE FUNCTION analytics.get_delivery_kpis(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  total_batches BIGINT,
  completed_batches BIGINT,
  on_time_batches BIGINT,
  late_batches BIGINT,
  on_time_rate NUMERIC,
  avg_completion_time_hours NUMERIC,
  total_items_delivered BIGINT,
  total_distance_km NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_batches,
    COUNT(*) FILTER (WHERE dp.status = 'completed')::BIGINT as completed_batches,
    COUNT(*) FILTER (WHERE dp.on_time = true)::BIGINT as on_time_batches,
    COUNT(*) FILTER (WHERE dp.on_time = false)::BIGINT as late_batches,
    ROUND(
      (COUNT(*) FILTER (WHERE dp.on_time = true)::NUMERIC /
       NULLIF(COUNT(*) FILTER (WHERE dp.status = 'completed'), 0)::NUMERIC) * 100,
      2
    ) as on_time_rate,
    ROUND(AVG(dp.completion_time_hours) FILTER (WHERE dp.completion_time_hours IS NOT NULL), 2) as avg_completion_time_hours,
    COALESCE(SUM(dp.items_count), 0)::BIGINT as total_items_delivered,
    COALESCE(SUM(dp.total_distance), 0) as total_distance_km
  FROM analytics.delivery_performance dp
  WHERE (p_start_date IS NULL OR dp.scheduled_date >= p_start_date)
    AND (p_end_date IS NULL OR dp.scheduled_date <= p_end_date);
END;
$$ LANGUAGE plpgsql STABLE;

-- get_driver_kpis
CREATE FUNCTION analytics.get_driver_kpis()
RETURNS TABLE (
  total_drivers BIGINT,
  active_drivers BIGINT,
  avg_on_time_rate NUMERIC,
  avg_fuel_efficiency NUMERIC,
  total_incidents BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_drivers,
    COUNT(*) FILTER (WHERE de.total_batches > 0)::BIGINT as active_drivers,
    ROUND(AVG(de.on_time_rate) FILTER (WHERE de.on_time_rate IS NOT NULL), 2) as avg_on_time_rate,
    ROUND(AVG(de.fuel_efficiency_km_per_liter) FILTER (WHERE de.fuel_efficiency_km_per_liter IS NOT NULL), 2) as avg_fuel_efficiency,
    COALESCE(SUM(de.total_incidents), 0)::BIGINT as total_incidents
  FROM analytics.driver_efficiency de;
END;
$$ LANGUAGE plpgsql STABLE;

-- get_vehicle_kpis
CREATE FUNCTION analytics.get_vehicle_kpis()
RETURNS TABLE (
  total_vehicles BIGINT,
  active_vehicles BIGINT,
  in_maintenance BIGINT,
  avg_utilization_rate NUMERIC,
  avg_fuel_efficiency NUMERIC,
  total_maintenance_cost NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_vehicles,
    COUNT(*) FILTER (WHERE vu.total_batches_assigned > 0)::BIGINT as active_vehicles,
    COUNT(*) FILTER (WHERE vu.currently_in_maintenance = true)::BIGINT as in_maintenance,
    ROUND(AVG(vu.utilization_rate) FILTER (WHERE vu.utilization_rate IS NOT NULL), 2) as avg_utilization_rate,
    ROUND(AVG(vu.actual_fuel_efficiency_km_per_liter) FILTER (WHERE vu.actual_fuel_efficiency_km_per_liter IS NOT NULL), 2) as avg_fuel_efficiency,
    COALESCE(SUM(vu.total_maintenance_cost), 0) as total_maintenance_cost
  FROM analytics.vehicle_utilization vu;
END;
$$ LANGUAGE plpgsql STABLE;

-- get_cost_kpis
CREATE FUNCTION analytics.get_cost_kpis()
RETURNS TABLE (
  total_system_cost NUMERIC,
  total_maintenance_cost NUMERIC,
  total_fuel_cost NUMERIC,
  avg_cost_per_item NUMERIC,
  avg_cost_per_km NUMERIC,
  active_vehicles BIGINT,
  active_drivers BIGINT,
  total_items_delivered BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ca.total_system_cost,
    ca.total_maintenance_cost,
    ca.total_fuel_cost,
    ca.avg_cost_per_item,
    ca.avg_cost_per_km,
    ca.active_vehicles,
    ca.active_drivers,
    ca.total_items_delivered
  FROM analytics.cost_analysis ca;
END;
$$ LANGUAGE plpgsql STABLE;

-- get_dashboard_summary
CREATE FUNCTION analytics.get_dashboard_summary(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  total_deliveries BIGINT,
  on_time_rate NUMERIC,
  avg_completion_hours NUMERIC,
  total_items BIGINT,
  active_vehicles BIGINT,
  vehicle_utilization_rate NUMERIC,
  vehicles_in_maintenance BIGINT,
  active_drivers BIGINT,
  driver_on_time_rate NUMERIC,
  total_incidents BIGINT,
  total_cost NUMERIC,
  cost_per_item NUMERIC,
  cost_per_km NUMERIC
) AS $$
DECLARE
  v_total_deliveries BIGINT;
  v_on_time_rate NUMERIC;
  v_avg_completion_hours NUMERIC;
  v_total_items BIGINT;
  v_active_vehicles BIGINT;
  v_vehicle_utilization_rate NUMERIC;
  v_vehicles_in_maintenance BIGINT;
  v_active_drivers BIGINT;
  v_driver_on_time_rate NUMERIC;
  v_total_incidents BIGINT;
  v_total_cost NUMERIC;
  v_cost_per_item NUMERIC;
  v_cost_per_km NUMERIC;
BEGIN
  SELECT d.completed_batches, d.on_time_rate, d.avg_completion_time_hours, d.total_items_delivered
  INTO v_total_deliveries, v_on_time_rate, v_avg_completion_hours, v_total_items
  FROM analytics.get_delivery_kpis(p_start_date, p_end_date) d;

  SELECT v.active_vehicles, v.avg_utilization_rate, v.in_maintenance
  INTO v_active_vehicles, v_vehicle_utilization_rate, v_vehicles_in_maintenance
  FROM analytics.get_vehicle_kpis() v;

  SELECT dr.active_drivers, dr.avg_on_time_rate, dr.total_incidents
  INTO v_active_drivers, v_driver_on_time_rate, v_total_incidents
  FROM analytics.get_driver_kpis() dr;

  SELECT c.total_system_cost, c.avg_cost_per_item, c.avg_cost_per_km
  INTO v_total_cost, v_cost_per_item, v_cost_per_km
  FROM analytics.get_cost_kpis() c;

  RETURN QUERY SELECT
    v_total_deliveries, v_on_time_rate, v_avg_completion_hours, v_total_items,
    v_active_vehicles, v_vehicle_utilization_rate, v_vehicles_in_maintenance,
    v_active_drivers, v_driver_on_time_rate, v_total_incidents,
    v_total_cost, v_cost_per_item, v_cost_per_km;
END;
$$ LANGUAGE plpgsql STABLE;

-- ===========================================================================
-- STEP 7: CREATE PUBLIC WRAPPER FUNCTIONS
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.get_delivery_kpis(
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  total_batches BIGINT,
  completed_batches BIGINT,
  on_time_batches BIGINT,
  late_batches BIGINT,
  on_time_rate NUMERIC,
  avg_completion_time_hours NUMERIC,
  total_items_delivered BIGINT,
  total_distance_km NUMERIC
) AS $$
BEGIN
  RETURN QUERY SELECT * FROM analytics.get_delivery_kpis(start_date, end_date);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_driver_kpis()
RETURNS TABLE (
  total_drivers BIGINT,
  active_drivers BIGINT,
  avg_on_time_rate NUMERIC,
  avg_fuel_efficiency NUMERIC,
  total_incidents BIGINT
) AS $$
BEGIN
  RETURN QUERY SELECT * FROM analytics.get_driver_kpis();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_vehicle_kpis()
RETURNS TABLE (
  total_vehicles BIGINT,
  active_vehicles BIGINT,
  in_maintenance BIGINT,
  avg_utilization_rate NUMERIC,
  avg_fuel_efficiency NUMERIC,
  total_maintenance_cost NUMERIC
) AS $$
BEGIN
  RETURN QUERY SELECT * FROM analytics.get_vehicle_kpis();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_cost_kpis()
RETURNS TABLE (
  total_system_cost NUMERIC,
  total_maintenance_cost NUMERIC,
  total_fuel_cost NUMERIC,
  avg_cost_per_item NUMERIC,
  avg_cost_per_km NUMERIC,
  active_vehicles BIGINT,
  active_drivers BIGINT,
  total_items_delivered BIGINT
) AS $$
BEGIN
  RETURN QUERY SELECT * FROM analytics.get_cost_kpis();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_dashboard_summary(
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  total_deliveries BIGINT,
  on_time_rate NUMERIC,
  avg_completion_hours NUMERIC,
  total_items BIGINT,
  active_vehicles BIGINT,
  vehicle_utilization_rate NUMERIC,
  vehicles_in_maintenance BIGINT,
  active_drivers BIGINT,
  driver_on_time_rate NUMERIC,
  total_incidents BIGINT,
  total_cost NUMERIC,
  cost_per_item NUMERIC,
  cost_per_km NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.total_deliveries, a.on_time_rate, a.avg_completion_hours, a.total_items,
    a.active_vehicles, a.vehicle_utilization_rate, a.vehicles_in_maintenance,
    a.active_drivers, a.driver_on_time_rate, a.total_incidents,
    a.total_cost, a.cost_per_item, a.cost_per_km
  FROM analytics.get_dashboard_summary(start_date, end_date) a;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ===========================================================================
-- STEP 8: GRANT PERMISSIONS
-- ===========================================================================

-- Materialized views
GRANT SELECT ON analytics.delivery_performance TO authenticated, anon;
GRANT SELECT ON analytics.driver_efficiency TO authenticated, anon;
GRANT SELECT ON analytics.vehicle_utilization TO authenticated, anon;
GRANT SELECT ON analytics.cost_analysis TO authenticated, anon;

-- Analytics functions
GRANT EXECUTE ON FUNCTION analytics.get_delivery_kpis(DATE, DATE) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION analytics.get_driver_kpis() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION analytics.get_vehicle_kpis() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION analytics.get_cost_kpis() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION analytics.get_dashboard_summary(DATE, DATE) TO authenticated, anon;

-- Public wrapper functions
GRANT EXECUTE ON FUNCTION public.get_delivery_kpis(DATE, DATE) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_driver_kpis() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_vehicle_kpis() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_cost_kpis() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_summary(DATE, DATE) TO authenticated, anon;

-- ===========================================================================
-- STEP 9: REFRESH ALL VIEWS
-- ===========================================================================

REFRESH MATERIALIZED VIEW analytics.delivery_performance;
REFRESH MATERIALIZED VIEW analytics.driver_efficiency;
REFRESH MATERIALIZED VIEW analytics.vehicle_utilization;
REFRESH MATERIALIZED VIEW analytics.cost_analysis;

-- ===========================================================================
-- STEP 10: VERIFICATION
-- ===========================================================================

DO $$
DECLARE
  dp_count INTEGER;
  de_count INTEGER;
  vu_count INTEGER;
  ca_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dp_count FROM analytics.delivery_performance;
  SELECT COUNT(*) INTO de_count FROM analytics.driver_efficiency;
  SELECT COUNT(*) INTO vu_count FROM analytics.vehicle_utilization;
  SELECT COUNT(*) INTO ca_count FROM analytics.cost_analysis;

  RAISE NOTICE '==================================================================';
  RAISE NOTICE 'CONSOLIDATED ANALYTICS MIGRATION COMPLETED SUCCESSFULLY';
  RAISE NOTICE '==================================================================';
  RAISE NOTICE 'Analytics views created and refreshed:';
  RAISE NOTICE '  - delivery_performance: % rows', dp_count;
  RAISE NOTICE '  - driver_efficiency: % rows', de_count;
  RAISE NOTICE '  - vehicle_utilization: % rows', vu_count;
  RAISE NOTICE '  - cost_analysis: % rows', ca_count;
  RAISE NOTICE '';
  RAISE NOTICE 'All KPI functions and public wrappers created.';
  RAISE NOTICE 'All triggers configured for automatic refresh.';
  RAISE NOTICE '==================================================================';
END $$;

-- ===========================================================================
-- END OF CONSOLIDATED ANALYTICS MIGRATION
-- ===========================================================================
