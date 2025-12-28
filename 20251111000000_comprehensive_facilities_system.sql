-- Comprehensive Facilities System Migration
-- Adds all missing columns and features for the facilities management system

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
  ADD COLUMN IF NOT EXISTS service_zone TEXT CHECK (service_zone IN ('Central', 'Gaya', 'Danbatta', 'Gwarzo', 'Rano')),
  ADD COLUMN IF NOT EXISTS level_of_care TEXT CHECK (level_of_care IN ('Tertiary', 'Secondary', 'Primary')),
  ADD COLUMN IF NOT EXISTS lga TEXT,
  ADD COLUMN IF NOT EXISTS ward TEXT,
  ADD COLUMN IF NOT EXISTS contact_name_pharmacy TEXT,
  ADD COLUMN IF NOT EXISTS designation TEXT,
  ADD COLUMN IF NOT EXISTS phone_pharmacy TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS storage_capacity INTEGER,
  ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES public.zones(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- Update the type column constraint to match legacy data
ALTER TABLE public.facilities
  ALTER COLUMN type DROP NOT NULL;

-- Function to generate warehouse code
CREATE OR REPLACE FUNCTION generate_warehouse_code(service_zone_param TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  zone_code TEXT;
  state_code TEXT := 'KAN'; -- Kano state code
  next_seq INTEGER;
BEGIN
  -- Get zone code based on service zone
  CASE LOWER(COALESCE(service_zone_param, ''))
    WHEN 'central' THEN zone_code := '01';
    WHEN 'gaya' THEN zone_code := '02';
    WHEN 'danbatta' THEN zone_code := '03';
    WHEN 'gwarzo' THEN zone_code := '04';
    WHEN 'rano' THEN zone_code := '05';
    ELSE zone_code := '99'; -- Default/unknown zone
  END CASE;

  -- Get next sequence number for this zone
  SELECT COALESCE(MAX(CAST(SUBSTRING(warehouse_code, 8, 3) AS INTEGER)), 0) + 1
  INTO next_seq
  FROM public.facilities
  WHERE warehouse_code LIKE state_code || '/' || zone_code || '/%'
    AND deleted_at IS NULL;

  -- Format: PSM/KAN/##/###
  RETURN 'PSM/' || state_code || '/' || LPAD(zone_code, 2, '0') || '/' || LPAD(next_seq::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate warehouse_code if not provided
CREATE OR REPLACE FUNCTION set_warehouse_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.warehouse_code IS NULL THEN
    NEW.warehouse_code := generate_warehouse_code(NEW.service_zone);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for warehouse code generation
DROP TRIGGER IF EXISTS facility_warehouse_code_trigger ON public.facilities;
CREATE TRIGGER facility_warehouse_code_trigger
  BEFORE INSERT ON public.facilities
  FOR EACH ROW
  EXECUTE FUNCTION set_warehouse_code();

-- Create facility_services table for service availability tracking
CREATE TABLE IF NOT EXISTS public.facility_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  availability BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(facility_id, service_name)
);

-- Create facility_deliveries table for delivery history
CREATE TABLE IF NOT EXISTS public.facility_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  delivery_date DATE NOT NULL,
  items_delivered JSONB,
  quantity INTEGER,
  batch_id UUID,
  driver_id UUID REFERENCES public.drivers(id),
  vehicle_id UUID REFERENCES public.vehicles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create facility_stock table for inventory tracking
CREATE TABLE IF NOT EXISTS public.facility_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  product_id UUID,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT,
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(facility_id, product_id)
);

-- Create facility_audit_log table for change tracking
CREATE TABLE IF NOT EXISTS public.facility_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
  old_values JSONB,
  new_values JSONB,
  changed_by UUID REFERENCES auth.users(id),
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.facility_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_audit_log ENABLE ROW LEVEL SECURITY;

-- Create permissive policies (can be tightened later with authentication)
CREATE POLICY "Allow all operations on facility_services" ON public.facility_services FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on facility_deliveries" ON public.facility_deliveries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on facility_stock" ON public.facility_stock FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on facility_audit_log" ON public.facility_audit_log FOR ALL USING (true) WITH CHECK (true);

-- Geographic queries
CREATE INDEX IF NOT EXISTS idx_facilities_location_compound ON public.facilities(state, lga, ward) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_facilities_coordinates ON public.facilities(lat, lng) WHERE deleted_at IS NULL;

-- Warehouse code lookups
CREATE INDEX IF NOT EXISTS idx_facilities_warehouse_code ON public.facilities(warehouse_code) WHERE deleted_at IS NULL;

-- Service zone and level of care
CREATE INDEX IF NOT EXISTS idx_facilities_service_zone ON public.facilities(service_zone) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_facilities_level_of_care ON public.facilities(level_of_care) WHERE deleted_at IS NULL;

-- Programme and funding
CREATE INDEX IF NOT EXISTS idx_facilities_programme ON public.facilities(programme) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_facilities_funding_source ON public.facilities(funding_source) WHERE deleted_at IS NULL;

-- Related tables
CREATE INDEX IF NOT EXISTS idx_facility_services_facility ON public.facility_services(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_deliveries_facility ON public.facility_deliveries(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_stock_facility ON public.facility_stock(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_audit_log_facility ON public.facility_audit_log(facility_id);

-- Function to populate default services for existing facilities
CREATE OR REPLACE FUNCTION populate_default_services()
RETURNS VOID AS $$
DECLARE
  facility_record RECORD;
  services TEXT[] := ARRAY[
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
  ];
BEGIN
  FOR facility_record IN SELECT id FROM public.facilities WHERE deleted_at IS NULL LOOP
    -- Insert default services if they don't exist
    INSERT INTO public.facility_services (facility_id, service_name, availability)
    SELECT facility_record.id, unnest(services), false
    ON CONFLICT (facility_id, service_name) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Populate default services for existing facilities
SELECT populate_default_services();

-- Function to create audit log entries
CREATE OR REPLACE FUNCTION create_facility_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.facility_audit_log (facility_id, action, new_values, changed_by)
    VALUES (NEW.id, 'created', row_to_json(NEW), NEW.created_by);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.facility_audit_log (facility_id, action, old_values, new_values, changed_by)
    VALUES (NEW.id, 'updated', row_to_json(OLD), row_to_json(NEW), NEW.updated_by);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.facility_audit_log (facility_id, action, old_values, changed_by)
    VALUES (OLD.id, 'deleted', row_to_json(OLD), OLD.deleted_by);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create audit trigger
DROP TRIGGER IF EXISTS facility_audit_trigger ON public.facilities;
CREATE TRIGGER facility_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.facilities
  FOR EACH ROW
  EXECUTE FUNCTION create_facility_audit_log();

-- Comments for documentation
COMMENT ON TABLE public.facilities IS 'Healthcare facilities with comprehensive metadata';
COMMENT ON COLUMN public.facilities.warehouse_code IS 'Unique identifier format: PSM/KAN/##/###';
COMMENT ON COLUMN public.facilities.deleted_at IS 'Soft delete timestamp';
COMMENT ON TABLE public.facility_services IS 'Available services at each facility';
COMMENT ON TABLE public.facility_deliveries IS 'Delivery history for each facility';
COMMENT ON TABLE public.facility_stock IS 'Current stock levels at facilities';
COMMENT ON TABLE public.facility_audit_log IS 'Audit trail of all facility changes';
