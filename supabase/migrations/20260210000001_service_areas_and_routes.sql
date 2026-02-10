-- ============================================================
-- Migration: Service Areas & Route Management
-- Description: Creates service_areas, service_area_facilities,
--              routes, and route_facilities tables for the
--              Zone → Service Area → Route planning hierarchy.
-- ============================================================

-- =========================
-- 1. service_areas table
-- =========================
CREATE TABLE IF NOT EXISTS public.service_areas (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT        NOT NULL,
  zone_id           UUID        NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
  warehouse_id      UUID        NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  service_type      TEXT        NOT NULL DEFAULT 'general',
  description       TEXT,
  max_distance_km   NUMERIC(8,2),
  delivery_frequency TEXT,
  priority          TEXT        NOT NULL DEFAULT 'standard',
  sla_hours         INTEGER,
  is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
  metadata          JSONB       NOT NULL DEFAULT '{}',
  created_by        UUID        REFERENCES auth.users(id),
  updated_by        UUID        REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.service_areas IS 'Defines facility-to-warehouse access logic within a zone';
COMMENT ON COLUMN public.service_areas.service_type IS 'Values: general, arv, epi, mixed';
COMMENT ON COLUMN public.service_areas.delivery_frequency IS 'Values: weekly, biweekly, monthly, quarterly';
COMMENT ON COLUMN public.service_areas.priority IS 'Values: critical, high, standard, low';

-- =========================
-- 2. service_area_facilities junction table
-- =========================
CREATE TABLE IF NOT EXISTS public.service_area_facilities (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  service_area_id   UUID        NOT NULL REFERENCES public.service_areas(id) ON DELETE CASCADE,
  facility_id       UUID        NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  assigned_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by       UUID        REFERENCES auth.users(id),
  CONSTRAINT unique_sa_facility UNIQUE (service_area_id, facility_id)
);

COMMENT ON TABLE public.service_area_facilities IS 'Maps facilities to service areas (many-to-many)';

-- =========================
-- 3. routes table
-- =========================
CREATE TABLE IF NOT EXISTS public.routes (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT        NOT NULL,
  zone_id               UUID        NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
  service_area_id       UUID        NOT NULL REFERENCES public.service_areas(id) ON DELETE RESTRICT,
  warehouse_id          UUID        NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  creation_mode         TEXT        NOT NULL DEFAULT 'facility_list',
  status                TEXT        NOT NULL DEFAULT 'draft',
  total_distance_km     NUMERIC(10,2),
  estimated_duration_min INTEGER,
  optimized_geometry    JSONB,
  algorithm_used        TEXT,
  is_sandbox            BOOLEAN     NOT NULL DEFAULT FALSE,
  locked_at             TIMESTAMPTZ,
  locked_by             UUID        REFERENCES auth.users(id),
  metadata              JSONB       NOT NULL DEFAULT '{}',
  created_by            UUID        REFERENCES auth.users(id),
  updated_by            UUID        REFERENCES auth.users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.routes IS 'Named delivery routes derived from service areas';
COMMENT ON COLUMN public.routes.creation_mode IS 'Values: facility_list, upload, sandbox';
COMMENT ON COLUMN public.routes.status IS 'Values: draft, active, locked, archived';
COMMENT ON COLUMN public.routes.optimized_geometry IS 'GeoJSON LineString of the optimized route path';

-- =========================
-- 4. route_facilities junction/sequence table
-- =========================
CREATE TABLE IF NOT EXISTS public.route_facilities (
  id                         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id                   UUID        NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  facility_id                UUID        NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  sequence_order             INTEGER     NOT NULL,
  distance_from_previous_km  NUMERIC(8,2),
  estimated_arrival_min      INTEGER,
  metadata                   JSONB       NOT NULL DEFAULT '{}',
  CONSTRAINT unique_route_facility UNIQUE (route_id, facility_id)
);

COMMENT ON TABLE public.route_facilities IS 'Ordered facility sequence within a route';

-- =========================
-- 5. Indexes
-- =========================
CREATE INDEX idx_service_areas_zone ON public.service_areas(zone_id);
CREATE INDEX idx_service_areas_warehouse ON public.service_areas(warehouse_id);
CREATE INDEX idx_service_areas_active ON public.service_areas(is_active);

CREATE INDEX idx_sa_facilities_sa ON public.service_area_facilities(service_area_id);
CREATE INDEX idx_sa_facilities_fac ON public.service_area_facilities(facility_id);

CREATE INDEX idx_routes_zone ON public.routes(zone_id);
CREATE INDEX idx_routes_service_area ON public.routes(service_area_id);
CREATE INDEX idx_routes_status ON public.routes(status);
CREATE INDEX idx_routes_sandbox ON public.routes(is_sandbox);

CREATE INDEX idx_route_facilities_route ON public.route_facilities(route_id);
CREATE INDEX idx_route_facilities_facility ON public.route_facilities(facility_id);

-- =========================
-- 6. RLS Policies
-- =========================
ALTER TABLE public.service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_area_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_facilities ENABLE ROW LEVEL SECURITY;

-- Service Areas
CREATE POLICY "Authenticated users can read service_areas"
  ON public.service_areas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert service_areas"
  ON public.service_areas FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update service_areas"
  ON public.service_areas FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete service_areas"
  ON public.service_areas FOR DELETE
  TO authenticated
  USING (true);

-- Service Area Facilities
CREATE POLICY "Authenticated users can read service_area_facilities"
  ON public.service_area_facilities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert service_area_facilities"
  ON public.service_area_facilities FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update service_area_facilities"
  ON public.service_area_facilities FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete service_area_facilities"
  ON public.service_area_facilities FOR DELETE
  TO authenticated
  USING (true);

-- Routes
CREATE POLICY "Authenticated users can read routes"
  ON public.routes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert routes"
  ON public.routes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update routes"
  ON public.routes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete routes"
  ON public.routes FOR DELETE
  TO authenticated
  USING (true);

-- Route Facilities
CREATE POLICY "Authenticated users can read route_facilities"
  ON public.route_facilities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert route_facilities"
  ON public.route_facilities FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update route_facilities"
  ON public.route_facilities FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete route_facilities"
  ON public.route_facilities FOR DELETE
  TO authenticated
  USING (true);

-- =========================
-- 7. Route Immutability Trigger
-- =========================
CREATE OR REPLACE FUNCTION public.prevent_locked_route_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'locked' THEN
    RAISE EXCEPTION 'Cannot modify a locked route. Route % has been used for batch execution.', OLD.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_locked_route_modification
  BEFORE UPDATE OR DELETE ON public.routes
  FOR EACH ROW EXECUTE FUNCTION public.prevent_locked_route_modification();

-- =========================
-- 8. Updated_at Triggers
-- =========================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_service_areas_updated_at
  BEFORE UPDATE ON public.service_areas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_routes_updated_at
  BEFORE UPDATE ON public.routes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
