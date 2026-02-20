-- =====================================================
-- Setup Default Workspace and Auto-Add Users
-- =====================================================
-- This migration ensures:
-- 1. A default workspace exists
-- 2. All existing users are members of the default workspace
-- 3. New users are automatically added to the default workspace

-- =====================================================
-- 1. CREATE DEFAULT WORKSPACE
-- =====================================================

DO $$
DECLARE
  default_workspace_id UUID;
  country_id UUID;
BEGIN
  -- Get Nigeria's country ID (assuming it exists)
  SELECT id INTO country_id
  FROM public.countries
  WHERE iso_code = 'NG' OR name = 'Nigeria'
  LIMIT 1;

  -- If no country found, create Nigeria
  IF country_id IS NULL THEN
    INSERT INTO public.countries (iso_code, name, currency_code)
    VALUES ('NG', 'Nigeria', 'NGN')
    RETURNING id INTO country_id;
  END IF;

  -- Create or get default workspace
  INSERT INTO public.workspaces (
    id,
    name,
    slug,
    country_id,
    description,
    is_active
  )
  VALUES (
    '00000000-0000-0000-0000-000000000001'::UUID,
    'Default Workspace',
    'default',
    country_id,
    'Default workspace for BIKO platform',
    true
  )
  ON CONFLICT (id) DO UPDATE
  SET
    name = EXCLUDED.name,
    is_active = true
  RETURNING id INTO default_workspace_id;

  RAISE NOTICE 'Default workspace created/updated: %', default_workspace_id;
END $$;

-- =====================================================
-- 2. ADD ALL EXISTING USERS TO DEFAULT WORKSPACE
-- =====================================================

DO $$
DECLARE
  default_workspace_id UUID := '00000000-0000-0000-0000-000000000001'::UUID;
  user_count INTEGER;
BEGIN
  -- Add all existing users to the default workspace as admins
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  SELECT
    default_workspace_id,
    u.id,
    'admin'
  FROM auth.users u
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.user_id = u.id
    AND wm.workspace_id = default_workspace_id
  )
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  GET DIAGNOSTICS user_count = ROW_COUNT;
  RAISE NOTICE 'Added % existing users to default workspace', user_count;
END $$;

-- =====================================================
-- 3. AUTO-ADD NEW USERS TO DEFAULT WORKSPACE
-- =====================================================

-- Create function to auto-add new users to default workspace
CREATE OR REPLACE FUNCTION public.add_user_to_default_workspace()
RETURNS TRIGGER AS $$
DECLARE
  default_workspace_id UUID := '00000000-0000-0000-0000-000000000001'::UUID;
BEGIN
  -- Add new user to default workspace as member
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (default_workspace_id, NEW.id, 'member')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_add_user_to_default_workspace ON auth.users;

-- Create trigger to auto-add users on signup
CREATE TRIGGER trigger_add_user_to_default_workspace
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.add_user_to_default_workspace();

-- =====================================================
-- 4. COMMENTS
-- =====================================================

COMMENT ON FUNCTION public.add_user_to_default_workspace IS
'Automatically adds new users to the default workspace upon signup';

-- Note: Cannot add comment to auth.users trigger (insufficient permissions)
-- COMMENT ON TRIGGER trigger_add_user_to_default_workspace ON auth.users IS
-- 'Ensures all new users are members of the default workspace';

-- =====================================================
-- COMPLETE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=============================================================';
  RAISE NOTICE 'Default workspace setup complete!';
  RAISE NOTICE 'Workspace ID: 00000000-0000-0000-0000-000000000001';
  RAISE NOTICE 'All users have been added to the default workspace.';
  RAISE NOTICE '=============================================================';
END $$;
