-- Add workspace_id to zones, routes, service_areas, and route_facilities tables
-- This enables workspace isolation for these entities

-- =============================================
-- 1. ZONES
-- =============================================
ALTER TABLE public.zones
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id);

-- Backfill: assign existing zones to the first workspace (if any)
UPDATE public.zones
SET workspace_id = (SELECT id FROM public.workspaces ORDER BY created_at LIMIT 1)
WHERE workspace_id IS NULL;

-- Make NOT NULL after backfill
ALTER TABLE public.zones
  ALTER COLUMN workspace_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_zones_workspace_id ON public.zones(workspace_id);

-- RLS
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_isolation" ON public.zones;
CREATE POLICY "workspace_isolation" ON public.zones
  FOR ALL TO authenticated
  USING (is_workspace_member_v2(workspace_id))
  WITH CHECK (is_workspace_member_v2(workspace_id));

-- =============================================
-- 2. SERVICE_AREAS
-- =============================================
ALTER TABLE public.service_areas
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id);

UPDATE public.service_areas
SET workspace_id = (SELECT id FROM public.workspaces ORDER BY created_at LIMIT 1)
WHERE workspace_id IS NULL;

ALTER TABLE public.service_areas
  ALTER COLUMN workspace_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_service_areas_workspace_id ON public.service_areas(workspace_id);

ALTER TABLE public.service_areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_isolation" ON public.service_areas;
CREATE POLICY "workspace_isolation" ON public.service_areas
  FOR ALL TO authenticated
  USING (is_workspace_member_v2(workspace_id))
  WITH CHECK (is_workspace_member_v2(workspace_id));

-- =============================================
-- 3. ROUTES
-- =============================================
ALTER TABLE public.routes
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id);

UPDATE public.routes
SET workspace_id = (SELECT id FROM public.workspaces ORDER BY created_at LIMIT 1)
WHERE workspace_id IS NULL;

ALTER TABLE public.routes
  ALTER COLUMN workspace_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_routes_workspace_id ON public.routes(workspace_id);

ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_isolation" ON public.routes;
CREATE POLICY "workspace_isolation" ON public.routes
  FOR ALL TO authenticated
  USING (is_workspace_member_v2(workspace_id))
  WITH CHECK (is_workspace_member_v2(workspace_id));

-- =============================================
-- 4. ROUTE_FACILITIES (inherits workspace via route, but add RLS)
-- =============================================
ALTER TABLE public.route_facilities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_isolation" ON public.route_facilities;
CREATE POLICY "workspace_isolation" ON public.route_facilities
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.routes r
      WHERE r.id = route_facilities.route_id
      AND is_workspace_member_v2(r.workspace_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.routes r
      WHERE r.id = route_facilities.route_id
      AND is_workspace_member_v2(r.workspace_id)
    )
  );

-- =============================================
-- 5. SERVICE_AREA_FACILITIES (inherits workspace via service_area)
-- =============================================
ALTER TABLE public.service_area_facilities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_isolation" ON public.service_area_facilities;
CREATE POLICY "workspace_isolation" ON public.service_area_facilities
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.service_areas sa
      WHERE sa.id = service_area_facilities.service_area_id
      AND is_workspace_member_v2(sa.workspace_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.service_areas sa
      WHERE sa.id = service_area_facilities.service_area_id
      AND is_workspace_member_v2(sa.workspace_id)
    )
  );
