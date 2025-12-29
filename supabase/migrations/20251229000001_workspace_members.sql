-- Create workspace_members table for multi-tenancy RLS policies
-- This table is required by planning system RLS policies

-- ============================================================================
-- 1. CREATE WORKSPACE_MEMBERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- ============================================================================
-- 2. CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON public.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_role ON public.workspace_members(role);

-- ============================================================================
-- 3. ENABLE RLS
-- ============================================================================

ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. CREATE RLS POLICIES
-- ============================================================================

-- Users can view their own workspace memberships
DROP POLICY IF EXISTS "Users can view their own workspace memberships" ON public.workspace_members;
CREATE POLICY "Users can view their own workspace memberships"
  ON public.workspace_members FOR SELECT
  USING (auth.uid() = user_id);

-- Workspace admins can view all members in their workspaces
DROP POLICY IF EXISTS "Admins can view workspace members" ON public.workspace_members;
CREATE POLICY "Admins can view workspace members"
  ON public.workspace_members FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Workspace owners can insert new members
DROP POLICY IF EXISTS "Owners can add workspace members" ON public.workspace_members;
CREATE POLICY "Owners can add workspace members"
  ON public.workspace_members FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Workspace owners can update member roles
DROP POLICY IF EXISTS "Owners can update member roles" ON public.workspace_members;
CREATE POLICY "Owners can update member roles"
  ON public.workspace_members FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Workspace owners can remove members (except themselves)
DROP POLICY IF EXISTS "Owners can remove members" ON public.workspace_members;
CREATE POLICY "Owners can remove members"
  ON public.workspace_members FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
    AND user_id != auth.uid() -- Cannot remove yourself
  );

-- ============================================================================
-- 5. CREATE UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_workspace_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workspace_members_updated_at ON public.workspace_members;
CREATE TRIGGER workspace_members_updated_at
  BEFORE UPDATE ON public.workspace_members
  FOR EACH ROW
  EXECUTE FUNCTION update_workspace_members_updated_at();

-- ============================================================================
-- 6. BOOTSTRAP EXISTING USER INTO DEFAULT WORKSPACE
-- ============================================================================

-- Get the authenticated user (if running in a session context)
-- Otherwise this will be run manually after deployment

DO $$
DECLARE
  v_default_workspace_id UUID;
  v_admin_email TEXT := 'frankbarde@gmail.com'; -- Default admin email
  v_admin_user_id UUID;
BEGIN
  -- Find the default workspace by slug
  SELECT id INTO v_default_workspace_id
  FROM public.workspaces
  WHERE slug = 'kano-pharma'
  LIMIT 1;

  -- Only proceed if workspace exists
  IF v_default_workspace_id IS NULL THEN
    RAISE NOTICE 'Default workspace not found - skipping user bootstrap';
    RETURN;
  END IF;

  -- Try to find the admin user by email
  SELECT id INTO v_admin_user_id
  FROM auth.users
  WHERE email = v_admin_email
  LIMIT 1;

  -- If admin user exists, add them as owner of default workspace
  IF v_admin_user_id IS NOT NULL THEN
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (v_default_workspace_id, v_admin_user_id, 'owner')
    ON CONFLICT (workspace_id, user_id) DO UPDATE
    SET role = 'owner', updated_at = NOW();

    RAISE NOTICE 'Admin user % added as owner of default workspace', v_admin_email;
  ELSE
    RAISE NOTICE 'Admin user % not found - workspace membership must be created manually', v_admin_email;
  END IF;
END $$;

-- ============================================================================
-- 7. VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_members_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_members_count FROM public.workspace_members;

  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Workspace Members Table Created';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Total workspace members: %', v_members_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Verify admin user is added to default workspace';
  RAISE NOTICE '2. Add additional users via admin interface';
  RAISE NOTICE '3. Deploy planning system migration (depends on this table)';
  RAISE NOTICE '=================================================================';
END $$;
