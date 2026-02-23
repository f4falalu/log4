-- ============================================================================
-- Drop old create_organization_with_admin overload
-- ============================================================================
-- Issue: Migration 20260121000005 created create_organization_with_admin with
-- 7 parameters. Migration 20260222200001 used CREATE OR REPLACE with 11
-- parameters, which created an OVERLOADED function instead of replacing it.
-- PostgREST cannot disambiguate overloaded functions when optional params
-- overlap, causing "Failed to create organization" errors.
-- Fix: Drop the old 7-param overload, keeping only the V2 (11-param) version.
-- ============================================================================

-- Drop the old 7-parameter overload explicitly by signature
DROP FUNCTION IF EXISTS public.create_organization_with_admin(
  TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT
);

-- Verify only the V2 version remains
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname = 'create_organization_with_admin';

  IF v_count != 1 THEN
    RAISE EXCEPTION 'Expected exactly 1 overload of create_organization_with_admin, found %', v_count;
  END IF;

  RAISE NOTICE 'OK: create_organization_with_admin has exactly 1 overload (V2)';
END $$;
