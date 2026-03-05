-- =====================================================
-- Phase 2: Per-User Permissions, User Groups, Notifications
-- =====================================================
-- Adds mSupply-style granular permission management:
-- 1. Direct per-user permission grants
-- 2. User groups with group-level permissions
-- 3. Notification preferences
-- 4. RPCs for admin operations
-- 5. Updated effective permissions view
-- =====================================================

BEGIN;

-- =====================================================
-- 1. DIRECT USER PERMISSIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, permission_id)
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Admins can manage, authenticated can read
CREATE POLICY "Admins can manage user permissions"
  ON public.user_permissions FOR ALL
  USING (public.is_system_admin(auth.uid()));

CREATE POLICY "Users can view own permissions"
  ON public.user_permissions FOR SELECT
  USING (user_id = auth.uid());

-- =====================================================
-- 2. USER GROUPS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  organization_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view groups"
  ON public.user_groups FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage groups"
  ON public.user_groups FOR ALL
  USING (public.is_system_admin(auth.uid()));

-- =====================================================
-- 3. GROUP MEMBERS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.user_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own group memberships"
  ON public.group_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage group members"
  ON public.group_members FOR ALL
  USING (public.is_system_admin(auth.uid()));

-- =====================================================
-- 4. GROUP PERMISSIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.group_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.user_groups(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  UNIQUE(group_id, permission_id)
);

ALTER TABLE public.group_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view group permissions"
  ON public.group_permissions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage group permissions"
  ON public.group_permissions FOR ALL
  USING (public.is_system_admin(auth.uid()));

-- =====================================================
-- 5. NOTIFICATION PREFERENCES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'in_app',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, notification_type, channel)
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification preferences"
  ON public.notification_preferences FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own notification preferences"
  ON public.notification_preferences FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all notification preferences"
  ON public.notification_preferences FOR ALL
  USING (public.is_system_admin(auth.uid()));

-- =====================================================
-- 6. INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON public.user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission ON public.user_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_permissions_group ON public.group_permissions(group_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON public.notification_preferences(user_id);

-- =====================================================
-- 7. UPDATE MATERIALIZED VIEW — add group + direct sources
-- =====================================================

DROP MATERIALIZED VIEW IF EXISTS public.mv_user_permissions;

CREATE MATERIALIZED VIEW public.mv_user_permissions AS
-- From roles
SELECT DISTINCT
  ur.user_id,
  p.id AS permission_id,
  p.code AS permission_code,
  p.resource,
  p.action,
  p.category,
  p.is_dangerous,
  'role' AS source,
  r.code AS role_code
FROM public.user_roles ur
JOIN public.roles r ON r.id = ur.role_id
JOIN public.role_permissions rp ON rp.role_id = r.id
JOIN public.permissions p ON p.id = rp.permission_id

UNION

-- From permission sets
SELECT DISTINCT
  ups.user_id,
  p.id AS permission_id,
  p.code AS permission_code,
  p.resource,
  p.action,
  p.category,
  p.is_dangerous,
  'permission_set' AS source,
  ps.code AS role_code
FROM public.user_permission_sets ups
JOIN public.permission_sets ps ON ps.id = ups.permission_set_id AND ps.is_active = true
JOIN public.permission_set_permissions psp ON psp.permission_set_id = ps.id
JOIN public.permissions p ON p.id = psp.permission_id
WHERE ups.expires_at IS NULL OR ups.expires_at > now()

UNION

-- From user groups
SELECT DISTINCT
  gm.user_id,
  p.id AS permission_id,
  p.code AS permission_code,
  p.resource,
  p.action,
  p.category,
  p.is_dangerous,
  'group' AS source,
  ug.code AS role_code
FROM public.group_members gm
JOIN public.user_groups ug ON ug.id = gm.group_id
JOIN public.group_permissions gp ON gp.group_id = ug.id
JOIN public.permissions p ON p.id = gp.permission_id

UNION

-- From direct user permissions
SELECT DISTINCT
  up.user_id,
  p.id AS permission_id,
  p.code AS permission_code,
  p.resource,
  p.action,
  p.category,
  p.is_dangerous,
  'direct' AS source,
  NULL AS role_code
FROM public.user_permissions up
JOIN public.permissions p ON p.id = up.permission_id;

-- Recreate indexes on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_user_permissions_unique
  ON public.mv_user_permissions(user_id, permission_id, source, COALESCE(role_code, ''));
CREATE INDEX IF NOT EXISTS idx_mv_user_permissions_user_perm
  ON public.mv_user_permissions(user_id, permission_code);
CREATE INDEX IF NOT EXISTS idx_mv_user_permissions_user
  ON public.mv_user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_mv_user_permissions_code
  ON public.mv_user_permissions(permission_code);

-- =====================================================
-- 8. REFRESH TRIGGERS for new tables
-- =====================================================

-- Trigger function to refresh materialized view (may already exist)
CREATE OR REPLACE FUNCTION public.refresh_user_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_user_permissions;
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  -- If concurrent refresh fails (e.g., no unique index), do regular refresh
  REFRESH MATERIALIZED VIEW public.mv_user_permissions;
  RETURN NULL;
END;
$$;

-- Also allow calling as a plain function (for manual refresh)
CREATE OR REPLACE FUNCTION public.refresh_user_permissions_fn()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_user_permissions;
EXCEPTION WHEN OTHERS THEN
  REFRESH MATERIALIZED VIEW public.mv_user_permissions;
END;
$$;

-- Drop existing triggers that may conflict
DROP TRIGGER IF EXISTS refresh_permissions_on_user_permissions ON public.user_permissions;
DROP TRIGGER IF EXISTS refresh_permissions_on_group_members ON public.group_members;
DROP TRIGGER IF EXISTS refresh_permissions_on_group_permissions ON public.group_permissions;

-- Create triggers for new tables
CREATE TRIGGER refresh_permissions_on_user_permissions
  AFTER INSERT OR UPDATE OR DELETE ON public.user_permissions
  FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_user_permissions();

CREATE TRIGGER refresh_permissions_on_group_members
  AFTER INSERT OR UPDATE OR DELETE ON public.group_members
  FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_user_permissions();

CREATE TRIGGER refresh_permissions_on_group_permissions
  AFTER INSERT OR UPDATE OR DELETE ON public.group_permissions
  FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_user_permissions();

-- =====================================================
-- 9. ADMIN RPCs
-- =====================================================

-- Toggle a single permission for a user
CREATE OR REPLACE FUNCTION public.admin_set_user_permission(
  _target_user_id UUID,
  _permission_id UUID,
  _grant BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_system_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only system admins can manage user permissions';
  END IF;

  IF _grant THEN
    INSERT INTO public.user_permissions (user_id, permission_id, granted_by)
    VALUES (_target_user_id, _permission_id, auth.uid())
    ON CONFLICT (user_id, permission_id) DO NOTHING;
  ELSE
    DELETE FROM public.user_permissions
    WHERE user_id = _target_user_id AND permission_id = _permission_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_permission(UUID, UUID, BOOLEAN) TO authenticated;

-- Bulk replace all direct permissions for a user
CREATE OR REPLACE FUNCTION public.admin_bulk_set_user_permissions(
  _target_user_id UUID,
  _permission_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_system_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only system admins can manage user permissions';
  END IF;

  -- Remove all existing direct permissions
  DELETE FROM public.user_permissions WHERE user_id = _target_user_id;

  -- Insert new permissions
  IF array_length(_permission_ids, 1) > 0 THEN
    INSERT INTO public.user_permissions (user_id, permission_id, granted_by)
    SELECT _target_user_id, pid, auth.uid()
    FROM unnest(_permission_ids) AS pid
    ON CONFLICT (user_id, permission_id) DO NOTHING;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_bulk_set_user_permissions(UUID, UUID[]) TO authenticated;

-- Copy direct permissions from one user to another
CREATE OR REPLACE FUNCTION public.admin_copy_user_permissions(
  _source_user_id UUID,
  _target_user_id UUID,
  _copy_direct BOOLEAN DEFAULT true,
  _copy_role BOOLEAN DEFAULT false,
  _copy_groups BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _direct_count INT := 0;
  _role_copied TEXT := NULL;
  _groups_count INT := 0;
BEGIN
  IF NOT public.is_system_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only system admins can copy permissions';
  END IF;

  -- Copy direct permissions
  IF _copy_direct THEN
    DELETE FROM public.user_permissions WHERE user_id = _target_user_id;

    INSERT INTO public.user_permissions (user_id, permission_id, granted_by)
    SELECT _target_user_id, permission_id, auth.uid()
    FROM public.user_permissions
    WHERE user_id = _source_user_id
    ON CONFLICT (user_id, permission_id) DO NOTHING;

    GET DIAGNOSTICS _direct_count = ROW_COUNT;
  END IF;

  -- Copy role
  IF _copy_role THEN
    -- Get source user's role_id
    DELETE FROM public.user_roles WHERE user_id = _target_user_id;

    INSERT INTO public.user_roles (user_id, role_id, role)
    SELECT _target_user_id, ur.role_id, ur.role
    FROM public.user_roles ur
    WHERE ur.user_id = _source_user_id
    LIMIT 1;

    SELECT r.code INTO _role_copied
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = _target_user_id
    LIMIT 1;
  END IF;

  -- Copy group memberships
  IF _copy_groups THEN
    DELETE FROM public.group_members WHERE user_id = _target_user_id;

    INSERT INTO public.group_members (group_id, user_id)
    SELECT group_id, _target_user_id
    FROM public.group_members
    WHERE user_id = _source_user_id
    ON CONFLICT (group_id, user_id) DO NOTHING;

    GET DIAGNOSTICS _groups_count = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'direct_permissions_copied', _direct_count,
    'role_copied', _role_copied,
    'groups_copied', _groups_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_copy_user_permissions(UUID, UUID, BOOLEAN, BOOLEAN, BOOLEAN) TO authenticated;

-- Get effective permissions for a user with source labels
CREATE OR REPLACE FUNCTION public.admin_get_user_effective_permissions(_target_user_id UUID)
RETURNS TABLE(
  permission_id UUID,
  permission_code TEXT,
  resource TEXT,
  action TEXT,
  category TEXT,
  description TEXT,
  is_dangerous BOOLEAN,
  source TEXT,
  source_name TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- From role
  SELECT DISTINCT
    p.id, p.code, p.resource, p.action, p.category, p.description, p.is_dangerous,
    'role'::TEXT AS source,
    r.name AS source_name
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  JOIN public.role_permissions rp ON rp.role_id = r.id
  JOIN public.permissions p ON p.id = rp.permission_id
  WHERE ur.user_id = _target_user_id

  UNION ALL

  -- From groups
  SELECT DISTINCT
    p.id, p.code, p.resource, p.action, p.category, p.description, p.is_dangerous,
    'group'::TEXT AS source,
    ug.name AS source_name
  FROM public.group_members gm
  JOIN public.user_groups ug ON ug.id = gm.group_id
  JOIN public.group_permissions gp ON gp.group_id = ug.id
  JOIN public.permissions p ON p.id = gp.permission_id
  WHERE gm.user_id = _target_user_id

  UNION ALL

  -- From direct
  SELECT DISTINCT
    p.id, p.code, p.resource, p.action, p.category, p.description, p.is_dangerous,
    'direct'::TEXT AS source,
    'Direct Grant'::TEXT AS source_name
  FROM public.user_permissions up
  JOIN public.permissions p ON p.id = up.permission_id
  WHERE up.user_id = _target_user_id

  UNION ALL

  -- From permission sets
  SELECT DISTINCT
    p.id, p.code, p.resource, p.action, p.category, p.description, p.is_dangerous,
    'permission_set'::TEXT AS source,
    ps.name AS source_name
  FROM public.user_permission_sets ups
  JOIN public.permission_sets ps ON ps.id = ups.permission_set_id AND ps.is_active = true
  JOIN public.permission_set_permissions psp ON psp.permission_set_id = ps.id
  JOIN public.permissions p ON p.id = psp.permission_id
  WHERE ups.user_id = _target_user_id
    AND (ups.expires_at IS NULL OR ups.expires_at > now())

  ORDER BY 5, 2, 8;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_user_effective_permissions(UUID) TO authenticated;

-- Set group permissions (bulk replace)
CREATE OR REPLACE FUNCTION public.admin_set_group_permissions(
  _group_id UUID,
  _permission_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_system_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only system admins can manage group permissions';
  END IF;

  DELETE FROM public.group_permissions WHERE group_id = _group_id;

  IF array_length(_permission_ids, 1) > 0 THEN
    INSERT INTO public.group_permissions (group_id, permission_id)
    SELECT _group_id, pid
    FROM unnest(_permission_ids) AS pid
    ON CONFLICT (group_id, permission_id) DO NOTHING;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_group_permissions(UUID, UUID[]) TO authenticated;

-- =====================================================
-- 10. VERIFICATION
-- =====================================================

DO $$
DECLARE
  _table_count INT;
BEGIN
  SELECT COUNT(*) INTO _table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('user_permissions', 'user_groups', 'group_members', 'group_permissions', 'notification_preferences');

  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Phase 2: User Permissions, Groups & Notifications';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Tables created: %/5', _table_count;
  RAISE NOTICE '';
  RAISE NOTICE 'New tables:';
  RAISE NOTICE '  - user_permissions (direct per-user grants)';
  RAISE NOTICE '  - user_groups (group definitions)';
  RAISE NOTICE '  - group_members (user-group memberships)';
  RAISE NOTICE '  - group_permissions (group-level permissions)';
  RAISE NOTICE '  - notification_preferences (per-user notification toggles)';
  RAISE NOTICE '';
  RAISE NOTICE 'Materialized view mv_user_permissions updated with 4 sources:';
  RAISE NOTICE '  role, permission_set, group, direct';
  RAISE NOTICE '';
  RAISE NOTICE 'RPCs created:';
  RAISE NOTICE '  - admin_set_user_permission(user_id, perm_id, grant)';
  RAISE NOTICE '  - admin_bulk_set_user_permissions(user_id, perm_ids[])';
  RAISE NOTICE '  - admin_copy_user_permissions(source, target, ...)';
  RAISE NOTICE '  - admin_get_user_effective_permissions(user_id)';
  RAISE NOTICE '  - admin_set_group_permissions(group_id, perm_ids[])';
  RAISE NOTICE '=================================================================';
END $$;

COMMIT;
