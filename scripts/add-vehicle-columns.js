import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const sql = `
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS vehicle_type varchar(50),
  ADD COLUMN IF NOT EXISTS license_plate varchar(20),
  ADD COLUMN IF NOT EXISTS make varchar(100),
  ADD COLUMN IF NOT EXISTS year int,
  ADD COLUMN IF NOT EXISTS acquisition_type varchar(50),
  ADD COLUMN IF NOT EXISTS acquisition_date date,
  ADD COLUMN IF NOT EXISTS vendor_name varchar(255),
  ADD COLUMN IF NOT EXISTS registration_expiry date,
  ADD COLUMN IF NOT EXISTS insurance_expiry date,
  ADD COLUMN IF NOT EXISTS transmission varchar(50),
  ADD COLUMN IF NOT EXISTS interior_length_cm int,
  ADD COLUMN IF NOT EXISTS interior_width_cm int,
  ADD COLUMN IF NOT EXISTS interior_height_cm int,
  ADD COLUMN IF NOT EXISTS seating_capacity int,
  ADD COLUMN IF NOT EXISTS current_mileage numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vehicle_type_id uuid,
  ADD COLUMN IF NOT EXISTS category_id uuid,
  ADD COLUMN IF NOT EXISTS vehicle_id varchar(50),
  ADD COLUMN IF NOT EXISTS capacity_m3 numeric,
  ADD COLUMN IF NOT EXISTS tiered_config jsonb,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid;
`;

async function addColumns() {
  try {
    console.log('Adding vehicle columns...');

    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('Error adding columns:', error);
      // Try direct query
      console.log('Trying direct SQL execution...');
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ sql_query: sql })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Direct SQL execution failed:', errorText);
        console.log('\n⚠️  You need to run this SQL manually in Supabase SQL Editor:');
        console.log(sql);
        process.exit(1);
      }
    }

    console.log('✅ Columns added successfully!');
  } catch (err) {
    console.error('Unexpected error:', err);
    console.log('\n⚠️  You need to run this SQL manually in Supabase SQL Editor:');
    console.log(sql);
    process.exit(1);
  }
}

addColumns();
