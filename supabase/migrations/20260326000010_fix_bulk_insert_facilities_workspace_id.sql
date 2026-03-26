-- ============================================================================
-- Fix bulk_insert_facilities: include workspace_id
-- The facilities table requires workspace_id (NOT NULL), but the previous
-- version of this function omitted it, causing every insert to fail.
-- ============================================================================
DROP FUNCTION IF EXISTS public.bulk_insert_facilities(JSONB);

CREATE FUNCTION public.bulk_insert_facilities(facilities JSONB)
RETURNS TABLE(inserted_count INT, failed_count INT, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inserted INT := 0;
  _failed   INT := 0;
  _errors   TEXT[] := '{}';
  f         JSONB;
  _idx      INT := 0;
BEGIN
  FOR f IN SELECT * FROM jsonb_array_elements(facilities)
  LOOP
    _idx := _idx + 1;
    BEGIN
      INSERT INTO public.facilities (
        name, address, lat, lng, phone, contact_person, capacity,
        operating_hours, warehouse_code, state, ip_name, funding_source,
        programme, pcr_service, cd4_service, type_of_service, service_zone,
        level_of_care, lga, ward, contact_name_pharmacy, designation,
        phone_pharmacy, email, storage_capacity, zone_id, workspace_id
      ) VALUES (
        COALESCE(NULLIF(TRIM(f->>'name'), ''), 'Unnamed Facility'),
        COALESCE(NULLIF(TRIM(f->>'address'), ''), ''),
        COALESCE((f->>'lat')::DECIMAL(10,8), 0),
        COALESCE((f->>'lng')::DECIMAL(11,8), 0),
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
        NULLIF(f->>'zone_id', '')::UUID,
        (f->>'workspace_id')::UUID
      );
      _inserted := _inserted + 1;
    EXCEPTION WHEN OTHERS THEN
      _failed := _failed + 1;
      IF array_length(_errors, 1) IS NULL OR array_length(_errors, 1) < 20 THEN
        _errors := array_append(_errors, 'Row ' || _idx || ': ' || SQLERRM);
      END IF;
    END;
  END LOOP;

  RETURN QUERY SELECT _inserted, _failed,
    CASE WHEN _failed > 0 THEN array_to_string(_errors, '; ') ELSE NULL::TEXT END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bulk_insert_facilities(JSONB) TO authenticated;
