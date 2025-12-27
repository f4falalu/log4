-- ============================================================================
-- BIKO PLATFORM - CONSOLIDATED MIGRATION SCRIPT
-- ============================================================================
-- This script consolidates 3 new migrations for manual deployment
-- Execute this entire script in the Supabase SQL Editor
--
-- Migrations included:
-- 1. Trade-Off System (20251223000001_tradeoff_system.sql)
-- 2. Planning System (20251223000002_planning_system.sql)
-- 3. Payloads System (20251225000001_create_payloads_table.sql)
--
-- IMPORTANT: Create a database backup before executing!
-- Dashboard → Database → Backups → Create Backup
-- ============================================================================

-- ============================================================================
-- MIGRATION 1: TRADE-OFF SYSTEM
-- ============================================================================
-- Trade-Off is the ONLY reassignment mechanism in operational mode
-- Workflow: Select Source → Choose Receivers → Place Handover → Confirm → Execute

-- 1.1: TRADEOFFS TABLE (Main Trade-Off Records)
CREATE TABLE IF NOT EXISTS public.tradeoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Metadata
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  initiated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- State Machine
  status TEXT NOT NULL DEFAULT 'draft',
  -- Status values: draft, pending_confirmation, confirmed, executing, completed, rejected, cancelled

  -- Source Vehicle
  source_vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  source_driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,

  -- Receiving Vehicles (stored as array)
  receiving_vehicle_ids UUID[] NOT NULL DEFAULT '{}',

  -- Handover Point
  handover_point GEOMETRY(Point, 4326) NOT NULL,
  handover_address TEXT,
  handover_notes TEXT,

  -- Metrics (calculated at creation)
  estimated_time_saved INTEGER, -- minutes
  estimated_distance_saved NUMERIC(10, 2), -- km
  estimated_fuel_saved NUMERIC(10, 2), -- liters

  -- Outcomes (recorded after completion)
  actual_time_saved INTEGER, -- minutes
  actual_distance_saved NUMERIC(10, 2), -- km
  actual_fuel_saved NUMERIC(10, 2), -- liters
  success_rate INTEGER, -- 0-100 percentage

  -- Confirmation tracking
  requires_confirmation BOOLEAN DEFAULT true,
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Rejection tracking
  rejected_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rejection_reason TEXT,

  -- Execution tracking
  executed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tradeoffs_workspace ON public.tradeoffs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tradeoffs_status ON public.tradeoffs(status);
CREATE INDEX IF NOT EXISTS idx_tradeoffs_source_vehicle ON public.tradeoffs(source_vehicle_id);
CREATE INDEX IF NOT EXISTS idx_tradeoffs_initiated_at ON public.tradeoffs(initiated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tradeoffs_handover_point ON public.tradeoffs USING GIST(handover_point);

ALTER TABLE public.tradeoffs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "CREATE POLICY "
CREATE POLICY "Users can view tradeoffs"
  ON public.tradeoffs FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "CREATE POLICY "
CREATE POLICY "Users can create tradeoffs"
  ON public.tradeoffs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "CREATE POLICY "
CREATE POLICY "Users can update tradeoffs"
  ON public.tradeoffs FOR UPDATE
  USING (auth.role() = 'authenticated');

COMMENT ON TABLE public.tradeoffs IS 'Trade-Off records - the ONLY reassignment mechanism';

-- 1.2: TRADEOFF_ITEMS TABLE (Items Being Transferred)
CREATE TABLE IF NOT EXISTS public.tradeoff_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  tradeoff_id UUID NOT NULL REFERENCES public.tradeoffs(id) ON DELETE CASCADE,

  -- Items can be entire batches or individual facility deliveries within a batch
  batch_id UUID REFERENCES public.delivery_batches(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES public.facilities(id) ON DELETE SET NULL,

  -- Assignment
  assigned_to_vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  assigned_to_driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,

  -- Original assignment (for audit trail)
  original_vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  original_driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,

  -- Transfer details
  transferred_at TIMESTAMPTZ,
  transfer_confirmed BOOLEAN DEFAULT false,

  -- Item details
  item_count INTEGER,
  item_type TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CHECK (batch_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_tradeoff_items_tradeoff ON public.tradeoff_items(tradeoff_id);
CREATE INDEX IF NOT EXISTS idx_tradeoff_items_batch ON public.tradeoff_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_tradeoff_items_facility ON public.tradeoff_items(facility_id);
CREATE INDEX IF NOT EXISTS idx_tradeoff_items_assigned_vehicle ON public.tradeoff_items(assigned_to_vehicle_id);

ALTER TABLE public.tradeoff_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "CREATE POLICY "
CREATE POLICY "Users can view tradeoff items"
  ON public.tradeoff_items FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "CREATE POLICY "
CREATE POLICY "Users can manage tradeoff items"
  ON public.tradeoff_items FOR ALL
  USING (auth.role() = 'authenticated');

COMMENT ON TABLE public.tradeoff_items IS 'Items (deliveries) being transferred in a Trade-Off';

-- 1.3: TRADEOFF_CONFIRMATIONS TABLE
CREATE TABLE IF NOT EXISTS public.tradeoff_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  tradeoff_id UUID NOT NULL REFERENCES public.tradeoffs(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,

  status TEXT NOT NULL DEFAULT 'pending',
  confirmed_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  response_notes TEXT,

  confirmation_location GEOMETRY(Point, 4326),

  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(tradeoff_id, driver_id)
);

CREATE INDEX IF NOT EXISTS idx_tradeoff_confirmations_tradeoff ON public.tradeoff_confirmations(tradeoff_id);
CREATE INDEX IF NOT EXISTS idx_tradeoff_confirmations_driver ON public.tradeoff_confirmations(driver_id);
CREATE INDEX IF NOT EXISTS idx_tradeoff_confirmations_status ON public.tradeoff_confirmations(status);

ALTER TABLE public.tradeoff_confirmations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "CREATE POLICY "
CREATE POLICY "Users can view confirmations"
  ON public.tradeoff_confirmations FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "CREATE POLICY "
CREATE POLICY "Users can update confirmations"
  ON public.tradeoff_confirmations FOR UPDATE
  USING (auth.role() = 'authenticated');

COMMENT ON TABLE public.tradeoff_confirmations IS 'Multi-party confirmation tracking for Trade-Offs';

-- 1.4: TRADEOFF_ROUTES TABLE
CREATE TABLE IF NOT EXISTS public.tradeoff_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  tradeoff_id UUID NOT NULL REFERENCES public.tradeoffs(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,

  route_type TEXT NOT NULL,
  route_geometry GEOMETRY(LineString, 4326) NOT NULL,

  total_distance NUMERIC(10, 2),
  estimated_duration INTEGER,
  waypoints JSONB DEFAULT '[]'::jsonb,

  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tradeoff_routes_tradeoff ON public.tradeoff_routes(tradeoff_id);
CREATE INDEX IF NOT EXISTS idx_tradeoff_routes_vehicle ON public.tradeoff_routes(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_tradeoff_routes_geometry ON public.tradeoff_routes USING GIST(route_geometry);

ALTER TABLE public.tradeoff_routes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "CREATE POLICY "
CREATE POLICY "Users can view routes"
  ON public.tradeoff_routes FOR SELECT
  USING (auth.role() = 'authenticated');

COMMENT ON TABLE public.tradeoff_routes IS 'Route snapshots for Trade-Off forensics and analysis';

-- 1.5: TRADEOFF TRIGGERS AND FUNCTIONS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_tradeoffs_updated_at ON public.tradeoffs;
CREATE TRIGGER update_tradeoffs_updated_at BEFORE UPDATE ON public.tradeoffs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tradeoff_items_updated_at ON public.tradeoff_items;
CREATE TRIGGER update_tradeoff_items_updated_at BEFORE UPDATE ON public.tradeoff_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tradeoff_confirmations_updated_at ON public.tradeoff_confirmations;
CREATE TRIGGER update_tradeoff_confirmations_updated_at BEFORE UPDATE ON public.tradeoff_confirmations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION get_workspace_tradeoffs(p_workspace_id UUID)
RETURNS TABLE (
  id UUID,
  status TEXT,
  source_vehicle_id UUID,
  receiving_vehicle_ids UUID[],
  handover_point GEOMETRY,
  items_count BIGINT,
  initiated_at TIMESTAMPTZ,
  estimated_time_saved INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.status,
    t.source_vehicle_id,
    t.receiving_vehicle_ids,
    t.handover_point,
    COUNT(ti.id) as items_count,
    t.initiated_at,
    t.estimated_time_saved
  FROM public.tradeoffs t
  LEFT JOIN public.tradeoff_items ti ON t.id = ti.tradeoff_id
  WHERE t.workspace_id = p_workspace_id
  GROUP BY t.id
  ORDER BY t.initiated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_workspace_tradeoffs(UUID) TO authenticated;

-- ============================================================================
-- MIGRATION 2: PLANNING SYSTEM
-- ============================================================================
-- Planning mode: Draft → Review → Activate workflow for spatial configurations

-- 2.1: ZONE_CONFIGURATIONS TABLE
CREATE TABLE IF NOT EXISTS public.zone_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Metadata
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,

  -- Zone geometry
  boundary GEOMETRY(Polygon, 4326) NOT NULL,
  centroid GEOMETRY(Point, 4326),

  -- Versioning
  version INTEGER NOT NULL DEFAULT 1,
  parent_version_id UUID REFERENCES public.zone_configurations(id) ON DELETE SET NULL,

  -- Activation workflow
  active BOOLEAN NOT NULL DEFAULT false,
  draft_created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  draft_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Review tracking
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  -- Activation tracking
  activated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  activated_at TIMESTAMPTZ,

  -- Deactivation tracking
  deactivated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deactivated_at TIMESTAMPTZ,
  deactivation_reason TEXT,

  -- Associated facilities
  assigned_facility_ids UUID[] DEFAULT '{}',

  -- Zone properties
  zone_type TEXT DEFAULT 'service',
  priority INTEGER DEFAULT 0,
  capacity_limit INTEGER,

  -- Performance targets
  target_delivery_time INTEGER,
  target_success_rate INTEGER,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zone_configurations_workspace ON public.zone_configurations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_zone_configurations_active ON public.zone_configurations(active);
CREATE INDEX IF NOT EXISTS idx_zone_configurations_version ON public.zone_configurations(version);
CREATE INDEX IF NOT EXISTS idx_zone_configurations_boundary ON public.zone_configurations USING GIST(boundary);
CREATE INDEX IF NOT EXISTS idx_zone_configurations_centroid ON public.zone_configurations USING GIST(centroid);

ALTER TABLE public.zone_configurations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "CREATE POLICY "
CREATE POLICY "Users can view zone configurations"
  ON public.zone_configurations FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "CREATE POLICY "
CREATE POLICY "Users can create zone configurations"
  ON public.zone_configurations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "CREATE POLICY "
CREATE POLICY "Users can update zone configurations"
  ON public.zone_configurations FOR UPDATE
  USING (auth.role() = 'authenticated');

COMMENT ON TABLE public.zone_configurations IS 'Service zone configurations with versioning and draft workflow';

-- 2.2: ROUTE_SKETCHES TABLE
CREATE TABLE IF NOT EXISTS public.route_sketches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,

  route_geometry GEOMETRY(LineString, 4326) NOT NULL,
  waypoints JSONB DEFAULT '[]'::jsonb,

  start_facility_id UUID REFERENCES public.facilities(id) ON DELETE SET NULL,
  end_facility_id UUID REFERENCES public.facilities(id) ON DELETE SET NULL,
  estimated_distance NUMERIC(10, 2),
  estimated_duration INTEGER,
  route_type TEXT DEFAULT 'delivery',

  active BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_route_sketches_workspace ON public.route_sketches(workspace_id);
CREATE INDEX IF NOT EXISTS idx_route_sketches_active ON public.route_sketches(active);
CREATE INDEX IF NOT EXISTS idx_route_sketches_geometry ON public.route_sketches USING GIST(route_geometry);
CREATE INDEX IF NOT EXISTS idx_route_sketches_start_facility ON public.route_sketches(start_facility_id);
CREATE INDEX IF NOT EXISTS idx_route_sketches_end_facility ON public.route_sketches(end_facility_id);

ALTER TABLE public.route_sketches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "CREATE POLICY "
CREATE POLICY "Users can view route sketches"
  ON public.route_sketches FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "CREATE POLICY "
CREATE POLICY "Users can manage route sketches"
  ON public.route_sketches FOR ALL
  USING (auth.role() = 'authenticated');

COMMENT ON TABLE public.route_sketches IS 'Non-binding route sketches for planning mode';

-- 2.3: FACILITY_ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS public.facility_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  zone_configuration_id UUID NOT NULL REFERENCES public.zone_configurations(id) ON DELETE CASCADE,

  assignment_type TEXT DEFAULT 'primary',
  priority INTEGER DEFAULT 0,

  active BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  activated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  activated_at TIMESTAMPTZ,

  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(facility_id, zone_configuration_id)
);

CREATE INDEX IF NOT EXISTS idx_facility_assignments_workspace ON public.facility_assignments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_facility_assignments_facility ON public.facility_assignments(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_assignments_zone ON public.facility_assignments(zone_configuration_id);
CREATE INDEX IF NOT EXISTS idx_facility_assignments_active ON public.facility_assignments(active);

ALTER TABLE public.facility_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "CREATE POLICY "
CREATE POLICY "Users can view facility assignments"
  ON public.facility_assignments FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "CREATE POLICY "
CREATE POLICY "Users can manage facility assignments"
  ON public.facility_assignments FOR ALL
  USING (auth.role() = 'authenticated');

COMMENT ON TABLE public.facility_assignments IS 'Facility-to-zone assignments with draft workflow';

-- 2.4: MAP_ACTION_AUDIT TABLE
CREATE TABLE IF NOT EXISTS public.map_action_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  action_type TEXT NOT NULL,
  capability TEXT NOT NULL,

  entity_type TEXT,
  entity_id UUID,

  old_data JSONB,
  new_data JSONB,

  action_location GEOMETRY(Point, 4326),

  success BOOLEAN DEFAULT true,
  error_message TEXT,

  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_map_action_audit_workspace ON public.map_action_audit(workspace_id);
CREATE INDEX IF NOT EXISTS idx_map_action_audit_user ON public.map_action_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_map_action_audit_action_type ON public.map_action_audit(action_type);
CREATE INDEX IF NOT EXISTS idx_map_action_audit_capability ON public.map_action_audit(capability);
CREATE INDEX IF NOT EXISTS idx_map_action_audit_created_at ON public.map_action_audit(created_at DESC);

ALTER TABLE public.map_action_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "CREATE POLICY "
CREATE POLICY "Users can view audit logs"
  ON public.map_action_audit FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "CREATE POLICY "
CREATE POLICY "System can insert audit logs"
  ON public.map_action_audit FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE public.map_action_audit IS 'Audit log for all map system actions';

-- 2.5: FORENSICS_QUERY_LOG TABLE
CREATE TABLE IF NOT EXISTS public.forensics_query_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  query_type TEXT NOT NULL,
  time_range_start TIMESTAMPTZ,
  time_range_end TIMESTAMPTZ,

  filters JSONB DEFAULT '{}'::jsonb,

  results_count INTEGER,
  execution_time_ms INTEGER,

  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_forensics_query_log_workspace ON public.forensics_query_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_forensics_query_log_user ON public.forensics_query_log(user_id);
CREATE INDEX IF NOT EXISTS idx_forensics_query_log_query_type ON public.forensics_query_log(query_type);
CREATE INDEX IF NOT EXISTS idx_forensics_query_log_created_at ON public.forensics_query_log(created_at DESC);

ALTER TABLE public.forensics_query_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "CREATE POLICY "
CREATE POLICY "Users can view query logs"
  ON public.forensics_query_log FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "CREATE POLICY "
CREATE POLICY "System can insert query logs"
  ON public.forensics_query_log FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE public.forensics_query_log IS 'Query log for forensics mode usage tracking';

-- 2.6: PLANNING SYSTEM TRIGGERS AND FUNCTIONS
CREATE OR REPLACE FUNCTION calculate_zone_centroid()
RETURNS TRIGGER AS $$
BEGIN
  NEW.centroid = ST_Centroid(NEW.boundary);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_zone_centroid_trigger ON public.zone_configurations;
CREATE TRIGGER calculate_zone_centroid_trigger
  BEFORE INSERT OR UPDATE OF boundary ON public.zone_configurations
  FOR EACH ROW
  EXECUTE FUNCTION calculate_zone_centroid();

DROP TRIGGER IF EXISTS update_zone_configurations_updated_at ON public.zone_configurations;
CREATE TRIGGER update_zone_configurations_updated_at
  BEFORE UPDATE ON public.zone_configurations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_route_sketches_updated_at ON public.route_sketches;
CREATE TRIGGER update_route_sketches_updated_at
  BEFORE UPDATE ON public.route_sketches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_facility_assignments_updated_at ON public.facility_assignments;
CREATE TRIGGER update_facility_assignments_updated_at
  BEFORE UPDATE ON public.facility_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION activate_zone_configuration(
  p_zone_id UUID,
  p_activated_by UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_workspace_id UUID;
BEGIN
  SELECT workspace_id INTO v_workspace_id
  FROM public.zone_configurations
  WHERE id = p_zone_id;

  UPDATE public.zone_configurations
  SET
    active = false,
    deactivated_by = p_activated_by,
    deactivated_at = now(),
    deactivation_reason = 'Replaced by newer version'
  WHERE workspace_id = v_workspace_id
    AND name = (SELECT name FROM public.zone_configurations WHERE id = p_zone_id)
    AND id != p_zone_id
    AND active = true;

  UPDATE public.zone_configurations
  SET
    active = true,
    activated_by = p_activated_by,
    activated_at = now()
  WHERE id = p_zone_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION activate_zone_configuration(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION get_active_zones(p_workspace_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  boundary GEOMETRY,
  centroid GEOMETRY,
  version INTEGER,
  activated_at TIMESTAMPTZ,
  zone_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    zc.id,
    zc.name,
    zc.boundary,
    zc.centroid,
    zc.version,
    zc.activated_at,
    zc.zone_type
  FROM public.zone_configurations zc
  WHERE zc.workspace_id = p_workspace_id
    AND zc.active = true
  ORDER BY zc.priority DESC, zc.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_active_zones(UUID) TO authenticated;

-- ============================================================================
-- MIGRATION 3: PAYLOADS SYSTEM
-- ============================================================================
-- Create payloads table for draft payload planning

-- 3.1: PAYLOADS TABLE
CREATE TABLE IF NOT EXISTS payloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  workspace_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  name TEXT NOT NULL,
  status TEXT CHECK (status IN ('draft', 'ready', 'finalized')) DEFAULT 'draft',
  total_weight_kg FLOAT DEFAULT 0,
  total_volume_m3 FLOAT DEFAULT 0,
  utilization_pct FLOAT DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3.2: UPDATE PAYLOAD_ITEMS TABLE
ALTER TABLE payload_items
ADD COLUMN IF NOT EXISTS payload_id UUID REFERENCES payloads(id) ON DELETE CASCADE;

ALTER TABLE payload_items
ALTER COLUMN batch_id DROP NOT NULL;

-- 3.3: INDEXES
CREATE INDEX IF NOT EXISTS idx_payloads_vehicle_id ON payloads(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_payloads_workspace_id ON payloads(workspace_id);
CREATE INDEX IF NOT EXISTS idx_payloads_status ON payloads(status);
CREATE INDEX IF NOT EXISTS idx_payload_items_payload_id ON payload_items(payload_id);

-- 3.4: RLS
ALTER TABLE payloads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "CREATE POLICY "
CREATE POLICY "Enable read access for authenticated users"
  ON payloads FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "CREATE POLICY "
CREATE POLICY "Enable all operations for authenticated users"
  ON payloads FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 3.5: REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE payloads;

-- 3.6: PAYLOAD TRIGGERS AND FUNCTIONS
CREATE OR REPLACE FUNCTION update_payload_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE payloads
  SET
    total_weight_kg = (
      SELECT COALESCE(SUM(weight_kg * quantity), 0)
      FROM payload_items
      WHERE payload_id = COALESCE(NEW.payload_id, OLD.payload_id)
    ),
    total_volume_m3 = (
      SELECT COALESCE(SUM(volume_m3), 0)
      FROM payload_items
      WHERE payload_id = COALESCE(NEW.payload_id, OLD.payload_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.payload_id, OLD.payload_id);

  UPDATE payloads p
  SET utilization_pct = CASE
    WHEN v.capacity_volume_m3 > 0 THEN
      LEAST((p.total_volume_m3 / v.capacity_volume_m3) * 100, 100)
    ELSE 0
  END
  FROM vehicles v
  WHERE p.vehicle_id = v.id
    AND p.id = COALESCE(NEW.payload_id, OLD.payload_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_payload_totals ON payload_items;
CREATE TRIGGER trigger_update_payload_totals
  AFTER INSERT OR UPDATE OR DELETE ON payload_items
  FOR EACH ROW
  EXECUTE FUNCTION update_payload_totals();

CREATE OR REPLACE FUNCTION update_payload_utilization_on_vehicle_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.vehicle_id IS NOT NULL THEN
    UPDATE payloads
    SET utilization_pct = CASE
      WHEN v.capacity_volume_m3 > 0 THEN
        LEAST((NEW.total_volume_m3 / v.capacity_volume_m3) * 100, 100)
      ELSE 0
    END
    FROM vehicles v
    WHERE payloads.id = NEW.id AND v.id = NEW.vehicle_id;
  ELSE
    UPDATE payloads
    SET utilization_pct = 0
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_utilization_on_vehicle_change ON payloads;
CREATE TRIGGER trigger_update_utilization_on_vehicle_change
  AFTER UPDATE OF vehicle_id ON payloads
  FOR EACH ROW
  WHEN (OLD.vehicle_id IS DISTINCT FROM NEW.vehicle_id)
  EXECUTE FUNCTION update_payload_utilization_on_vehicle_change();

CREATE OR REPLACE FUNCTION update_payloads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_payloads_timestamp ON payloads;
CREATE TRIGGER trigger_update_payloads_timestamp
  BEFORE UPDATE ON payloads
  FOR EACH ROW
  EXECUTE FUNCTION update_payloads_updated_at();

-- ============================================================================
-- MIGRATION TRACKING
-- ============================================================================
-- After successful execution, run these queries to mark migrations as applied:
/*
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES
  ('20251223000001'),
  ('20251223000002'),
  ('20251225000001')
ON CONFLICT (version) DO NOTHING;
*/

-- ============================================================================
-- DEPLOYMENT COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Verify tables were created successfully
-- 2. Run the migration tracking INSERT statement above
-- 3. Enable feature flags in .env file
-- 4. Test features in the application
-- ============================================================================
