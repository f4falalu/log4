-- Test what columns delivery_performance actually has
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'analytics'
  AND table_name = 'delivery_performance'
ORDER BY ordinal_position;
