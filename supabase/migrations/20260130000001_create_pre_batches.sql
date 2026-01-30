-- =====================================================
-- Unified Scheduler-Batch Workflow: Pre-Batches Table
-- =====================================================
-- Pre-batches serve as the handshake mechanism between
-- Storefront (scheduler) and FleetOps (batch) domains.
-- Created during Steps 1-2, converted to delivery_batch in Step 5.

-- Create the pre-batches table
CREATE TABLE IF NOT EXISTS public.scheduler_pre_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Source Selection (Step 1)
  source_method TEXT NOT NULL CHECK (source_method IN ('ready', 'upload', 'manual')),
  source_sub_option TEXT CHECK (source_sub_option IN ('manual_scheduling', 'ai_optimization')),

  -- Schedule Details (Step 2)
  schedule_title TEXT NOT NULL,
  start_location_id UUID NOT NULL,
  start_location_type TEXT NOT NULL CHECK (start_location_type IN ('warehouse', 'facility')),
  planned_date DATE NOT NULL,
  time_window TEXT CHECK (time_window IN ('morning', 'afternoon', 'evening', 'all_day')),

  -- Working Set (ordered facility list with requisition mapping)
  facility_order TEXT[] NOT NULL DEFAULT '{}',
  facility_requisition_map JSONB NOT NULL DEFAULT '{}',

  -- AI Optimization Options (if applicable)
  ai_optimization_options JSONB,

  -- Vehicle Suggestion (NOT commitment - just recommendation)
  suggested_vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,

  -- Workflow Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'converted', 'cancelled')),

  -- Reference to converted batch (set when batch is finalized)
  converted_batch_id UUID REFERENCES public.delivery_batches(id) ON DELETE SET NULL,

  -- Notes
  notes TEXT,

  -- Audit fields
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_pre_batches_workspace ON public.scheduler_pre_batches(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pre_batches_status ON public.scheduler_pre_batches(status);
CREATE INDEX IF NOT EXISTS idx_pre_batches_date ON public.scheduler_pre_batches(planned_date);
CREATE INDEX IF NOT EXISTS idx_pre_batches_created_by ON public.scheduler_pre_batches(created_by);
CREATE INDEX IF NOT EXISTS idx_pre_batches_created_at ON public.scheduler_pre_batches(created_at DESC);

-- Add columns to delivery_batches for unified workflow
ALTER TABLE public.delivery_batches
ADD COLUMN IF NOT EXISTS pre_batch_id UUID REFERENCES public.scheduler_pre_batches(id) ON DELETE SET NULL;

ALTER TABLE public.delivery_batches
ADD COLUMN IF NOT EXISTS slot_assignments JSONB DEFAULT '{}';

-- Create index for pre_batch reference
CREATE INDEX IF NOT EXISTS idx_delivery_batches_pre_batch
ON public.delivery_batches(pre_batch_id) WHERE pre_batch_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.scheduler_pre_batches ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop and recreate to be idempotent)
DROP POLICY IF EXISTS "Users can view their workspace's pre-batches" ON public.scheduler_pre_batches;
CREATE POLICY "Users can view their workspace's pre-batches"
ON public.scheduler_pre_batches FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can insert pre-batches for their workspace" ON public.scheduler_pre_batches;
CREATE POLICY "Users can insert pre-batches for their workspace"
ON public.scheduler_pre_batches FOR INSERT
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update their workspace's pre-batches" ON public.scheduler_pre_batches;
CREATE POLICY "Users can update their workspace's pre-batches"
ON public.scheduler_pre_batches FOR UPDATE
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete their workspace's pre-batches" ON public.scheduler_pre_batches;
CREATE POLICY "Users can delete their workspace's pre-batches"
ON public.scheduler_pre_batches FOR DELETE
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pre_batch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_pre_batch_updated_at ON public.scheduler_pre_batches;
CREATE TRIGGER trigger_pre_batch_updated_at
BEFORE UPDATE ON public.scheduler_pre_batches
FOR EACH ROW
EXECUTE FUNCTION update_pre_batch_updated_at();

-- Add comment for documentation
COMMENT ON TABLE public.scheduler_pre_batches IS
'Pre-batch records for unified scheduler-batch workflow. Created in Storefront (Steps 1-2), converted to delivery_batch in FleetOps (Step 5).';
