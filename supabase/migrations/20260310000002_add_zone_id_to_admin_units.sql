-- Add zone_id to admin_units table for zone assignment
-- This allows LGAs (admin_level=6) in admin_units to be assigned to operational zones
-- Replaces the hardcoded lgas table with dynamic admin_units approach

BEGIN;

-- Add zone_id column to admin_units
ALTER TABLE public.admin_units
  ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES public.zones(id) ON DELETE SET NULL;

-- Create index for zone_id lookups
CREATE INDEX IF NOT EXISTS idx_admin_units_zone_id ON public.admin_units(zone_id);

-- Migrate existing zone assignments from lgas table to admin_units
-- Match by name (case-insensitive) and copy zone_id
UPDATE public.admin_units au
SET zone_id = l.zone_id
FROM public.lgas l
WHERE
  au.admin_level = 6
  AND LOWER(au.name) = LOWER(l.name)
  AND au.zone_id IS NULL
  AND l.zone_id IS NOT NULL;

COMMIT;

-- Comment
COMMENT ON COLUMN public.admin_units.zone_id IS 'Optional reference to operational zone (for LGAs at admin_level=6)';
