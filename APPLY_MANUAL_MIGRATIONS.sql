-- =====================================================
-- Manual Migration Application Script
-- =====================================================
-- This script consolidates critical migrations that need to be applied manually
-- Run this in the Supabase SQL Editor

-- =====================================================
-- STEP 1: Enable Required Extensions
-- =====================================================

-- Enable PostGIS extension for geographic data support
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable pg_trgm for fuzzy text matching (trigram similarity)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enable unaccent for accent-insensitive text matching
CREATE EXTENSION IF NOT EXISTS unaccent;

-- =====================================================
-- STEP 2: Check if admin_units table exists
-- =====================================================
-- If this query returns 0, continue with the rest of the script
-- If it returns 1, skip to STEP 5 (vehicle migrations)

SELECT COUNT(*) as admin_units_exists
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'admin_units';

-- =====================================================
-- STEP 3: Country/Workspace/Admin Units Model
-- (Only run if admin_units doesn't exist)
-- =====================================================

-- Note: The full migration from 20251117000001_country_location_model.sql
-- should be read and applied separately if admin_units doesn't exist.
-- It's too large to include inline here.

-- =====================================================
-- STEP 4: Default Workspace Creation
-- (Only run if admin_units was just created)
-- =====================================================

-- Note: The full migration from 20251117000002_create_default_workspace.sql
-- should be read and applied separately if needed.

-- =====================================================
-- STEP 5: Vehicle Categories (EU Taxonomy)
-- =====================================================

-- Create vehicle_categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.vehicle_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_code VARCHAR(10) UNIQUE NOT NULL,
  category_name VARCHAR(100) NOT NULL,
  description TEXT,
  eu_regulatory_class VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS
ALTER TABLE public.vehicle_categories ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vehicle_categories' AND policyname = 'Anyone can view vehicle categories') THEN
    CREATE POLICY "Anyone can view vehicle categories"
      ON public.vehicle_categories FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vehicle_categories' AND policyname = 'Admins can manage vehicle categories') THEN
    CREATE POLICY "Admins can manage vehicle categories"
      ON public.vehicle_categories FOR ALL
      USING (public.has_role(auth.uid(), 'system_admin'::app_role));
  END IF;
END $$;

-- =====================================================
-- STEP 6: Vehicle Types (Operational Subtypes)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.vehicle_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.vehicle_categories(id) ON DELETE CASCADE,
  type_code VARCHAR(50) UNIQUE NOT NULL,
  type_name VARCHAR(200) NOT NULL,
  description TEXT,
  typical_models JSONB DEFAULT '[]'::jsonb,
  capacity_range JSONB,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.vehicle_types ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vehicle_types' AND policyname = 'Anyone can view vehicle types') THEN
    CREATE POLICY "Anyone can view vehicle types"
      ON public.vehicle_types FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vehicle_types' AND policyname = 'Admins can manage vehicle types') THEN
    CREATE POLICY "Admins can manage vehicle types"
      ON public.vehicle_types FOR ALL
      USING (public.has_role(auth.uid(), 'system_admin'::app_role));
  END IF;
END $$;

-- =====================================================
-- STEP 7: Vehicle Tiers (Capacity Normalization)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.vehicle_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  tier_number INTEGER NOT NULL CHECK (tier_number >= 1),
  tier_name VARCHAR(100),
  capacity DECIMAL(10, 2) NOT NULL CHECK (capacity > 0),
  max_weight DECIMAL(10, 2),
  dimensions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vehicle_id, tier_number)
);

ALTER TABLE public.vehicle_tiers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vehicle_tiers' AND policyname = 'Authenticated users can view vehicle tiers') THEN
    CREATE POLICY "Authenticated users can view vehicle tiers"
      ON public.vehicle_tiers FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vehicle_tiers' AND policyname = 'Admins can manage vehicle tiers') THEN
    CREATE POLICY "Admins can manage vehicle tiers"
      ON public.vehicle_tiers FOR ALL
      USING (public.has_role(auth.uid(), 'system_admin'::app_role));
  END IF;
END $$;

-- =====================================================
-- STEP 8: Add Missing Columns to Vehicles Table
-- =====================================================

-- Check which columns exist
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'vehicles'
ORDER BY ordinal_position;

-- Add columns one by one with IF NOT EXISTS checks
DO $$
BEGIN
  -- Basic Info
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'make') THEN
    ALTER TABLE public.vehicles ADD COLUMN make VARCHAR(100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'year') THEN
    ALTER TABLE public.vehicles ADD COLUMN year INTEGER CHECK (year >= 1900 AND year <= EXTRACT(YEAR FROM CURRENT_DATE) + 1);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'vin') THEN
    ALTER TABLE public.vehicles ADD COLUMN vin VARCHAR(17) UNIQUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'vehicle_id') THEN
    ALTER TABLE public.vehicles ADD COLUMN vehicle_id VARCHAR(50) UNIQUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'color') THEN
    ALTER TABLE public.vehicles ADD COLUMN color VARCHAR(50);
  END IF;

  -- Acquisition
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'acquisition_date') THEN
    ALTER TABLE public.vehicles ADD COLUMN acquisition_date DATE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'acquisition_type') THEN
    ALTER TABLE public.vehicles ADD COLUMN acquisition_type VARCHAR(50);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'purchase_price') THEN
    ALTER TABLE public.vehicles ADD COLUMN purchase_price DECIMAL(15, 2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'vendor_name') THEN
    ALTER TABLE public.vehicles ADD COLUMN vendor_name VARCHAR(255);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'warranty_expiry') THEN
    ALTER TABLE public.vehicles ADD COLUMN warranty_expiry DATE;
  END IF;

  -- Specifications
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'transmission') THEN
    ALTER TABLE public.vehicles ADD COLUMN transmission VARCHAR(50);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'seating_capacity') THEN
    ALTER TABLE public.vehicles ADD COLUMN seating_capacity INTEGER;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'engine_capacity') THEN
    ALTER TABLE public.vehicles ADD COLUMN engine_capacity DECIMAL(10, 2);
  END IF;

  -- Insurance/Registration
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'insurance_provider') THEN
    ALTER TABLE public.vehicles ADD COLUMN insurance_provider VARCHAR(255);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'insurance_policy_number') THEN
    ALTER TABLE public.vehicles ADD COLUMN insurance_policy_number VARCHAR(100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'insurance_expiry') THEN
    ALTER TABLE public.vehicles ADD COLUMN insurance_expiry DATE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'registration_expiry') THEN
    ALTER TABLE public.vehicles ADD COLUMN registration_expiry DATE;
  END IF;

  -- Status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'current_location_id') THEN
    ALTER TABLE public.vehicles ADD COLUMN current_location_id UUID REFERENCES public.facilities(id);
  END IF;

  -- Financial
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'depreciation_rate') THEN
    ALTER TABLE public.vehicles ADD COLUMN depreciation_rate DECIMAL(5, 2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'current_book_value') THEN
    ALTER TABLE public.vehicles ADD COLUMN current_book_value DECIMAL(15, 2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'total_maintenance_cost') THEN
    ALTER TABLE public.vehicles ADD COLUMN total_maintenance_cost DECIMAL(15, 2) DEFAULT 0;
  END IF;

  -- Service
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'current_mileage') THEN
    ALTER TABLE public.vehicles ADD COLUMN current_mileage DECIMAL(10, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'last_service_date') THEN
    ALTER TABLE public.vehicles ADD COLUMN last_service_date DATE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'next_service_date') THEN
    ALTER TABLE public.vehicles ADD COLUMN next_service_date DATE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'last_inspection_date') THEN
    ALTER TABLE public.vehicles ADD COLUMN last_inspection_date DATE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'next_inspection_date') THEN
    ALTER TABLE public.vehicles ADD COLUMN next_inspection_date DATE;
  END IF;

  -- Metadata
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'documents') THEN
    ALTER TABLE public.vehicles ADD COLUMN documents JSONB DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'photos') THEN
    ALTER TABLE public.vehicles ADD COLUMN photos JSONB DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'notes') THEN
    ALTER TABLE public.vehicles ADD COLUMN notes TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'tags') THEN
    ALTER TABLE public.vehicles ADD COLUMN tags TEXT[];
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'created_by') THEN
    ALTER TABLE public.vehicles ADD COLUMN created_by UUID REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'updated_by') THEN
    ALTER TABLE public.vehicles ADD COLUMN updated_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- =====================================================
-- STEP 9: Add license_plate Column with Sync Trigger
-- =====================================================

-- Add license_plate column
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'license_plate') THEN
    ALTER TABLE public.vehicles ADD COLUMN license_plate VARCHAR(20) UNIQUE;
  END IF;
END $$;

-- Create sync function
CREATE OR REPLACE FUNCTION public.sync_plate_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- If license_plate is set but plate_number is not, copy license_plate to plate_number
  IF NEW.license_plate IS NOT NULL AND NEW.plate_number IS NULL THEN
    NEW.plate_number := NEW.license_plate;
  END IF;

  -- If plate_number is set but license_plate is not, copy plate_number to license_plate
  IF NEW.plate_number IS NOT NULL AND NEW.license_plate IS NULL THEN
    NEW.license_plate := NEW.plate_number;
  END IF;

  -- If both are set but different, license_plate takes precedence
  IF NEW.license_plate IS NOT NULL AND NEW.plate_number IS NOT NULL AND NEW.license_plate != NEW.plate_number THEN
    NEW.plate_number := NEW.license_plate;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS sync_license_plate ON public.vehicles;
CREATE TRIGGER sync_license_plate
  BEFORE INSERT OR UPDATE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_plate_columns();

-- =====================================================
-- STEP 10: Verify Installation
-- =====================================================

-- Check extensions
SELECT extname, extversion FROM pg_extension WHERE extname IN ('postgis', 'pg_trgm', 'unaccent');

-- Check new tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('vehicle_categories', 'vehicle_types', 'vehicle_tiers')
ORDER BY table_name;

-- Check new columns in vehicles table
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'vehicles'
AND column_name IN ('make', 'year', 'vin', 'license_plate', 'acquisition_date', 'insurance_provider')
ORDER BY column_name;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Manual migrations applied successfully!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Regenerate TypeScript types: npx supabase gen types typescript --linked';
  RAISE NOTICE '2. Test VLMS onboarding wizard';
  RAISE NOTICE '3. Verify backward compatibility';
END $$;
