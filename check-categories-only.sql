-- Check if vehicle_categories table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'vehicle_categories'
) AS table_exists;

-- If it exists, count and show categories
SELECT COUNT(*) as category_count FROM vehicle_categories;

SELECT * FROM vehicle_categories LIMIT 5;
