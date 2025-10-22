-- Create requisitions table for warehouse order requests
CREATE TABLE public.requisitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requisition_number TEXT NOT NULL UNIQUE,
  facility_id UUID NOT NULL,
  warehouse_id UUID NOT NULL,
  requested_by UUID NOT NULL,
  approved_by UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'fulfilled', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  requested_delivery_date DATE NOT NULL,
  notes TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  fulfilled_at TIMESTAMP WITH TIME ZONE
);

-- Create requisition_items table for line items
CREATE TABLE public.requisition_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requisition_id UUID NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL DEFAULT 'units',
  weight_kg NUMERIC,
  volume_m3 NUMERIC,
  temperature_required BOOLEAN DEFAULT false,
  handling_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisition_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for requisitions
CREATE POLICY "Authenticated users can view requisitions"
  ON public.requisitions FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Warehouse officers can manage requisitions"
  ON public.requisitions FOR ALL
  USING (
    has_role(auth.uid(), 'warehouse_officer') OR 
    has_role(auth.uid(), 'system_admin')
  );

CREATE POLICY "Users can create their own requisitions"
  ON public.requisitions FOR INSERT
  WITH CHECK (auth.uid() = requested_by);

-- RLS Policies for requisition_items
CREATE POLICY "Authenticated users can view requisition items"
  ON public.requisition_items FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Warehouse officers can manage requisition items"
  ON public.requisition_items FOR ALL
  USING (
    has_role(auth.uid(), 'warehouse_officer') OR 
    has_role(auth.uid(), 'system_admin')
  );

-- Create function to auto-update updated_at
CREATE TRIGGER update_requisitions_updated_at
  BEFORE UPDATE ON public.requisitions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_requisitions_facility ON public.requisitions(facility_id);
CREATE INDEX idx_requisitions_warehouse ON public.requisitions(warehouse_id);
CREATE INDEX idx_requisitions_status ON public.requisitions(status);
CREATE INDEX idx_requisition_items_requisition ON public.requisition_items(requisition_id);