-- =====================================================
-- RBAC Workflow State Guards
-- =====================================================
-- Adds permission-based validation to workflow state transitions
-- for requisitions, invoices, batches, and schedules.
--
-- This migration enhances existing state machines with RBAC enforcement,
-- ensuring users have the required permissions before transitioning states.
-- =====================================================

-- =====================================================
-- 1. REQUISITION WORKFLOW GUARDS
-- =====================================================
-- Enhances the existing requisition state machine with permission checks

CREATE OR REPLACE FUNCTION enforce_requisition_state_transitions()
RETURNS TRIGGER AS $$
DECLARE
  _user_id UUID;
BEGIN
  -- Get current user ID
  _user_id := auth.uid();

  -- Define valid transitions with permission checks
  -- pending → approved, rejected, cancelled
  IF OLD.status = 'pending' THEN
    IF NEW.status = 'approved' THEN
      -- Requires requisition.approve permission
      IF NOT has_permission(_user_id, 'requisition.approve') THEN
        RAISE EXCEPTION 'Permission denied: requisition.approve required to approve requisitions';
      END IF;
    ELSIF NEW.status = 'rejected' THEN
      -- Requires requisition.approve permission (to reject)
      IF NOT has_permission(_user_id, 'requisition.approve') THEN
        RAISE EXCEPTION 'Permission denied: requisition.approve required to reject requisitions';
      END IF;
    ELSIF NEW.status = 'cancelled' THEN
      -- Requires requisition.cancel permission OR is the creator
      IF NOT (has_permission(_user_id, 'requisition.cancel') OR NEW.requested_by = _user_id::text) THEN
        RAISE EXCEPTION 'Permission denied: requisition.cancel required or must be the creator';
      END IF;
    ELSE
      RAISE EXCEPTION 'Invalid state transition: pending can only transition to approved, rejected, or cancelled';
    END IF;

  -- approved → packaged (system only), rejected, cancelled
  ELSIF OLD.status = 'approved' THEN
    IF NEW.status = 'packaged' THEN
      -- System-only transition (auto-packaging)
      -- Allow if user has system.admin permission
      IF _user_id IS NOT NULL AND NOT has_permission(_user_id, 'system.admin') THEN
        RAISE EXCEPTION 'Invalid transition: packaged state is system-managed';
      END IF;
    ELSIF NEW.status = 'rejected' THEN
      IF NOT has_permission(_user_id, 'requisition.approve') THEN
        RAISE EXCEPTION 'Permission denied: requisition.approve required to reject approved requisitions';
      END IF;
    ELSIF NEW.status = 'cancelled' THEN
      IF NOT has_permission(_user_id, 'requisition.cancel') THEN
        RAISE EXCEPTION 'Permission denied: requisition.cancel required';
      END IF;
    ELSE
      RAISE EXCEPTION 'Invalid state transition: approved can only transition to packaged, rejected, or cancelled';
    END IF;

  -- packaged → ready_for_dispatch, cancelled
  ELSIF OLD.status = 'packaged' THEN
    IF NEW.status = 'ready_for_dispatch' THEN
      -- Requires requisition.dispatch permission
      IF NOT has_permission(_user_id, 'requisition.dispatch') THEN
        RAISE EXCEPTION 'Permission denied: requisition.dispatch required to mark as ready';
      END IF;
    ELSIF NEW.status = 'cancelled' THEN
      IF NOT has_permission(_user_id, 'requisition.cancel') THEN
        RAISE EXCEPTION 'Permission denied: requisition.cancel required';
      END IF;
    ELSE
      RAISE EXCEPTION 'Invalid state transition: packaged can only transition to ready_for_dispatch or cancelled';
    END IF;

  -- ready_for_dispatch → assigned_to_batch, cancelled
  ELSIF OLD.status = 'ready_for_dispatch' THEN
    IF NEW.status = 'assigned_to_batch' THEN
      -- Requires scheduler.plan permission
      IF NOT has_permission(_user_id, 'scheduler.plan') THEN
        RAISE EXCEPTION 'Permission denied: scheduler.plan required to assign to batch';
      END IF;
    ELSIF NEW.status = 'cancelled' THEN
      IF NOT has_permission(_user_id, 'requisition.cancel') THEN
        RAISE EXCEPTION 'Permission denied: requisition.cancel required';
      END IF;
    ELSE
      RAISE EXCEPTION 'Invalid state transition: ready_for_dispatch can only transition to assigned_to_batch or cancelled';
    END IF;

  -- assigned_to_batch → in_transit, ready_for_dispatch (rollback), cancelled
  ELSIF OLD.status = 'assigned_to_batch' THEN
    IF NEW.status = 'in_transit' THEN
      -- Requires batch.dispatch permission
      IF NOT has_permission(_user_id, 'batch.dispatch') THEN
        RAISE EXCEPTION 'Permission denied: batch.dispatch required to mark as in transit';
      END IF;
    ELSIF NEW.status = 'ready_for_dispatch' THEN
      -- Rollback - requires scheduler.plan permission
      IF NOT has_permission(_user_id, 'scheduler.plan') THEN
        RAISE EXCEPTION 'Permission denied: scheduler.plan required to unassign from batch';
      END IF;
    ELSIF NEW.status = 'cancelled' THEN
      IF NOT has_permission(_user_id, 'requisition.cancel') THEN
        RAISE EXCEPTION 'Permission denied: requisition.cancel required';
      END IF;
    ELSE
      RAISE EXCEPTION 'Invalid state transition: assigned_to_batch can only transition to in_transit, ready_for_dispatch, or cancelled';
    END IF;

  -- in_transit → fulfilled, partially_delivered, failed
  ELSIF OLD.status = 'in_transit' THEN
    IF NEW.status IN ('fulfilled', 'partially_delivered', 'failed') THEN
      -- Requires batch.complete permission
      IF NOT has_permission(_user_id, 'batch.complete') THEN
        RAISE EXCEPTION 'Permission denied: batch.complete required to complete delivery';
      END IF;
    ELSE
      RAISE EXCEPTION 'Invalid state transition: in_transit can only transition to fulfilled, partially_delivered, or failed';
    END IF;

  -- Terminal states cannot be changed
  ELSIF OLD.status IN ('fulfilled', 'partially_delivered', 'failed', 'rejected', 'cancelled') THEN
    -- Only system admins can modify terminal states (for corrections)
    IF NOT has_permission(_user_id, 'system.admin') THEN
      RAISE EXCEPTION 'Invalid state transition: terminal states cannot be changed';
    END IF;
  END IF;

  -- Set timestamps for state transitions (existing logic preserved)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- 2. INVOICE WORKFLOW GUARDS
-- =====================================================
-- Invoices state machine: draft → submitted → approved → paid → cancelled

-- Add status constraint to invoices if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'invoices_status_check'
  ) THEN
    ALTER TABLE public.invoices
    ADD CONSTRAINT invoices_status_check
    CHECK (status IN ('draft', 'submitted', 'approved', 'paid', 'cancelled', 'rejected'));
  END IF;
END $$;

-- Create invoice state transition function
CREATE OR REPLACE FUNCTION enforce_invoice_state_transitions()
RETURNS TRIGGER AS $$
DECLARE
  _user_id UUID;
BEGIN
  _user_id := auth.uid();

  -- If no old status (new record), allow any initial status
  IF OLD.status IS NULL THEN
    RETURN NEW;
  END IF;

  -- Draft → submitted, cancelled
  IF OLD.status = 'draft' THEN
    IF NEW.status = 'submitted' THEN
      -- Requires invoice.create permission
      IF NOT has_permission(_user_id, 'invoice.create') THEN
        RAISE EXCEPTION 'Permission denied: invoice.create required to submit invoices';
      END IF;
    ELSIF NEW.status = 'cancelled' THEN
      -- Creator or invoice.approve permission can cancel
      IF NOT (has_permission(_user_id, 'invoice.approve') OR NEW.created_by = _user_id::text) THEN
        RAISE EXCEPTION 'Permission denied: invoice.approve required or must be the creator';
      END IF;
    ELSE
      RAISE EXCEPTION 'Invalid state transition: draft can only transition to submitted or cancelled';
    END IF;

  -- Submitted → approved, rejected, cancelled
  ELSIF OLD.status = 'submitted' THEN
    IF NEW.status IN ('approved', 'rejected') THEN
      -- Requires invoice.approve permission
      IF NOT has_permission(_user_id, 'invoice.approve') THEN
        RAISE EXCEPTION 'Permission denied: invoice.approve required to approve/reject invoices';
      END IF;
    ELSIF NEW.status = 'cancelled' THEN
      IF NOT has_permission(_user_id, 'invoice.approve') THEN
        RAISE EXCEPTION 'Permission denied: invoice.approve required to cancel submitted invoices';
      END IF;
    ELSE
      RAISE EXCEPTION 'Invalid state transition: submitted can only transition to approved, rejected, or cancelled';
    END IF;

  -- Approved → paid, cancelled
  ELSIF OLD.status = 'approved' THEN
    IF NEW.status = 'paid' THEN
      -- Requires invoice.approve permission (for payment processing)
      IF NOT has_permission(_user_id, 'invoice.approve') THEN
        RAISE EXCEPTION 'Permission denied: invoice.approve required to mark as paid';
      END IF;
    ELSIF NEW.status = 'cancelled' THEN
      IF NOT has_permission(_user_id, 'invoice.approve') THEN
        RAISE EXCEPTION 'Permission denied: invoice.approve required to cancel approved invoices';
      END IF;
    ELSE
      RAISE EXCEPTION 'Invalid state transition: approved can only transition to paid or cancelled';
    END IF;

  -- Terminal states cannot be changed
  ELSIF OLD.status IN ('paid', 'cancelled', 'rejected') THEN
    IF NOT has_permission(_user_id, 'system.admin') THEN
      RAISE EXCEPTION 'Invalid state transition: terminal states cannot be changed';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for invoice state transitions
DROP TRIGGER IF EXISTS enforce_invoice_state_transitions_trigger ON public.invoices;
CREATE TRIGGER enforce_invoice_state_transitions_trigger
  BEFORE UPDATE OF status ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION enforce_invoice_state_transitions();


-- =====================================================
-- 3. DELIVERY BATCH WORKFLOW GUARDS
-- =====================================================
-- Batches: planned → assigned → in-progress → completed → cancelled

CREATE OR REPLACE FUNCTION enforce_batch_state_transitions()
RETURNS TRIGGER AS $$
DECLARE
  _user_id UUID;
BEGIN
  _user_id := auth.uid();

  -- Planned → assigned, cancelled
  IF OLD.status = 'planned' THEN
    IF NEW.status = 'assigned' THEN
      -- Requires batch.assign permission
      IF NOT has_permission(_user_id, 'batch.assign') THEN
        RAISE EXCEPTION 'Permission denied: batch.assign required to assign drivers';
      END IF;
    ELSIF NEW.status = 'cancelled' THEN
      IF NOT has_permission(_user_id, 'batch.cancel') THEN
        RAISE EXCEPTION 'Permission denied: batch.cancel required';
      END IF;
    ELSE
      RAISE EXCEPTION 'Invalid state transition: planned can only transition to assigned or cancelled';
    END IF;

  -- Assigned → in-progress, planned (rollback), cancelled
  ELSIF OLD.status = 'assigned' THEN
    IF NEW.status = 'in-progress' THEN
      -- Requires batch.dispatch permission
      IF NOT has_permission(_user_id, 'batch.dispatch') THEN
        RAISE EXCEPTION 'Permission denied: batch.dispatch required to start batch';
      END IF;
    ELSIF NEW.status = 'planned' THEN
      -- Rollback - requires batch.assign permission
      IF NOT has_permission(_user_id, 'batch.assign') THEN
        RAISE EXCEPTION 'Permission denied: batch.assign required to unassign driver';
      END IF;
    ELSIF NEW.status = 'cancelled' THEN
      IF NOT has_permission(_user_id, 'batch.cancel') THEN
        RAISE EXCEPTION 'Permission denied: batch.cancel required';
      END IF;
    ELSE
      RAISE EXCEPTION 'Invalid state transition: assigned can only transition to in-progress, planned, or cancelled';
    END IF;

  -- In-progress → completed, cancelled
  ELSIF OLD.status = 'in-progress' THEN
    IF NEW.status = 'completed' THEN
      -- Requires batch.complete permission
      IF NOT has_permission(_user_id, 'batch.complete') THEN
        RAISE EXCEPTION 'Permission denied: batch.complete required to complete batch';
      END IF;
    ELSIF NEW.status = 'cancelled' THEN
      -- Requires batch.cancel permission (emergency cancellation)
      IF NOT has_permission(_user_id, 'batch.cancel') THEN
        RAISE EXCEPTION 'Permission denied: batch.cancel required to cancel in-progress batch';
      END IF;
    ELSE
      RAISE EXCEPTION 'Invalid state transition: in-progress can only transition to completed or cancelled';
    END IF;

  -- Terminal states cannot be changed
  ELSIF OLD.status IN ('completed', 'cancelled') THEN
    IF NOT has_permission(_user_id, 'system.admin') THEN
      RAISE EXCEPTION 'Invalid state transition: terminal states cannot be changed';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for batch state transitions
DROP TRIGGER IF EXISTS enforce_batch_state_transitions_trigger ON public.delivery_batches;
CREATE TRIGGER enforce_batch_state_transitions_trigger
  BEFORE UPDATE OF status ON public.delivery_batches
  FOR EACH ROW
  EXECUTE FUNCTION enforce_batch_state_transitions();


-- =====================================================
-- 4. SCHEDULER BATCH WORKFLOW GUARDS
-- =====================================================
-- Scheduler batches: draft → ready → scheduled → published → cancelled

CREATE OR REPLACE FUNCTION enforce_scheduler_batch_state_transitions()
RETURNS TRIGGER AS $$
DECLARE
  _user_id UUID;
BEGIN
  _user_id := auth.uid();

  -- If no old status (new record), allow any initial status
  IF OLD.status IS NULL THEN
    RETURN NEW;
  END IF;

  -- Draft → ready, cancelled
  IF OLD.status = 'draft' THEN
    IF NEW.status = 'ready' THEN
      -- Requires scheduler.plan permission
      IF NOT has_permission(_user_id, 'scheduler.plan') THEN
        RAISE EXCEPTION 'Permission denied: scheduler.plan required to mark batch as ready';
      END IF;
    ELSIF NEW.status = 'cancelled' THEN
      IF NOT has_permission(_user_id, 'scheduler.plan') THEN
        RAISE EXCEPTION 'Permission denied: scheduler.plan required to cancel draft batches';
      END IF;
    ELSE
      RAISE EXCEPTION 'Invalid state transition: draft can only transition to ready or cancelled';
    END IF;

  -- Ready → scheduled, draft (rollback), cancelled
  ELSIF OLD.status = 'ready' THEN
    IF NEW.status = 'scheduled' THEN
      -- Requires scheduler.optimize permission
      IF NOT has_permission(_user_id, 'scheduler.optimize') THEN
        RAISE EXCEPTION 'Permission denied: scheduler.optimize required to schedule batches';
      END IF;
    ELSIF NEW.status = 'draft' THEN
      -- Rollback
      IF NOT has_permission(_user_id, 'scheduler.plan') THEN
        RAISE EXCEPTION 'Permission denied: scheduler.plan required to move back to draft';
      END IF;
    ELSIF NEW.status = 'cancelled' THEN
      IF NOT has_permission(_user_id, 'scheduler.plan') THEN
        RAISE EXCEPTION 'Permission denied: scheduler.plan required to cancel';
      END IF;
    ELSE
      RAISE EXCEPTION 'Invalid state transition: ready can only transition to scheduled, draft, or cancelled';
    END IF;

  -- Scheduled → published, ready (rollback), cancelled
  ELSIF OLD.status = 'scheduled' THEN
    IF NEW.status = 'published' THEN
      -- Requires scheduler.publish permission
      IF NOT has_permission(_user_id, 'scheduler.publish') THEN
        RAISE EXCEPTION 'Permission denied: scheduler.publish required to publish schedules';
      END IF;
    ELSIF NEW.status = 'ready' THEN
      -- Rollback
      IF NOT has_permission(_user_id, 'scheduler.optimize') THEN
        RAISE EXCEPTION 'Permission denied: scheduler.optimize required to unschedule';
      END IF;
    ELSIF NEW.status = 'cancelled' THEN
      IF NOT has_permission(_user_id, 'scheduler.plan') THEN
        RAISE EXCEPTION 'Permission denied: scheduler.plan required to cancel';
      END IF;
    ELSE
      RAISE EXCEPTION 'Invalid state transition: scheduled can only transition to published, ready, or cancelled';
    END IF;

  -- Published and cancelled are terminal states
  ELSIF OLD.status IN ('published', 'cancelled') THEN
    IF NOT has_permission(_user_id, 'system.admin') THEN
      RAISE EXCEPTION 'Invalid state transition: terminal states cannot be changed';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for scheduler batch state transitions
DROP TRIGGER IF EXISTS enforce_scheduler_batch_state_transitions_trigger ON public.scheduler_batches;
CREATE TRIGGER enforce_scheduler_batch_state_transitions_trigger
  BEFORE UPDATE OF status ON public.scheduler_batches
  FOR EACH ROW
  EXECUTE FUNCTION enforce_scheduler_batch_state_transitions();


-- =====================================================
-- 5. HELPER FUNCTIONS FOR CLIENT-SIDE VALIDATION
-- =====================================================

-- Function to check if a state transition is valid for a requisition
CREATE OR REPLACE FUNCTION can_transition_requisition_status(
  _requisition_id UUID,
  _new_status TEXT,
  _user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
DECLARE
  _current_status TEXT;
  _requested_by TEXT;
BEGIN
  SELECT status, requested_by INTO _current_status, _requested_by
  FROM requisitions WHERE id = _requisition_id;

  -- Apply the same logic as the trigger (simplified for boolean return)
  IF _current_status = 'pending' AND _new_status = 'approved' THEN
    RETURN has_permission(_user_id, 'requisition.approve');
  ELSIF _current_status = 'pending' AND _new_status = 'cancelled' THEN
    RETURN has_permission(_user_id, 'requisition.cancel') OR _requested_by = _user_id::text;
  -- ... (add other transitions as needed)
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get available next states for a requisition
CREATE OR REPLACE FUNCTION get_available_requisition_states(
  _requisition_id UUID,
  _user_id UUID DEFAULT auth.uid()
)
RETURNS TEXT[] AS $$
DECLARE
  _current_status TEXT;
  _available_states TEXT[] := ARRAY[]::TEXT[];
BEGIN
  SELECT status INTO _current_status
  FROM requisitions WHERE id = _requisition_id;

  -- Build list of available states based on current status and permissions
  IF _current_status = 'pending' THEN
    IF has_permission(_user_id, 'requisition.approve') THEN
      _available_states := _available_states || ARRAY['approved', 'rejected'];
    END IF;
    IF has_permission(_user_id, 'requisition.cancel') THEN
      _available_states := _available_states || 'cancelled';
    END IF;
  ELSIF _current_status = 'packaged' THEN
    IF has_permission(_user_id, 'requisition.dispatch') THEN
      _available_states := _available_states || 'ready_for_dispatch';
    END IF;
    IF has_permission(_user_id, 'requisition.cancel') THEN
      _available_states := _available_states || 'cancelled';
    END IF;
  -- ... (add other statuses as needed)
  END IF;

  RETURN _available_states;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION enforce_requisition_state_transitions() IS
'Enhanced requisition state machine with permission-based guards.
Requires: requisition.approve, requisition.dispatch, requisition.cancel, scheduler.plan, batch.dispatch, batch.complete';

COMMENT ON FUNCTION enforce_invoice_state_transitions() IS
'Invoice state machine with permission-based guards.
States: draft → submitted → approved → paid | rejected | cancelled
Requires: invoice.create, invoice.approve';

COMMENT ON FUNCTION enforce_batch_state_transitions() IS
'Delivery batch state machine with permission-based guards.
States: planned → assigned → in-progress → completed | cancelled
Requires: batch.assign, batch.dispatch, batch.complete, batch.cancel';

COMMENT ON FUNCTION enforce_scheduler_batch_state_transitions() IS
'Scheduler batch state machine with permission-based guards.
States: draft → ready → scheduled → published | cancelled
Requires: scheduler.plan, scheduler.optimize, scheduler.publish';
