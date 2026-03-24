-- Function to compute program metrics from related tables
-- Programs link to requisitions via the `program` VARCHAR column (name match)

CREATE OR REPLACE FUNCTION public.get_program_metrics(
  _program_code TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result JSON;
  _facility_count INT;
  _active_requisitions INT;
  _total_requisitions INT;
  _fulfilled_requisitions INT;
  _active_batches INT;
  _pending_batches INT;
  _avg_delivery_days NUMERIC;
BEGIN
  -- Count distinct facilities with requisitions for this program
  SELECT COUNT(DISTINCT facility_id)
  INTO _facility_count
  FROM requisitions
  WHERE program ILIKE _program_code;

  -- Count active requisitions (pending + approved)
  SELECT COUNT(*)
  INTO _active_requisitions
  FROM requisitions
  WHERE program ILIKE _program_code
    AND status IN ('pending', 'approved');

  -- Count total requisitions for fulfillment rate
  SELECT COUNT(*)
  INTO _total_requisitions
  FROM requisitions
  WHERE program ILIKE _program_code;

  -- Count fulfilled requisitions
  SELECT COUNT(*)
  INTO _fulfilled_requisitions
  FROM requisitions
  WHERE program ILIKE _program_code
    AND status = 'fulfilled';

  -- Count active batches that include facilities with this program's requisitions
  SELECT COUNT(DISTINCT db.id)
  INTO _active_batches
  FROM delivery_batches db
  WHERE db.status IN ('assigned', 'in-progress')
    AND EXISTS (
      SELECT 1 FROM unnest(db.facility_ids) AS fid
      JOIN requisitions r ON r.facility_id = fid
      WHERE r.program ILIKE _program_code
    );

  -- Count pending (planned) batches
  SELECT COUNT(DISTINCT db.id)
  INTO _pending_batches
  FROM delivery_batches db
  WHERE db.status = 'planned'
    AND EXISTS (
      SELECT 1 FROM unnest(db.facility_ids) AS fid
      JOIN requisitions r ON r.facility_id = fid
      WHERE r.program ILIKE _program_code
    );

  -- Average delivery time in days (from actual_start_time to actual_end_time)
  SELECT COALESCE(
    AVG(EXTRACT(EPOCH FROM (db.actual_end_time - db.actual_start_time)) / 86400.0),
    0
  )
  INTO _avg_delivery_days
  FROM delivery_batches db
  WHERE db.status = 'completed'
    AND db.actual_start_time IS NOT NULL
    AND db.actual_end_time IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM unnest(db.facility_ids) AS fid
      JOIN requisitions r ON r.facility_id = fid
      WHERE r.program ILIKE _program_code
    );

  -- Build the result JSON
  SELECT json_build_object(
    'facility_count', COALESCE(_facility_count, 0),
    'active_requisitions', COALESCE(_active_requisitions, 0),
    'active_schedules', 0, -- schedules don't have program linkage yet
    'active_batches', COALESCE(_active_batches, 0),
    'pending_batches', COALESCE(_pending_batches, 0),
    'stockout_count', 0, -- no stockout tracking yet
    'fulfillment_rate', CASE
      WHEN COALESCE(_total_requisitions, 0) = 0 THEN 0
      ELSE ROUND((_fulfilled_requisitions::NUMERIC / _total_requisitions) * 100)
    END,
    'avg_delivery_time', ROUND(COALESCE(_avg_delivery_days, 0)::NUMERIC, 1)
  ) INTO _result;

  RETURN _result;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_program_metrics(TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_program_metrics IS 'Computes program metrics by matching program name against requisitions and related batches';
