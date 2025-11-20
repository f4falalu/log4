-- Country-based Location Model Migration
-- This migration creates the foundational tables for a scalable country-based location hierarchy
-- Supporting multiple countries with admin boundaries (States, LGAs, Wards) from OpenStreetMap

-- ============================================================================
-- 1. COUNTRIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  iso_code TEXT NOT NULL UNIQUE, -- ISO 3166-1 alpha-2 code (e.g., 'NG' for Nigeria)
  iso3_code TEXT UNIQUE, -- ISO 3166-1 alpha-3 code (e.g., 'NGA' for Nigeria)
  capital TEXT,
  currency_code TEXT, -- ISO 4217 currency code (e.g., 'NGN')
  phone_code TEXT, -- International dialing code (e.g., '+234')
  bounds GEOMETRY(Polygon, 4326), -- Geographic bounding box for the country
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_countries_iso_code ON public.countries(iso_code);
CREATE INDEX IF NOT EXISTS idx_countries_is_active ON public.countries(is_active);
CREATE INDEX IF NOT EXISTS idx_countries_bounds ON public.countries USING GIST(bounds);

-- Add RLS
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

-- Everyone can read countries
CREATE POLICY "Countries are viewable by everyone"
  ON public.countries FOR SELECT
  USING (true);

-- Only admins can modify countries
CREATE POLICY "Only admins can modify countries"
  ON public.countries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

COMMENT ON TABLE public.countries IS 'Countries table for multi-country support';

-- ============================================================================
-- 2. WORKSPACES TABLE (Multi-tenancy)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE, -- URL-friendly identifier (e.g., 'kano-pharma')
  country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE RESTRICT,
  description TEXT,
  settings JSONB DEFAULT '{}'::jsonb, -- Workspace-specific configuration
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT workspace_name_unique_per_country UNIQUE (country_id, name)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_workspaces_country_id ON public.workspaces(country_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON public.workspaces(slug);
CREATE INDEX IF NOT EXISTS idx_workspaces_is_active ON public.workspaces(is_active);

-- Add RLS
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Users can view workspaces they belong to
CREATE POLICY "Users can view their workspaces"
  ON public.workspaces FOR SELECT
  USING (true); -- TODO: Add workspace membership check

-- Only admins can create/modify workspaces
CREATE POLICY "Only admins can modify workspaces"
  ON public.workspaces FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

COMMENT ON TABLE public.workspaces IS 'Workspaces for multi-tenancy, each workspace operates within one country';

-- ============================================================================
-- 3. ADMIN_UNITS TABLE (Replaces LGAs with hierarchical admin boundaries)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.admin_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL, -- NULL = available to all workspaces

  -- Hierarchical structure
  parent_id UUID REFERENCES public.admin_units(id) ON DELETE CASCADE, -- NULL for top-level (States)

  -- OSM data
  osm_id BIGINT, -- OpenStreetMap ID
  osm_type TEXT, -- 'relation', 'way', 'node'
  admin_level INTEGER NOT NULL, -- OSM admin_level (4=State, 6=LGA, 8=Ward in Nigeria)

  -- Basic information
  name TEXT NOT NULL,
  name_en TEXT, -- English name
  name_local TEXT, -- Local language name

  -- Geographic data
  geometry GEOMETRY(MultiPolygon, 4326), -- Full boundary polygon from OSM
  center_point GEOMETRY(Point, 4326), -- Centroid for map markers
  bounds GEOMETRY(Polygon, 4326), -- Bounding box for quick spatial queries

  -- Additional metadata
  population INTEGER,
  area_km2 NUMERIC,
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional OSM tags, local data

  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT admin_unit_name_unique_per_parent UNIQUE (parent_id, name, country_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_admin_units_country_id ON public.admin_units(country_id);
CREATE INDEX IF NOT EXISTS idx_admin_units_workspace_id ON public.admin_units(workspace_id);
CREATE INDEX IF NOT EXISTS idx_admin_units_parent_id ON public.admin_units(parent_id);
CREATE INDEX IF NOT EXISTS idx_admin_units_admin_level ON public.admin_units(admin_level);
CREATE INDEX IF NOT EXISTS idx_admin_units_osm_id ON public.admin_units(osm_id);
CREATE INDEX IF NOT EXISTS idx_admin_units_name ON public.admin_units(name);
CREATE INDEX IF NOT EXISTS idx_admin_units_is_active ON public.admin_units(is_active);

-- Spatial indexes
CREATE INDEX IF NOT EXISTS idx_admin_units_geometry ON public.admin_units USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_admin_units_center_point ON public.admin_units USING GIST(center_point);
CREATE INDEX IF NOT EXISTS idx_admin_units_bounds ON public.admin_units USING GIST(bounds);

-- Text search index for fuzzy matching
CREATE INDEX IF NOT EXISTS idx_admin_units_name_trgm ON public.admin_units USING GIN(name gin_trgm_ops);

-- Add RLS
ALTER TABLE public.admin_units ENABLE ROW LEVEL SECURITY;

-- Everyone can read admin units
CREATE POLICY "Admin units are viewable by everyone"
  ON public.admin_units FOR SELECT
  USING (is_active = true);

-- Only admins can modify admin units
CREATE POLICY "Only admins can modify admin units"
  ON public.admin_units FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

COMMENT ON TABLE public.admin_units IS 'Hierarchical administrative units (States, LGAs, Wards) from OpenStreetMap';
COMMENT ON COLUMN public.admin_units.admin_level IS 'OSM admin_level: 4=State, 6=LGA, 8=Ward (Nigeria-specific)';

-- ============================================================================
-- 4. ADD WORKSPACE_ID TO EXISTING TABLES
-- ============================================================================

-- Add workspace_id to zones table
ALTER TABLE public.zones
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_zones_workspace_id ON public.zones(workspace_id);

-- Add workspace_id to facilities table
ALTER TABLE public.facilities
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_facilities_workspace_id ON public.facilities(workspace_id);

-- Add workspace_id to facility_types table
ALTER TABLE public.facility_types
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_facility_types_workspace_id ON public.facility_types(workspace_id);

-- Add workspace_id to levels_of_care table
ALTER TABLE public.levels_of_care
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_levels_of_care_workspace_id ON public.levels_of_care(workspace_id);

-- Add workspace_id to lgas table (deprecated, will migrate to admin_units)
ALTER TABLE public.lgas
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_lgas_workspace_id ON public.lgas(workspace_id);

-- ============================================================================
-- 5. HELPER FUNCTIONS
-- ============================================================================

-- Function to get all child admin units recursively
CREATE OR REPLACE FUNCTION get_admin_unit_descendants(unit_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  admin_level INTEGER,
  depth INTEGER
) AS $$
  WITH RECURSIVE descendants AS (
    -- Base case: the unit itself
    SELECT
      au.id,
      au.name,
      au.admin_level,
      0 AS depth
    FROM admin_units au
    WHERE au.id = unit_id

    UNION ALL

    -- Recursive case: children of previous level
    SELECT
      au.id,
      au.name,
      au.admin_level,
      d.depth + 1
    FROM admin_units au
    INNER JOIN descendants d ON au.parent_id = d.id
  )
  SELECT * FROM descendants;
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION get_admin_unit_descendants IS 'Recursively get all descendant admin units';

-- Function to find admin unit by point (reverse geocoding)
CREATE OR REPLACE FUNCTION find_admin_unit_by_point(
  p_lat NUMERIC,
  p_lng NUMERIC,
  p_admin_level INTEGER DEFAULT NULL,
  p_country_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  admin_level INTEGER,
  country_id UUID
) AS $$
  SELECT
    au.id,
    au.name,
    au.admin_level,
    au.country_id
  FROM admin_units au
  WHERE
    ST_Contains(au.geometry, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326))
    AND au.is_active = true
    AND (p_admin_level IS NULL OR au.admin_level = p_admin_level)
    AND (p_country_id IS NULL OR au.country_id = p_country_id)
  ORDER BY au.admin_level ASC
  LIMIT 1;
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION find_admin_unit_by_point IS 'Find admin unit containing a geographic point (reverse geocoding)';

-- Function for fuzzy name matching using pg_trgm
CREATE OR REPLACE FUNCTION fuzzy_match_admin_unit(
  p_name TEXT,
  p_country_id UUID,
  p_admin_level INTEGER DEFAULT NULL,
  p_threshold NUMERIC DEFAULT 0.65
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  admin_level INTEGER,
  similarity REAL
) AS $$
  SELECT
    au.id,
    au.name,
    au.admin_level,
    similarity(au.name, p_name) AS similarity
  FROM admin_units au
  WHERE
    au.country_id = p_country_id
    AND au.is_active = true
    AND (p_admin_level IS NULL OR au.admin_level = p_admin_level)
    AND similarity(au.name, p_name) >= p_threshold
  ORDER BY similarity DESC, au.admin_level ASC
  LIMIT 10;
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION fuzzy_match_admin_unit IS 'Fuzzy match admin unit name using trigram similarity';

-- ============================================================================
-- 6. SEED DEFAULT DATA
-- ============================================================================

-- Insert Nigeria as the default country
INSERT INTO public.countries (id, name, iso_code, iso3_code, capital, currency_code, phone_code, is_active)
VALUES (
  'country-nigeria-0000-0000-000000000000',
  'Nigeria',
  'NG',
  'NGA',
  'Abuja',
  'NGN',
  '+234',
  true
)
ON CONFLICT (iso_code) DO NOTHING;

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_countries_updated_at BEFORE UPDATE ON public.countries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_units_updated_at BEFORE UPDATE ON public.admin_units
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Country location model created successfully';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Create a workspace for your organization';
  RAISE NOTICE '2. Import admin boundaries from OpenStreetMap using the Geofabrik import tool';
  RAISE NOTICE '3. Migrate existing LGA data to admin_units table';
END $$;
