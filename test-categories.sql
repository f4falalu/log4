-- Test queries to check vehicle_categories table
-- Run these in Supabase SQL Editor to verify the onboarding system

-- 1. Check if vehicle_categories table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'vehicle_categories'
) AS table_exists;

-- 2. Count categories
SELECT COUNT(*) as category_count FROM vehicle_categories;

-- 3. Show all categories
SELECT code, display_name, source FROM vehicle_categories ORDER BY source DESC, display_name;

-- 4. Check RLS policies on vehicle_categories
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'vehicle_categories';

-- 5. Check if vehicle_types table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'vehicle_types'
) AS table_exists;

-- 6. Count vehicle types
SELECT COUNT(*) as type_count FROM vehicle_types;

-- 7. Show all vehicle types with their categories
SELECT vt.code, vt.name, vc.display_name as category
FROM vehicle_types vt
LEFT JOIN vehicle_categories vc ON vt.category_id = vc.id
ORDER BY vc.display_name, vt.name;
