-- Migration: Create workspace_settings table for tenant-configurable values
-- Created: 2026-03-08
-- Purpose: Move hardcoded currency, locale, map center, and country defaults
--          into a per-workspace configuration table

-- ============================================================================
-- 0. CLEANUP PARTIAL STATE (from failed first attempt)
-- ============================================================================

DROP TABLE IF EXISTS public.workspace_settings CASCADE;

-- ============================================================================
-- 1. CREATE WORKSPACE_SETTINGS TABLE
-- ============================================================================

CREATE TABLE public.workspace_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'NGN',
  currency_symbol TEXT NOT NULL DEFAULT '₦',
  locale TEXT NOT NULL DEFAULT 'en-NG',
  country TEXT NOT NULL DEFAULT 'Nigeria',
  default_state TEXT DEFAULT 'kano',
  map_center_lat DECIMAL(10, 6) DEFAULT 12.0,
  map_center_lng DECIMAL(10, 6) DEFAULT 8.5167,
  map_default_zoom INTEGER DEFAULT 11,
  timezone TEXT DEFAULT 'Africa/Lagos',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_workspace_settings UNIQUE (workspace_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_workspace_settings_workspace_id ON public.workspace_settings(workspace_id);

-- Add updated_at trigger
CREATE TRIGGER set_workspace_settings_updated_at
  BEFORE UPDATE ON public.workspace_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. ENABLE RLS
-- ============================================================================

ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;

-- Users can view settings for workspaces they belong to
CREATE POLICY "Users can view their workspace settings"
  ON public.workspace_settings FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

-- Only admins can modify workspace settings
CREATE POLICY "Admins can insert workspace settings"
  ON public.workspace_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'system_admin'
    )
  );

CREATE POLICY "Admins can update workspace settings"
  ON public.workspace_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'system_admin'
    )
  );

-- ============================================================================
-- 3. SEED DEFAULT WORKSPACE SETTINGS
-- ============================================================================

-- Insert settings for the default Kano Pharma workspace
INSERT INTO public.workspace_settings (workspace_id, currency, currency_symbol, locale, country, default_state, map_center_lat, map_center_lng, map_default_zoom, timezone)
SELECT id, 'NGN', '₦', 'en-NG', 'Nigeria', 'kano', 12.0, 8.5167, 11, 'Africa/Lagos'
FROM public.workspaces
WHERE slug = 'kano-pharma'
ON CONFLICT (workspace_id) DO NOTHING;

-- ============================================================================
-- 4. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.workspace_settings TO authenticated;
GRANT INSERT, UPDATE ON public.workspace_settings TO authenticated;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================

-- DROP TABLE IF EXISTS public.workspace_settings CASCADE;
