-- Comprehensive Facilities Management System Migration
-- Adds all 19 data points + related tables for services, deliveries, stock, and audit

-- =====================================================
-- PART 1: Extend facilities table with all 19 data points
-- =====================================================

-- Add new columns to existing facilities table
ALTER TABLE public.facilities
  ADD COLUMN IF NOT EXISTS warehouse_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS state TEXT NOT NULL DEFAULT 'kano',
  ADD COLUMN IF NOT EXISTS ip_name TEXT CHECK (ip_name IN ('smoh', 'ace-2', 'crs')),
  ADD COLUMN IF NOT EXISTS funding_source TEXT CHECK (funding_source IN ('unfpa', 'pepfar--usaid', 'global-fund')),
  ADD COLUMN IF NOT EXISTS programme TEXT CHECK (programme IN ('Family Planning', 'DRF', 'HIV/AIDS', 'Malaria')),
  ADD COLUMN IF NOT EXISTS pcr_service BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS cd4_service BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS type_of_service TEXT,
  ADD COLUMN IF NOT EXISTS service_zone TEXT,
  ADD COLUMN IF NOT EXISTS level_of_care TEXT CHECK (level_of_care IN ('Tertiary', 'Secondary', 'Primary')),
  ADD COLUMN IF NOT EXISTS lga TEXT,
  ADD COLUMN IF NOT EXISTS ward TEXT,
  ADD COLUMN IF NOT EXISTS contact_name_pharmacy TEXT,
  ADD COLUMN IF NOT EXISTS designation TEXT,
  ADD COLUMN IF NOT EXISTS phone_pharmacy TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS storage_capacity INTEGER,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- Update the type column constraint to match legacy data
ALTER TABLE public.facilities
  ALTER COLUMN type DROP NOT NULL,
  ALTER COLUMN type SET DEFAULT 'clinic';

-- =====================================================
-- PART 2: Create sequence for warehouse codes
-- =====================================================

CREATE SEQUENCE IF NOT EXISTS facility_sequence START 1;

-- Function to generate warehouse code
CREATE OR REPLACE FUNCTION generate_warehouse_code()
RETURNS TEXT AS $$
DECLARE
  next_seq INTEGER;
  zone_code TEXT;
  state_code TEXT := 'KAN'; -- Kano state code
BEGIN
  -- Get next sequence number
  next_seq := nextval('facility_sequence');

  -- Extract zone from service_zone (first 2 chars or default to '01')
  zone_code := COALESCE(SUBSTRING(NEW.service_zone FROM 1 FOR 2), '01');

  -- Format: PSM/KAN/ZONE/SEQ
  RETURN 'PSM/' || state_code || '/' || LPAD(zone_code, 2, '0') || '/' || LPAD(next_seq::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate warehouse_code if not provided
CREATE OR REPLACE FUNCTION set_warehouse_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.warehouse_code IS NULL THEN
    NEW.warehouse_code := generate_warehouse_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER facility_warehouse_code_trigger
  BEFORE INSERT ON public.facilities
  FOR EACH ROW
  EXECUTE FUNCTION set_warehouse_code();

-- =====================================================
-- PART 3: Create facility_services table (11 service types)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.facility_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL CHECK (service_name IN (
    'Medical Services',
    'Surgical Services',
    'Pediatrics Services',
    'Ambulance Services',
    'Special Clinical Services',
    'Obstetrics & Gynecology Services',
    'Dental Services',
    'Onsite Laboratory',
    'Mortuary Services',
    'Onsite Imaging',
    'Onsite Pharmacy'
  )),
  availability BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(facility_id, service_name)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_facility_services_facility_id ON public.facility_services(facility_id);

-- =====================================================
-- PART 4: Create facility_deliveries table (LMD tracking)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.facility_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
  delivery_date TIMESTAMPTZ NOT NULL,
  items_delivered INTEGER NOT NULL DEFAULT 0,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'delivered', 'failed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_facility_deliveries_facility_id ON public.facility_deliveries(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_deliveries_batch_id ON public.facility_deliveries(batch_id);
CREATE INDEX IF NOT EXISTS idx_facility_deliveries_date ON public.facility_deliveries(delivery_date DESC);

-- =====================================================
-- PART 5: Create facility_stock table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.facility_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.payloads(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT,
  last_updated TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(facility_id, product_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_facility_stock_facility_id ON public.facility_stock(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_stock_product_id ON public.facility_stock(product_id);

-- =====================================================
-- PART 6: Create facility_audit_log table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.facility_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID REFERENCES public.facilities(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'restored')),
  changes JSONB,
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for audit log
CREATE INDEX IF NOT EXISTS idx_facility_audit_facility_id ON public.facility_audit_log(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_audit_user_id ON public.facility_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_facility_audit_timestamp ON public.facility_audit_log(timestamp DESC);

-- =====================================================
-- PART 7: Create audit trigger for facilities
-- =====================================================

CREATE OR REPLACE FUNCTION log_facility_changes()
RETURNS TRIGGER AS $$
DECLARE
  changes_data JSONB;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    changes_data := to_jsonb(OLD);
    INSERT INTO public.facility_audit_log (facility_id, user_id, action, changes)
    VALUES (OLD.id, auth.uid(), 'deleted', changes_data);
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    changes_data := jsonb_build_object(
      'before', to_jsonb(OLD),
      'after', to_jsonb(NEW)
    );
    INSERT INTO public.facility_audit_log (facility_id, user_id, action, changes)
    VALUES (NEW.id, auth.uid(), 'updated', changes_data);
    NEW.updated_at := now();
    NEW.updated_by := auth.uid();
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    changes_data := to_jsonb(NEW);
    INSERT INTO public.facility_audit_log (facility_id, user_id, action, changes)
    VALUES (NEW.id, auth.uid(), 'created', changes_data);
    NEW.created_by := auth.uid();
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists and recreate
DROP TRIGGER IF EXISTS facility_audit_trigger ON public.facilities;
CREATE TRIGGER facility_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.facilities
  FOR EACH ROW
  EXECUTE FUNCTION log_facility_changes();

-- =====================================================
-- PART 8: Add updated_at triggers for related tables
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER facility_services_updated_at
  BEFORE UPDATE ON public.facility_services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER facility_deliveries_updated_at
  BEFORE UPDATE ON public.facility_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PART 9: Add composite indexes for common queries
-- =====================================================

-- Geographic queries
CREATE INDEX IF NOT EXISTS idx_facilities_location_compound ON public.facilities(state, lga, ward);
CREATE INDEX IF NOT EXISTS idx_facilities_coordinates ON public.facilities(lat, lng);

-- Warehouse code lookups
CREATE INDEX IF NOT EXISTS idx_facilities_warehouse_code ON public.facilities(warehouse_code) WHERE deleted_at IS NULL;

-- Service zone and level of care
CREATE INDEX IF NOT EXISTS idx_facilities_service_zone ON public.facilities(service_zone) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_facilities_level_of_care ON public.facilities(level_of_care) WHERE deleted_at IS NULL;

-- Programme and funding
CREATE INDEX IF NOT EXISTS idx_facilities_programme ON public.facilities(programme) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_facilities_funding_source ON public.facilities(funding_source) WHERE deleted_at IS NULL;

-- Full text search index for name and address
CREATE INDEX IF NOT EXISTS idx_facilities_name_trgm ON public.facilities USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_facilities_address_trgm ON public.facilities USING gin(address gin_trgm_ops);

-- =====================================================
-- PART 10: Enable Row Level Security (RLS)
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE public.facility_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_audit_log ENABLE ROW LEVEL SECURITY;

-- Policies for facility_services (same as facilities)
CREATE POLICY "Allow all operations on facility services"
  ON public.facility_services FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policies for facility_deliveries
CREATE POLICY "Allow all operations on facility deliveries"
  ON public.facility_deliveries FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policies for facility_stock
CREATE POLICY "Allow all operations on facility stock"
  ON public.facility_stock FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policies for facility_audit_log (read-only for most users)
CREATE POLICY "Allow read access to audit log"
  ON public.facility_audit_log FOR SELECT
  USING (true);

CREATE POLICY "Allow insert to audit log"
  ON public.facility_audit_log FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- PART 11: Enable Realtime for all tables
-- =====================================================

-- Enable realtime on facilities (if not already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE public.facilities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.facility_services;
ALTER PUBLICATION supabase_realtime ADD TABLE public.facility_deliveries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.facility_stock;

-- =====================================================
-- PART 12: Seed default services for existing facilities
-- =====================================================

-- Insert default 11 services for each existing facility
INSERT INTO public.facility_services (facility_id, service_name, availability)
SELECT
  f.id,
  s.service_name,
  false
FROM
  public.facilities f
CROSS JOIN (
  VALUES
    ('Medical Services'),
    ('Surgical Services'),
    ('Pediatrics Services'),
    ('Ambulance Services'),
    ('Special Clinical Services'),
    ('Obstetrics & Gynecology Services'),
    ('Dental Services'),
    ('Onsite Laboratory'),
    ('Mortuary Services'),
    ('Onsite Imaging'),
    ('Onsite Pharmacy')
) AS s(service_name)
ON CONFLICT (facility_id, service_name) DO NOTHING;

-- =====================================================
-- PART 13: Comments for documentation
-- =====================================================

COMMENT ON TABLE public.facility_services IS 'Tracks 11 service types availability for each facility';
COMMENT ON TABLE public.facility_deliveries IS 'Historic delivery tracking including Last Mile Delivery (LMD)';
COMMENT ON TABLE public.facility_stock IS 'Current stock levels for each facility';
COMMENT ON TABLE public.facility_audit_log IS 'Audit trail of all facility changes';
COMMENT ON COLUMN public.facilities.warehouse_code IS 'Unique identifier format: PSM/KAN/##/###';
COMMENT ON COLUMN public.facilities.deleted_at IS 'Soft delete timestamp';
