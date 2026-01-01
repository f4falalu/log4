#!/usr/bin/env node

/**
 * Apply Stock Analytics Migration to Production Supabase
 *
 * This script applies the stock analytics functions migration
 * to the production Supabase database.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase environment variables');
  console.error('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('🚀 Applying Stock Analytics Migration...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260101000001_stock_analytics.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded:', migrationPath);
    console.log('📊 File size:', (migrationSQL.length / 1024).toFixed(2), 'KB\n');

    // Split into individual statements (rough split on CREATE/DROP/GRANT/COMMENT/CREATE INDEX)
    const statements = migrationSQL
      .split(/(?=(?:CREATE|DROP|GRANT|COMMENT ON|--\s*=====))/i)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Executing ${statements.length} SQL statements...\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip comment-only statements
      if (statement.startsWith('COMMENT ON')) {
        console.log(`${i + 1}. [COMMENT] ${statement.substring(0, 60)}...`);
        continue;
      }

      // Extract statement type for logging
      const statementType = statement.match(/^(CREATE|DROP|GRANT|CREATE INDEX)/i)?.[0] || 'SQL';
      const preview = statement.substring(0, 80).replace(/\s+/g, ' ');

      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql: statement });

        if (error) {
          // Some errors are expected (e.g., "already exists")
          if (error.message?.includes('already exists') ||
              error.message?.includes('does not exist')) {
            console.log(`${i + 1}. [SKIP] ${statementType}: ${preview}...`);
            console.log(`   ⚠️  ${error.message}\n`);
          } else {
            console.error(`${i + 1}. [ERROR] ${statementType}: ${preview}...`);
            console.error(`   ❌ ${error.message}\n`);
            errorCount++;
          }
        } else {
          console.log(`${i + 1}. [OK] ${statementType}: ${preview}...`);
          successCount++;
        }
      } catch (err) {
        console.error(`${i + 1}. [EXCEPTION] ${statementType}: ${preview}...`);
        console.error(`   ❌ ${err.message}\n`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log('='.repeat(60) + '\n');

    // Test the functions
    console.log('🧪 Testing stock analytics functions...\n');

    // Test 1: get_stock_status
    console.log('1. Testing get_stock_status()...');
    const { data: stockStatus, error: statusError } = await supabase.rpc('get_stock_status');
    if (statusError) {
      console.error('   ❌ Error:', statusError.message);
    } else {
      console.log('   ✅ Success:', JSON.stringify(stockStatus));
    }

    // Test 2: get_stock_balance
    console.log('\n2. Testing get_stock_balance()...');
    const { data: stockBalance, error: balanceError } = await supabase.rpc('get_stock_balance');
    if (balanceError) {
      console.error('   ❌ Error:', balanceError.message);
    } else {
      console.log(`   ✅ Success: ${stockBalance?.length || 0} products`);
      if (stockBalance?.length > 0) {
        console.log('   📦 Sample:', JSON.stringify(stockBalance[0]));
      }
    }

    // Test 3: get_stock_performance
    console.log('\n3. Testing get_stock_performance()...');
    const { data: stockPerf, error: perfError } = await supabase.rpc('get_stock_performance');
    if (perfError) {
      console.error('   ❌ Error:', perfError.message);
    } else {
      console.log(`   ✅ Success: ${stockPerf?.length || 0} products`);
      if (stockPerf?.length > 0) {
        console.log('   📈 Sample:', JSON.stringify(stockPerf[0]));
      }
    }

    // Test 4: get_stock_by_zone
    console.log('\n4. Testing get_stock_by_zone()...');
    const { data: stockZone, error: zoneError } = await supabase.rpc('get_stock_by_zone');
    if (zoneError) {
      console.error('   ❌ Error:', zoneError.message);
    } else {
      console.log(`   ✅ Success: ${stockZone?.length || 0} zones`);
      if (stockZone?.length > 0) {
        console.log('   🗺️  Zones:', stockZone.map(z => z.zone).join(', '));
      }
    }

    // Test 5: get_low_stock_alerts
    console.log('\n5. Testing get_low_stock_alerts()...');
    const { data: alerts, error: alertsError } = await supabase.rpc('get_low_stock_alerts', {
      p_threshold_days: 7
    });
    if (alertsError) {
      console.error('   ❌ Error:', alertsError.message);
    } else {
      console.log(`   ✅ Success: ${alerts?.length || 0} low stock alerts`);
      if (alerts?.length > 0) {
        console.log('   ⚠️  Sample alert:', JSON.stringify(alerts[0]));
      }
    }

    console.log('\n✅ Migration and testing complete!');

    if (errorCount > 0) {
      console.log('\n⚠️  Some errors occurred during migration. Please review the output above.');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the migration
applyMigration();
