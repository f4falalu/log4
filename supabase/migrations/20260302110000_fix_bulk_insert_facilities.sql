-- ============================================================================
-- 1. Add 'warehouse' to facility_type enum (safe, idempotent)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'facility_type'::regtype AND enumlabel = 'warehouse'
  ) THEN
    ALTER TYPE facility_type ADD VALUE 'warehouse';
  END IF;
END $$;

-- ============================================================================
-- 2. Replace bulk_insert_facilities to be forgiving with NULLs
--    - COALESCE all NOT NULL columns to safe defaults
--    - Cast facility_type safely via a helper CASE expression
--    - Non-required columns are left nullable (user can update later)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.bulk_insert_facilities(facilities JSONB)
RETURNS TABLE(inserted_count INT, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inserted INT := 0;
  _err TEXT := NULL;
BEGIN
  INSERT INTO public.facilities (
    name, address, lat, lng, type, phone, contact_person, capacity,
    operating_hours, warehouse_code, state, ip_name, funding_source,
    programme, pcr_service, cd4_service, type_of_service, service_zone,
    level_of_care, lga, ward, contact_name_pharmacy, designation,
    phone_pharmacy, email, storage_capacity, zone_id
  )
  SELECT
    COALESCE(NULLIF(TRIM(f->>'name'), ''), 'Unnamed Facility'),
    COALESCE(NULLIF(TRIM(f->>'address'), ''), ''),
    COALESCE((f->>'lat')::DECIMAL(10,8), 0),
    COALESCE((f->>'lng')::DECIMAL(11,8), 0),
    -- Safe enum cast: map known values, default to 'other'
    CASE LOWER(TRIM(f->>'type'))
      WHEN 'hospital' THEN 'hospital'::facility_type
      WHEN 'clinic' THEN 'clinic'::facility_type
      WHEN 'health_center' THEN 'health_center'::facility_type
      WHEN 'health center' THEN 'health_center'::facility_type
      WHEN 'health centre' THEN 'health_center'::facility_type
      WHEN 'primary health center' THEN 'health_center'::facility_type
      WHEN 'primary health centre' THEN 'health_center'::facility_type
      WHEN 'pharmacy' THEN 'pharmacy'::facility_type
      WHEN 'lab' THEN 'lab'::facility_type
      WHEN 'laboratory' THEN 'lab'::facility_type
      WHEN 'warehouse' THEN 'warehouse'::facility_type
      WHEN 'other' THEN 'other'::facility_type
      ELSE 'other'::facility_type
    END,
    f->>'phone',
    f->>'contact_person',
    (f->>'capacity')::INT,
    f->>'operating_hours',
    f->>'warehouse_code',
    COALESCE(NULLIF(TRIM(f->>'state'), ''), 'kano'),
    f->>'ip_name',
    f->>'funding_source',
    f->>'programme',
    COALESCE((f->>'pcr_service')::BOOLEAN, false),
    COALESCE((f->>'cd4_service')::BOOLEAN, false),
    f->>'type_of_service',
    f->>'service_zone',
    f->>'level_of_care',
    f->>'lga',
    f->>'ward',
    f->>'contact_name_pharmacy',
    f->>'designation',
    f->>'phone_pharmacy',
    f->>'email',
    (f->>'storage_capacity')::INT,
    NULLIF(f->>'zone_id', '')::UUID
  FROM jsonb_array_elements(facilities) AS f;

  GET DIAGNOSTICS _inserted = ROW_COUNT;

  RETURN QUERY SELECT _inserted, _err;
EXCEPTION WHEN OTHERS THEN
  _err := SQLERRM;
  RETURN QUERY SELECT 0, _err;
END;
$$;
