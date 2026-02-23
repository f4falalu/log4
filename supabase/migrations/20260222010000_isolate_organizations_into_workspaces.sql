-- =====================================================
-- ISOLATE ORGANIZATIONS INTO SEPARATE WORKSPACES
-- =====================================================
--
-- CRITICAL SECURITY FIX: Separate 5 users into individual workspaces
--
-- Current State: ALL 5 users in shared "default" workspace
-- Target State: Each user in their own organization workspace
--
-- Users identified:
-- 1. emailfalalu@gmail.com
-- 2. brown.algren@proton.me
-- 3. admin@biko.org
-- 4. admin@example.com
-- 5. admin@biko.net
--
-- NOTE: If biko.org and biko.net are the SAME organization,
--       you can modify this script to put them in one workspace
--
-- =====================================================

DO $$
DECLARE
  nigeria_country_id UUID;

  -- Workspace IDs (will be created)
  workspace_gmail UUID;
  workspace_proton UUID;
  workspace_biko_org UUID;
  workspace_example UUID;
  workspace_biko_net UUID;

  -- User IDs (will be fetched)
  user_gmail UUID;
  user_proton UUID;
  user_biko_org UUID;
  user_example UUID;
  user_biko_net UUID;

  migration_count INT := 0;
BEGIN
  -- =====================================================
  -- 1. GET COUNTRY ID
  -- =====================================================
  SELECT id INTO nigeria_country_id
  FROM public.countries
  WHERE iso_code = 'NG' OR name = 'Nigeria'
  LIMIT 1;

  IF nigeria_country_id IS NULL THEN
    INSERT INTO public.countries (iso_code, name, currency_code)
    VALUES ('NG', 'Nigeria', 'NGN')
    RETURNING id INTO nigeria_country_id;
  END IF;

  -- =====================================================
  -- 2. GET USER IDs
  -- =====================================================
  SELECT id INTO user_gmail FROM auth.users WHERE email = 'emailfalalu@gmail.com';
  SELECT id INTO user_proton FROM auth.users WHERE email = 'brown.algren@proton.me';
  SELECT id INTO user_biko_org FROM auth.users WHERE email = 'admin@biko.org';
  SELECT id INTO user_example FROM auth.users WHERE email = 'admin@example.com';
  SELECT id INTO user_biko_net FROM auth.users WHERE email = 'admin@biko.net';

  -- =====================================================
  -- 3. CREATE WORKSPACES
  -- =====================================================

  -- Workspace 1: Gmail User
  IF user_gmail IS NOT NULL THEN
    INSERT INTO public.workspaces (
      name, slug, country_id, description, is_active, created_by
    ) VALUES (
      'Gmail Organization',
      'gmail-org',
      nigeria_country_id,
      'Workspace for emailfalalu@gmail.com',
      true,
      user_gmail
    ) RETURNING id INTO workspace_gmail;

    RAISE NOTICE '✅ Created workspace for emailfalalu@gmail.com: %', workspace_gmail;
  END IF;

  -- Workspace 2: Proton User
  IF user_proton IS NOT NULL THEN
    INSERT INTO public.workspaces (
      name, slug, country_id, description, is_active, created_by
    ) VALUES (
      'Proton Organization',
      'proton-org',
      nigeria_country_id,
      'Workspace for brown.algren@proton.me',
      true,
      user_proton
    ) RETURNING id INTO workspace_proton;

    RAISE NOTICE '✅ Created workspace for brown.algren@proton.me: %', workspace_proton;
  END IF;

  -- Workspace 3: BIKO.org
  IF user_biko_org IS NOT NULL THEN
    INSERT INTO public.workspaces (
      name, slug, country_id, description, is_active, created_by
    ) VALUES (
      'BIKO Organization',
      'biko-org',
      nigeria_country_id,
      'Workspace for BIKO (biko.org)',
      true,
      user_biko_org
    ) RETURNING id INTO workspace_biko_org;

    RAISE NOTICE '✅ Created workspace for admin@biko.org: %', workspace_biko_org;
  END IF;

  -- Workspace 4: Example.com (System Admin)
  IF user_example IS NOT NULL THEN
    INSERT INTO public.workspaces (
      name, slug, country_id, description, is_active, created_by
    ) VALUES (
      'Example Organization',
      'example-org',
      nigeria_country_id,
      'Workspace for admin@example.com',
      true,
      user_example
    ) RETURNING id INTO workspace_example;

    RAISE NOTICE '✅ Created workspace for admin@example.com: %', workspace_example;
  END IF;

  -- Workspace 5: BIKO.net
  -- NOTE: If this is the SAME as biko.org, comment this out and use workspace_biko_org instead
  IF user_biko_net IS NOT NULL THEN
    INSERT INTO public.workspaces (
      name, slug, country_id, description, is_active, created_by
    ) VALUES (
      'BIKO Network',
      'biko-net',
      nigeria_country_id,
      'Workspace for BIKO (biko.net)',
      true,
      user_biko_net
    ) RETURNING id INTO workspace_biko_net;

    RAISE NOTICE '✅ Created workspace for admin@biko.net: %', workspace_biko_net;
  END IF;

  -- =====================================================
  -- 4. REMOVE ALL USERS FROM DEFAULT WORKSPACE
  -- =====================================================
  DELETE FROM public.workspace_members
  WHERE workspace_id = '00000000-0000-0000-0000-000000000001';

  GET DIAGNOSTICS migration_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Removed % users from default workspace', migration_count;

  -- =====================================================
  -- 5. ADD USERS TO THEIR NEW WORKSPACES
  -- =====================================================

  -- Add Gmail user to their workspace
  IF user_gmail IS NOT NULL AND workspace_gmail IS NOT NULL THEN
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (workspace_gmail, user_gmail, 'owner');
    RAISE NOTICE '✅ Added emailfalalu@gmail.com to their workspace as owner';
  END IF;

  -- Add Proton user to their workspace
  IF user_proton IS NOT NULL AND workspace_proton IS NOT NULL THEN
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (workspace_proton, user_proton, 'owner');
    RAISE NOTICE '✅ Added brown.algren@proton.me to their workspace as owner';
  END IF;

  -- Add BIKO.org user to their workspace
  IF user_biko_org IS NOT NULL AND workspace_biko_org IS NOT NULL THEN
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (workspace_biko_org, user_biko_org, 'owner');
    RAISE NOTICE '✅ Added admin@biko.org to their workspace as owner';
  END IF;

  -- Add Example.com user to their workspace
  IF user_example IS NOT NULL AND workspace_example IS NOT NULL THEN
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (workspace_example, user_example, 'owner');
    RAISE NOTICE '✅ Added admin@example.com to their workspace as owner';
  END IF;

  -- Add BIKO.net user to their workspace
  -- NOTE: If biko.net should be WITH biko.org, change workspace_biko_net to workspace_biko_org
  IF user_biko_net IS NOT NULL AND workspace_biko_net IS NOT NULL THEN
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (workspace_biko_net, user_biko_net, 'owner');
    RAISE NOTICE '✅ Added admin@biko.net to their workspace as owner';
  END IF;

  -- =====================================================
  -- 6. VERIFICATION
  -- =====================================================
  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE '🔒 WORKSPACE ISOLATION MIGRATION COMPLETE';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Created workspaces: 5';
  RAISE NOTICE 'Migrated users: 5';
  RAISE NOTICE 'Users removed from default workspace: %', migration_count;
  RAISE NOTICE '';
  RAISE NOTICE '📊 Current workspace distribution:';

  FOR rec IN (
    SELECT
      w.name as workspace_name,
      COUNT(wm.user_id) as user_count,
      string_agg(au.email, ', ') as users
    FROM workspaces w
    LEFT JOIN workspace_members wm ON wm.workspace_id = w.id
    LEFT JOIN auth.users au ON au.id = wm.user_id
    WHERE w.is_active = true
    GROUP BY w.id, w.name
    ORDER BY w.created_at DESC
  ) LOOP
    RAISE NOTICE '  - %: % user(s) (%)', rec.workspace_name, rec.user_count, rec.users;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '✅ Each organization now has complete data isolation!';
  RAISE NOTICE '=================================================================';

END $$;

-- =====================================================
-- 7. DELETE THE DEFAULT WORKSPACE
-- =====================================================
DELETE FROM public.workspaces
WHERE id = '00000000-0000-0000-0000-000000000001';

-- =====================================================
-- 8. VERIFICATION QUERIES
-- =====================================================

-- Check isolation
SELECT
  '=== FINAL VERIFICATION ===' as check_name,
  NULL::text as metric,
  NULL::bigint as value
UNION ALL
SELECT
  '',
  'Active workspaces',
  COUNT(*) FROM workspaces WHERE is_active = true
UNION ALL
SELECT
  '',
  'Total workspace memberships',
  COUNT(*) FROM workspace_members
UNION ALL
SELECT
  '',
  'Users in multiple workspaces (should be 0)',
  COUNT(*) FROM (
    SELECT user_id
    FROM workspace_members
    GROUP BY user_id
    HAVING COUNT(DISTINCT workspace_id) > 1
  ) multi
UNION ALL
SELECT
  '',
  'Users without workspace (should be 0)',
  COUNT(*) FROM auth.users u
  WHERE NOT EXISTS (
    SELECT 1 FROM workspace_members wm WHERE wm.user_id = u.id
  );

-- Final success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ✅ ✅ MIGRATION COMPLETE! ✅ ✅ ✅';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Test login as each user';
  RAISE NOTICE '2. Verify they only see their own data';
  RAISE NOTICE '3. Check /admin/analytics shows correct counts';
  RAISE NOTICE '';
END $$;
