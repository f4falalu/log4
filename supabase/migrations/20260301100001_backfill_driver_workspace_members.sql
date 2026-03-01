-- ============================================================================
-- Backfill: Add existing MOD4 linked drivers to workspace_members
-- ============================================================================
-- Existing drivers who onboarded via OTP before migration 20260301100000
-- are missing workspace_members records. This backfills them using the
-- workspace_id from their OTP record.
-- ============================================================================

INSERT INTO workspace_members (workspace_id, user_id, role)
SELECT DISTINCT o.workspace_id, l.user_id, 'member'
FROM mod4_driver_links l
JOIN auth.users au ON au.id = l.user_id
JOIN mod4_otp_codes o ON o.target_email = au.email
WHERE NOT EXISTS (
  SELECT 1 FROM workspace_members wm
  WHERE wm.user_id = l.user_id AND wm.workspace_id = o.workspace_id
)
ON CONFLICT (workspace_id, user_id) DO NOTHING;
