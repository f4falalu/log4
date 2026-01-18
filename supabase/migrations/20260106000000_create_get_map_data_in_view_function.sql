
CREATE OR REPLACE FUNCTION get_map_data_in_view(
  min_lat float,
  min_lon float,
  max_lat float,
  max_lon float,
  zoom_level int
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  bbox geometry;
  facilities_json json;
  warehouses_json json;
  vehicles_json json;
  drivers_json json;
  zones_json json;
  batches_json json;
  result json;
BEGIN
  -- Create a bounding box from the input coordinates
  bbox := ST_MakeEnvelope(min_lon, min_lat, max_lon, max_lat, 4326);

  -- Get facilities within the bounding box
  SELECT json_agg(f) INTO facilities_json
  FROM (
    SELECT id, name, address, lat, lng, type
    FROM facilities
    WHERE ST_Contains(bbox, ST_SetSRID(ST_MakePoint(lng, lat), 4326))
  ) AS f;

  -- Get warehouses within the bounding box
  SELECT json_agg(w) INTO warehouses_json
  FROM (
    SELECT id, name, address, lat, lng, type
    FROM warehouses
    WHERE ST_Contains(bbox, ST_SetSRID(ST_MakePoint(lng, lat), 4326))
  ) AS w;

  -- Get vehicles and their drivers within the bounding box (via facilities)
  SELECT json_agg(v) INTO vehicles_json
  FROM (
    SELECT
      v.id,
      v.model,
      v.plate_number,
      v.status,
      v.current_driver_id,
      fac.lat,
      fac.lng
    FROM vehicles v
    JOIN facilities fac ON v.current_location_id = fac.id
    WHERE ST_Contains(bbox, ST_SetSRID(ST_MakePoint(fac.lng, fac.lat), 4326))
  ) AS v;

  -- Get drivers based on the visible vehicles
  SELECT json_agg(d) INTO drivers_json
  FROM (
    SELECT p.id, p.full_name, p.phone_number
    FROM profiles p
    JOIN vehicles v ON p.id = v.current_driver_id
    JOIN facilities fac ON v.current_location_id = fac.id
    WHERE ST_Contains(bbox, ST_SetSRID(ST_MakePoint(fac.lng, fac.lat), 4326))
  ) AS d;

  -- Get zones where the region center is within the bounding box
  SELECT json_agg(z) INTO zones_json
  FROM (
    SELECT id, name, code, region_center
    FROM zones
    WHERE ST_Contains(bbox, ST_SetSRID(ST_MakePoint((region_center->>'lng')::float, (region_center->>'lat')::float), 4326))
  ) AS z;

  -- Get delivery batches with optimized routes
  -- A more advanced implementation could check for route intersection with the bbox
  SELECT json_agg(b) INTO batches_json
  FROM (
    SELECT id, name, status, priority, optimized_route, warehouse_id, driver_id, vehicle_id
    FROM delivery_batches
    WHERE optimized_route IS NOT NULL AND json_array_length(optimized_route) > 0
  ) AS b;


  -- Combine all results into a single JSON object
  SELECT json_build_object(
    'facilities', COALESCE(facilities_json, '[]'::json),
    'warehouses', COALESCE(warehouses_json, '[]'::json),
    'vehicles', COALESCE(vehicles_json, '[]'::json),
    'drivers', COALESCE(drivers_json, '[]'::json),
    'zones', COALESCE(zones_json, '[]'::json),
    'batches', COALESCE(batches_json, '[]'::json)
  ) INTO result;

  RETURN result;
END;
$$;
