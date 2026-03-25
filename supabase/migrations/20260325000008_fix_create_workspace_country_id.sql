-- Fix create_workspace: include country_id (required NOT NULL column)
-- Accepts optional p_country_id; defaults to Nigeria (iso_code='NG') if not provided.

CREATE OR REPLACE FUNCTION public.create_workspace(
  p_name TEXT,
  p_slug TEXT,
  p_org_type TEXT DEFAULT NULL,
  p_country_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_owner_role_id UUID;
  v_country_id UUID;
  v_user_id UUID := auth.uid();
BEGIN
  -- Validate inputs
  IF trim(p_name) = '' THEN
    RAISE EXCEPTION 'Workspace name is required';
  END IF;
  IF trim(p_slug) = '' THEN
    RAISE EXCEPTION 'Workspace slug is required';
  END IF;

  -- Check slug uniqueness
  IF EXISTS (SELECT 1 FROM public.workspaces WHERE slug = trim(p_slug)) THEN
    RAISE EXCEPTION 'A workspace with this slug already exists';
  END IF;

  -- Resolve country_id: use provided value or default to Nigeria
  v_country_id := p_country_id;
  IF v_country_id IS NULL THEN
    SELECT id INTO v_country_id FROM public.countries WHERE iso_code = 'NG' LIMIT 1;
  END IF;
  IF v_country_id IS NULL THEN
    -- Fallback: pick any active country
    SELECT id INTO v_country_id FROM public.countries WHERE is_active = true LIMIT 1;
  END IF;
  IF v_country_id IS NULL THEN
    RAISE EXCEPTION 'No country found. Please seed the countries table first.';
  END IF;

  -- Get owner role id (fall back to admin if owner role doesn't exist)
  SELECT id INTO v_owner_role_id FROM public.roles WHERE code = 'owner';
  IF v_owner_role_id IS NULL THEN
    SELECT id INTO v_owner_role_id FROM public.roles WHERE code = 'admin';
  END IF;
  IF v_owner_role_id IS NULL THEN
    RAISE EXCEPTION 'Owner/Admin role not found in roles table';
  END IF;

  -- Create workspace
  INSERT INTO public.workspaces (id, name, slug, country_id, org_type, is_active, created_by)
  VALUES (gen_random_uuid(), trim(p_name), trim(p_slug), v_country_id, p_org_type, true, v_user_id)
  RETURNING id INTO v_workspace_id;

  -- Auto-assign creator as owner (active)
  INSERT INTO public.workspace_members (workspace_id, user_id, role, role_id, status)
  VALUES (v_workspace_id, v_user_id, 'owner', v_owner_role_id, 'active');

  -- Audit log
  INSERT INTO public.rbac_audit_logs (workspace_id, user_id, action, metadata)
  VALUES (v_workspace_id, v_user_id, 'workspace_created',
    jsonb_build_object('name', trim(p_name), 'slug', trim(p_slug),
      'org_type', p_org_type, 'country_id', v_country_id, 'role', 'owner'));

  RETURN v_workspace_id;
END;
$$;

-- Grant with new signature (4 params)
GRANT EXECUTE ON FUNCTION public.create_workspace(TEXT, TEXT, TEXT, UUID) TO authenticated;
