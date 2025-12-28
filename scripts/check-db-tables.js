import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://cenugzabuzglswikoewy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlbnVnemFidXpnbHN3aWtvZXd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjYwNzE2NDksImV4cCI6MjA0MTY0NzY0OX0.hU0m5WmHCOV5r-xNuebLBU5EkB0qW5glI6p3Br8DP2U'
);

async function checkTables() {
  console.log('Checking database tables...\n');

  const { data: facilityTypes, error: ftError } = await supabase
    .from('facility_types')
    .select('count')
    .limit(1);

  const { data: levelsOfCare, error: locError } = await supabase
    .from('levels_of_care')
    .select('count')
    .limit(1);

  console.log('✓ facility_types exists:', !ftError);
  if (ftError) console.log('  Error:', ftError.message);

  console.log('✓ levels_of_care exists:', !locError);
  if (locError) console.log('  Error:', locError.message);

  if (!ftError && !locError) {
    console.log('\n✅ Both tables exist! Fetching sample data...\n');

    const { data: types } = await supabase
      .from('facility_types')
      .select('*')
      .limit(5);

    const { data: levels } = await supabase
      .from('levels_of_care')
      .select('*')
      .limit(5);

    console.log('Facility Types:', types);
    console.log('Levels of Care:', levels);
  }
}

checkTables().catch(console.error);
