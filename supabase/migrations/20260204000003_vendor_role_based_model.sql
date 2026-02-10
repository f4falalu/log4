-- Migration: Vendor Role-Based Model
-- Purpose: Transform vendors from simple service providers to role-based organizational entities
-- Date: 2026-02-04
--
-- Key Changes:
-- 1. Add organization_type enum and field
-- 2. Add vendor_role enum and vendor_roles array field
-- 3. Add vendor_service enum and services_offered array field
-- 4. Add vendor_status enum and field
-- 5. Add structured address fields (country, state, lga)
-- 6. Add new primary contact fields (organization_lead_name, organization_lead_title, primary_email, primary_phone)
-- 7. Add operational metadata (onboarded_by, onboarded_at, internal_notes)
-- 8. Maintain backward compatibility with legacy fields

-- ============================================
-- STEP 1: Create Enums
-- ============================================

-- Organization Type Enum
DO $$ BEGIN
  CREATE TYPE organization_type AS ENUM (
    'government_agency',
    'ngo_ingo',
    'private_company',
    'logistics_provider',
    'healthcare_facility',
    'donor_development_partner',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Vendor Role Enum
DO $$ BEGIN
  CREATE TYPE vendor_role AS ENUM (
    'client',
    'partner',
    'service_vendor'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Vendor Service Enum
DO $$ BEGIN
  CREATE TYPE vendor_service AS ENUM (
    'fleet_vehicles',
    'drivers',
    'warehousing',
    'last_mile_delivery',
    'cold_chain_logistics',
    'maintenance_fuel',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Vendor Status Enum
DO $$ BEGIN
  CREATE TYPE vendor_status AS ENUM (
    'active',
    'suspended',
    'archived'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- STEP 2: Add New Columns to vendors Table
-- ============================================

-- Organization Type
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS organization_type organization_type;

-- Vendor Roles (array, required)
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS vendor_roles vendor_role[] NOT NULL DEFAULT ARRAY['service_vendor']::vendor_role[];

-- Vendor Status
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS vendor_status vendor_status DEFAULT 'active';

-- Structured Address
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS lga TEXT;

-- Primary Contact Information
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS organization_lead_name TEXT,
ADD COLUMN IF NOT EXISTS organization_lead_title TEXT,
ADD COLUMN IF NOT EXISTS primary_email TEXT,
ADD COLUMN IF NOT EXISTS primary_phone TEXT;

-- Services Offered
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS services_offered vendor_service[];

-- Operational Metadata
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS onboarded_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- ============================================
-- STEP 3: Migrate Existing Data
-- ============================================

-- Copy legacy contact fields to new primary contact fields
UPDATE vendors
SET
  organization_lead_name = contact_name,
  primary_email = email,
  primary_phone = contact_phone,
  onboarded_at = COALESCE(created_at, NOW()),
  vendor_status = 'active'
WHERE organization_lead_name IS NULL;

-- Set default organization_type based on heuristics (optional - can be left NULL for manual update)
-- This is a best-effort migration - admins should review and correct these
UPDATE vendors
SET organization_type = CASE
  WHEN name ILIKE '%ministry%' OR name ILIKE '%government%' THEN 'government_agency'::organization_type
  WHEN name ILIKE '%ngo%' OR name ILIKE '%ingo%' THEN 'ngo_ingo'::organization_type
  WHEN name ILIKE '%logistics%' OR name ILIKE '%transport%' THEN 'logistics_provider'::organization_type
  WHEN name ILIKE '%hospital%' OR name ILIKE '%clinic%' OR name ILIKE '%health%' THEN 'healthcare_facility'::organization_type
  ELSE 'other'::organization_type
END
WHERE organization_type IS NULL;

-- ============================================
-- STEP 4: Add Constraints and Indexes
-- ============================================

-- Ensure vendor_roles is not empty
ALTER TABLE vendors
ADD CONSTRAINT vendors_roles_not_empty
CHECK (array_length(vendor_roles, 1) > 0);

-- Ensure at least one contact method (email or phone)
ALTER TABLE vendors
ADD CONSTRAINT vendors_contact_required
CHECK (
  primary_email IS NOT NULL OR
  primary_phone IS NOT NULL OR
  email IS NOT NULL OR
  contact_phone IS NOT NULL
);

-- Conditional constraint: services_offered required if role includes service_vendor or partner
-- Note: This is enforced at application level in the validation schema
-- as PostgreSQL check constraints cannot reference array elements easily

-- Add indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_vendors_organization_type ON vendors(organization_type);
CREATE INDEX IF NOT EXISTS idx_vendors_vendor_roles ON vendors USING GIN(vendor_roles);
CREATE INDEX IF NOT EXISTS idx_vendors_vendor_status ON vendors(vendor_status);
CREATE INDEX IF NOT EXISTS idx_vendors_onboarded_by ON vendors(onboarded_by);

-- ============================================
-- STEP 5: Add Comments for Documentation
-- ============================================

COMMENT ON COLUMN vendors.organization_type IS 'Type of organization (e.g., government agency, NGO, private company)';
COMMENT ON COLUMN vendors.vendor_roles IS 'Roles this vendor can assume: client (receives services), partner (collaborates), service_vendor (provides services). Must have at least one role.';
COMMENT ON COLUMN vendors.vendor_status IS 'Current operational status: active, suspended, or archived';
COMMENT ON COLUMN vendors.country IS 'Country where vendor is based';
COMMENT ON COLUMN vendors.state IS 'State/Province where vendor is based';
COMMENT ON COLUMN vendors.lga IS 'Local Government Area where vendor is based';
COMMENT ON COLUMN vendors.organization_lead_name IS 'Name of the primary contact person for this organization';
COMMENT ON COLUMN vendors.organization_lead_title IS 'Title/Role of the organization lead (e.g., Director, CEO, Coordinator)';
COMMENT ON COLUMN vendors.primary_email IS 'Primary email contact for the organization';
COMMENT ON COLUMN vendors.primary_phone IS 'Primary phone contact for the organization';
COMMENT ON COLUMN vendors.services_offered IS 'Services this vendor provides (required if role includes service_vendor or partner)';
COMMENT ON COLUMN vendors.onboarded_at IS 'Timestamp when vendor was registered in the system';
COMMENT ON COLUMN vendors.onboarded_by IS 'User who registered this vendor';
COMMENT ON COLUMN vendors.internal_notes IS 'Internal notes and comments about this vendor (not visible to vendor)';
COMMENT ON COLUMN vendors.contact_name IS 'DEPRECATED: Use organization_lead_name instead. Kept for backward compatibility.';
COMMENT ON COLUMN vendors.email IS 'DEPRECATED: Use primary_email instead. Kept for backward compatibility.';
COMMENT ON COLUMN vendors.contact_phone IS 'DEPRECATED: Use primary_phone instead. Kept for backward compatibility.';

-- ============================================
-- STEP 6: Update RLS Policies (if needed)
-- ============================================

-- Ensure existing RLS policies work with new columns
-- Add any additional RLS policies here if needed

-- ============================================
-- STEP 7: Create Helper Functions (Optional)
-- ============================================

-- Function to check if vendor has a specific role
CREATE OR REPLACE FUNCTION vendor_has_role(vendor_roles vendor_role[], role vendor_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN role = ANY(vendor_roles);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION vendor_has_role IS 'Helper function to check if a vendor has a specific role';

-- ============================================
-- Migration Complete
-- ============================================

-- Summary:
-- - Added 4 new enums: organization_type, vendor_role, vendor_service, vendor_status
-- - Added 13 new columns to vendors table
-- - Migrated existing data from legacy fields to new fields
-- - Added constraints to ensure data integrity
-- - Added indexes for performance
-- - Maintained backward compatibility with legacy fields
-- - Created helper functions for role checking
--
-- Next Steps:
-- 1. Review migrated organization_type values and correct as needed
-- 2. Update vendor records to add appropriate vendor_roles for clients and partners
-- 3. Add services_offered for existing service vendors
-- 4. Consider deprecating legacy fields in future migration after UI fully adopts new fields
