-- Check remaining zones
SELECT id, name, code, description FROM zones;

-- Check remaining service areas
SELECT id, name, zone_id, warehouse_id, description FROM service_areas;

-- Check remaining warehouses
SELECT id, name, state, city FROM warehouses;

-- Sample of remaining facilities (first 5)
SELECT id, name, state, lga, ward FROM facilities LIMIT 5;
