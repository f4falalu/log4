-- =============================================
-- Fix Stock Analytics Schema
-- =============================================
-- Purpose: Add missing product_name column to facility_deliveries
--          and update stock analytics functions to work with actual schema
-- Date: 2026-01-01
-- =============================================

-- Add product_name column to facility_deliveries if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'facility_deliveries'
    AND column_name = 'product_name'
  ) THEN
    ALTER TABLE public.facility_deliveries
    ADD COLUMN product_name TEXT;

    -- Create index for the new column
    CREATE INDEX idx_facility_deliveries_product_name
    ON public.facility_deliveries(product_name);
  END IF;
END $$;

-- Update existing records to populate product_name from facility_stock if possible
-- This is a one-time backfill that won't affect future inserts
UPDATE public.facility_deliveries fd
SET product_name = (
  SELECT DISTINCT fs.product_name
  FROM public.facility_stock fs
  WHERE fs.facility_id = fd.facility_id
  LIMIT 1
)
WHERE fd.product_name IS NULL
AND EXISTS (
  SELECT 1 FROM public.facility_stock fs
  WHERE fs.facility_id = fd.facility_id
);

-- =============================================
-- Migration Complete
-- =============================================

COMMENT ON COLUMN public.facility_deliveries.product_name IS
'Product name delivered - used for stock performance analytics';
