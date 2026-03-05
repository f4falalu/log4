-- =====================================================
-- Trigger: Update drivers.current_lat/lng on GPS event
-- =====================================================
-- When a new GPS event is inserted into driver_gps_events,
-- update the corresponding drivers row with the latest
-- coordinates. This bridges MOD4 telemetry → BIKO maps.
--
-- driver_gps_events.driver_id has a direct FK to drivers(id),
-- so we can update the row directly without a join table.

CREATE OR REPLACE FUNCTION update_driver_current_location()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
    UPDATE drivers
    SET current_lat = NEW.lat,
        current_lng = NEW.lng,
        updated_at = NOW()
    WHERE id = NEW.driver_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to driver_gps_events
DROP TRIGGER IF EXISTS trg_update_driver_location ON driver_gps_events;

CREATE TRIGGER trg_update_driver_location
  AFTER INSERT ON driver_gps_events
  FOR EACH ROW
  EXECUTE FUNCTION update_driver_current_location();
