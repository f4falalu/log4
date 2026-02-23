/**
 * Fetches states/regions for all countries from the open-source
 * countries-states-cities-database (https://github.com/dr5hn/countries-states-cities-database)
 * and generates a SQL migration file.
 *
 * Usage: npx tsx scripts/seed-states.ts
 * Then:  npx supabase db push
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const STATES_JSON_URL =
  'https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json/states.json';

interface ExternalState {
  id: number;
  name: string;
  country_id: number;
  country_code: string; // ISO 3166-1 alpha-2
  country_name: string;
  state_code: string;
  type: string | null;
  latitude: string | null;
  longitude: string | null;
}

function escapeSql(str: string): string {
  return str.replace(/'/g, "''");
}

async function main() {
  console.log('=== Generating States/Regions Migration ===\n');

  // 1. Fetch states JSON from GitHub
  console.log('Fetching states data from GitHub...');
  const response = await fetch(STATES_JSON_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch states: ${response.status} ${response.statusText}`);
  }
  const allStates: ExternalState[] = await response.json();
  console.log(`  Fetched ${allStates.length} states/regions globally\n`);

  // 2. Group states by country_code
  const statesByCountry = new Map<string, ExternalState[]>();
  for (const state of allStates) {
    const existing = statesByCountry.get(state.country_code) || [];
    existing.push(state);
    statesByCountry.set(state.country_code, existing);
  }
  console.log(`  Found states for ${statesByCountry.size} countries\n`);

  // 3. Generate SQL
  let sql = `-- Auto-generated: States/Regions for all countries
-- Source: https://github.com/dr5hn/countries-states-cities-database
-- Generated: ${new Date().toISOString()}
-- Total states: ${allStates.length}

BEGIN;

DO $$
DECLARE
  v_country_id UUID;
BEGIN
`;

  let totalStates = 0;

  // Sort country codes for deterministic output
  const sortedCodes = [...statesByCountry.keys()].sort();

  for (const isoCode of sortedCodes) {
    const states = statesByCountry.get(isoCode)!;
    const countryName = states[0].country_name;

    sql += `
  -- ${countryName} (${isoCode}) — ${states.length} states
  SELECT id INTO v_country_id FROM public.countries WHERE iso_code = '${escapeSql(isoCode)}';
  IF v_country_id IS NOT NULL THEN
`;

    for (const state of states) {
      const name = escapeSql(state.name || `State ${state.id}`);
      const stateCode = escapeSql(state.state_code || '');
      const stateType = state.type ? `'${escapeSql(String(state.type))}'` : 'null';

      sql += `    INSERT INTO public.admin_units (id, country_id, parent_id, admin_level, name, name_en, is_active, metadata)
    VALUES (gen_random_uuid(), v_country_id, NULL, 4, '${name}', '${name}', true,
      jsonb_build_object('source', 'dr5hn/countries-states-cities-database', 'state_code', '${stateCode}', 'type', ${stateType}, 'external_id', ${state.id}, 'placeholder', true))
    ON CONFLICT (parent_id, name, country_id) DO NOTHING;
`;
      totalStates++;
    }

    sql += `  END IF;\n`;
  }

  sql += `
  RAISE NOTICE 'Seeded states/regions for all countries';
END $$;

COMMIT;
`;

  // 4. Write migration file
  const migrationPath = join(
    __dirname,
    '..',
    'supabase',
    'migrations',
    '20260222230000_seed_global_states_regions.sql'
  );
  writeFileSync(migrationPath, sql, 'utf-8');

  console.log(`Migration file written: supabase/migrations/20260222230000_seed_global_states_regions.sql`);
  console.log(`  Total states: ${totalStates}`);
  console.log(`  Countries covered: ${statesByCountry.size}`);
  console.log(`\nNext step: npx supabase db push`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
