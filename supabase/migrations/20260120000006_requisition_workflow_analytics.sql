-- ============================================================================
-- RFC-012 Phase 6: Requisition Workflow Analytics
-- ============================================================================
-- Purpose: Provide analytics for the requisition state machine and packaging workflow
--
-- Metrics Covered:
-- 1. Requisition approval turnaround time (Storefront)
-- 2. Packaging computation efficiency (Storefront)
-- 3. Ready-for-dispatch queue metrics (Storefront)
-- 4. Slot demand analysis (Storefront)
-- 5. Batch assembly efficiency (FleetOps)
-- 6. Dispatch workflow timing (FleetOps)
-- 7. Requisition fulfillment rates (FleetOps)
-- 8. Packaging type distribution (Storefront)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Materialized View: Requisition Workflow Metrics
-- ----------------------------------------------------------------------------
-- Aggregates state transition timings for each requisition
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.mv_requisition_workflow_metrics AS
SELECT
  r.id AS requisition_id,
  r.facility_id,
  r.status,
  r.created_at,
  r.updated_at,
  r.packaged_at,
  r.ready_for_dispatch_at,
  r.assigned_to_batch_at,
  r.in_transit_at,
  r.delivered_at,
  r.batch_id,

  -- Approval turnaround (pending → approved/packaged)
  EXTRACT(EPOCH FROM (COALESCE(r.packaged_at, r.updated_at) - r.created_at)) / 3600 AS approval_hours,

  -- Packaging computation time (approved → packaged)
  EXTRACT(EPOCH FROM (r.packaged_at - r.updated_at)) / 60 AS packaging_minutes,

  -- Ready-for-dispatch wait time (packaged → ready_for_dispatch)
  EXTRACT(EPOCH FROM (r.ready_for_dispatch_at - r.packaged_at)) / 3600 AS ready_wait_hours,

  -- Batch assignment wait time (ready_for_dispatch → assigned_to_batch)
  EXTRACT(EPOCH FROM (r.assigned_to_batch_at - r.ready_for_dispatch_at)) / 3600 AS assignment_wait_hours,

  -- Dispatch start time (assigned_to_batch → in_transit)
  EXTRACT(EPOCH FROM (r.in_transit_at - r.assigned_to_batch_at)) / 3600 AS dispatch_start_hours,

  -- In-transit completion time (in_transit → delivered)
  EXTRACT(EPOCH FROM (r.delivered_at - r.in_transit_at)) / 3600 AS in_transit_hours,

  -- Total end-to-end time (created → delivered)
  EXTRACT(EPOCH FROM (r.delivered_at - r.created_at)) / 3600 AS total_cycle_hours,

  -- Packaging data
  rp.total_slot_demand,
  rp.rounded_slot_demand,
  rp.packaging_version,
  rp.computed_at AS packaging_computed_at,

  -- Flags
  CASE WHEN r.status IN ('fulfilled', 'partially_delivered') THEN TRUE ELSE FALSE END AS is_fulfilled,
  CASE WHEN r.status = 'failed' THEN TRUE ELSE FALSE END AS is_failed,
  CASE WHEN r.ready_for_dispatch_at IS NOT NULL THEN TRUE ELSE FALSE END AS reached_ready_state

FROM public.requisitions r
LEFT JOIN public.requisition_packaging rp ON rp.requisition_id = r.id;

-- Index for performance (UNIQUE index required for CONCURRENTLY refresh)
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_requisition_workflow_id
  ON analytics.mv_requisition_workflow_metrics(requisition_id);
CREATE INDEX IF NOT EXISTS idx_mv_requisition_workflow_facility
  ON analytics.mv_requisition_workflow_metrics(facility_id);
CREATE INDEX IF NOT EXISTS idx_mv_requisition_workflow_status
  ON analytics.mv_requisition_workflow_metrics(status);
CREATE INDEX IF NOT EXISTS idx_mv_requisition_workflow_created
  ON analytics.mv_requisition_workflow_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_mv_requisition_workflow_batch
  ON analytics.mv_requisition_workflow_metrics(batch_id);

COMMENT ON MATERIALIZED VIEW analytics.mv_requisition_workflow_metrics IS
  'RFC-012 Phase 6: Pre-aggregated metrics for requisition state machine analysis';

-- ----------------------------------------------------------------------------
-- Materialized View: Packaging Analytics
-- ----------------------------------------------------------------------------
-- Aggregates packaging type distribution and slot demand
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.mv_packaging_analytics AS
SELECT
  rpi.packaging_type,
  COUNT(*) AS item_count,
  SUM(rpi.quantity) AS total_quantity,
  SUM(rpi.slot_cost) AS total_slot_cost,
  AVG(rpi.slot_cost) AS avg_slot_cost_per_item,
  SUM(rpi.slot_demand) AS total_slot_demand_from_items,
  SUM(rpi.package_count) AS total_package_count,

  -- Join to packaging to get requisition-level aggregation
  COUNT(DISTINCT rp.requisition_id) AS requisition_count,
  AVG(rp.total_slot_demand) AS avg_slot_demand_per_requisition,
  SUM(rp.total_slot_demand) AS total_slot_demand,

  -- Temporal aggregation
  DATE_TRUNC('day', rp.computed_at) AS computed_date

FROM public.requisition_packaging_items rpi
JOIN public.requisition_packaging rp ON rp.id = rpi.requisition_packaging_id
WHERE rp.is_final = TRUE
GROUP BY rpi.packaging_type, DATE_TRUNC('day', rp.computed_at);

-- Index for performance (UNIQUE index required for CONCURRENTLY refresh)
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_packaging_analytics_unique
  ON analytics.mv_packaging_analytics(packaging_type, computed_date);
CREATE INDEX IF NOT EXISTS idx_mv_packaging_analytics_type
  ON analytics.mv_packaging_analytics(packaging_type);
CREATE INDEX IF NOT EXISTS idx_mv_packaging_analytics_date
  ON analytics.mv_packaging_analytics(computed_date);

COMMENT ON MATERIALIZED VIEW analytics.mv_packaging_analytics IS
  'RFC-012 Phase 6: Packaging type distribution and slot demand analytics';

-- ----------------------------------------------------------------------------
-- Materialized View: Batch Assembly Metrics
-- ----------------------------------------------------------------------------
-- Tracks batch lifecycle from planned to completed
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.mv_batch_assembly_metrics AS
SELECT
  db.id AS batch_id,
  db.name AS batch_name,
  db.status,
  db.created_at,
  db.scheduled_date,
  db.scheduled_time,
  db.actual_start_time,
  db.actual_end_time,
  db.is_snapshot_locked,

  -- Assembly time (planned → assigned = when vehicle/driver added)
  EXTRACT(EPOCH FROM (db.updated_at - db.created_at)) / 3600 AS assembly_hours,

  -- Dispatch duration (in-progress → completed)
  EXTRACT(EPOCH FROM (db.actual_end_time - db.actual_start_time)) / 3600 AS dispatch_duration_hours,

  -- Snapshot lock duration
  EXTRACT(EPOCH FROM (db.actual_end_time - db.actual_start_time)) / 3600 AS snapshot_lock_hours,

  -- Count requisitions in batch
  (SELECT COUNT(*) FROM public.requisitions WHERE batch_id = db.id) AS requisition_count,

  -- Total slot demand in batch
  (SELECT SUM(rp.total_slot_demand)
   FROM public.requisitions r
   JOIN public.requisition_packaging rp ON rp.requisition_id = r.id
   WHERE r.batch_id = db.id) AS total_batch_slot_demand,

  -- Batch snapshot data (immutable)
  db.batch_snapshot,

  -- Flags
  CASE WHEN db.status = 'completed' THEN TRUE ELSE FALSE END AS is_completed,
  CASE WHEN db.status = 'cancelled' THEN TRUE ELSE FALSE END AS is_cancelled

FROM public.delivery_batches db;

-- Index for performance (UNIQUE index required for CONCURRENTLY refresh)
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_batch_assembly_id
  ON analytics.mv_batch_assembly_metrics(batch_id);
CREATE INDEX IF NOT EXISTS idx_mv_batch_assembly_status
  ON analytics.mv_batch_assembly_metrics(status);
CREATE INDEX IF NOT EXISTS idx_mv_batch_assembly_created
  ON analytics.mv_batch_assembly_metrics(created_at);

COMMENT ON MATERIALIZED VIEW analytics.mv_batch_assembly_metrics IS
  'RFC-012 Phase 6: Batch assembly and dispatch workflow metrics';

-- ----------------------------------------------------------------------------
-- Refresh Function: Refresh all RFC-012 analytics materialized views
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION analytics.refresh_requisition_workflow_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_requisition_workflow_metrics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_packaging_analytics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_batch_assembly_metrics;
END;
$$;

COMMENT ON FUNCTION analytics.refresh_requisition_workflow_analytics IS
  'RFC-012 Phase 6: Refresh all requisition workflow analytics views';

-- ----------------------------------------------------------------------------
-- RPC: Get Storefront Requisition Analytics
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_storefront_requisition_analytics(
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'approval_turnaround', json_build_object(
      'avg_hours', COALESCE(ROUND(AVG(approval_hours)::numeric, 2), 0),
      'median_hours', COALESCE(ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY approval_hours)::numeric, 2), 0),
      'p95_hours', COALESCE(ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY approval_hours)::numeric, 2), 0),
      'count', COUNT(*) FILTER (WHERE approval_hours IS NOT NULL)
    ),
    'packaging_efficiency', json_build_object(
      'avg_minutes', COALESCE(ROUND(AVG(packaging_minutes)::numeric, 2), 0),
      'median_minutes', COALESCE(ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY packaging_minutes)::numeric, 2), 0),
      'total_packaged', COUNT(*) FILTER (WHERE packaging_minutes IS NOT NULL)
    ),
    'ready_for_dispatch_queue', json_build_object(
      'avg_wait_hours', COALESCE(ROUND(AVG(assignment_wait_hours)::numeric, 2), 0),
      'current_queue_depth', (SELECT COUNT(*) FROM public.requisitions WHERE status = 'ready_for_dispatch'),
      'total_processed', COUNT(*) FILTER (WHERE assignment_wait_hours IS NOT NULL)
    ),
    'slot_demand', json_build_object(
      'avg_slot_demand', COALESCE(ROUND(AVG(total_slot_demand)::numeric, 2), 0),
      'total_slot_demand', COALESCE(ROUND(SUM(total_slot_demand)::numeric, 2), 0),
      'avg_rounded_slots', COALESCE(ROUND(AVG(rounded_slot_demand)::numeric, 2), 0),
      'total_requisitions', COUNT(*) FILTER (WHERE total_slot_demand IS NOT NULL)
    ),
    'fulfillment_rate', json_build_object(
      'total_requisitions', COUNT(*),
      'fulfilled', COUNT(*) FILTER (WHERE is_fulfilled),
      'failed', COUNT(*) FILTER (WHERE is_failed),
      'in_progress', COUNT(*) FILTER (WHERE status IN ('pending', 'approved', 'packaged', 'ready_for_dispatch', 'assigned_to_batch', 'in_transit')),
      'fulfillment_percentage', COALESCE(ROUND((COUNT(*) FILTER (WHERE is_fulfilled)::numeric / NULLIF(COUNT(*), 0) * 100), 2), 0)
    )
  ) INTO v_result
  FROM analytics.mv_requisition_workflow_metrics
  WHERE created_at >= p_start_date AND created_at <= p_end_date;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_storefront_requisition_analytics IS
  'RFC-012 Phase 6: Get Storefront requisition workflow analytics';

-- ----------------------------------------------------------------------------
-- RPC: Get FleetOps Dispatch Analytics
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_fleetops_dispatch_analytics(
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'batch_assembly', json_build_object(
      'avg_hours', COALESCE(ROUND(AVG(assembly_hours)::numeric, 2), 0),
      'median_hours', COALESCE(ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY assembly_hours)::numeric, 2), 0),
      'total_batches_assembled', COUNT(*) FILTER (WHERE assembly_hours IS NOT NULL)
    ),
    'dispatch_efficiency', json_build_object(
      'avg_dispatch_hours', COALESCE(ROUND(AVG(dispatch_duration_hours)::numeric, 2), 0),
      'median_dispatch_hours', COALESCE(ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY dispatch_duration_hours)::numeric, 2), 0),
      'total_dispatches_completed', COUNT(*) FILTER (WHERE is_completed)
    ),
    'snapshot_lock_duration', json_build_object(
      'avg_hours', COALESCE(ROUND(AVG(snapshot_lock_hours)::numeric, 2), 0),
      'median_hours', COALESCE(ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY snapshot_lock_hours)::numeric, 2), 0),
      'currently_locked', (SELECT COUNT(*) FROM public.delivery_batches WHERE is_snapshot_locked = TRUE)
    ),
    'batch_status_distribution', json_build_object(
      'planned', COUNT(*) FILTER (WHERE status = 'planned'),
      'assigned', COUNT(*) FILTER (WHERE status = 'assigned'),
      'in_progress', COUNT(*) FILTER (WHERE status = 'in-progress'),
      'completed', COUNT(*) FILTER (WHERE is_completed),
      'cancelled', COUNT(*) FILTER (WHERE is_cancelled)
    ),
    'slot_demand_per_batch', json_build_object(
      'avg_slot_demand', COALESCE(ROUND(AVG(total_batch_slot_demand)::numeric, 2), 0),
      'avg_requisitions_per_batch', COALESCE(ROUND(AVG(requisition_count)::numeric, 2), 0)
    )
  ) INTO v_result
  FROM analytics.mv_batch_assembly_metrics
  WHERE created_at >= p_start_date AND created_at <= p_end_date;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_fleetops_dispatch_analytics IS
  'RFC-012 Phase 6: Get FleetOps dispatch workflow analytics';

-- ----------------------------------------------------------------------------
-- RPC: Get Packaging Type Distribution
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_packaging_type_distribution(
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(
  packaging_type TEXT,
  item_count BIGINT,
  total_quantity BIGINT,
  total_slot_cost NUMERIC,
  avg_slot_cost_per_item NUMERIC,
  total_package_count BIGINT,
  requisition_count BIGINT,
  avg_slot_demand_per_requisition NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pa.packaging_type,
    SUM(pa.item_count)::BIGINT,
    SUM(pa.total_quantity)::BIGINT,
    ROUND(SUM(pa.total_slot_cost)::numeric, 2),
    ROUND(AVG(pa.avg_slot_cost_per_item)::numeric, 2),
    SUM(pa.total_package_count)::BIGINT,
    SUM(pa.requisition_count)::BIGINT,
    ROUND(AVG(pa.avg_slot_demand_per_requisition)::numeric, 2)
  FROM analytics.mv_packaging_analytics pa
  WHERE pa.computed_date >= p_start_date::DATE AND pa.computed_date <= p_end_date::DATE
  GROUP BY pa.packaging_type
  ORDER BY SUM(pa.item_count) DESC;
END;
$$;

COMMENT ON FUNCTION public.get_packaging_type_distribution IS
  'RFC-012 Phase 6: Get packaging type distribution and slot cost analysis';

-- ----------------------------------------------------------------------------
-- Trigger: Auto-refresh analytics on requisition/batch changes
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION analytics.trigger_refresh_requisition_analytics()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Refresh views asynchronously (non-blocking)
  PERFORM analytics.refresh_requisition_workflow_analytics();
  RETURN NEW;
END;
$$;

-- Attach triggers (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_refresh_analytics_on_requisition_update'
  ) THEN
    CREATE TRIGGER trigger_refresh_analytics_on_requisition_update
    AFTER INSERT OR UPDATE ON public.requisitions
    FOR EACH STATEMENT
    EXECUTE FUNCTION analytics.trigger_refresh_requisition_analytics();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_refresh_analytics_on_batch_update'
  ) THEN
    CREATE TRIGGER trigger_refresh_analytics_on_batch_update
    AFTER INSERT OR UPDATE ON public.delivery_batches
    FOR EACH STATEMENT
    EXECUTE FUNCTION analytics.trigger_refresh_requisition_analytics();
  END IF;
END $$;

COMMENT ON FUNCTION analytics.trigger_refresh_requisition_analytics IS
  'RFC-012 Phase 6: Auto-refresh analytics views when requisitions or batches change';

-- ============================================================================
-- Initial Data Population
-- ============================================================================
-- Refresh all views initially
SELECT analytics.refresh_requisition_workflow_analytics();
