#!/usr/bin/env node

/**
 * Apply Resource Utilization KPIs Migration
 * This script directly applies the resource utilization analytics functions
 * to the Supabase database using the REST API.
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://cenugzabuzglswikoewy.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

async function executeSql(sql) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to execute SQL: ${response.status} ${error}`);
  }

  return response.json();
}

async function main() {
  console.log('🚀 Applying resource utilization KPIs migration...\n');

  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260101000003_resource_utilization_kpis.sql');

  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('📄 Migration file loaded:', migrationPath);
  console.log('📏 SQL size:', sql.length, 'bytes\n');

  try {
    console.log('⚙️  Executing SQL...');
    await executeSql(sql);
    console.log('✅ Migration applied successfully!\n');

    console.log('🔍 Verifying functions...');

    // Test each function
    const functions = [
      'get_vehicle_payload_utilization',
      'get_program_performance',
      'get_driver_utilization',
      'get_route_efficiency',
      'get_facility_coverage',
      'get_cost_by_program',
    ];

    for (const fnName of functions) {
      const testResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fnName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({}),
      });

      if (testResponse.ok) {
        console.log(`  ✅ ${fnName}`);
      } else {
        console.log(`  ❌ ${fnName} - ${testResponse.status} ${testResponse.statusText}`);
      }
    }

    console.log('\n✨ Done!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
