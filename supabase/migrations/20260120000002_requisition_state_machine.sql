-- =====================================================
-- RFC-012: Requisition State Machine Extension
-- =====================================================
-- Extends requisition statuses to support the complete workflow:
-- pending → approved → packaged → ready_for_dispatch → assigned_to_batch → in_transit → fulfilled/failed
--
-- This migration adds new states required for proper domain separation between
-- Storefront (demand & readiness) and FleetOps (planning & execution).
-- =====================================================

-- Step 1: Drop the existing check constraint on status
ALTER TABLE public.requisitions
DROP CONSTRAINT IF EXISTS requisitions_status_check;

-- Step 2: Add the extended status constraint with new states
ALTER TABLE public.requisitions
ADD CONSTRAINT requisitions_status_check
CHECK (status IN (
  'pending',             -- Initial submission, awaiting approval
  'approved',            -- Approved by warehouse officer
  'packaged',            -- Packaging computed (system-only, auto after approved)
  'ready_for_dispatch',  -- Ready for FleetOps to pick up
  'assigned_to_batch',   -- Assigned to a delivery batch
  'in_transit',          -- Batch is dispatched, delivery in progress
  'fulfilled',           -- Delivered successfully
  'partially_delivered', -- Some items delivered, variance recorded
  'failed',              -- Delivery failed
  'rejected',            -- Rejected by warehouse officer
  'cancelled'            -- Cancelled before dispatch
));

-- Step 3: Add new columns to requisitions for tracking batch assignment
ALTER TABLE public.requisitions
ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.delivery_batches(id),
ADD COLUMN IF NOT EXISTS packaged_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ready_for_dispatch_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS assigned_to_batch_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS in_transit_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- Step 4: Create index for batch assignment lookups
CREATE INDEX IF NOT EXISTS idx_requisitions_batch_id ON public.requisitions(batch_id);
CREATE INDEX IF NOT EXISTS idx_requisitions_ready_for_dispatch
  ON public.requisitions(status) WHERE status = 'ready_for_dispatch';

-- Step 5: Create function to enforce state transitions
CREATE OR REPLACE FUNCTION enforce_requisition_state_transitions()
RETURNS TRIGGER AS $$
BEGIN
  -- Define valid transitions
  -- pending → approved, rejected, cancelled
  -- approved → packaged (system only), rejected, cancelled
  -- packaged → ready_for_dispatch, cancelled
  -- ready_for_dispatch → assigned_to_batch, cancelled
  -- assigned_to_batch → in_transit, cancelled
  -- in_transit → fulfilled, partially_delivered, failed

  IF OLD.status = 'pending' THEN
    IF NEW.status NOT IN ('approved', 'rejected', 'cancelled') THEN
      RAISE EXCEPTION 'Invalid state transition: pending can only transition to approved, rejected, or cancelled';
    END IF;
  ELSIF OLD.status = 'approved' THEN
    IF NEW.status NOT IN ('packaged', 'rejected', 'cancelled') THEN
      RAISE EXCEPTION 'Invalid state transition: approved can only transition to packaged, rejected, or cancelled';
    END IF;
  ELSIF OLD.status = 'packaged' THEN
    IF NEW.status NOT IN ('ready_for_dispatch', 'cancelled') THEN
      RAISE EXCEPTION 'Invalid state transition: packaged can only transition to ready_for_dispatch or cancelled';
    END IF;
  ELSIF OLD.status = 'ready_for_dispatch' THEN
    IF NEW.status NOT IN ('assigned_to_batch', 'cancelled') THEN
      RAISE EXCEPTION 'Invalid state transition: ready_for_dispatch can only transition to assigned_to_batch or cancelled';
    END IF;
  ELSIF OLD.status = 'assigned_to_batch' THEN
    IF NEW.status NOT IN ('in_transit', 'ready_for_dispatch', 'cancelled') THEN
      RAISE EXCEPTION 'Invalid state transition: assigned_to_batch can only transition to in_transit, ready_for_dispatch (rollback), or cancelled';
    END IF;
  ELSIF OLD.status = 'in_transit' THEN
    IF NEW.status NOT IN ('fulfilled', 'partially_delivered', 'failed') THEN
      RAISE EXCEPTION 'Invalid state transition: in_transit can only transition to fulfilled, partially_delivered, or failed';
    END IF;
  ELSIF OLD.status IN ('fulfilled', 'partially_delivered', 'failed', 'rejected', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid state transition: terminal states cannot be changed';
  END IF;

  -- Set timestamps for state transitions
  IF NEW.status = 'packaged' AND OLD.status = 'approved' THEN
    NEW.packaged_at := NOW();
  ELSIF NEW.status = 'ready_for_dispatch' AND OLD.status = 'packaged' THEN
    NEW.ready_for_dispatch_at := NOW();
  ELSIF NEW.status = 'assigned_to_batch' AND OLD.status = 'ready_for_dispatch' THEN
    NEW.assigned_to_batch_at := NOW();
  ELSIF NEW.status = 'in_transit' AND OLD.status = 'assigned_to_batch' THEN
    NEW.in_transit_at := NOW();
  ELSIF NEW.status = 'fulfilled' AND OLD.status = 'in_transit' THEN
    NEW.fulfilled_at := NOW();
    NEW.delivered_at := NOW();
  ELSIF NEW.status = 'partially_delivered' AND OLD.status = 'in_transit' THEN
    NEW.delivered_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create trigger for state transition enforcement
DROP TRIGGER IF EXISTS enforce_requisition_state_transitions_trigger ON public.requisitions;
CREATE TRIGGER enforce_requisition_state_transitions_trigger
  BEFORE UPDATE OF status ON public.requisitions
  FOR EACH ROW
  EXECUTE FUNCTION enforce_requisition_state_transitions();

-- Step 7: Comment for documentation
COMMENT ON TABLE public.requisitions IS
'Requisitions represent demand from facilities. State machine:
- pending: Initial submission
- approved: Approved by warehouse officer (triggers auto-packaging)
- packaged: Packaging computed by system (immutable)
- ready_for_dispatch: Ready for FleetOps to plan batches
- assigned_to_batch: Assigned to a delivery batch
- in_transit: Batch dispatched, delivery in progress
- fulfilled/partially_delivered/failed: Terminal states
- rejected/cancelled: Termination states';
