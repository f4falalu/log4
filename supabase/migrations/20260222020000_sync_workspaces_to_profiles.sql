-- =====================================================
-- SYNC WORKSPACES TO PROFILES.ORGANIZATION
-- =====================================================
-- Problem: We have workspace isolation via workspace_members table
--          BUT profiles.organization still shows 'default' for everyone
-- Solution: Update profiles.organization to match workspace name
-- =====================================================

-- Step 1: Update profiles.organization to match workspace name
UPDATE public.profiles p
SET
  organization = (
    SELECT w.name
    FROM public.workspaces w
    INNER JOIN public.workspace_members wm ON wm.workspace_id = w.id
    WHERE wm.user_id = p.id
    LIMIT 1
  )
WHERE EXISTS (
  SELECT 1
  FROM public.workspace_members wm
  WHERE wm.user_id = p.id
);

-- Step 2: Verify the update
DO $$
DECLARE
  total_users INTEGER;
  updated_users INTEGER;
  still_default INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_users FROM public.profiles;

  SELECT COUNT(*) INTO updated_users
  FROM public.profiles
  WHERE organization IS NOT NULL
    AND organization != 'default';

  SELECT COUNT(*) INTO still_default
  FROM public.profiles
  WHERE organization = 'default' OR organization IS NULL;

  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Workspace → Organization Sync Complete';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Total profiles: %', total_users;
  RAISE NOTICE 'Updated with workspace names: %', updated_users;
  RAISE NOTICE 'Still showing "default": %', still_default;
  RAISE NOTICE '';

  IF still_default > 0 THEN
    RAISE NOTICE '⚠️  WARNING: % users still have "default" organization', still_default;
    RAISE NOTICE '   These users may not have been assigned to a workspace yet';
  ELSE
    RAISE NOTICE '✅ SUCCESS: All users have organization from workspace';
  END IF;
  RAISE NOTICE '=================================================================';
END $$;

-- Step 3: Show current state
SELECT
  '=== ORGANIZATION DISTRIBUTION ===' as section,
  p.organization,
  COUNT(*) as user_count,
  array_agg(u.email ORDER BY u.email) as users
FROM public.profiles p
LEFT JOIN auth.users u ON u.id = p.id
GROUP BY p.organization
ORDER BY user_count DESC;
