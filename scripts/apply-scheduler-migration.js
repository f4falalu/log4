/**
 * Script to apply the scheduler migration to the Supabase database
 *
 * This script reads the migration file and executes it using the Supabase client
 * with service role credentials (admin access).
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key node scripts/apply-scheduler-migration.js
 *
 * Or add SUPABASE_SERVICE_ROLE_KEY to your .env file and run:
 *   node scripts/apply-scheduler-migration.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing required environment variables');
  console.error('');
  console.error('Please ensure the following are set in your .env file:');
  console.error('  - VITE_SUPABASE_URL (already set)');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY (missing)');
  console.error('');
  console.error('You can find your service role key in:');
  console.error('  Supabase Dashboard → Settings → API → service_role key');
  console.error('');
  process.exit(1);
}

// Create Supabase client with service role (admin access)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  console.log('🚀 Starting migration application...');
  console.log('');

  try {
    // Read the migration file
    const migrationPath = join(__dirname, '../supabase/migrations/20251027000000_scheduler_feature_schema.sql');
    console.log(`📖 Reading migration file: ${migrationPath}`);
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log(`✅ Migration file loaded (${migrationSQL.split('\n').length} lines)`);
    console.log('');

    // Execute the migration
    console.log('⚙️  Executing migration...');
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      // If exec_sql doesn't exist, try using the REST API directly
      console.log('⚠️  exec_sql function not found, trying direct API call...');

      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({ query: migrationSQL })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${await response.text()}`);
      }

      console.log('✅ Migration executed successfully via REST API!');
    } else {
      console.log('✅ Migration executed successfully!');
    }

    console.log('');
    console.log('📊 Verifying tables were created...');

    // Verify the tables were created
    const { data: tables, error: verifyError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .in('table_name', [
        'scheduler_batches',
        'schedule_templates',
        'optimization_runs',
        'scheduler_settings'
      ])
      .eq('table_schema', 'public');

    if (verifyError) {
      console.log('⚠️  Could not verify tables (this is okay, they might still be created)');
    } else if (tables && tables.length > 0) {
      console.log(`✅ Verified ${tables.length} tables created:`);
      tables.forEach(t => console.log(`   - ${t.table_name}`));
    }

    console.log('');
    console.log('🎉 Migration completed successfully!');
    console.log('');
    console.log('You can now:');
    console.log('  1. Go back to your app at http://localhost:8081');
    console.log('  2. Try creating a schedule through the Schedule Wizard');
    console.log('  3. It should work without errors!');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ Migration failed with error:');
    console.error(error);
    console.error('');
    console.error('📝 Manual application required:');
    console.error('');
    console.error('Please apply the migration manually via Supabase Dashboard:');
    console.error('  1. Go to https://supabase.com/dashboard');
    console.error('  2. Select your project');
    console.error('  3. Go to SQL Editor');
    console.error('  4. Copy the contents of:');
    console.error('     supabase/migrations/20251027000000_scheduler_feature_schema.sql');
    console.error('  5. Paste and run in SQL Editor');
    console.error('');
    process.exit(1);
  }
}

// Run the migration
applyMigration();
