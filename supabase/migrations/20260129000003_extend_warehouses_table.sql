-- Extend warehouses table with additional columns for full-featured management
ALTER TABLE public.warehouses
ADD COLUMN IF NOT EXISTS storage_zones JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS total_capacity_m3 DECIMAL(12,3),
ADD COLUMN IF NOT EXISTS used_capacity_m3 DECIMAL(12,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS contact_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS contact_email VARCHAR(100),
ADD COLUMN IF NOT EXISTS operating_hours VARCHAR(100),
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS country VARCHAR(100),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Add comments for new columns
COMMENT ON COLUMN public.warehouses.storage_zones IS 'JSON array of storage zones with type, temperature range, and capacity';
COMMENT ON COLUMN public.warehouses.total_capacity_m3 IS 'Total storage capacity in cubic meters';
COMMENT ON COLUMN public.warehouses.used_capacity_m3 IS 'Currently used storage capacity in cubic meters';
COMMENT ON COLUMN public.warehouses.is_active IS 'Whether the warehouse is currently active and available';

-- Example storage_zones format:
-- [
--   {
--     "id": "uuid",
--     "name": "Cold Storage A",
--     "type": "cold",
--     "temp_range": "2-8°C",
--     "capacity_m3": 100,
--     "used_m3": 45
--   }
-- ]
