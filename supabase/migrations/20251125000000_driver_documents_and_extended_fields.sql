-- Migration: Driver Documents and Extended Fields
-- Created: 2025-11-25
-- Description: Add driver_documents table and extend drivers table with additional fields for comprehensive driver management

-- ============================================================================
-- PART 1: Extend drivers table with additional fields
-- ============================================================================

ALTER TABLE drivers ADD COLUMN IF NOT EXISTS
  email VARCHAR(255),
  address_line1 TEXT,
  address_line2 TEXT,
  city VARCHAR(100),
  state_province VARCHAR(100),
  country VARCHAR(100) DEFAULT 'United States',
  postal_code VARCHAR(20),
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(50),
  license_number VARCHAR(100),
  license_state VARCHAR(100),
  employment_type VARCHAR(50) DEFAULT 'full-time',
  position VARCHAR(100) DEFAULT 'Driver',
  employer VARCHAR(255) DEFAULT 'BIKO Logistics',
  group_name VARCHAR(100),
  start_date DATE,
  profile_photo_url TEXT,
  documents_complete BOOLEAN DEFAULT false,
  date_of_birth DATE,
  middle_name VARCHAR(100),
  preferred_services VARCHAR(255),
  federal_id VARCHAR(50);

-- Add comment for documentation
COMMENT ON COLUMN drivers.email IS 'Driver email address for communication';
COMMENT ON COLUMN drivers.documents_complete IS 'Flag indicating if all required documents have been uploaded';
COMMENT ON COLUMN drivers.profile_photo_url IS 'URL to driver profile photo in storage';

-- ============================================================================
-- PART 2: Create driver_documents table
-- ============================================================================

CREATE TABLE IF NOT EXISTS driver_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  expiry_date DATE,
  upload_date TIMESTAMPTZ DEFAULT now(),
  uploaded_by UUID REFERENCES profiles(id),
  status VARCHAR(20) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT valid_document_type CHECK (document_type IN (
    'profile_photo',
    'drivers_license_front',
    'drivers_license_back',
    'medical_certificate',
    'background_check',
    'twic_card',
    'commercial_insurance',
    'other'
  )),

  CONSTRAINT valid_status CHECK (status IN (
    'pending',
    'approved',
    'rejected',
    'expired'
  ))
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_driver_documents_driver_id ON driver_documents(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_documents_type ON driver_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_driver_documents_status ON driver_documents(status);
CREATE INDEX IF NOT EXISTS idx_driver_documents_expiry ON driver_documents(expiry_date);

-- Add comments
COMMENT ON TABLE driver_documents IS 'Stores all documents related to drivers (licenses, certificates, etc.)';
COMMENT ON COLUMN driver_documents.document_type IS 'Type of document (license, medical cert, etc.)';
COMMENT ON COLUMN driver_documents.status IS 'Approval status of the document';
COMMENT ON COLUMN driver_documents.expiry_date IS 'Expiration date for time-sensitive documents';

-- ============================================================================
-- PART 3: Create updated_at trigger for driver_documents
-- ============================================================================

CREATE OR REPLACE FUNCTION update_driver_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER driver_documents_updated_at
  BEFORE UPDATE ON driver_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_driver_documents_updated_at();

-- ============================================================================
-- PART 4: Create function to check document completeness
-- ============================================================================

CREATE OR REPLACE FUNCTION check_driver_documents_complete(p_driver_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  required_docs TEXT[] := ARRAY['drivers_license_front', 'medical_certificate'];
  missing_count INTEGER;
BEGIN
  -- Count how many required documents are missing or not approved
  SELECT COUNT(*)
  INTO missing_count
  FROM unnest(required_docs) AS required_doc
  WHERE NOT EXISTS (
    SELECT 1
    FROM driver_documents
    WHERE driver_id = p_driver_id
      AND document_type = required_doc
      AND status = 'approved'
  );

  -- Return true if no required documents are missing
  RETURN missing_count = 0;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 5: Create trigger to auto-update documents_complete flag
-- ============================================================================

CREATE OR REPLACE FUNCTION update_driver_documents_complete_flag()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the driver's documents_complete flag
  UPDATE drivers
  SET documents_complete = check_driver_documents_complete(NEW.driver_id)
  WHERE id = NEW.driver_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER driver_documents_completion_check
  AFTER INSERT OR UPDATE OR DELETE ON driver_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_driver_documents_complete_flag();

-- ============================================================================
-- PART 6: Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE driver_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view documents for drivers they have access to
CREATE POLICY "Users can view driver documents"
  ON driver_documents
  FOR SELECT
  USING (true); -- Adjust based on your auth requirements

-- Policy: Authenticated users can insert documents
CREATE POLICY "Authenticated users can insert driver documents"
  ON driver_documents
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: Users can update documents they uploaded or all if admin
CREATE POLICY "Users can update driver documents"
  ON driver_documents
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Policy: Users can delete documents they uploaded or all if admin
CREATE POLICY "Users can delete driver documents"
  ON driver_documents
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- PART 7: Create view for drivers with document status
-- ============================================================================

CREATE OR REPLACE VIEW drivers_with_document_status AS
SELECT
  d.*,
  COALESCE(doc_counts.total_documents, 0) AS total_documents,
  COALESCE(doc_counts.approved_documents, 0) AS approved_documents,
  COALESCE(doc_counts.pending_documents, 0) AS pending_documents,
  COALESCE(doc_counts.expired_documents, 0) AS expired_documents
FROM drivers d
LEFT JOIN (
  SELECT
    driver_id,
    COUNT(*) AS total_documents,
    COUNT(*) FILTER (WHERE status = 'approved') AS approved_documents,
    COUNT(*) FILTER (WHERE status = 'pending') AS pending_documents,
    COUNT(*) FILTER (WHERE status = 'expired' OR (expiry_date IS NOT NULL AND expiry_date < CURRENT_DATE)) AS expired_documents
  FROM driver_documents
  GROUP BY driver_id
) doc_counts ON d.id = doc_counts.driver_id;

COMMENT ON VIEW drivers_with_document_status IS 'View showing drivers with their document upload status and counts';
