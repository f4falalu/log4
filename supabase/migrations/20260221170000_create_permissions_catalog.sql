-- =====================================================
-- RBAC System - Part 1: Permissions Catalog
-- =====================================================
-- Creates the master permissions table and seeds with
-- default V1 permission set (32 permissions)
--
-- Based on enterprise patterns from Salesforce, mSupply,
-- e2Open, and Fleetbase.
-- =====================================================

-- =====================================================
-- 1. CREATE PERMISSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE, -- resource.action format
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (
    category IN (
      'SYSTEM',
      'MASTER_DATA',
      'INVENTORY',
      'REQUISITION',
      'INVOICE',
      'SCHEDULER',
      'BATCH',
      'DRIVER',
      'REPORTING'
    )
  ),
  is_dangerous BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_permissions_code ON public.permissions(code);
CREATE INDEX idx_permissions_category ON public.permissions(category);
CREATE INDEX idx_permissions_resource ON public.permissions(resource);

-- Enable RLS
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Read-only for all authenticated users, manage only for system_admin
CREATE POLICY "All authenticated users can view permissions"
  ON public.permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System admins can manage permissions"
  ON public.permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'system_admin'
    )
  );

-- =====================================================
-- 2. SEED DEFAULT PERMISSIONS (V1 - 32 Permissions)
-- =====================================================

-- SYSTEM / ADMIN (5 permissions)
INSERT INTO public.permissions (resource, action, code, description, category, is_dangerous) VALUES
('system', 'manage_users', 'system.manage_users', 'Create, update, and deactivate user accounts', 'SYSTEM', true),
('system', 'manage_roles', 'system.manage_roles', 'Create and modify role definitions', 'SYSTEM', true),
('system', 'manage_permissions', 'system.manage_permissions', 'Assign and revoke permissions', 'SYSTEM', true),
('system', 'manage_scopes', 'system.manage_scopes', 'Define user data access scopes (warehouse/program)', 'SYSTEM', true),
('system', 'manage_settings', 'system.manage_settings', 'Modify system-wide configuration', 'SYSTEM', true);

-- MASTER DATA (5 permissions)
INSERT INTO public.permissions (resource, action, code, description, category, is_dangerous) VALUES
('item', 'manage', 'item.manage', 'Create, update, and delete inventory items', 'MASTER_DATA', false),
('program', 'manage', 'program.manage', 'Create, update, and delete programs', 'MASTER_DATA', false),
('warehouse', 'manage', 'warehouse.manage', 'Create, update, and delete warehouses', 'MASTER_DATA', true),
('facility', 'manage', 'facility.manage', 'Create, update, and delete facilities', 'MASTER_DATA', false),
('zone', 'manage', 'zone.manage', 'Create, update, and delete zones', 'MASTER_DATA', false);

-- INVENTORY (3 permissions)
INSERT INTO public.permissions (resource, action, code, description, category, is_dangerous) VALUES
('inventory', 'view', 'inventory.view', 'View inventory levels and stock data', 'INVENTORY', false),
('inventory', 'adjust', 'inventory.adjust', 'Adjust inventory quantities (add/remove stock)', 'INVENTORY', true),
('inventory', 'transfer', 'inventory.transfer', 'Transfer inventory between warehouses', 'INVENTORY', true);

-- REQUISITION (3 permissions)
INSERT INTO public.permissions (resource, action, code, description, category, is_dangerous) VALUES
('requisition', 'create', 'requisition.create', 'Create and submit requisitions', 'REQUISITION', false),
('requisition', 'approve', 'requisition.approve', 'Approve or reject requisitions', 'REQUISITION', true),
('requisition', 'cancel', 'requisition.cancel', 'Cancel approved requisitions', 'REQUISITION', true);

-- INVOICE (2 permissions)
INSERT INTO public.permissions (resource, action, code, description, category, is_dangerous) VALUES
('invoice', 'process', 'invoice.process', 'Create and validate invoices (financial impact)', 'INVOICE', true),
('invoice', 'cancel', 'invoice.cancel', 'Cancel processed invoices', 'INVOICE', true);

-- SCHEDULER (3 permissions)
INSERT INTO public.permissions (resource, action, code, description, category, is_dangerous) VALUES
('schedule', 'create', 'schedule.create', 'Create delivery schedules', 'SCHEDULER', false),
('schedule', 'review', 'schedule.review', 'Review and approve schedules', 'SCHEDULER', false),
('schedule', 'delete', 'schedule.delete', 'Delete scheduled deliveries', 'SCHEDULER', true);

-- BATCH / FLEETOPS (5 permissions)
INSERT INTO public.permissions (resource, action, code, description, category, is_dangerous) VALUES
('batch', 'create', 'batch.create', 'Create delivery batches', 'BATCH', false),
('batch', 'assign', 'batch.assign', 'Assign vehicles and drivers to batches', 'BATCH', false),
('batch', 'dispatch', 'batch.dispatch', 'Dispatch batches for delivery execution', 'BATCH', true),
('batch', 'complete', 'batch.complete', 'Mark batches as completed', 'BATCH', false),
('batch', 'cancel', 'batch.cancel', 'Cancel dispatched batches', 'BATCH', true);

-- DRIVER EXECUTION (4 permissions)
INSERT INTO public.permissions (resource, action, code, description, category, is_dangerous) VALUES
('driver', 'view_assigned', 'driver.view_assigned', 'View assigned delivery routes', 'DRIVER', false),
('driver', 'confirm_delivery', 'driver.confirm_delivery', 'Confirm delivery completion with proof', 'DRIVER', false),
('driver', 'record_discrepancy', 'driver.record_discrepancy', 'Record delivery discrepancies', 'DRIVER', false),
('driver', 'record_return', 'driver.record_return', 'Record returned items', 'DRIVER', false);

-- REPORTING (2 permissions)
INSERT INTO public.permissions (resource, action, code, description, category, is_dangerous) VALUES
('report', 'view', 'report.view', 'View analytics and reports', 'REPORTING', false),
('report', 'export', 'report.export', 'Export reports to CSV/Excel', 'REPORTING', false);

-- =====================================================
-- 3. CREATE UPDATED_AT TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_permissions_updated_at
  BEFORE UPDATE ON public.permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 4. VERIFICATION
-- =====================================================

DO $$
DECLARE
  permission_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO permission_count FROM public.permissions;

  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'RBAC System - Permissions Catalog Created';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Total permissions seeded: %', permission_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Permission breakdown:';
  RAISE NOTICE '  - SYSTEM: 5 permissions';
  RAISE NOTICE '  - MASTER_DATA: 5 permissions';
  RAISE NOTICE '  - INVENTORY: 3 permissions';
  RAISE NOTICE '  - REQUISITION: 3 permissions';
  RAISE NOTICE '  - INVOICE: 2 permissions';
  RAISE NOTICE '  - SCHEDULER: 3 permissions';
  RAISE NOTICE '  - BATCH: 5 permissions';
  RAISE NOTICE '  - DRIVER: 4 permissions';
  RAISE NOTICE '  - REPORTING: 2 permissions';
  RAISE NOTICE '';
  RAISE NOTICE 'Dangerous permissions flagged: %', (
    SELECT COUNT(*) FROM public.permissions WHERE is_dangerous = true
  );
  RAISE NOTICE '=================================================================';
END $$;
