-- Trade-Off System Migration
-- This migration creates tables for the Trade-Off workflow system
-- Trade-Off is the ONLY reassignment mechanism in operational mode
--
-- Workflow: Select Source → Choose Receivers → Place Handover → Confirm → Execute
-- State Machine: idle → selecting_items → selecting_receivers → placing_handover → confirming → executing → completed/rejected

-- ============================================================================
-- 1. TRADEOFFS TABLE (Main Trade-Off Records)
-- ============================================================================
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tradeoffs_workspace ON public.tradeoffs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tradeoffs_status ON public.tradeoffs(status);
CREATE INDEX IF NOT EXISTS idx_tradeoffs_source_vehicle ON public.tradeoffs(source_vehicle_id);
CREATE INDEX IF NOT EXISTS idx_tradeoffs_initiated_at ON public.tradeoffs(initiated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tradeoffs_handover_point ON public.tradeoffs USING GIST(handover_point);

-- RLS
ALTER TABLE public.tradeoffs ENABLE ROW LEVEL SECURITY;

-- Simplified RLS: Allow authenticated users to access tradeoffs
-- TODO: Add proper workspace membership check when workspace_members table is created
CREATE POLICY "Users can view tradeoffs"
  ON public.tradeoffs FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create tradeoffs"
  ON public.tradeoffs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update tradeoffs"
  ON public.tradeoffs FOR UPDATE
  USING (auth.role() = 'authenticated');

COMMENT ON TABLE public.tradeoffs IS 'Trade-Off records - the ONLY reassignment mechanism';

-- ============================================================================
-- 2. TRADEOFF_ITEMS TABLE (Items Being Transferred)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tradeoff_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  tradeoff_id UUID NOT NULL REFERENCES public.tradeoffs(id) ON DELETE CASCADE,

  -- Items can be entire batches or individual facility deliveries within a batch
  batch_id UUID REFERENCES public.delivery_batches(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES public.facilities(id) ON DELETE SET NULL, -- Specific delivery stop if partial batch transfer

  -- Assignment
  assigned_to_vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  assigned_to_driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,

  -- Original assignment (for audit trail)
  original_vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  original_driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,

  -- Transfer details
  transferred_at TIMESTAMPTZ,
  transfer_confirmed BOOLEAN DEFAULT false,

  -- Item details (if applicable)
  item_count INTEGER, -- Number of items transferred
  item_type TEXT, -- Type of items (medication, supplies, etc.)

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraint: Must have either batch_id or both batch_id and facility_id
  CHECK (batch_id IS NOT NULL)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tradeoff_items_tradeoff ON public.tradeoff_items(tradeoff_id);
CREATE INDEX IF NOT EXISTS idx_tradeoff_items_batch ON public.tradeoff_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_tradeoff_items_facility ON public.tradeoff_items(facility_id);
CREATE INDEX IF NOT EXISTS idx_tradeoff_items_assigned_vehicle ON public.tradeoff_items(assigned_to_vehicle_id);

-- RLS
ALTER TABLE public.tradeoff_items ENABLE ROW LEVEL SECURITY;

-- Simplified RLS: Allow authenticated users
CREATE POLICY "Users can view tradeoff items"
  ON public.tradeoff_items FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage tradeoff items"
  ON public.tradeoff_items FOR ALL
  USING (auth.role() = 'authenticated');

COMMENT ON TABLE public.tradeoff_items IS 'Items (deliveries) being transferred in a Trade-Off';

-- ============================================================================
-- 3. TRADEOFF_CONFIRMATIONS TABLE (Multi-party Confirmation Tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tradeoff_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  tradeoff_id UUID NOT NULL REFERENCES public.tradeoffs(id) ON DELETE CASCADE,

  -- Who needs to confirm
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,

  -- Confirmation details
  status TEXT NOT NULL DEFAULT 'pending',
  -- Status values: pending, confirmed, rejected

  confirmed_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  response_notes TEXT,

  -- Location tracking (where confirmation happened)
  confirmation_location GEOMETRY(Point, 4326),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Ensure one confirmation per driver per tradeoff
  UNIQUE(tradeoff_id, driver_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tradeoff_confirmations_tradeoff ON public.tradeoff_confirmations(tradeoff_id);
CREATE INDEX IF NOT EXISTS idx_tradeoff_confirmations_driver ON public.tradeoff_confirmations(driver_id);
CREATE INDEX IF NOT EXISTS idx_tradeoff_confirmations_status ON public.tradeoff_confirmations(status);

-- RLS
ALTER TABLE public.tradeoff_confirmations ENABLE ROW LEVEL SECURITY;

-- Simplified RLS: Allow authenticated users
CREATE POLICY "Users can view confirmations"
  ON public.tradeoff_confirmations FOR SELECT
  USING (auth.role() = 'authenticated');

-- Simplified: Allow authenticated users to update confirmations
-- TODO: Add driver-specific check when user_id is added to drivers table
CREATE POLICY "Users can update confirmations"
  ON public.tradeoff_confirmations FOR UPDATE
  USING (auth.role() = 'authenticated');

COMMENT ON TABLE public.tradeoff_confirmations IS 'Multi-party confirmation tracking for Trade-Offs';

-- ============================================================================
-- 4. TRADEOFF_ROUTES TABLE (Route Snapshots for Forensics)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tradeoff_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  tradeoff_id UUID NOT NULL REFERENCES public.tradeoffs(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,

  -- Route type
  route_type TEXT NOT NULL,
  -- Route types: original_source, modified_source, original_receiving, modified_receiving

  -- Route geometry (LineString)
  route_geometry GEOMETRY(LineString, 4326) NOT NULL,

  -- Route metrics
  total_distance NUMERIC(10, 2), -- km
  estimated_duration INTEGER, -- minutes
  waypoints JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tradeoff_routes_tradeoff ON public.tradeoff_routes(tradeoff_id);
CREATE INDEX IF NOT EXISTS idx_tradeoff_routes_vehicle ON public.tradeoff_routes(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_tradeoff_routes_geometry ON public.tradeoff_routes USING GIST(route_geometry);

-- RLS
ALTER TABLE public.tradeoff_routes ENABLE ROW LEVEL SECURITY;

-- Simplified RLS: Allow authenticated users
CREATE POLICY "Users can view routes"
  ON public.tradeoff_routes FOR SELECT
  USING (auth.role() = 'authenticated');

COMMENT ON TABLE public.tradeoff_routes IS 'Route snapshots for Trade-Off forensics and analysis';

-- ============================================================================
-- 5. TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tradeoffs_updated_at BEFORE UPDATE ON public.tradeoffs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tradeoff_items_updated_at BEFORE UPDATE ON public.tradeoff_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tradeoff_confirmations_updated_at BEFORE UPDATE ON public.tradeoff_confirmations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. FUNCTIONS
-- ============================================================================

-- Function to get all Trade-Offs for a workspace with items count
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_workspace_tradeoffs(UUID) TO authenticated;
