-- Migration: Fix Driver Extended Fields
-- Created: 2026-03-10
-- Description: Properly add extended fields to drivers table (fixing syntax error from previous migration)

-- ============================================================================
-- Add extended fields to drivers table (one column at a time)
-- ============================================================================

ALTER TABLE drivers ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS address_line2 TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS state_province VARCHAR(100);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Nigeria';
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(50);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS license_number VARCHAR(100);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS license_state VARCHAR(100);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS license_expiry DATE;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS employment_type VARCHAR(50) DEFAULT 'full-time';
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS position VARCHAR(100) DEFAULT 'Driver';
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS employer VARCHAR(255) DEFAULT 'BIKO Logistics';
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS group_name VARCHAR(100);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS documents_complete BOOLEAN DEFAULT false;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS preferred_services VARCHAR(255);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS federal_id VARCHAR(50);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS license_verified BOOLEAN DEFAULT false;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS performance_score NUMERIC(3, 2);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS total_deliveries INTEGER DEFAULT 0;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS on_time_percentage NUMERIC(5, 2) DEFAULT 100;

-- Add comments for documentation
COMMENT ON COLUMN drivers.email IS 'Driver email address for communication';
COMMENT ON COLUMN drivers.documents_complete IS 'Flag indicating if all required documents have been uploaded';
COMMENT ON COLUMN drivers.profile_photo_url IS 'URL to driver profile photo in storage';
COMMENT ON COLUMN drivers.onboarding_completed IS 'Flag indicating if driver onboarding is complete';
COMMENT ON COLUMN drivers.license_verified IS 'Flag indicating if driver license has been verified';
COMMENT ON COLUMN drivers.location_updated_at IS 'Timestamp of last location update';
COMMENT ON COLUMN drivers.performance_score IS 'Driver performance score (0-5)';
COMMENT ON COLUMN drivers.total_deliveries IS 'Total number of deliveries completed';
COMMENT ON COLUMN drivers.on_time_percentage IS 'Percentage of on-time deliveries';
