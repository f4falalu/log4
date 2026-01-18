/**
 * Migration: Enhance Handoffs Governance
 *
 * Purpose: Add governance fields to handoffs table to enforce system-proposed-only trade-offs
 * Phase 5: Operational Map - Trade-Off Governance
 *
 * Changes:
 * 1. Add proposed_by field (must always be 'system')
 * 2. Add approved_by field (user who approved)
 * 3. Add approved_at timestamp
 * 4. Add approval_method ('ui' or 'api')
 * 5. Add rejection_reason for declined proposals
 * 6. Add constraint to enforce system-only proposals
 * 7. Add RLS policies for approval workflow
 * 8. Add indexes for audit queries
 */

-- Step 1: Add governance fields to handoffs table
ALTER TABLE handoffs
  ADD COLUMN IF NOT EXISTS proposed_by TEXT NOT NULL DEFAULT 'system'
    CHECK (proposed_by IN ('system', 'manual')),
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approval_method TEXT
    CHECK (approval_method IN ('ui', 'api')),
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Step 2: Add constraint to enforce system-only proposals
-- This is the CRITICAL governance rule: manual proposals are FORBIDDEN
ALTER TABLE handoffs
  ADD CONSTRAINT handoffs_system_only
  CHECK (proposed_by = 'system');

-- Step 3: Add column comments for documentation
COMMENT ON COLUMN handoffs.proposed_by IS
  'Must always be ''system'' - manual trade-off proposals are FORBIDDEN by governance rules';
COMMENT ON COLUMN handoffs.approved_by IS
  'User ID who approved the system-proposed trade-off';
COMMENT ON COLUMN handoffs.approved_at IS
  'Timestamp when the trade-off was approved by a human';
COMMENT ON COLUMN handoffs.approval_method IS
  'How the approval was submitted: ''ui'' (via map interface) or ''api'' (via programmatic call)';
COMMENT ON COLUMN handoffs.rejection_reason IS
  'If the human rejected the system proposal, this field contains the reason';

-- Step 4: Add indexes for performance on audit queries
CREATE INDEX IF NOT EXISTS idx_handoffs_proposed_by
  ON handoffs(proposed_by);

CREATE INDEX IF NOT EXISTS idx_handoffs_approved_by
  ON handoffs(approved_by);

CREATE INDEX IF NOT EXISTS idx_handoffs_approved_at
  ON handoffs(approved_at DESC);

CREATE INDEX IF NOT EXISTS idx_handoffs_status_approved_at
  ON handoffs(status, approved_at DESC);

-- Step 5: Update RLS policies to enforce governance

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view handoffs in their workspace" ON handoffs;
DROP POLICY IF EXISTS "Users can create system-proposed handoffs" ON handoffs;
DROP POLICY IF EXISTS "Users can approve system-proposed handoffs" ON handoffs;
DROP POLICY IF EXISTS "Users can reject system-proposed handoffs" ON handoffs;

-- Policy 1: View handoffs in workspace
CREATE POLICY "Users can view handoffs in their workspace" ON handoffs
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Policy 2: Create handoffs (SYSTEM ONLY - enforced by constraint)
-- This policy allows the system to create handoffs programmatically
-- The handoffs_system_only constraint ensures proposed_by = 'system'
CREATE POLICY "System can create handoffs" ON handoffs
  FOR INSERT
  WITH CHECK (
    proposed_by = 'system' AND
    workspace_id IN (
      SELECT workspace_id
      FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Policy 3: Approve system-proposed handoffs
-- Users can only approve proposals that are:
-- - System-proposed (enforced by constraint anyway)
-- - Pending approval (approved_by IS NULL)
-- - In their workspace
CREATE POLICY "Users can approve system-proposed handoffs" ON handoffs
  FOR UPDATE
  USING (
    proposed_by = 'system' AND
    approved_by IS NULL AND
    status = 'pending' AND
    workspace_id IN (
      SELECT workspace_id
      FROM workspace_members
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    proposed_by = 'system' AND
    approved_by = auth.uid()
  );

-- Policy 4: Reject system-proposed handoffs
-- Users can reject proposals by updating status to 'rejected' and adding rejection_reason
CREATE POLICY "Users can reject system-proposed handoffs" ON handoffs
  FOR UPDATE
  USING (
    proposed_by = 'system' AND
    approved_by IS NULL AND
    status = 'pending' AND
    workspace_id IN (
      SELECT workspace_id
      FROM workspace_members
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    proposed_by = 'system' AND
    status = 'rejected' AND
    rejection_reason IS NOT NULL
  );

-- Step 6: Create audit log function for handoff approvals
CREATE OR REPLACE FUNCTION log_handoff_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Log approval to audit trail
  IF NEW.approved_by IS NOT NULL AND OLD.approved_by IS NULL THEN
    INSERT INTO audit_logs (
      workspace_id,
      user_id,
      action,
      entity_type,
      entity_id,
      metadata,
      created_at
    ) VALUES (
      NEW.workspace_id,
      NEW.approved_by,
      'handoff_approved',
      'handoff',
      NEW.id,
      jsonb_build_object(
        'from_batch_id', NEW.from_batch_id,
        'to_batch_id', NEW.to_batch_id,
        'facility_id', NEW.facility_id,
        'approval_method', NEW.approval_method,
        'reason', NEW.reason
      ),
      NOW()
    );
  END IF;

  -- Log rejection to audit trail
  IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    INSERT INTO audit_logs (
      workspace_id,
      user_id,
      action,
      entity_type,
      entity_id,
      metadata,
      created_at
    ) VALUES (
      NEW.workspace_id,
      auth.uid(),
      'handoff_rejected',
      'handoff',
      NEW.id,
      jsonb_build_object(
        'from_batch_id', NEW.from_batch_id,
        'to_batch_id', NEW.to_batch_id,
        'facility_id', NEW.facility_id,
        'rejection_reason', NEW.rejection_reason,
        'reason', NEW.reason
      ),
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create trigger for handoff approval logging
DROP TRIGGER IF EXISTS handoff_approval_audit ON handoffs;

CREATE TRIGGER handoff_approval_audit
  AFTER UPDATE ON handoffs
  FOR EACH ROW
  WHEN (
    (NEW.approved_by IS NOT NULL AND OLD.approved_by IS NULL) OR
    (NEW.status = 'rejected' AND OLD.status != 'rejected')
  )
  EXECUTE FUNCTION log_handoff_approval();

-- Step 8: Create view for pending approvals
CREATE OR REPLACE VIEW pending_handoff_approvals AS
SELECT
  h.id,
  h.workspace_id,
  h.from_batch_id,
  h.to_batch_id,
  h.facility_id,
  h.reason,
  h.status,
  h.proposed_by,
  h.proposed_at,
  h.payload_item_ids,
  fb.name AS from_batch_name,
  tb.name AS to_batch_name,
  f.name AS facility_name,
  f.lat AS facility_lat,
  f.lng AS facility_lng,
  -- Time since proposal
  EXTRACT(EPOCH FROM (NOW() - h.proposed_at)) / 60 AS minutes_pending
FROM handoffs h
LEFT JOIN delivery_batches fb ON h.from_batch_id = fb.id
LEFT JOIN delivery_batches tb ON h.to_batch_id = tb.id
LEFT JOIN facilities f ON h.facility_id = f.id
WHERE h.status = 'pending'
  AND h.approved_by IS NULL
  AND h.proposed_by = 'system'
ORDER BY h.proposed_at ASC;

COMMENT ON VIEW pending_handoff_approvals IS
  'System-proposed trade-offs awaiting human approval';

-- Step 9: Grant permissions
GRANT SELECT ON pending_handoff_approvals TO authenticated;

-- Step 10: Backfill existing handoffs with default values
-- Mark all existing handoffs as system-proposed (if any exist)
UPDATE handoffs
SET proposed_by = 'system'
WHERE proposed_by IS NULL;

-- Migration complete
-- All handoffs are now governed by system-proposed-only constraint
