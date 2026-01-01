-- Test the exact query from get_delivery_kpis to see what it returns

SELECT
  COUNT(*)::BIGINT as total_batches,
  COUNT(*) FILTER (WHERE dp.status = 'completed')::BIGINT as completed_batches,
  COUNT(*) FILTER (WHERE dp.on_time = true)::BIGINT as on_time_batches,
  COUNT(*) FILTER (WHERE dp.on_time = false)::BIGINT as late_batches,
  ROUND(
    (COUNT(*) FILTER (WHERE dp.on_time = true)::NUMERIC /
     NULLIF(COUNT(*) FILTER (WHERE dp.status = 'completed'), 0)::NUMERIC) * 100,
    2
  ) as on_time_rate,
  ROUND(AVG(dp.completion_time_hours) FILTER (WHERE dp.completion_time_hours IS NOT NULL), 2) as avg_completion_time_hours,
  COALESCE(SUM(dp.items_count), 0)::BIGINT as total_items_delivered,
  COALESCE(SUM(dp.total_distance), 0) as total_distance_km
FROM analytics.delivery_performance dp;
