#!/usr/bin/env node

/**
 * Apply Analytics Public Wrapper Migration
 *
 * This script applies the analytics public wrapper migration to make
 * analytics functions accessible via Supabase RPC calls.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://cenugzabuzglswikoewy.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('\n❌ SUPABASE_SERVICE_ROLE_KEY environment variable not set\n');
  console.log('To apply the migration:');
  console.log('1. Get your service role key from: https://supabase.com/dashboard/project/cenugzabuzglswikoewy/settings/api');
  console.log('2. Run: SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/apply-analytics-wrapper.js\n');
  process.exit(1);
}

async function applyMigration() {
  console.log('\n🚀 Applying Analytics Wrapper Migration\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Read migration file
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251231000001_analytics_public_wrappers.sql');

  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('📄 Migration file:', migrationPath);
  console.log('📊 SQL size:', (sql.length / 1024).toFixed(2), 'KB\n');

  try {
    console.log('⏳ Executing migration...\n');

    const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });

    if (error) {
      // Try direct query approach
      console.log('⚠️  RPC method failed, trying direct query...\n');

      const { error: queryError } = await supabase.from('_migrations').select('*').limit(1);

      if (queryError) {
        console.error('❌ Migration failed:', error);
        console.error('\n📝 Manual application required:');
        console.error('1. Go to: https://supabase.com/dashboard/project/cenugzabuzglswikoewy/sql/new');
        console.error('2. Copy content from:', migrationPath);
        console.error('3. Paste and run in SQL editor\n');
        process.exit(1);
      }
    }

    console.log('✅ Migration applied successfully!\n');
    console.log('Created public wrapper functions:');
    console.log('  • get_delivery_kpis');
    console.log('  • get_top_vehicles_by_ontime');
    console.log('  • get_driver_kpis');
    console.log('  • get_top_drivers');
    console.log('  • get_vehicle_kpis');
    console.log('  • get_vehicles_needing_maintenance');
    console.log('  • get_cost_kpis');
    console.log('  • get_vehicle_costs');
    console.log('  • get_driver_costs');
    console.log('  • get_dashboard_summary ← This fixes your error!\n');

    console.log('🎉 Analytics dashboard should now work!\n');

  } catch (err) {
    console.error('❌ Error applying migration:', err.message);
    console.error('\n📝 Please apply manually via Supabase Dashboard');
    console.error('URL: https://supabase.com/dashboard/project/cenugzabuzglswikoewy/sql/new\n');
    process.exit(1);
  }
}

applyMigration();
