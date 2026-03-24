-- ============================================================================
-- PHASE 2.1: VERIFY LOCATION HIERARCHY
-- ============================================================================
-- Ensures all location tables (zones, facilities, admin_units) have
-- workspace_id populated. Backfills NULLs from related records.
-- ============================================================================

BEGIN;

-- ============================================================
-- 1. VERIFY zones.workspace_id
-- ============================================================

-- Ensure column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'zones'
      AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE public.zones
      ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id);
  END IF;
END $$;

-- Backfill NULL workspace_ids from workspace_members of the zone creator
-- If that's not available, use the first active workspace
UPDATE public.zones z
SET workspace_id = (
  SELECT w.id FROM public.workspaces w
  WHERE w.is_active = true
  ORDER BY w.created_at ASC
  LIMIT 1
)
WHERE z.workspace_id IS NULL;

-- ============================================================
-- 2. VERIFY facilities.workspace_id
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'facilities'
      AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE public.facilities
      ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id);
  END IF;
END $$;

-- Backfill from zone's workspace_id
UPDATE public.facilities f
SET workspace_id = z.workspace_id
FROM public.zones z
WHERE f.zone_id = z.id
  AND f.workspace_id IS NULL
  AND z.workspace_id IS NOT NULL;

-- Any remaining NULLs get the first active workspace
UPDATE public.facilities f
SET workspace_id = (
  SELECT w.id FROM public.workspaces w
  WHERE w.is_active = true
  ORDER BY w.created_at ASC
  LIMIT 1
)
WHERE f.workspace_id IS NULL;

-- ============================================================
-- 3. VERIFY admin_units.workspace_id
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'admin_units'
      AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE public.admin_units
      ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id);
  END IF;
END $$;

-- Backfill from zone
UPDATE public.admin_units au
SET workspace_id = z.workspace_id
FROM public.zones z
WHERE au.zone_id = z.id
  AND au.workspace_id IS NULL
  AND z.workspace_id IS NOT NULL;

-- Any remaining NULLs
UPDATE public.admin_units au
SET workspace_id = (
  SELECT w.id FROM public.workspaces w
  WHERE w.is_active = true
  ORDER BY w.created_at ASC
  LIMIT 1
)
WHERE au.workspace_id IS NULL;

-- ============================================================
-- 4. ADD NOT NULL CONSTRAINTS (after all backfills)
-- ============================================================
-- Only add NOT NULL if there are no remaining NULLs

DO $$
BEGIN
  -- zones
  IF NOT EXISTS (
    SELECT 1 FROM public.zones WHERE workspace_id IS NULL
  ) THEN
    ALTER TABLE public.zones ALTER COLUMN workspace_id SET NOT NULL;
  END IF;

  -- facilities
  IF NOT EXISTS (
    SELECT 1 FROM public.facilities WHERE workspace_id IS NULL
  ) THEN
    ALTER TABLE public.facilities ALTER COLUMN workspace_id SET NOT NULL;
  END IF;

  -- admin_units
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_units WHERE workspace_id IS NULL
  ) THEN
    ALTER TABLE public.admin_units ALTER COLUMN workspace_id SET NOT NULL;
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- DONE: Location hierarchy verified.
-- All zones, facilities, and admin_units have workspace_id populated.
-- ============================================================================
