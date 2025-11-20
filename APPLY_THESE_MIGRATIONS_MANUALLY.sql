-- ============================================================================
-- MANUAL MIGRATION APPLICATION
-- ============================================================================
--
-- This file contains the essential migrations needed for the location model.
-- Apply this in the Supabase SQL Editor if 'npx supabase db push' fails.
--
-- URL: https://supabase.com/dashboard/project/cenugzabuzglswikoewy/sql/new
--
-- IMPORTANT: Apply these in order!
-- ============================================================================

-- ============================================================================
-- STEP 1: Check if migrations are already applied
-- ============================================================================
-- Run this first to see what's already in your database:
-- SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;

-- ============================================================================
-- MIGRATION 1: Enable PostGIS (20251117000000)
-- ============================================================================

-- Enable PostGIS extension for geographic data support
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable pg_trgm for fuzzy text matching (trigram similarity)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enable unaccent for accent-insensitive text matching
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Add comment explaining the extensions
COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';
COMMENT ON EXTENSION pg_trgm IS 'Text similarity measurement and index searching based on trigrams';
COMMENT ON EXTENSION unaccent IS 'Text search dictionary that removes accents';

-- Verify extensions are enabled
DO $$
BEGIN
  RAISE NOTICE 'PostGIS version: %', PostGIS_Version();
  RAISE NOTICE 'Extensions enabled successfully';
END $$;

-- Record migration
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20251117000000')
ON CONFLICT (version) DO NOTHING;

-- ============================================================================
-- MIGRATION 2: Country Location Model (20251117000001)
-- ============================================================================

-- Create countries table
CREATE TABLE IF NOT EXISTS public.countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  iso_code TEXT NOT NULL UNIQUE,
  iso3_code TEXT UNIQUE,
  capital TEXT,
  currency_code TEXT,
  phone_code TEXT,
  bounds GEOMETRY(Polygon, 4326),
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_countries_iso_code ON public.countries(iso_code);
CREATE INDEX IF NOT EXISTS idx_countries_is_active ON public.countries(is_active);
CREATE INDEX IF NOT EXISTS idx_countries_bounds ON public.countries USING GIST(bounds);

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Countries are viewable by everyone"
  ON public.countries FOR SELECT
  USING (true);

-- Seed Nigeria
INSERT INTO public.countries (id, name, iso_code, iso3_code, capital, currency_code, phone_code, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Nigeria',
  'NG',
  'NGA',
  'Abuja',
  'NGN',
  '+234',
  true
)
ON CONFLICT (iso_code) DO NOTHING;

-- Create workspaces table
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE RESTRICT,
  description TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT workspace_name_unique_per_country UNIQUE (country_id, name)
);

CREATE INDEX IF NOT EXISTS idx_workspaces_country_id ON public.workspaces(country_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON public.workspaces(slug);
CREATE INDEX IF NOT EXISTS idx_workspaces_is_active ON public.workspaces(is_active);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their workspaces"
  ON public.workspaces FOR SELECT
  USING (true);

-- Create admin_units table
CREATE TABLE IF NOT EXISTS public.admin_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES public.admin_units(id) ON DELETE CASCADE,
  osm_id BIGINT,
  osm_type TEXT,
  admin_level INTEGER NOT NULL,
  name TEXT NOT NULL,
  name_en TEXT,
  name_local TEXT,
  geometry GEOMETRY(MultiPolygon, 4326),
  center_point GEOMETRY(Point, 4326),
  bounds GEOMETRY(Polygon, 4326),
  population INTEGER,
  area_km2 NUMERIC,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT admin_unit_name_unique_per_parent UNIQUE (parent_id, name, country_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_units_country_id ON public.admin_units(country_id);
CREATE INDEX IF NOT EXISTS idx_admin_units_workspace_id ON public.admin_units(workspace_id);
CREATE INDEX IF NOT EXISTS idx_admin_units_parent_id ON public.admin_units(parent_id);
CREATE INDEX IF NOT EXISTS idx_admin_units_admin_level ON public.admin_units(admin_level);
CREATE INDEX IF NOT EXISTS idx_admin_units_osm_id ON public.admin_units(osm_id);
CREATE INDEX IF NOT EXISTS idx_admin_units_name ON public.admin_units(name);
CREATE INDEX IF NOT EXISTS idx_admin_units_is_active ON public.admin_units(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_units_geometry ON public.admin_units USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_admin_units_center_point ON public.admin_units USING GIST(center_point);
CREATE INDEX IF NOT EXISTS idx_admin_units_bounds ON public.admin_units USING GIST(bounds);
CREATE INDEX IF NOT EXISTS idx_admin_units_name_trgm ON public.admin_units USING GIN(name gin_trgm_ops);

ALTER TABLE public.admin_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin units are viewable by everyone"
  ON public.admin_units FOR SELECT
  USING (is_active = true);

-- Add workspace_id to existing tables (if they exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'zones') THEN
    ALTER TABLE public.zones ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_zones_workspace_id ON public.zones(workspace_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'facilities') THEN
    -- Add workspace and admin_unit foreign keys
    ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
    ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS admin_unit_id UUID REFERENCES public.admin_units(id) ON DELETE SET NULL;

    -- Add location columns (from comprehensive facilities system migration)
    ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS state TEXT;
    ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS lga TEXT;
    ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS ward TEXT;

    -- Set default for state if needed
    UPDATE public.facilities SET state = 'kano' WHERE state IS NULL;

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_facilities_workspace_id ON public.facilities(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_facilities_admin_unit_id ON public.facilities(admin_unit_id);
    CREATE INDEX IF NOT EXISTS idx_facilities_lga ON public.facilities(lga);
    CREATE INDEX IF NOT EXISTS idx_facilities_state ON public.facilities(state);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'facility_types') THEN
    ALTER TABLE public.facility_types ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_facility_types_workspace_id ON public.facility_types(workspace_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'levels_of_care') THEN
    ALTER TABLE public.levels_of_care ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_levels_of_care_workspace_id ON public.levels_of_care(workspace_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lgas') THEN
    ALTER TABLE public.lgas ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_lgas_workspace_id ON public.lgas(workspace_id);
  END IF;
END $$;

-- Helper Functions
CREATE OR REPLACE FUNCTION get_admin_unit_descendants(unit_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  admin_level INTEGER,
  depth INTEGER
) AS $$
  WITH RECURSIVE descendants AS (
    SELECT
      au.id,
      au.name,
      au.admin_level,
      0 AS depth
    FROM admin_units au
    WHERE au.id = unit_id

    UNION ALL

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

-- Triggers
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

-- Record migration
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20251117000001')
ON CONFLICT (version) DO NOTHING;

-- ============================================================================
-- MIGRATION 3: Create Default Workspace (20251117000002)
-- ============================================================================

-- Insert default workspace for Kano Pharma
INSERT INTO public.workspaces (id, name, slug, country_id, description, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Kano Pharma',
  'kano-pharma',
  '00000000-0000-0000-0000-000000000001',
  'Default workspace for Kano Pharma operations',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  updated_at = now();

-- Migrate existing LGAs to admin_units (if lgas table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lgas') THEN
    INSERT INTO public.admin_units (
      id,
      country_id,
      workspace_id,
      parent_id,
      admin_level,
      name,
      center_point,
      population,
      metadata,
      is_active,
      created_at,
      updated_at
    )
    SELECT
      lgas.id,
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      NULL,
      6,
      lgas.name,
      NULL,
      lgas.population,
      jsonb_build_object(
        'legacy_zone_id', lgas.zone_id,
        'legacy_warehouse_id', lgas.warehouse_id,
        'state', lgas.state,
        'migrated_from_lgas', true
      ),
      true,
      lgas.created_at,
      lgas.updated_at
    FROM public.lgas
    WHERE lgas.id IS NOT NULL
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Create placeholder Kano State
INSERT INTO public.admin_units (
  id,
  country_id,
  workspace_id,
  parent_id,
  admin_level,
  name,
  name_en,
  center_point,
  metadata,
  is_active
)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  NULL,
  4,
  'Kano',
  'Kano State',
  ST_SetSRID(ST_MakePoint(8.5167, 12.0000), 4326),
  jsonb_build_object(
    'placeholder', true,
    'note', 'Placeholder for Kano State - will be replaced with OSM boundary import'
  ),
  true
)
ON CONFLICT (id) DO NOTHING;

-- Update migrated LGAs to have Kano State as parent
UPDATE public.admin_units
SET parent_id = '00000000-0000-0000-0000-000000000003'
WHERE
  admin_level = 6
  AND country_id = '00000000-0000-0000-0000-000000000001'
  AND workspace_id = '00000000-0000-0000-0000-000000000002'
  AND parent_id IS NULL
  AND metadata->>'migrated_from_lgas' = 'true';

-- Associate existing data with default workspace
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'zones') THEN
    UPDATE public.zones
    SET workspace_id = '00000000-0000-0000-0000-000000000002'
    WHERE workspace_id IS NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'facilities') THEN
    UPDATE public.facilities
    SET workspace_id = '00000000-0000-0000-0000-000000000002'
    WHERE workspace_id IS NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'facility_types') THEN
    UPDATE public.facility_types
    SET workspace_id = NULL
    WHERE workspace_id IS NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'levels_of_care') THEN
    UPDATE public.levels_of_care
    SET workspace_id = NULL
    WHERE workspace_id IS NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lgas') THEN
    UPDATE public.lgas
    SET workspace_id = '00000000-0000-0000-0000-000000000002'
    WHERE workspace_id IS NULL;
  END IF;

  -- Link facilities to admin units by LGA name
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'facilities') THEN
    UPDATE public.facilities f
    SET admin_unit_id = au.id
    FROM public.admin_units au
    WHERE
      f.admin_unit_id IS NULL
      AND f.lga IS NOT NULL
      AND LOWER(TRIM(f.lga)) = LOWER(au.name)
      AND au.admin_level = 6
      AND au.workspace_id = '00000000-0000-0000-0000-000000000002';
  END IF;
END $$;

-- Record migration
INSERT INTO supabase_migrations.schema_migrations (version)
VALUES ('20251117000002')
ON CONFLICT (version) DO NOTHING;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
DECLARE
  v_workspace_count INTEGER;
  v_admin_units_count INTEGER;
  v_countries_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_workspace_count FROM public.workspaces;
  SELECT COUNT(*) INTO v_admin_units_count FROM public.admin_units;
  SELECT COUNT(*) INTO v_countries_count FROM public.countries;

  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Migration Complete!';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Countries created: %', v_countries_count;
  RAISE NOTICE 'Workspaces created: %', v_workspace_count;
  RAISE NOTICE 'Admin units created: %', v_admin_units_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Extensions enabled:';
  RAISE NOTICE '  - PostGIS: %', PostGIS_Version();
  RAISE NOTICE '  - pg_trgm: ✓';
  RAISE NOTICE '  - unaccent: ✓';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Test facility import with existing LGAs';
  RAISE NOTICE '2. (Optional) Import OSM boundaries via LocationManagement page';
  RAISE NOTICE '3. Test manual facility form with State/LGA cascading';
  RAISE NOTICE '=================================================================';
END $$;
