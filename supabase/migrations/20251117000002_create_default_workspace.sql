-- Create Default Workspace and Migrate Existing Data
-- This migration creates a default workspace for the existing deployment
-- and associates all existing data with this workspace

-- ============================================================================
-- 1. CREATE DEFAULT WORKSPACE
-- ============================================================================

-- Insert default workspace for Kano Pharma
INSERT INTO public.workspaces (id, name, slug, country_id, description, is_active)
VALUES (
  'workspace-kano-pharma-0000-0000-000000000000',
  'Kano Pharma',
  'kano-pharma',
  'country-nigeria-0000-0000-000000000000', -- Nigeria
  'Default workspace for Kano Pharma operations',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  updated_at = now();

-- ============================================================================
-- 2. MIGRATE EXISTING LGAS TO ADMIN_UNITS
-- ============================================================================

-- Migrate existing LGA data from lgas table to admin_units
-- These will be admin_level=6 (LGA level in Nigeria)
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
  'country-nigeria-0000-0000-000000000000', -- Nigeria
  'workspace-kano-pharma-0000-0000-000000000000', -- Default workspace
  NULL, -- Parent will be set later when we import States
  6, -- admin_level=6 for LGAs in Nigeria (OSM standard)
  lgas.name,
  NULL, -- center_point will be populated when OSM boundaries are imported
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
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  population = EXCLUDED.population,
  metadata = EXCLUDED.metadata,
  updated_at = now();

-- ============================================================================
-- 3. ASSOCIATE EXISTING DATA WITH DEFAULT WORKSPACE
-- ============================================================================

-- Update zones
UPDATE public.zones
SET workspace_id = 'workspace-kano-pharma-0000-0000-000000000000'
WHERE workspace_id IS NULL;

-- Update facilities
UPDATE public.facilities
SET workspace_id = 'workspace-kano-pharma-0000-0000-000000000000'
WHERE workspace_id IS NULL;

-- Update facility_types (make them workspace-specific or NULL for global)
-- NULL workspace_id means available to all workspaces
UPDATE public.facility_types
SET workspace_id = NULL -- Global facility types
WHERE workspace_id IS NULL;

-- Update levels_of_care (make them global)
UPDATE public.levels_of_care
SET workspace_id = NULL -- Global levels of care
WHERE workspace_id IS NULL;

-- Update lgas to reference default workspace
UPDATE public.lgas
SET workspace_id = 'workspace-kano-pharma-0000-0000-000000000000'
WHERE workspace_id IS NULL;

-- ============================================================================
-- 4. CREATE ADMIN-LEVEL 4 PLACEHOLDER FOR KANO STATE
-- ============================================================================

-- Create a placeholder admin unit for Kano State (admin_level=4)
-- This will be replaced with actual OSM boundary data later
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
  'admin-kano-state-0000-0000-000000000000',
  'country-nigeria-0000-0000-000000000000',
  'workspace-kano-pharma-0000-0000-000000000000',
  NULL, -- Top-level (State)
  4, -- admin_level=4 for States in Nigeria
  'Kano',
  'Kano State',
  ST_SetSRID(ST_MakePoint(8.5167, 12.0000), 4326), -- Approximate center of Kano
  jsonb_build_object(
    'placeholder', true,
    'note', 'Placeholder for Kano State - will be replaced with OSM boundary import'
  ),
  true
)
ON CONFLICT (id) DO NOTHING;

-- Update migrated LGAs to have Kano State as parent
UPDATE public.admin_units
SET parent_id = 'admin-kano-state-0000-0000-000000000000'
WHERE
  admin_level = 6
  AND country_id = 'country-nigeria-0000-0000-000000000000'
  AND workspace_id = 'workspace-kano-pharma-0000-0000-000000000000'
  AND parent_id IS NULL
  AND metadata->>'migrated_from_lgas' = 'true';

-- ============================================================================
-- 5. ADD FACILITIES REFERENCE TO ADMIN_UNITS
-- ============================================================================

-- Add admin_unit_id column to facilities table to replace lga text field
ALTER TABLE public.facilities
  ADD COLUMN IF NOT EXISTS admin_unit_id UUID REFERENCES public.admin_units(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_facilities_admin_unit_id ON public.facilities(admin_unit_id);

-- Migrate facilities.lga text to admin_units reference
-- Match by name (case-insensitive)
UPDATE public.facilities f
SET admin_unit_id = au.id
FROM public.admin_units au
WHERE
  f.admin_unit_id IS NULL
  AND f.lga IS NOT NULL
  AND LOWER(TRIM(f.lga)) = LOWER(au.name)
  AND au.admin_level = 6 -- LGA level
  AND au.workspace_id = 'workspace-kano-pharma-0000-0000-000000000000';

-- ============================================================================
-- 6. VERIFICATION AND STATS
-- ============================================================================

DO $$
DECLARE
  v_workspace_count INTEGER;
  v_admin_units_count INTEGER;
  v_facilities_migrated INTEGER;
  v_lgas_migrated INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_workspace_count FROM public.workspaces;
  SELECT COUNT(*) INTO v_admin_units_count FROM public.admin_units;
  SELECT COUNT(*) INTO v_facilities_migrated FROM public.facilities WHERE admin_unit_id IS NOT NULL;
  SELECT COUNT(*) INTO v_lgas_migrated FROM public.admin_units WHERE metadata->>'migrated_from_lgas' = 'true';

  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Default Workspace Migration Complete';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Workspaces created: %', v_workspace_count;
  RAISE NOTICE 'Admin units (LGAs migrated): %', v_lgas_migrated;
  RAISE NOTICE 'Total admin units: %', v_admin_units_count;
  RAISE NOTICE 'Facilities linked to admin units: %', v_facilities_migrated;
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Import OSM boundaries for Kano State using Geofabrik tool';
  RAISE NOTICE '2. Update facilities that could not be auto-matched to admin units';
  RAISE NOTICE '3. Verify all zones, facilities, and reference tables are workspace-aware';
  RAISE NOTICE '=================================================================';
END $$;
