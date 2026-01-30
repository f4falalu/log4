-- Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  ref_number VARCHAR(50),
  requisition_id UUID REFERENCES public.requisitions(id) ON DELETE SET NULL,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
  facility_id UUID NOT NULL REFERENCES public.facilities(id),
  status VARCHAR(30) DEFAULT 'draft' CHECK (status IN (
    'draft', 'ready', 'packaging_pending', 'packaged',
    'dispatched', 'completed', 'cancelled'
  )),
  total_weight_kg DECIMAL(10,3),
  total_volume_m3 DECIMAL(10,6),
  total_price DECIMAL(12,2) DEFAULT 0,
  packaging_required BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create invoice line items table
CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  serial_number VARCHAR(50),
  description TEXT NOT NULL,
  unit_pack VARCHAR(50),
  category VARCHAR(50),
  weight_kg DECIMAL(10,3),
  volume_m3 DECIMAL(10,6),
  batch_number VARCHAR(50),
  mfg_date DATE,
  expiry_date DATE,
  unit_price DECIMAL(10,2) DEFAULT 0,
  quantity INTEGER DEFAULT 1,
  total_price DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create invoice packaging table
CREATE TABLE IF NOT EXISTS public.invoice_packaging (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  packaging_mode VARCHAR(10) CHECK (packaging_mode IN ('box', 'bag')),
  total_packages INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create package items table
CREATE TABLE IF NOT EXISTS public.package_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  packaging_id UUID NOT NULL REFERENCES public.invoice_packaging(id) ON DELETE CASCADE,
  package_type VARCHAR(10) CHECK (package_type IN ('box', 'bag')),
  size VARCHAR(10) CHECK (size IN ('S', 'M', 'L')),
  package_number INTEGER,
  weight_kg DECIMAL(10,3),
  volume_m3 DECIMAL(10,6),
  item_ids UUID[] DEFAULT '{}'
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_warehouse ON public.invoices(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_invoices_facility ON public.invoices(facility_id);
CREATE INDEX IF NOT EXISTS idx_invoices_requisition ON public.invoices(requisition_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created ON public.invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice ON public.invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_item ON public.invoice_line_items(item_id);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_packaging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_items ENABLE ROW LEVEL SECURITY;

-- Create policies for invoices
CREATE POLICY "Invoices are viewable by authenticated users"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Invoices can be created by authenticated users"
  ON public.invoices FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Invoices can be updated by authenticated users"
  ON public.invoices FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Invoices can be deleted by authenticated users"
  ON public.invoices FOR DELETE
  TO authenticated
  USING (true);

-- Create policies for invoice_line_items
CREATE POLICY "Invoice line items are viewable by authenticated users"
  ON public.invoice_line_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Invoice line items can be created by authenticated users"
  ON public.invoice_line_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Invoice line items can be updated by authenticated users"
  ON public.invoice_line_items FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Invoice line items can be deleted by authenticated users"
  ON public.invoice_line_items FOR DELETE
  TO authenticated
  USING (true);

-- Create policies for invoice_packaging
CREATE POLICY "Invoice packaging is viewable by authenticated users"
  ON public.invoice_packaging FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Invoice packaging can be created by authenticated users"
  ON public.invoice_packaging FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Invoice packaging can be updated by authenticated users"
  ON public.invoice_packaging FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Invoice packaging can be deleted by authenticated users"
  ON public.invoice_packaging FOR DELETE
  TO authenticated
  USING (true);

-- Create policies for package_items
CREATE POLICY "Package items are viewable by authenticated users"
  ON public.package_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Package items can be created by authenticated users"
  ON public.package_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Package items can be updated by authenticated users"
  ON public.package_items FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Package items can be deleted by authenticated users"
  ON public.package_items FOR DELETE
  TO authenticated
  USING (true);

-- Add comments
COMMENT ON TABLE public.invoices IS 'Delivery invoices for storefront operations';
COMMENT ON TABLE public.invoice_line_items IS 'Line items for invoices';
COMMENT ON TABLE public.invoice_packaging IS 'Packaging configuration for invoices';
COMMENT ON TABLE public.package_items IS 'Individual packages with assigned items';
