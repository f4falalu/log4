-- =====================================================
-- Fix Driver GPS Type Mismatch
-- =====================================================
-- Fixes the type mismatch error in get_active_drivers_with_positions()
-- where license_plate VARCHAR(20) needs to be cast to TEXT

-- Fix the function by casting license_plate to TEXT
CREATE OR REPLACE FUNCTION get_active_drivers_with_positions()
RETURNS TABLE (
  driver_id UUID,
  driver_name TEXT,
  session_id UUID,
  vehicle_id UUID,
  vehicle_plate TEXT,
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  speed_mps DOUBLE PRECISION,
  last_update TIMESTAMPTZ,
  current_batch_id UUID,
  batch_name TEXT,
  session_started_at TIMESTAMPTZ,
  battery_level SMALLINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(mdl.driver_id, ds.driver_id) AS driver_id,
    COALESCE(d.name, p.full_name, 'Unknown') AS driver_name,
    ds.id AS session_id,
    ds.vehicle_id,
    v.license_plate::TEXT AS vehicle_plate,
    gps.lat AS current_lat,
    gps.lng AS current_lng,
    gps.heading,
    gps.speed_mps,
    gps.captured_at AS last_update,
    gps.batch_id AS current_batch_id,
    db.name AS batch_name,
    ds.started_at AS session_started_at,
    gps.battery_level
  FROM driver_sessions ds
  -- Link to drivers via mod4_driver_links (user_id -> driver_id)
  LEFT JOIN mod4_driver_links mdl ON mdl.user_id = ds.driver_id AND mdl.status = 'active'
  LEFT JOIN drivers d ON d.id = mdl.driver_id
  -- Fallback to profiles for name
  LEFT JOIN profiles p ON p.id = ds.driver_id
  -- Vehicle info
  LEFT JOIN vehicles v ON v.id = ds.vehicle_id
  -- Latest GPS position
  LEFT JOIN LATERAL (
    SELECT dge.lat, dge.lng, dge.heading, dge.speed_mps,
           dge.captured_at, dge.batch_id, dge.battery_level
    FROM driver_gps_events dge
    WHERE dge.session_id = ds.id
    ORDER BY dge.captured_at DESC
    LIMIT 1
  ) gps ON true
  -- Batch info
  LEFT JOIN delivery_batches db ON db.id = gps.batch_id
  WHERE ds.status = 'ACTIVE'
  ORDER BY gps.captured_at DESC NULLS LAST;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_active_drivers_with_positions() TO authenticated;