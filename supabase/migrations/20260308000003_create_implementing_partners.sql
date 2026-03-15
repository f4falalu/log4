-- Migration: Create implementing_partners lookup table
-- Created: 2026-03-08
-- Purpose: Replace hardcoded IP name values (SMOH, ACE-2, CRS) with DB-driven lookups

-- ============================================================================
-- 1. CREATE IMPLEMENTING_PARTNERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.implementing_partners (
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
CREATE INDEX IF NOT EXISTS idx_implementing_partners_name ON public.implementing_partners(name);
CREATE INDEX IF NOT EXISTS idx_implementing_partners_code ON public.implementing_partners(code);
CREATE INDEX IF NOT EXISTS idx_implementing_partners_active ON public.implementing_partners(is_active);

-- Add updated_at trigger
CREATE TRIGGER set_implementing_partners_updated_at
  BEFORE UPDATE ON public.implementing_partners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. ENABLE RLS
-- ============================================================================

ALTER TABLE public.implementing_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Implementing partners are viewable by authenticated users"
  ON public.implementing_partners FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Implementing partners can be inserted by admins"
  ON public.implementing_partners FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'system_admin'
    )
  );

CREATE POLICY "Implementing partners can be updated by admins"
  ON public.implementing_partners FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'system_admin'
    )
  );

-- ============================================================================
-- 3. SEED DATA
-- ============================================================================

INSERT INTO public.implementing_partners (name, code, description, is_active) VALUES
  ('SMOH', 'smoh', 'State Ministry of Health', true),
  ('ACE-2', 'ace-2', 'ACE-2 Implementing Partner', true),
  ('CRS', 'crs', 'Catholic Relief Services', true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 4. ADD FK COLUMN TO FACILITIES
-- ============================================================================

ALTER TABLE public.facilities
  ADD COLUMN IF NOT EXISTS implementing_partner_id UUID REFERENCES public.implementing_partners(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_facilities_implementing_partner_id ON public.facilities(implementing_partner_id);

-- ============================================================================
-- 5. DATA MIGRATION
-- ============================================================================

UPDATE public.facilities f
SET implementing_partner_id = ip.id
FROM public.implementing_partners ip
WHERE LOWER(TRIM(f.ip_name)) = LOWER(ip.code)
  AND f.implementing_partner_id IS NULL
  AND f.ip_name IS NOT NULL;

-- ============================================================================
-- 6. HELPER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_implementing_partner_id(partner_code TEXT)
RETURNS UUID AS $$
DECLARE
  result_id UUID;
BEGIN
  SELECT id INTO result_id
  FROM public.implementing_partners
  WHERE LOWER(TRIM(code)) = LOWER(TRIM(partner_code))
    AND is_active = true
  LIMIT 1;
  RETURN result_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.implementing_partners TO authenticated;
GRANT INSERT, UPDATE ON public.implementing_partners TO authenticated;
