-- Create schedule_batches table for detailed batch tracking
CREATE TABLE IF NOT EXISTS public.schedule_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES public.delivery_schedules(id) ON DELETE CASCADE,
  batch_name TEXT NOT NULL,
  facility_ids UUID[] NOT NULL,
  driver_id UUID REFERENCES public.drivers(id),
  vehicle_id UUID REFERENCES public.vehicles(id),
  sequence INTEGER NOT NULL DEFAULT 1,
  estimated_distance NUMERIC(8,2),
  estimated_duration INTEGER,
  capacity_used_pct NUMERIC(5,2),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'dispatched', 'completed')),
  route_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create upload_validations table for Excel upload tracking
CREATE TABLE IF NOT EXISTS public.upload_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by UUID REFERENCES public.profiles(id),
  file_name TEXT NOT NULL,
  parsed_data JSONB NOT NULL,
  validation_errors JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.schedule_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_validations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for schedule_batches
CREATE POLICY "Authenticated users can view schedule batches"
  ON public.schedule_batches FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Warehouse officers can manage schedule batches"
  ON public.schedule_batches FOR ALL
  USING (has_role(auth.uid(), 'warehouse_officer'::app_role) OR has_role(auth.uid(), 'system_admin'::app_role));

-- RLS Policies for upload_validations
CREATE POLICY "Users can view their own uploads"
  ON public.upload_validations FOR SELECT
  USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can create uploads"
  ON public.upload_validations FOR INSERT
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Warehouse officers can view all uploads"
  ON public.upload_validations FOR SELECT
  USING (has_role(auth.uid(), 'warehouse_officer'::app_role) OR has_role(auth.uid(), 'system_admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_schedule_batches_updated_at
  BEFORE UPDATE ON public.schedule_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_schedule_batches_schedule_id ON public.schedule_batches(schedule_id);
CREATE INDEX idx_schedule_batches_status ON public.schedule_batches(status);
CREATE INDEX idx_upload_validations_uploaded_by ON public.upload_validations(uploaded_by);
CREATE INDEX idx_upload_validations_status ON public.upload_validations(status);