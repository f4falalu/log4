import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLGAs() {
  console.log('Checking LGAs table...\n');

  // Fetch all LGAs
  const { data: lgas, error } = await supabase
    .from('lgas')
    .select('*')
    .order('name');

  if (error) {
    console.error('❌ Error fetching LGAs:', error.message);
    return;
  }

  console.log(`✅ Found ${lgas.length} LGAs in database:\n`);

  lgas.forEach((lga, index) => {
    console.log(`${index + 1}. ${lga.name}`);
    console.log(`   ID: ${lga.id}`);
    console.log(`   State: ${lga.state}`);
    console.log(`   Zone ID: ${lga.zone_id || 'Not assigned'}`);
    console.log(`   Warehouse ID: ${lga.warehouse_id || 'Not assigned'}`);
    console.log('');
  });

  // Also check facility_types and levels_of_care
  const { data: facilityTypes, error: ftError } = await supabase
    .from('facility_types')
    .select('*')
    .order('name');

  const { data: levelsOfCare, error: locError } = await supabase
    .from('levels_of_care')
    .select('*')
    .order('hierarchy_level');

  console.log('\n📊 Reference Tables Status:');
  console.log(`✓ facility_types: ${ftError ? '❌ ' + ftError.message : '✅ ' + facilityTypes.length + ' records'}`);
  console.log(`✓ levels_of_care: ${locError ? '❌ ' + locError.message : '✅ ' + levelsOfCare.length + ' records'}`);
}

checkLGAs().catch(console.error);
