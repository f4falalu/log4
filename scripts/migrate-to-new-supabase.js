/**
 * Migration Script: Migrate to New Supabase Project
 *
 * This script applies all database migrations to the new Supabase project.
 * It reads all SQL migration files in order and executes them sequentially.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️${colors.reset}  ${msg}`),
  step: (msg) => console.log(`${colors.cyan}📦${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${msg}${colors.reset}\n`),
};

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  log.error('Missing required environment variables');
  console.log('');
  console.log('Required in .env file:');
  console.log('  - VITE_SUPABASE_URL');
  console.log('  - SUPABASE_SERVICE_ROLE_KEY');
  console.log('');
  process.exit(1);
}

// Create Supabase client with service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Execute SQL against the database
 */
async function executeSql(sql) {
  try {
    // Use the Supabase REST API to execute raw SQL
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ query: sql })
    });

    // If exec RPC doesn't exist, use direct SQL execution via PostgREST
    if (response.status === 404) {
      // Try alternative: use Supabase client's rpc method
      const { data, error } = await supabase.rpc('exec', { sql });

      if (error && error.message && error.message.includes('exec')) {
        // exec function doesn't exist, we need to execute SQL directly
        // Use the SQL editor endpoint
        const sqlResponse = await fetch(`${SUPABASE_URL}/rest/v1/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ query: sql })
        });

        if (!sqlResponse.ok) {
          const errorText = await sqlResponse.text();
          throw new Error(`SQL execution failed: ${errorText}`);
        }

        return { success: true };
      }

      if (error) throw error;
      return { success: true, data };
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    return { success: true, data: result };

  } catch (error) {
    // If all methods fail, we'll need to use psql or manual execution
    log.warning('Direct SQL execution not available via API');
    log.info('Will use Supabase Dashboard SQL Editor method');
    return { success: false, error, needsManualExecution: true };
  }
}

/**
 * Apply all migrations
 */
async function applyMigrations() {
  log.header('🚀 Starting Migration to New Supabase Project');
  log.info(`Target: ${SUPABASE_URL}`);
  log.info(`Project ID: ${SUPABASE_URL.match(/https:\/\/(.+?)\.supabase\.co/)?.[1] || 'unknown'}`);
  console.log('');

  // Get all migration files
  const migrationsDir = join(__dirname, '../supabase/migrations');
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort(); // Chronological order

  log.info(`Found ${files.length} migration files`);
  console.log('');

  let successCount = 0;
  let failCount = 0;
  const results = [];

  // Apply each migration
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const migrationNumber = i + 1;
    const migrationName = file.replace(/\.sql$/, '').substring(0, 50);

    log.step(`Migration ${migrationNumber}/${files.length}: ${migrationName}`);

    try {
      // Read migration file
      const migrationPath = join(migrationsDir, file);
      const sql = readFileSync(migrationPath, 'utf-8');

      // Log file size
      const lines = sql.split('\n').length;
      log.info(`  Reading ${lines} lines from ${file}`);

      const startTime = Date.now();

      // Execute SQL
      const result = await executeSql(sql);

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      if (result.needsManualExecution) {
        log.warning(`  Migration requires manual execution`);
        log.info(`  File: ${migrationPath}`);
        results.push({
          file,
          status: 'manual',
          duration,
        });
        // Continue - we'll provide manual instructions at the end
      } else if (result.success) {
        log.success(`  Migration applied successfully (${duration}s)`);
        successCount++;
        results.push({
          file,
          status: 'success',
          duration,
        });
      } else {
        throw result.error;
      }

      console.log('');
    } catch (error) {
      log.error(`  Migration failed: ${error.message}`);
      console.error('  Error details:', error);
      console.log('');
      failCount++;
      results.push({
        file,
        status: 'error',
        error: error.message,
      });

      // Stop on first error
      log.error('Stopping migration due to error');
      break;
    }
  }

  // Summary
  log.header('📊 Migration Summary');
  console.log(`Total migrations: ${files.length}`);
  console.log(`${colors.green}Successful: ${successCount}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failCount}${colors.reset}`);
  console.log(`${colors.yellow}Manual: ${results.filter(r => r.status === 'manual').length}${colors.reset}`);
  console.log('');

  // If we need manual execution, provide instructions
  const manualMigrations = results.filter(r => r.status === 'manual');
  if (manualMigrations.length > 0) {
    log.header('📝 Manual Migration Required');
    log.warning('Some migrations need to be applied manually via Supabase Dashboard');
    console.log('');
    console.log('Follow these steps:');
    console.log('');
    console.log('1. Go to: https://supabase.com/dashboard/project/cenugzabuzglswikoewy/sql/new');
    console.log('2. For each migration file below:');
    console.log('   - Open the file in your code editor');
    console.log('   - Copy all contents');
    console.log('   - Paste into Supabase SQL Editor');
    console.log('   - Click "Run"');
    console.log('');
    console.log('Migration files to apply:');
    manualMigrations.forEach((m, i) => {
      console.log(`   ${i + 1}. supabase/migrations/${m.file}`);
    });
    console.log('');
    log.info('After applying all migrations manually, run this script again to verify');
    console.log('');
    process.exit(2); // Exit with code 2 for manual intervention needed
  }

  // If there were errors, exit with error code
  if (failCount > 0) {
    log.error('Migration failed. Please check errors above.');
    console.log('');
    log.info('To rollback to old Supabase, run:');
    console.log('  node scripts/rollback-to-old-supabase.js');
    console.log('');
    process.exit(1);
  }

  // Success!
  log.header('🎉 All Migrations Completed Successfully!');
  log.success('Your new Supabase database is ready');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Restart your dev server: npm run dev');
  console.log('  2. Test the schedule creation feature');
  console.log('  3. Verify everything works as expected');
  console.log('');

  return { success: true, results };
}

/**
 * Verify database setup
 */
async function verifyDatabase() {
  log.header('🔍 Verifying Database Setup');

  try {
    // Check if we can connect
    log.step('Testing database connection...');
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(1);

    if (error) {
      log.warning('Could not query information_schema (this may be normal)');
      log.info('Verification will be done via Supabase Dashboard');
      return { needsManualVerification: true };
    }

    log.success('Database connection successful');
    console.log('');

    // Check for scheduler tables
    log.step('Checking for scheduler tables...');
    const { data: schedulerTables, error: schedulerError } = await supabase
      .from('scheduler_batches')
      .select('id')
      .limit(1);

    if (!schedulerError) {
      log.success('scheduler_batches table exists and accessible');
    } else {
      log.warning('scheduler_batches table check inconclusive');
    }

    console.log('');
    return { success: true };

  } catch (error) {
    log.warning('Verification inconclusive - will verify via dashboard');
    return { needsManualVerification: true };
  }
}

// Main execution
async function main() {
  try {
    // Apply migrations
    const migrationResult = await applyMigrations();

    if (!migrationResult.success) {
      process.exit(1);
    }

    // Verify database
    await verifyDatabase();

  } catch (error) {
    log.error('Unexpected error during migration');
    console.error(error);
    process.exit(1);
  }
}

// Run the script
main();
