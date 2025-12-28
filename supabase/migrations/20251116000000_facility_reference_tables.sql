-- Migration: Create facility reference tables for taxonomy standardization
-- Created: 2025-11-16
-- Purpose: Add facility_types and levels_of_care tables to replace hardcoded values

-- ============================================================================
-- 1. CREATE FACILITY_TYPES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.facility_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_facility_types_name ON public.facility_types(name);
CREATE INDEX IF NOT EXISTS idx_facility_types_active ON public.facility_types(is_active);

-- Add updated_at trigger
CREATE TRIGGER set_facility_types_updated_at
  BEFORE UPDATE ON public.facility_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.facility_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies (read-only for authenticated users, admin can modify)
CREATE POLICY "Facility types are viewable by authenticated users"
  ON public.facility_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Facility types can be inserted by admins"
  ON public.facility_types FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Facility types can be updated by admins"
  ON public.facility_types FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- ============================================================================
-- 2. CREATE LEVELS_OF_CARE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.levels_of_care (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  hierarchy_level INTEGER, -- 1=Primary, 2=Secondary, 3=Tertiary
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_levels_of_care_name ON public.levels_of_care(name);
CREATE INDEX IF NOT EXISTS idx_levels_of_care_active ON public.levels_of_care(is_active);
CREATE INDEX IF NOT EXISTS idx_levels_of_care_hierarchy ON public.levels_of_care(hierarchy_level);

-- Add updated_at trigger
CREATE TRIGGER set_levels_of_care_updated_at
  BEFORE UPDATE ON public.levels_of_care
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.levels_of_care ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Levels of care are viewable by authenticated users"
  ON public.levels_of_care FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Levels of care can be inserted by admins"
  ON public.levels_of_care FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Levels of care can be updated by admins"
  ON public.levels_of_care FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- ============================================================================
-- 3. SEED FACILITY_TYPES
-- ============================================================================

INSERT INTO public.facility_types (name, description, is_active) VALUES
  ('Hospital', 'Full-service medical facility with inpatient care', true),
  ('Clinic', 'Outpatient medical facility', true),
  ('Health Center', 'Primary healthcare facility', true),
  ('Pharmacy', 'Medication dispensary and pharmaceutical services', true),
  ('Laboratory', 'Medical testing and diagnostics facility', true),
  ('Other', 'Other facility types not categorized above', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 4. SEED LEVELS_OF_CARE
-- ============================================================================

INSERT INTO public.levels_of_care (name, description, hierarchy_level, is_active) VALUES
  ('Primary', 'Basic healthcare services at community level', 1, true),
  ('Secondary', 'Specialized healthcare services with referral support', 2, true),
  ('Tertiary', 'Advanced specialized healthcare and teaching hospitals', 3, true)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 5. UPDATE FACILITIES TABLE (Add Foreign Keys)
-- ============================================================================

-- Add new columns for foreign key relationships (nullable for migration)
ALTER TABLE public.facilities
  ADD COLUMN IF NOT EXISTS facility_type_id UUID REFERENCES public.facility_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS level_of_care_id UUID REFERENCES public.levels_of_care(id) ON DELETE SET NULL;

-- Add indexes for foreign keys
CREATE INDEX IF NOT EXISTS idx_facilities_facility_type_id ON public.facilities(facility_type_id);
CREATE INDEX IF NOT EXISTS idx_facilities_level_of_care_id ON public.facilities(level_of_care_id);

-- ============================================================================
-- 6. DATA MIGRATION (Populate FKs from existing text values)
-- ============================================================================

-- Migrate existing facility types to foreign keys (case-insensitive matching)
UPDATE public.facilities f
SET facility_type_id = ft.id
FROM public.facility_types ft
WHERE LOWER(TRIM(f.type)) = LOWER(ft.name)
  AND f.facility_type_id IS NULL;

-- Migrate existing levels of care to foreign keys (case-insensitive matching)
UPDATE public.facilities f
SET level_of_care_id = loc.id
FROM public.levels_of_care loc
WHERE LOWER(TRIM(f.level_of_care)) = LOWER(loc.name)
  AND f.level_of_care_id IS NULL;

-- ============================================================================
-- 7. ADD HELPER FUNCTIONS
-- ============================================================================

-- Function to get facility type ID by name (case-insensitive, with fuzzy matching)
CREATE OR REPLACE FUNCTION public.get_facility_type_id(type_name TEXT)
RETURNS UUID AS $$
DECLARE
  result_id UUID;
BEGIN
  -- Exact match (case-insensitive)
  SELECT id INTO result_id
  FROM public.facility_types
  WHERE LOWER(TRIM(name)) = LOWER(TRIM(type_name))
    AND is_active = true
  LIMIT 1;

  RETURN result_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get level of care ID by name (case-insensitive)
CREATE OR REPLACE FUNCTION public.get_level_of_care_id(level_name TEXT)
RETURNS UUID AS $$
DECLARE
  result_id UUID;
BEGIN
  -- Exact match (case-insensitive)
  SELECT id INTO result_id
  FROM public.levels_of_care
  WHERE LOWER(TRIM(name)) = LOWER(TRIM(level_name))
    AND is_active = true
  LIMIT 1;

  RETURN result_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.facility_types TO authenticated;
GRANT SELECT ON public.levels_of_care TO authenticated;
GRANT INSERT, UPDATE ON public.facility_types TO authenticated;
GRANT INSERT, UPDATE ON public.levels_of_care TO authenticated;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================================================

-- To rollback this migration:
-- DROP TABLE IF EXISTS public.facility_types CASCADE;
-- DROP TABLE IF EXISTS public.levels_of_care CASCADE;
-- ALTER TABLE public.facilities DROP COLUMN IF EXISTS facility_type_id;
-- ALTER TABLE public.facilities DROP COLUMN IF EXISTS level_of_care_id;
-- DROP FUNCTION IF EXISTS public.get_facility_type_id(TEXT);
-- DROP FUNCTION IF EXISTS public.get_level_of_care_id(TEXT);
