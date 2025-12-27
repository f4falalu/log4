-- ============================================================================
-- MIGRATION TRACKING
-- ============================================================================
-- Mark the 3 migrations as applied in Supabase's tracking system
-- ============================================================================

INSERT INTO supabase_migrations.schema_migrations (version)
VALUES
  ('20251223000001'),
  ('20251223000002'),
  ('20251225000001')
ON CONFLICT (version) DO NOTHING;

-- Verify they were added
SELECT version, inserted_at
FROM supabase_migrations.schema_migrations
WHERE version IN ('20251223000001', '20251223000002', '20251225000001')
ORDER BY version;

-- Expected: 3 rows showing the migration versions with timestamps
