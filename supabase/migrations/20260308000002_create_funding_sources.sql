-- Migration: Create funding_sources lookup table
-- Created: 2026-03-08
-- Purpose: Replace hardcoded funding source values in UI with DB-driven lookups
--          Unifies the inconsistent lists between facilities (3 sources) and programs (6 sources)

-- ============================================================================
-- 1. CREATE FUNDING_SOURCES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.funding_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_funding_sources_name ON public.funding_sources(name);
CREATE INDEX IF NOT EXISTS idx_funding_sources_code ON public.funding_sources(code);
CREATE INDEX IF NOT EXISTS idx_funding_sources_active ON public.funding_sources(is_active);

-- Add updated_at trigger
CREATE TRIGGER set_funding_sources_updated_at
  BEFORE UPDATE ON public.funding_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. ENABLE RLS
-- ============================================================================

ALTER TABLE public.funding_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Funding sources are viewable by authenticated users"
  ON public.funding_sources FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Funding sources can be inserted by admins"
  ON public.funding_sources FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'system_admin'
    )
  );

CREATE POLICY "Funding sources can be updated by admins"
  ON public.funding_sources FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'system_admin'
    )
  );

-- ============================================================================
-- 3. SEED DATA (merged from facilities + programs lists)
-- ============================================================================

INSERT INTO public.funding_sources (name, code, description, is_active) VALUES
  ('UNFPA', 'unfpa', 'United Nations Population Fund', true),
  ('PEPFAR-USAID', 'pepfar--usaid', 'Presidents Emergency Plan for AIDS Relief / USAID', true),
  ('Global Fund', 'global-fund', 'The Global Fund to Fight AIDS, Tuberculosis and Malaria', true),
  ('USAID PMM', 'usaid-pmm', 'USAID Prevention of Maternal Mortality', true),
  ('USAID ART', 'usaid-art', 'USAID Antiretroviral Treatment', true),
  ('USAID NHDP', 'usaid-nhdp', 'USAID National Health Development Program', true),
  ('WHO', 'who', 'World Health Organization', true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 4. ADD FK COLUMNS TO FACILITIES AND PROGRAMS
-- ============================================================================

ALTER TABLE public.facilities
  ADD COLUMN IF NOT EXISTS funding_source_id UUID REFERENCES public.funding_sources(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_facilities_funding_source_id ON public.facilities(funding_source_id);

ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS funding_source_id UUID REFERENCES public.funding_sources(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_programs_funding_source_id ON public.programs(funding_source_id);

-- ============================================================================
-- 5. DATA MIGRATION (populate FKs from existing text values)
-- ============================================================================

-- Migrate facilities.funding_source text → FK
UPDATE public.facilities f
SET funding_source_id = fs.id
FROM public.funding_sources fs
WHERE LOWER(TRIM(f.funding_source)) = LOWER(fs.code)
  AND f.funding_source_id IS NULL
  AND f.funding_source IS NOT NULL;

-- Migrate programs.funding_source text → FK
UPDATE public.programs p
SET funding_source_id = fs.id
FROM public.funding_sources fs
WHERE LOWER(TRIM(p.funding_source)) = LOWER(fs.code)
  AND p.funding_source_id IS NULL
  AND p.funding_source IS NOT NULL;

-- ============================================================================
-- 6. HELPER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_funding_source_id(source_code TEXT)
RETURNS UUID AS $$
DECLARE
  result_id UUID;
BEGIN
  SELECT id INTO result_id
  FROM public.funding_sources
  WHERE LOWER(TRIM(code)) = LOWER(TRIM(source_code))
    AND is_active = true
  LIMIT 1;
  RETURN result_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.funding_sources TO authenticated;
GRANT INSERT, UPDATE ON public.funding_sources TO authenticated;
