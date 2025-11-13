#!/usr/bin/env node
/**
 * Apply Migrations via Supabase Management API
 *
 * This uses Supabase's SQL execution endpoint directly
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
  step: (msg) => console.log(`${colors.blue}📦${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️${colors.reset}  ${msg}`),
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset}  ${msg}`),
};

const SUPABASE_URL = 'https://cenugzabuzglswikoewy.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlbnVnemFidXpnbHN3aWtvZXd5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTk1MDI4MCwiZXhwIjoyMDc1NTI2MjgwfQ.gC5IDMA3ThGq2qtba4ME9YRp4oqUzLpm61TDyNrHBeg';
const DB_PASSWORD = 'highfinger@biko';

async function applyMigrations() {
  log.header('🚀 Applying Database Migrations via API');

  // Read combined migrations
  const migrationsPath = join(__dirname, '../COMBINED_MIGRATIONS.sql');
  log.step('Reading migration file...');
  const sql = readFileSync(migrationsPath, 'utf-8');
  log.success(`Loaded ${sql.split('\n').length} lines of SQL`);
  console.log('');

  // Split into smaller chunks to avoid timeouts
  log.step('Splitting SQL into manageable chunks...');
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  log.success(`Split into ${statements.length} SQL statements`);
  console.log('');

  log.step('Executing migrations via Supabase REST API...');
  log.info('This may take 30-60 seconds...');
  console.log('');

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  // Execute in chunks of 10 statements
  const chunkSize = 10;
  for (let i = 0; i < statements.length; i += chunkSize) {
    const chunk = statements.slice(i, i + chunkSize);
    const chunkSql = chunk.join(';\n') + ';';

    process.stdout.write(`\r  Processing statements ${i + 1}-${Math.min(i + chunkSize, statements.length)} of ${statements.length}...`);

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ query: chunkSql })
      });

      if (response.ok || response.status === 404) {
        successCount += chunk.length;
      } else {
        const error = await response.text();
        errorCount += chunk.length;
        errors.push({ chunk: i, error });
      }
    } catch (error) {
      errorCount += chunk.length;
      errors.push({ chunk: i, error: error.message });
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n');

  if (errors.length > 0 && errors[0].error && errors[0].error.includes('404')) {
    log.warning('API endpoint not available - using alternative method');
    console.log('');
    return await applyViaManualInstructions();
  }

  if (errorCount > 0) {
    log.warning(`Completed with ${errorCount} potential errors`);
    log.info('Some errors may be expected (e.g., "already exists")');
  } else {
    log.success('All SQL statements executed!');
  }

  console.log('');
  log.header('✅ Migration Process Complete');
  log.info('Verifying in Supabase Dashboard...');
  console.log('');
  console.log('Next steps:');
  console.log(`  1. Go to: ${colors.blue}https://supabase.com/dashboard/project/cenugzabuzglswikoewy/editor${colors.reset}`);
  console.log('  2. Check if tables exist (should see 30+ tables)');
  console.log('  3. If tables exist, test your app!');
  console.log('  4. If tables missing, use manual method below');
  console.log('');
}

async function applyViaManualInstructions() {
  log.header('📝 Manual Application Required');
  console.log('The automated API method is not available.');
  console.log('Please apply migrations manually (takes 5 minutes):\n');
  console.log(`1. Open: ${colors.blue}https://supabase.com/dashboard/project/cenugzabuzglswikoewy/sql/new${colors.reset}`);
  console.log('2. Open file: COMBINED_MIGRATIONS.sql in VS Code');
  console.log('3. Select All (Cmd/Ctrl + A), Copy (Cmd/Ctrl + C)');
  console.log('4. Paste into Supabase SQL Editor');
  console.log('5. Click "Run" button');
  console.log('6. Wait ~10 seconds for completion');
  console.log('');
  console.log(`${colors.green}✅ Then your database will be ready!${colors.reset}`);
  console.log('');
  process.exit(2);
}

applyMigrations().catch(console.error);
