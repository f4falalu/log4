-- Fix duplicate Nigerian states and seed Kano LGAs
--
-- Problem: Two seed migrations (20260222210000 and 20260222230000) both inserted
-- Nigerian states. The ON CONFLICT clause didn't catch duplicates because
-- parent_id IS NULL and NULL != NULL in PostgreSQL.
--
-- This migration:
-- 1. Removes duplicate Nigerian state entries (keeps the one with the earliest created_at)
-- 2. Seeds all 44 Kano State LGAs as admin_units (admin_level=6)

BEGIN;

-- ============================================================
-- 1. Remove duplicate Nigerian states (keep earliest per name)
-- ============================================================
DELETE FROM admin_units
WHERE id IN (
  SELECT id FROM (
    SELECT id, name, country_id,
      ROW_NUMBER() OVER (PARTITION BY name, country_id ORDER BY created_at ASC) AS rn
    FROM admin_units
    WHERE country_id = '00000000-0000-0000-0000-000000000001'
      AND admin_level = 4
  ) dupes
  WHERE rn > 1
);

-- ============================================================
-- 2. Seed Kano State LGAs (44 LGAs, admin_level = 6)
-- ============================================================
-- Parent: Kano State = '00000000-0000-0000-0000-000000000003'
-- Country: Nigeria = '00000000-0000-0000-0000-000000000001'

INSERT INTO admin_units (id, country_id, parent_id, admin_level, name, name_en, is_active, metadata)
VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 6, 'Ajingi', 'Ajingi', true, '{"source": "nigeria-lga-seed"}'::jsonb),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 6, 'Albasu', 'Albasu', true, '{"source": "nigeria-lga-seed"}'::jsonb),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 6, 'Bagwai', 'Bagwai', true, '{"source": "nigeria-lga-seed"}'::jsonb),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 6, 'Bebeji', 'Bebeji', true, '{"source": "nigeria-lga-seed"}'::jsonb),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 6, 'Bichi', 'Bichi', true, '{"source": "nigeria-lga-seed"}'::jsonb),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 6, 'Bunkure', 'Bunkure', true, '{"source": "nigeria-lga-seed"}'::jsonb),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 6, 'Dala', 'Dala', true, '{"source": "nigeria-lga-seed"}'::jsonb),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 6, 'Dambatta', 'Dambatta', true, '{"source": "nigeria-lga-seed"}'::jsonb),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 6, 'Dawakin Kudu', 'Dawakin Kudu', true, '{"source": "nigeria-lga-seed"}'::jsonb),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 6, 'Dawakin Tofa', 'Dawakin Tofa', true, '{"source": "nigeria-lga-seed"}'::jsonb),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 6, 'Doguwa', 'Doguwa', true, '{"source": "nigeria-lga-seed"}'::jsonb),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 6, 'Fagge', 'Fagge', true, '{"source": "nigeria-lga-seed"}'::jsonb),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 6, 'Gabasawa', 'Gabasawa', true, '{"source": "nigeria-lga-seed"}'::jsonb),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 6, 'Garko', 'Garko', true, '{"source": "nigeria-lga-seed"}'::jsonb),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 6, 'Garun Mallam', 'Garun Mallam', true, '{"source": "nigeria-lga-seed"}'::jsonb),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 6, 'Gaya', 'Gaya', true, '{"source": "nigeria-lga-seed"}'::jsonb),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 6, 'Gezawa', 'Gezawa', true, '{"source": "nigeria-lga-seed"}'::jsonb),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 6, 'Gwale', 'Gwale', true, '{"source": "nigeria-lga-seed"}'::jsonb),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 6, 'Gwarzo', 'Gwarzo', true, '{"source": "nigeria-lga-seed"}'::jsonb),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 6, 'Kabo', 'Kabo', true, '{"source": "nigeria-lga-seed"}'::jsonb),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 6, 'Kano Municipal', 'Kano Municipal', true, '{"source": "nigeria-lga-seed"}'::jsonb),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 6, 'Karaye', 'Karaye', true, '{"source": "nigeria-lga-seed"}'::jsonb),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 6, 'Kibiya', 'Kibiya', true, '{"source": "nigeria-lga-seed"}'::jsonb),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 6, 'Kiru', 'Kiru', true, '{"source": "nigeria-lga-seed"}'::jsonb),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 6, 'Kumbotso', 'Kumbotso', true, '{"source": "nigeria-lga-seed"}'::jsonb),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 6, 'Kunchi', 'Kunchi', true, '{"source": "nigeria-lga-seed"}'::jsonb),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 6, 'Kura', 'Kura', true, '{"source": "nigeria-lga-seed"}'::jsonb),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 6, 'Madobi', 'Madobi', true, '{"source": "nigeria-lga-seed"}'::jsonb),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 6, 'Makoda', 'Makoda', true, '{"source": "nigeria-lga-seed"}'::jsonb),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 6, 'Minjibir', 'Minjibir', true, '{"source": "nigeria-lga-seed"}'::jsonb),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 6, 'Nassarawa', 'Nassarawa', true, '{"source": "nigeria-lga-seed"}'::jsonb),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 6, 'Rano', 'Rano', true, '{"source": "nigeria-lga-seed"}'::jsonb),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 6, 'Rimin Gado', 'Rimin Gado', true, '{"source": "nigeria-lga-seed"}'::jsonb),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 6, 'Rogo', 'Rogo', true, '{"source": "nigeria-lga-seed"}'::jsonb),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 6, 'Shanono', 'Shanono', true, '{"source": "nigeria-lga-seed"}'::jsonb),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 6, 'Sumaila', 'Sumaila', true, '{"source": "nigeria-lga-seed"}'::jsonb),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 6, 'Takai', 'Takai', true, '{"source": "nigeria-lga-seed"}'::jsonb),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 6, 'Tarauni', 'Tarauni', true, '{"source": "nigeria-lga-seed"}'::jsonb),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 6, 'Tofa', 'Tofa', true, '{"source": "nigeria-lga-seed"}'::jsonb),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 6, 'Tsanyawa', 'Tsanyawa', true, '{"source": "nigeria-lga-seed"}'::jsonb),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 6, 'Tudun Wada', 'Tudun Wada', true, '{"source": "nigeria-lga-seed"}'::jsonb),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 6, 'Ungogo', 'Ungogo', true, '{"source": "nigeria-lga-seed"}'::jsonb),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 6, 'Warawa', 'Warawa', true, '{"source": "nigeria-lga-seed"}'::jsonb),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 6, 'Wudil', 'Wudil', true, '{"source": "nigeria-lga-seed"}'::jsonb)
ON CONFLICT DO NOTHING;

COMMIT;
