-- Migration: Create programme_categories lookup table
-- Created: 2026-03-08
-- Purpose: Unified lookup for programme/program classification tags.
--          Merges facility programmes (4 values) with item programs (11 values)
--          into a single source of truth. Distinct from the operational `programs` table.

-- ============================================================================
-- 1. CREATE PROGRAMME_CATEGORIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.programme_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_programme_categories_name ON public.programme_categories(name);
CREATE INDEX IF NOT EXISTS idx_programme_categories_code ON public.programme_categories(code);
CREATE INDEX IF NOT EXISTS idx_programme_categories_active ON public.programme_categories(is_active);

-- Add updated_at trigger
CREATE TRIGGER set_programme_categories_updated_at
  BEFORE UPDATE ON public.programme_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. ENABLE RLS
-- ============================================================================

ALTER TABLE public.programme_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Programme categories are viewable by authenticated users"
  ON public.programme_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Programme categories can be inserted by admins"
  ON public.programme_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'system_admin'
    )
  );

CREATE POLICY "Programme categories can be updated by admins"
  ON public.programme_categories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'system_admin'
    )
  );

-- ============================================================================
-- 3. SEED DATA (merged from facilities + items programme lists)
-- ============================================================================

INSERT INTO public.programme_categories (name, code, description, is_active) VALUES
  ('Family Planning', 'family-planning', 'Family planning and reproductive health commodities', true),
  ('DRF', 'drf', 'Drug Revolving Fund', true),
  ('HIV/AIDS', 'hiv-aids', 'HIV/AIDS treatment and prevention', true),
  ('Malaria', 'malaria', 'Malaria prevention and treatment', true),
  ('Essential Medicines', 'essential-medicines', 'WHO Essential Medicines List', true),
  ('Reproductive Health', 'reproductive-health', 'Reproductive health services and supplies', true),
  ('Malaria Control', 'malaria-control', 'National Malaria Control Programme', true),
  ('Tuberculosis', 'tuberculosis', 'TB prevention and treatment', true),
  ('Immunization', 'immunization', 'Routine and supplemental immunization', true),
  ('Maternal Health', 'maternal-health', 'Maternal and newborn health', true),
  ('Child Health', 'child-health', 'Child health and nutrition', true),
  ('Nutrition', 'nutrition', 'Nutrition and feeding programmes', true),
  ('Other', 'other', 'Other programme categories', true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 4. ADD FK COLUMN TO FACILITIES
-- ============================================================================

ALTER TABLE public.facilities
  ADD COLUMN IF NOT EXISTS programme_category_id UUID REFERENCES public.programme_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_facilities_programme_category_id ON public.facilities(programme_category_id);

-- ============================================================================
-- 5. DATA MIGRATION (facilities.programme text → FK)
-- ============================================================================

UPDATE public.facilities f
SET programme_category_id = pc.id
FROM public.programme_categories pc
WHERE LOWER(TRIM(f.programme)) = LOWER(pc.name)
  AND f.programme_category_id IS NULL
  AND f.programme IS NOT NULL;

-- ============================================================================
-- 6. HELPER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_programme_category_id(programme_name TEXT)
RETURNS UUID AS $$
DECLARE
  result_id UUID;
BEGIN
  SELECT id INTO result_id
  FROM public.programme_categories
  WHERE LOWER(TRIM(name)) = LOWER(TRIM(programme_name))
    AND is_active = true
  LIMIT 1;
  RETURN result_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.programme_categories TO authenticated;
GRANT INSERT, UPDATE ON public.programme_categories TO authenticated;
