-- ============================================================================
-- PHASE 0.1: CLEANUP LEGACY RBAC
-- ============================================================================
-- Drops legacy RBAC tables, stubbed RPC functions, and the app_role enum.
-- These were suspended in 20260302100000_suspend_rbac_open_access.sql and
-- are no longer needed. The new RBAC v2 schema will be created in the next
-- migration (20260324000002).
--
-- Prerequisites:
-- - Verify no live RLS policies reference these functions (they don't — the
--   suspend migration already neutered them).
-- ============================================================================

BEGIN;

-- ============================================================
-- 1. DROP LEGACY TABLES (order respects FK dependencies)
-- ============================================================

-- Junction / leaf tables first
DROP TABLE IF EXISTS public.group_permissions CASCADE;
DROP TABLE IF EXISTS public.group_members CASCADE;
DROP TABLE IF EXISTS public.permission_set_permissions CASCADE;
DROP TABLE IF EXISTS public.user_permission_sets CASCADE;
DROP TABLE IF EXISTS public.user_scope_bindings CASCADE;
DROP TABLE IF EXISTS public.user_permissions CASCADE;
DROP TABLE IF EXISTS public.notification_preferences CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;

-- Parent tables
DROP TABLE IF EXISTS public.user_groups CASCADE;
DROP TABLE IF EXISTS public.permission_sets CASCADE;

-- ============================================================
-- 2. DROP STUBBED RPC FUNCTIONS
-- ============================================================
-- These were neutered in the suspend migration (always return TRUE / system_admin).

-- Permission checking functions
DROP FUNCTION IF EXISTS public.has_permission(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.can_access_resource(UUID, TEXT, UUID, UUID, UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.can_access_warehouse_resource(UUID, TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.can_access_program_resource(UUID, TEXT, UUID) CASCADE;

-- Role query functions
DROP FUNCTION IF EXISTS public.get_user_permissions(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_roles(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_permission_sets(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_dangerous_permission(TEXT) CASCADE;

-- Scope checking functions
DROP FUNCTION IF EXISTS public.user_has_warehouse_access(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.user_has_program_access(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.user_has_zone_access(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.user_has_facility_access(UUID, UUID) CASCADE;

-- Admin management functions
DROP FUNCTION IF EXISTS public.admin_assign_role(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.admin_remove_role(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.admin_get_user_roles(UUID) CASCADE;

-- Role helper functions (both overloads)
DROP FUNCTION IF EXISTS public.has_role(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(UUID, TEXT) CASCADE;

-- Identity helper functions
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_system_admin(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_warehouse_officer() CASCADE;
DROP FUNCTION IF EXISTS public.is_zone_manager() CASCADE;
DROP FUNCTION IF EXISTS public.is_fleet_manager() CASCADE;
DROP FUNCTION IF EXISTS public.manages_zone(UUID) CASCADE;

-- get_my_roles (used by useUserRole hook — being deleted)
DROP FUNCTION IF EXISTS public.get_my_roles() CASCADE;

-- ============================================================
-- 3. DROP app_role ENUM TYPE
-- ============================================================
-- This enum was used by the legacy role system. The new system
-- uses the roles table with a TEXT code column.

DROP TYPE IF EXISTS public.app_role CASCADE;

-- ============================================================
-- 4. DROP 'role' TEXT COLUMN FROM user_roles
-- ============================================================
-- user_roles now only needs (user_id, role_id). The legacy TEXT
-- 'role' column and its sync trigger were already removed by the
-- suspend migration.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_roles'
      AND column_name = 'role'
  ) THEN
    ALTER TABLE public.user_roles DROP COLUMN role;
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- DONE: Legacy RBAC artifacts have been removed.
-- Remaining tables: roles, role_permissions, permissions, user_roles
-- These will be repurposed by the RBAC v2 schema migration.
-- ============================================================================
