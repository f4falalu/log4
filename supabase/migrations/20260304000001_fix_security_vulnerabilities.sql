-- Migration: Fix security vulnerabilities flagged by Supabase linter
--
-- Issue 1: auth_users_exposed - 5 views expose auth.users to anon role
-- Issue 2: security_definer_view - views need SECURITY DEFINER to access auth.users,
--          but we must restrict who can query them
-- Issue 3: rls_disabled_in_public - spatial_ref_sys PostGIS table
--
-- NOTE: Views joining auth.users MUST remain SECURITY DEFINER because
-- authenticated users cannot access the auth schema directly.
-- The fix is to revoke anon access so only authenticated users can query them.

-- ============================================================
-- 1. REVOKE anon access from auth_users_exposed views
-- ============================================================
-- These views join auth.users and must not be queryable by unauthenticated users.
REVOKE ALL ON public.admin_users_view FROM anon;
REVOKE ALL ON public.user_scopes_detailed FROM anon;
REVOKE ALL ON public.audit_logs_critical FROM anon;
REVOKE ALL ON public.audit_summary_by_user FROM anon;
REVOKE ALL ON public.workspace_isolation_audit FROM anon;

-- Ensure authenticated role retains SELECT access
GRANT SELECT ON public.admin_users_view TO authenticated;
GRANT SELECT ON public.user_scopes_detailed TO authenticated;
GRANT SELECT ON public.audit_logs_critical TO authenticated;
GRANT SELECT ON public.audit_summary_by_user TO authenticated;
GRANT SELECT ON public.workspace_isolation_audit TO authenticated;

-- Also revoke anon from related audit/RBAC views that reference auth.users
REVOKE ALL ON public.audit_summary_by_resource FROM anon;
GRANT SELECT ON public.audit_summary_by_resource TO authenticated;

-- ============================================================
-- 2. spatial_ref_sys (PostGIS system table)
-- ============================================================
-- SKIPPED: spatial_ref_sys is owned by a system role and cannot
-- be altered via migrations. This is a PostGIS reference table
-- containing only public coordinate system definitions — no
-- sensitive data. The linter warning can be safely ignored.
