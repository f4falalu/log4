-- Update warehouses table to match form requirements
-- This migration adds missing columns and makes some fields optional that the form expects

-- First, make existing required fields optional to match form behavior
ALTER TABLE public.warehouses 
ALTER COLUMN address DROP NOT NULL,
ALTER COLUMN lat DROP NOT NULL,
ALTER COLUMN lng DROP NOT NULL,
ALTER COLUMN operating_hours DROP NOT NULL;

-- Add missing columns to warehouses table
ALTER TABLE public.warehouses 
ADD COLUMN IF NOT EXISTS code TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS contact_name TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT,
ADD COLUMN IF NOT EXISTS contact_email TEXT,
ADD COLUMN IF NOT EXISTS total_capacity_m3 DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS used_capacity_m3 DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS storage_zones JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Rename the old 'type' column to avoid conflicts with warehouse_type enum
ALTER TABLE public.warehouses RENAME COLUMN type TO warehouse_type_old;

-- Add new warehouse_type column as TEXT
ALTER TABLE public.warehouses 
ADD COLUMN IF NOT EXISTS warehouse_type TEXT DEFAULT 'zonal';

-- Copy data from old type column to new one
UPDATE public.warehouses 
SET warehouse_type = warehouse_type_old::TEXT 
WHERE warehouse_type_old IS NOT NULL;

-- Drop the old type column
ALTER TABLE public.warehouses DROP COLUMN IF EXISTS warehouse_type_old;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_warehouses_code ON public.warehouses(code);
CREATE INDEX IF NOT EXISTS idx_warehouses_state ON public.warehouses(state);
CREATE INDEX IF NOT EXISTS idx_warehouses_is_active ON public.warehouses(is_active);

-- Add comments
COMMENT ON COLUMN public.warehouses.code IS 'Unique warehouse identifier (e.g., WH-001)';
COMMENT ON COLUMN public.warehouses.city IS 'City where warehouse is located';
COMMENT ON COLUMN public.warehouses.state IS 'State/region where warehouse is located';
COMMENT ON COLUMN public.warehouses.country IS 'Country where warehouse is located';
COMMENT ON COLUMN public.warehouses.contact_name IS 'Name of contact person';
COMMENT ON COLUMN public.warehouses.contact_phone IS 'Phone number for contact';
COMMENT ON COLUMN public.warehouses.contact_email IS 'Email for contact';
COMMENT ON COLUMN public.warehouses.total_capacity_m3 IS 'Total storage capacity in cubic meters';
COMMENT ON COLUMN public.warehouses.used_capacity_m3 IS 'Currently used capacity in cubic meters';
COMMENT ON COLUMN public.warehouses.storage_zones IS 'JSON array of storage zones';
COMMENT ON COLUMN public.warehouses.is_active IS 'Whether warehouse is active for operations';
COMMENT ON COLUMN public.warehouses.created_by IS 'User who created this warehouse';
COMMENT ON COLUMN public.warehouses.warehouse_type IS 'Type of warehouse (zonal, regional, etc.)';
