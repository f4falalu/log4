-- Create items table for inventory management
CREATE TABLE IF NOT EXISTS public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  unit_pack VARCHAR(50),
  category VARCHAR(50) NOT NULL CHECK (category IN (
    'Tablet', 'Insertion', 'Capsule', 'Suspension', 'Syrup',
    'Injection', 'Intravenous', 'Oral Fluid', 'Opthal-Mics',
    'Cream', 'Extemporaneous', 'Consummable', 'Aerosol',
    'Vaccine', 'Powder', 'Device'
  )),
  weight_kg DECIMAL(10,3),
  volume_m3 DECIMAL(10,6),
  batch_number VARCHAR(50),
  mfg_date DATE,
  expiry_date DATE,
  store_address TEXT,
  lot_number VARCHAR(50),
  stock_on_hand INTEGER DEFAULT 0,
  unit_price DECIMAL(10,2) DEFAULT 0,
  warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_items_category ON public.items(category);
CREATE INDEX IF NOT EXISTS idx_items_warehouse ON public.items(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_items_expiry ON public.items(expiry_date);
CREATE INDEX IF NOT EXISTS idx_items_batch ON public.items(batch_number);
CREATE INDEX IF NOT EXISTS idx_items_serial ON public.items(serial_number);

-- Enable RLS
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Items are viewable by authenticated users"
  ON public.items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Items can be created by authenticated users"
  ON public.items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Items can be updated by authenticated users"
  ON public.items FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Items can be deleted by authenticated users"
  ON public.items FOR DELETE
  TO authenticated
  USING (true);

-- Add comment
COMMENT ON TABLE public.items IS 'Inventory items for storefront management';
