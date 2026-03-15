-- Sync zone_id from facilities to admin_units table
-- This ensures LGAs in admin_units have the same zone_id as their facilities

BEGIN;

-- Update admin_units.zone_id based on facilities in the same LGA
-- For each LGA (admin_level=6), set zone_id to match the most common zone_id
-- among facilities in that LGA
UPDATE public.admin_units au
SET zone_id = subq.zone_id
FROM (
  SELECT 
    LOWER(f.lga) as lga_name,
    f.zone_id,
    COUNT(*) as facility_count,
    ROW_NUMBER() OVER (PARTITION BY LOWER(f.lga) ORDER BY COUNT(*) DESC) as rn
  FROM public.facilities f
  WHERE 
    f.zone_id IS NOT NULL
    AND f.lga IS NOT NULL
    AND f.deleted_at IS NULL
  GROUP BY LOWER(f.lga), f.zone_id
) subq
WHERE 
  au.admin_level = 6
  AND LOWER(au.name) = subq.lga_name
  AND subq.rn = 1  -- Take the most common zone_id for each LGA
  AND (au.zone_id IS NULL OR au.zone_id != subq.zone_id);

COMMIT;

-- Add comment
COMMENT ON COLUMN public.admin_units.zone_id IS 
  'Operational zone assignment (synced from facilities for LGAs at admin_level=6)';
