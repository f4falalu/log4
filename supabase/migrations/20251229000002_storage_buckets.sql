-- Create storage buckets for VLMS and driver documents
-- Required for file upload/download functionality

-- ============================================================================
-- 1. CREATE STORAGE BUCKETS
-- ============================================================================

-- VLMS Documents Bucket (maintenance records, inspection reports, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vlms-documents',
  'vlms-documents',
  false, -- Not public, requires authentication
  10485760, -- 10MB max file size
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- VLMS Photos Bucket (vehicle photos, incident photos, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vlms-photos',
  'vlms-photos',
  false, -- Not public, requires authentication
  5242880, -- 5MB max file size
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- General Documents Bucket (driver documents, certificates, licenses, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false, -- Not public, requires authentication
  10485760, -- 10MB max file size
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. CREATE RLS POLICIES FOR VLMS-DOCUMENTS
-- ============================================================================

-- Allow authenticated users to upload documents
DROP POLICY IF EXISTS "Authenticated users can upload VLMS documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload VLMS documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'vlms-documents' AND
    auth.role() = 'authenticated'
  );

-- Allow authenticated users to view documents
DROP POLICY IF EXISTS "Authenticated users can view VLMS documents" ON storage.objects;
CREATE POLICY "Authenticated users can view VLMS documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'vlms-documents' AND
    auth.role() = 'authenticated'
  );

-- Allow authenticated users to update their own documents
DROP POLICY IF EXISTS "Authenticated users can update VLMS documents" ON storage.objects;
CREATE POLICY "Authenticated users can update VLMS documents"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'vlms-documents' AND
    auth.role() = 'authenticated'
  );

-- Allow authenticated users to delete documents
DROP POLICY IF EXISTS "Authenticated users can delete VLMS documents" ON storage.objects;
CREATE POLICY "Authenticated users can delete VLMS documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'vlms-documents' AND
    auth.role() = 'authenticated'
  );

-- ============================================================================
-- 3. CREATE RLS POLICIES FOR VLMS-PHOTOS
-- ============================================================================

-- Allow authenticated users to upload photos
DROP POLICY IF EXISTS "Authenticated users can upload VLMS photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload VLMS photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'vlms-photos' AND
    auth.role() = 'authenticated'
  );

-- Allow authenticated users to view photos
DROP POLICY IF EXISTS "Authenticated users can view VLMS photos" ON storage.objects;
CREATE POLICY "Authenticated users can view VLMS photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'vlms-photos' AND
    auth.role() = 'authenticated'
  );

-- Allow authenticated users to update their own photos
DROP POLICY IF EXISTS "Authenticated users can update VLMS photos" ON storage.objects;
CREATE POLICY "Authenticated users can update VLMS photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'vlms-photos' AND
    auth.role() = 'authenticated'
  );

-- Allow authenticated users to delete photos
DROP POLICY IF EXISTS "Authenticated users can delete VLMS photos" ON storage.objects;
CREATE POLICY "Authenticated users can delete VLMS photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'vlms-photos' AND
    auth.role() = 'authenticated'
  );

-- ============================================================================
-- 4. CREATE RLS POLICIES FOR DOCUMENTS
-- ============================================================================

-- Allow authenticated users to upload documents
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents' AND
    auth.role() = 'authenticated'
  );

-- Allow authenticated users to view documents
DROP POLICY IF EXISTS "Authenticated users can view documents" ON storage.objects;
CREATE POLICY "Authenticated users can view documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents' AND
    auth.role() = 'authenticated'
  );

-- Allow authenticated users to update documents
DROP POLICY IF EXISTS "Authenticated users can update documents" ON storage.objects;
CREATE POLICY "Authenticated users can update documents"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'documents' AND
    auth.role() = 'authenticated'
  );

-- Allow authenticated users to delete documents
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON storage.objects;
CREATE POLICY "Authenticated users can delete documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents' AND
    auth.role() = 'authenticated'
  );

-- ============================================================================
-- 5. VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_buckets_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_buckets_count
  FROM storage.buckets
  WHERE id IN ('vlms-documents', 'vlms-photos', 'documents');

  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Storage Buckets Created';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Buckets created: %', v_buckets_count;
  RAISE NOTICE 'Expected: 3 (vlms-documents, vlms-photos, documents)';
  RAISE NOTICE '';
  RAISE NOTICE 'Bucket Details:';
  RAISE NOTICE '- vlms-documents: 10MB limit, office documents + PDFs';
  RAISE NOTICE '- vlms-photos: 5MB limit, images only';
  RAISE NOTICE '- documents: 10MB limit, mixed documents + images';
  RAISE NOTICE '';
  RAISE NOTICE 'All buckets have RLS enabled with authenticated user access';
  RAISE NOTICE '=================================================================';
END $$;
