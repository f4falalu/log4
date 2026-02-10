-- ===========================================================================
-- REPAIR MIGRATION: Missing columns from 20251111000000 & 20251111000001
-- ===========================================================================
-- Migrations 20251111000000 and 20251111000001 were marked as applied
-- but their SQL was not executed. This migration applies the missing DDL.
-- All statements use IF NOT EXISTS / IF EXISTS for safe re-runs.
-- ===========================================================================

-- ===========================================================================
-- PART 1: Add missing columns to facilities (from 20251111000000)
-- ===========================================================================

ALTER TABLE public.facilities
  ADD COLUMN IF NOT EXISTS warehouse_code TEXT,
  ADD COLUMN IF NOT EXISTS ip_name TEXT,
  ADD COLUMN IF NOT EXISTS funding_source TEXT,
  ADD COLUMN IF NOT EXISTS programme TEXT,
  ADD COLUMN IF NOT EXISTS pcr_service BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS cd4_service BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS type_of_service TEXT,
  ADD COLUMN IF NOT EXISTS service_zone TEXT,
  ADD COLUMN IF NOT EXISTS level_of_care TEXT,
  ADD COLUMN IF NOT EXISTS contact_name_pharmacy TEXT,
  ADD COLUMN IF NOT EXISTS designation TEXT,
  ADD COLUMN IF NOT EXISTS phone_pharmacy TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS storage_capacity INTEGER,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- Add unique constraint on warehouse_code (skip if exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'facilities_warehouse_code_key'
  ) THEN
    -- Only add unique if no duplicates exist
    IF (SELECT COUNT(*) FROM (SELECT warehouse_code FROM public.facilities WHERE warehouse_code IS NOT NULL GROUP BY warehouse_code HAVING COUNT(*) > 1) dup) = 0 THEN
      ALTER TABLE public.facilities ADD CONSTRAINT facilities_warehouse_code_key UNIQUE (warehouse_code);
    END IF;
  END IF;
END $$;

-- Create index on deleted_at for soft-delete queries
CREATE INDEX IF NOT EXISTS idx_facilities_deleted_at ON public.facilities(deleted_at) WHERE deleted_at IS NULL;

-- ===========================================================================
-- PART 2: Create facility_services table (from 20251111000000)
-- ===========================================================================

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

CREATE INDEX IF NOT EXISTS idx_facility_services_facility ON public.facility_services(facility_id);

ALTER TABLE public.facility_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on facility_services" ON public.facility_services;
CREATE POLICY "Allow all operations on facility_services"
  ON public.facility_services FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ===========================================================================
-- PART 3: Create facility_deliveries table (from 20251111000000)
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.facility_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  delivery_date TIMESTAMPTZ NOT NULL,
  batch_id UUID,
  items_delivered INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_facility_deliveries_facility ON public.facility_deliveries(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_deliveries_date ON public.facility_deliveries(delivery_date DESC);

ALTER TABLE public.facility_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on facility_deliveries" ON public.facility_deliveries;
CREATE POLICY "Allow all operations on facility_deliveries"
  ON public.facility_deliveries FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ===========================================================================
-- PART 4: Create facility_stock table (from 20251111000000)
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.facility_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  product_id UUID,
  product_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 0,
  unit TEXT DEFAULT 'units',
  min_stock_level INTEGER,
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_facility_stock_facility ON public.facility_stock(facility_id);

ALTER TABLE public.facility_stock ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on facility_stock" ON public.facility_stock;
CREATE POLICY "Allow all operations on facility_stock"
  ON public.facility_stock FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ===========================================================================
-- PART 5: Create facility_audit_log table (from 20251111000000)
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.facility_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  performed_by UUID REFERENCES auth.users(id),
  details JSONB,
  timestamp TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_facility_audit_log_facility ON public.facility_audit_log(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_audit_log_timestamp ON public.facility_audit_log(timestamp DESC);

ALTER TABLE public.facility_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on facility_audit_log" ON public.facility_audit_log;
CREATE POLICY "Allow all operations on facility_audit_log"
  ON public.facility_audit_log FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ===========================================================================
-- PART 6: Create lgas table (from 20251111000001)
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.lgas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  zone_id UUID REFERENCES public.zones(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
  state TEXT DEFAULT 'kano',
  population INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lgas_zone_id ON public.lgas(zone_id);
CREATE INDEX IF NOT EXISTS idx_lgas_warehouse_id ON public.lgas(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_lgas_state ON public.lgas(state);
CREATE INDEX IF NOT EXISTS idx_lgas_name ON public.lgas(name);

ALTER TABLE public.lgas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on lgas" ON public.lgas;
CREATE POLICY "Allow all operations on lgas"
  ON public.lgas FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add zone_id to facilities if missing
ALTER TABLE public.facilities
  ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES public.zones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_facilities_zone_id ON public.facilities(zone_id);

-- ===========================================================================
-- PART 7: Add missing FK on requisitions for PostgREST joins
-- ===========================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'requisitions_facility_id_fkey'
  ) THEN
    ALTER TABLE public.requisitions
      ADD CONSTRAINT requisitions_facility_id_fkey
      FOREIGN KEY (facility_id) REFERENCES public.facilities(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'requisitions_warehouse_id_fkey'
  ) THEN
    ALTER TABLE public.requisitions
      ADD CONSTRAINT requisitions_warehouse_id_fkey
      FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);
  END IF;
END $$;

-- ===========================================================================
-- PART 8: Seed default LGAs
-- ===========================================================================

-- Seed LGAs linked to the first operational zone (if one exists)
INSERT INTO public.lgas (name, zone_id, state)
SELECT name, zone_id, 'kano'
FROM (
  VALUES ('Dala'), ('Tarauni'), ('Nassarawa'), ('Gwale')
) AS seed(name)
CROSS JOIN (
  SELECT id AS zone_id FROM public.zones WHERE is_active = true ORDER BY created_at LIMIT 1
) z
WHERE NOT EXISTS (
  SELECT 1 FROM public.lgas WHERE lgas.name = seed.name AND lgas.state = 'kano'
);

-- ===========================================================================
-- END OF REPAIR MIGRATION
-- ===========================================================================
