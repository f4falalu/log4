#!/usr/bin/env node
/**
 * Apply Vehicle Consolidation Migrations
 *
 * This script applies the 5 vehicle consolidation migration files
 * to the Supabase database using the SQL API
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PROJECT_ID = process.env.VITE_SUPABASE_PROJECT_ID;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !PROJECT_ID) {
  console.error('❌ Missing required environment variables');
  console.error('Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_PROJECT_ID');
  process.exit(1);
}

// Migration files to apply
const migrations = [
  '20251129000001_add_canonical_vehicle_columns.sql',
  '20251129000002_create_vehicle_merge_audit.sql',
  '20251129000003_backfill_vlms_to_vehicles.sql',
  '20251129000004_create_vehicles_unified_view.sql',
];

async function executeSql(sql, migrationName) {
  console.log(`\n📝 Executing: ${migrationName}`);

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const result = await response.json();
    console.log(`✅ Success: ${migrationName}`);
    return result;
  } catch (error) {
    console.error(`❌ Failed: ${migrationName}`);
    console.error(`Error: ${error.message}`);
    throw error;
  }
}

async function applyMigrations() {
  console.log('🚀 Starting Vehicle Consolidation Migrations');
  console.log(`📍 Project: ${PROJECT_ID}`);
  console.log(`🌐 URL: ${SUPABASE_URL}`);
  console.log(`📦 Migrations: ${migrations.length} files`);

  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');

  for (const migrationFile of migrations) {
    const filePath = path.join(migrationsDir, migrationFile);

    if (!fs.existsSync(filePath)) {
      console.error(`❌ Migration file not found: ${migrationFile}`);
      process.exit(1);
    }

    const sql = fs.readFileSync(filePath, 'utf8');

    // Remove comments and split into statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📄 ${migrationFile}: ${statements.length} statements`);

    try {
      await executeSql(sql, migrationFile);
    } catch (error) {
      console.error(`\n❌ Migration failed: ${migrationFile}`);
      console.error(`\n⚠️  Stopping migration process`);
      console.error(`\n📋 To rollback, run the rollback scripts in reverse order`);
      process.exit(1);
    }

    // Small delay between migrations
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n✅ All migrations applied successfully!');
  console.log('\n📊 Next steps:');
  console.log('1. Run validation queries (20251129000005_validation_queries.sql)');
  console.log('2. Review the vehicle_merge_audit table for conflicts');
  console.log('3. Enable feature flag: NEXT_PUBLIC_VEHICLE_CONSOLIDATION=true');
  console.log('4. Test vehicle operations');
}

// Run migrations
applyMigrations().catch(error => {
  console.error('\n❌ Migration process failed');
  console.error(error);
  process.exit(1);
});
