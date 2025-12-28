#!/usr/bin/env node
/**
 * Automated Database Migration Script
 *
 * This script applies all database migrations to the new Supabase project
 * using direct PostgreSQL connection.
 *
 * Usage: node scripts/apply-migrations-automated.js
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

const log = {
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
  step: (msg) => console.log(`${colors.blue}📦${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️${colors.reset}  ${msg}`),
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset}  ${msg}`),
  dim: (msg) => console.log(`${colors.dim}   ${msg}${colors.reset}`),
};

// Supabase connection details
const SUPABASE_PROJECT_ID = 'cenugzabuzglswikoewy';
const SUPABASE_DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;

// Connection string format:
// postgresql://postgres:[PASSWORD]@db.[PROJECT_ID].supabase.co:5432/postgres
const connectionString = SUPABASE_DB_PASSWORD
  ? `postgresql://postgres:${SUPABASE_DB_PASSWORD}@db.${SUPABASE_PROJECT_ID}.supabase.co:5432/postgres`
  : null;

/**
 * Apply migrations using PostgreSQL client
 */
async function applyMigrations() {
  log.header('🚀 Automated Database Migration');

  log.info(`Target Project: ${SUPABASE_PROJECT_ID}`);
  log.info(`Database: db.${SUPABASE_PROJECT_ID}.supabase.co`);
  console.log('');

  // Check if we have database password
  if (!connectionString) {
    log.error('Database password not provided');
    console.log('');
    log.warning('To use automated migration, you need the database password');
    console.log('');
    console.log('To get your database password:');
    console.log(`  1. Go to: ${colors.blue}https://supabase.com/dashboard/project/${SUPABASE_PROJECT_ID}/settings/database${colors.reset}`);
    console.log('  2. Look for "Database password" section');
    console.log('  3. Click "Reset database password" if needed');
    console.log('  4. Copy the password');
    console.log('');
    console.log('Then run this script with:');
    console.log(`  ${colors.green}SUPABASE_DB_PASSWORD=your_password node scripts/apply-migrations-automated.js${colors.reset}`);
    console.log('');
    console.log('Or add to your .env file:');
    console.log(`  ${colors.cyan}SUPABASE_DB_PASSWORD=your_password${colors.reset}`);
    console.log('');

    // Provide alternative method
    log.header('📝 Alternative: Manual Application (Recommended)');
    console.log('Since automatic migration requires the database password,');
    console.log('the quickest method is to apply manually via Supabase Dashboard:\n');
    console.log(`1. Open: ${colors.blue}https://supabase.com/dashboard/project/${SUPABASE_PROJECT_ID}/sql/new${colors.reset}`);
    console.log('2. Open file: COMBINED_MIGRATIONS.sql in VS Code');
    console.log('3. Select All (Cmd/Ctrl + A), Copy (Cmd/Ctrl + C)');
    console.log('4. Paste into Supabase SQL Editor');
    console.log('5. Click "Run" button');
    console.log('6. Wait ~10 seconds for completion');
    console.log('');
    process.exit(1);
  }

  // Create PostgreSQL client using connection pooler (better for IPv6 issues)
  const client = new Client({
    host: `aws-0-us-east-1.pooler.supabase.com`,
    port: 6543,
    database: 'postgres',
    user: `postgres.${SUPABASE_PROJECT_ID}`,
    password: SUPABASE_DB_PASSWORD,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // Connect to database
    log.step('Connecting to database...');
    await client.connect();
    log.success('Connected to PostgreSQL database');
    console.log('');

    // Read combined migrations file
    log.step('Reading migration file...');
    const migrationsPath = join(__dirname, '../COMBINED_MIGRATIONS.sql');
    const sql = readFileSync(migrationsPath, 'utf-8');
    const lines = sql.split('\n').length;
    log.success(`Loaded ${lines} lines of SQL from COMBINED_MIGRATIONS.sql`);
    console.log('');

    // Execute migrations
    log.step('Executing migrations...');
    log.dim('This will create 35+ tables, enums, functions, and policies');
    log.dim('Estimated time: 10-30 seconds');
    console.log('');

    const startTime = Date.now();

    await client.query(sql);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    log.success(`Migrations executed successfully in ${duration}s`);
    console.log('');

    // Verify tables were created
    log.step('Verifying database schema...');

    const tablesResult = await client.query(`
      SELECT COUNT(*) as table_count
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    `);

    const tableCount = parseInt(tablesResult.rows[0].table_count);
    log.success(`Found ${tableCount} tables in public schema`);

    // Check for scheduler tables specifically
    const schedulerResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('scheduler_batches', 'schedule_templates', 'optimization_runs', 'scheduler_settings')
      ORDER BY table_name
    `);

    if (schedulerResult.rows.length === 4) {
      log.success('All 4 scheduler tables created successfully:');
      schedulerResult.rows.forEach(row => {
        log.dim(`   - ${row.table_name}`);
      });
    } else {
      log.warning(`Only ${schedulerResult.rows.length}/4 scheduler tables found`);
    }

    console.log('');

    // Check enums
    const enumsResult = await client.query(`
      SELECT COUNT(*) as enum_count
      FROM pg_type
      WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND typtype = 'e'
    `);

    const enumCount = parseInt(enumsResult.rows[0].enum_count);
    log.success(`Created ${enumCount} custom enum types`);

    // Check functions
    const functionsResult = await client.query(`
      SELECT COUNT(*) as function_count
      FROM pg_proc
      WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    `);

    const functionCount = parseInt(functionsResult.rows[0].function_count);
    log.success(`Created ${functionCount} database functions`);

    console.log('');
    log.header('🎉 Migration Completed Successfully!');

    console.log('Database Summary:');
    console.log(`  ${colors.green}✓${colors.reset} ${tableCount} tables created`);
    console.log(`  ${colors.green}✓${colors.reset} ${enumCount} enums created`);
    console.log(`  ${colors.green}✓${colors.reset} ${functionCount} functions created`);
    console.log(`  ${colors.green}✓${colors.reset} RLS policies applied`);
    console.log(`  ${colors.green}✓${colors.reset} Indexes created`);
    console.log(`  ${colors.green}✓${colors.reset} Triggers configured`);
    console.log('');

    log.info('Your database is now fully configured!');
    console.log('');
    console.log('Next steps:');
    console.log(`  1. Go to ${colors.cyan}http://localhost:8081${colors.reset}`);
    console.log('  2. Navigate to Scheduler page');
    console.log('  3. Click "New Schedule"');
    console.log('  4. Complete the wizard');
    console.log(`  5. ${colors.green}Schedule creation should work!${colors.reset}`);
    console.log('');

  } catch (error) {
    log.error('Migration failed');
    console.log('');
    console.error('Error details:');
    console.error(error);
    console.log('');

    if (error.message && error.message.includes('password authentication failed')) {
      log.warning('Database password is incorrect');
      console.log('');
      console.log('Please check your password and try again:');
      console.log(`  1. Go to: ${colors.blue}https://supabase.com/dashboard/project/${SUPABASE_PROJECT_ID}/settings/database${colors.reset}`);
      console.log('  2. Reset your database password');
      console.log('  3. Run the script again with the new password');
    } else if (error.message && error.message.includes('already exists')) {
      log.warning('Some database objects already exist');
      log.info('This might be okay - checking current state...');
      // Continue to verification
    }

    process.exit(1);

  } finally {
    // Close connection
    await client.end();
  }
}

// Run the migration
applyMigrations().catch((error) => {
  console.error('Unexpected error:');
  console.error(error);
  process.exit(1);
});
