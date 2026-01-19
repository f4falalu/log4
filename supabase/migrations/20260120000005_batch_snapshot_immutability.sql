-- =====================================================
-- RFC-012: Batch Snapshot Immutability
-- =====================================================
-- Adds snapshot columns to delivery_batches and enforces immutability
-- once a batch transitions to in_transit (dispatch start).
--
-- Batch lifecycle:
-- - planned: Fully mutable
-- - assigned: Vehicle locked, driver assigned
-- - in-progress (in_transit): Snapshot frozen, no modifications allowed
-- - completed: Immutable terminal state
-- =====================================================

-- Step 1: Add snapshot columns to delivery_batches
ALTER TABLE public.delivery_batches
ADD COLUMN IF NOT EXISTS batch_snapshot JSONB,
ADD COLUMN IF NOT EXISTS snapshot_locked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_snapshot_locked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS total_slot_demand NUMERIC(6, 2),
ADD COLUMN IF NOT EXISTS vehicle_total_slots INTEGER;

-- Step 2: Create function to build batch snapshot
CREATE OR REPLACE FUNCTION build_batch_snapshot(p_batch_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_snapshot JSONB;
  v_batch RECORD;
  v_slot_demand NUMERIC;
BEGIN
  -- Get batch details
  SELECT * INTO v_batch
  FROM public.delivery_batches
  WHERE id = p_batch_id;

  IF v_batch IS NULL THEN
    RAISE EXCEPTION 'Batch not found: %', p_batch_id;
  END IF;

  -- Calculate total slot demand from requisition packaging
  SELECT COALESCE(SUM(rp.rounded_slot_demand), 0) INTO v_slot_demand
  FROM public.requisitions r
  JOIN public.requisition_packaging rp ON rp.requisition_id = r.id
  WHERE r.batch_id = p_batch_id;

  -- Build snapshot
  v_snapshot := jsonb_build_object(
    'snapshot_version', 1,
    'created_at', NOW(),
    'vehicle_id', v_batch.vehicle_id,
    'driver_id', v_batch.driver_id,
    'warehouse_id', v_batch.warehouse_id,
    'facility_ids', v_batch.facility_ids,
    'optimized_route', v_batch.optimized_route,
    'total_slot_demand', v_slot_demand,
    'total_quantity', v_batch.total_quantity,
    'total_distance', v_batch.total_distance,
    'estimated_duration', v_batch.estimated_duration,
    'scheduled_date', v_batch.scheduled_date,
    'scheduled_time', v_batch.scheduled_time,
    'priority', v_batch.priority,
    'medication_type', v_batch.medication_type
  );

  RETURN v_snapshot;
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 3: Create trigger to lock snapshot on dispatch start
CREATE OR REPLACE FUNCTION lock_batch_snapshot_on_dispatch()
RETURNS TRIGGER AS $$
BEGIN
  -- Lock snapshot when batch transitions to in-progress (dispatch start)
  IF NEW.status = 'in-progress' AND OLD.status IN ('planned', 'assigned') THEN
    -- Only lock if not already locked
    IF NOT COALESCE(OLD.is_snapshot_locked, FALSE) THEN
      NEW.batch_snapshot := build_batch_snapshot(NEW.id);
      NEW.snapshot_locked_at := NOW();
      NEW.is_snapshot_locked := TRUE;

      -- Calculate and store slot demand
      SELECT COALESCE(SUM(rp.rounded_slot_demand), 0) INTO NEW.total_slot_demand
      FROM public.requisitions r
      JOIN public.requisition_packaging rp ON rp.requisition_id = r.id
      WHERE r.batch_id = NEW.id;

      -- Update associated requisitions to in_transit
      UPDATE public.requisitions
      SET status = 'in_transit'
      WHERE batch_id = NEW.id
      AND status = 'assigned_to_batch';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS lock_batch_snapshot_trigger ON public.delivery_batches;
CREATE TRIGGER lock_batch_snapshot_trigger
  BEFORE UPDATE OF status ON public.delivery_batches
  FOR EACH ROW
  EXECUTE FUNCTION lock_batch_snapshot_on_dispatch();

-- Step 4: Create trigger to prevent modifications after snapshot lock
CREATE OR REPLACE FUNCTION prevent_batch_modifications_after_lock()
RETURNS TRIGGER AS $$
BEGIN
  -- If snapshot is locked, prevent modifications to critical fields
  IF OLD.is_snapshot_locked = TRUE THEN
    -- Allow only status changes to terminal states
    IF NEW.status NOT IN ('in-progress', 'completed', 'cancelled') THEN
      RAISE EXCEPTION 'Cannot change status from % to % after dispatch started', OLD.status, NEW.status;
    END IF;

    -- Prevent facility modifications
    IF NEW.facility_ids IS DISTINCT FROM OLD.facility_ids THEN
      RAISE EXCEPTION 'Cannot modify facility_ids after dispatch started. Batch snapshot is locked.';
    END IF;

    -- Prevent vehicle changes
    IF NEW.vehicle_id IS DISTINCT FROM OLD.vehicle_id THEN
      RAISE EXCEPTION 'Cannot change vehicle after dispatch started. Batch snapshot is locked.';
    END IF;

    -- Prevent quantity changes
    IF NEW.total_quantity IS DISTINCT FROM OLD.total_quantity THEN
      RAISE EXCEPTION 'Cannot modify total_quantity after dispatch started. Batch snapshot is locked.';
    END IF;

    -- Prevent route changes
    IF NEW.optimized_route IS DISTINCT FROM OLD.optimized_route THEN
      RAISE EXCEPTION 'Cannot modify optimized_route after dispatch started. Batch snapshot is locked.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_batch_modifications_trigger ON public.delivery_batches;
CREATE TRIGGER prevent_batch_modifications_trigger
  BEFORE UPDATE ON public.delivery_batches
  FOR EACH ROW
  WHEN (OLD.is_snapshot_locked = TRUE)
  EXECUTE FUNCTION prevent_batch_modifications_after_lock();

-- Step 5: Create trigger to sync requisition status on batch completion
CREATE OR REPLACE FUNCTION sync_requisition_status_on_batch_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- When batch completes, mark associated requisitions as fulfilled
  IF NEW.status = 'completed' AND OLD.status = 'in-progress' THEN
    UPDATE public.requisitions
    SET status = 'fulfilled'
    WHERE batch_id = NEW.id
    AND status = 'in_transit';
  END IF;

  -- When batch is cancelled, release requisitions back to ready_for_dispatch
  IF NEW.status = 'cancelled' AND OLD.status IN ('planned', 'assigned') THEN
    UPDATE public.requisitions
    SET
      status = 'ready_for_dispatch',
      batch_id = NULL
    WHERE batch_id = NEW.id
    AND status = 'assigned_to_batch';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_requisition_status_trigger ON public.delivery_batches;
CREATE TRIGGER sync_requisition_status_trigger
  AFTER UPDATE OF status ON public.delivery_batches
  FOR EACH ROW
  EXECUTE FUNCTION sync_requisition_status_on_batch_complete();

-- Step 6: Create RPC functions for dispatch operations

-- Start dispatch (FleetOps dispatcher action)
CREATE OR REPLACE FUNCTION start_dispatch(p_batch_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT status INTO v_status
  FROM public.delivery_batches
  WHERE id = p_batch_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Batch not found: %', p_batch_id;
  END IF;

  IF v_status NOT IN ('planned', 'assigned') THEN
    RAISE EXCEPTION 'Cannot start dispatch: batch must be in planned or assigned state (current: %)', v_status;
  END IF;

  -- Check if driver is assigned
  IF NOT EXISTS (
    SELECT 1 FROM public.delivery_batches
    WHERE id = p_batch_id AND driver_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Cannot start dispatch: no driver assigned';
  END IF;

  -- Check if vehicle is assigned
  IF NOT EXISTS (
    SELECT 1 FROM public.delivery_batches
    WHERE id = p_batch_id AND vehicle_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Cannot start dispatch: no vehicle assigned';
  END IF;

  -- Transition to in-progress (trigger will lock snapshot)
  UPDATE public.delivery_batches
  SET
    status = 'in-progress',
    actual_start_time = NOW()
  WHERE id = p_batch_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Assign driver to batch (FleetOps dispatcher action)
CREATE OR REPLACE FUNCTION assign_driver_to_batch(
  p_batch_id UUID,
  p_driver_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_status TEXT;
  v_is_locked BOOLEAN;
BEGIN
  SELECT status, is_snapshot_locked INTO v_status, v_is_locked
  FROM public.delivery_batches
  WHERE id = p_batch_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Batch not found: %', p_batch_id;
  END IF;

  IF v_is_locked THEN
    RAISE EXCEPTION 'Cannot assign driver: batch is already dispatched';
  END IF;

  IF v_status NOT IN ('planned', 'assigned') THEN
    RAISE EXCEPTION 'Cannot assign driver: batch must be in planned or assigned state (current: %)', v_status;
  END IF;

  -- Validate driver exists
  IF NOT EXISTS (SELECT 1 FROM public.drivers WHERE id = p_driver_id) THEN
    RAISE EXCEPTION 'Driver not found: %', p_driver_id;
  END IF;

  -- Assign driver and update status
  UPDATE public.delivery_batches
  SET
    driver_id = p_driver_id,
    status = 'assigned'
  WHERE id = p_batch_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Complete dispatch (FleetOps/Mod4 action)
CREATE OR REPLACE FUNCTION complete_dispatch(p_batch_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT status INTO v_status
  FROM public.delivery_batches
  WHERE id = p_batch_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Batch not found: %', p_batch_id;
  END IF;

  IF v_status != 'in-progress' THEN
    RAISE EXCEPTION 'Cannot complete dispatch: batch must be in-progress (current: %)', v_status;
  END IF;

  -- Complete the batch (trigger will update requisitions)
  UPDATE public.delivery_batches
  SET
    status = 'completed',
    actual_end_time = NOW()
  WHERE id = p_batch_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create index for locked batches
CREATE INDEX IF NOT EXISTS idx_delivery_batches_locked
  ON public.delivery_batches(is_snapshot_locked) WHERE is_snapshot_locked = TRUE;

-- Step 8: Comments
COMMENT ON COLUMN public.delivery_batches.batch_snapshot IS
'Immutable JSON snapshot of batch state at dispatch start. Contains vehicle, driver, facilities, route, slot demand.';

COMMENT ON COLUMN public.delivery_batches.is_snapshot_locked IS
'TRUE once dispatch starts. Prevents modifications to batch contents.';

COMMENT ON FUNCTION start_dispatch IS
'Starts dispatch for a batch. Locks snapshot, assigns vehicle/driver check, transitions to in-progress.';

COMMENT ON FUNCTION assign_driver_to_batch IS
'Assigns a driver to a batch. Only allowed before dispatch starts.';

COMMENT ON FUNCTION complete_dispatch IS
'Completes a batch dispatch. Updates requisitions to fulfilled status.';
