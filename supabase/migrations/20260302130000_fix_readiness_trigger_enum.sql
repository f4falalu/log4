-- ============================================================================
-- Fix: readiness trigger compares NEW.type (facility_type enum) against
-- string literals like 'central_warehouse' which are NOT valid enum values.
-- Postgres implicitly casts the literals to the enum, causing:
--   "invalid input value for enum facility_type: central_warehouse"
-- Fix: cast NEW.type to TEXT before comparison so no enum cast occurs.
-- ============================================================================
CREATE OR REPLACE FUNCTION update_readiness_on_facility_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track warehouses (cast to text to avoid enum mismatch)
  IF NEW.type::TEXT IN ('warehouse', 'central_warehouse', 'zonal_warehouse', 'state_warehouse') THEN
    IF NEW.workspace_id IS NOT NULL THEN
      INSERT INTO public.workspace_readiness (workspace_id, has_warehouse, first_warehouse_at)
      VALUES (NEW.workspace_id, TRUE, NOW())
      ON CONFLICT (workspace_id) DO UPDATE
      SET
        has_warehouse = TRUE,
        first_warehouse_at = COALESCE(workspace_readiness.first_warehouse_at, NOW()),
        updated_at = NOW()
      WHERE workspace_readiness.has_warehouse = FALSE;

      UPDATE public.workspaces
      SET first_warehouse_added_at = COALESCE(first_warehouse_added_at, NOW())
      WHERE id = NEW.workspace_id AND first_warehouse_added_at IS NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
