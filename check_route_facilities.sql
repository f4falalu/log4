-- Check route facility counts
SELECT
  r.id,
  r.name,
  r.zone_id,
  COUNT(rf.facility_id) as facility_count
FROM routes r
LEFT JOIN route_facilities rf ON r.id = rf.route_id
GROUP BY r.id, r.name, r.zone_id
ORDER BY facility_count DESC
LIMIT 10;
