/**
 * Direct Migration Application Script
 *
 * This script applies SQL migrations by reading each file and executing
 * the SQL statements through the Supabase REST API.
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m',
};

// Configuration from .env
const SUPABASE_URL = 'https://cenugzabuzglswikoewy.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlbnVnemFidXpnbHN3aWtvZXd5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTk1MDI4MCwiZXhwIjoyMDc1NTI2MjgwfQ.gC5IDMA3ThGq2qtba4ME9YRp4oqUzLpm61TDyNrHBeg';

console.log(`\n${colors.bright}🚀 Starting Database Migration${colors.reset}\n`);
console.log(`${colors.blue}Target:${colors.reset} ${SUPABASE_URL}`);
console.log(`${colors.blue}Project:${colors.reset} cenugzabuzglswikoewy\n`);

async function executeSQL(sql) {
  try {
    // Use Supabase SQL endpoint
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
      const text = await response.text();
      // If exec_sql doesn't exist, we need to use manual method
      if (response.status === 404 || text.includes('exec_sql')) {
        return { needsManual: true };
      }
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    return { success: true };
  } catch (error) {
    return { error, needsManual: true };
  }
}

async function main() {
  // Read combined migrations file
  const combinedFile = join(__dirname, '../COMBINED_MIGRATIONS.sql');

  console.log(`${colors.cyan}📖 Reading migration file...${colors.reset}`);
  const sql = readFileSync(combinedFile, 'utf-8');
  const lines = sql.split('\n').length;
  console.log(`${colors.green}✅ Loaded ${lines} lines of SQL${colors.reset}\n`);

  console.log(`${colors.cyan}⚙️  Executing migrations...${colors.reset}`);
  console.log(`${colors.yellow}This may take 10-30 seconds...${colors.reset}\n`);

  const result = await executeSQL(sql);

  if (result.needsManual) {
    console.log(`${colors.yellow}⚠️  Direct API execution not available${colors.reset}\n`);
    console.log(`${colors.bright}📝 Manual Application Required:${colors.reset}\n`);
    console.log(`Please follow these steps:\n`);
    console.log(`1. Open: ${colors.blue}https://supabase.com/dashboard/project/cenugzabuzglswikoewy/sql/new${colors.reset}`);
    console.log(`2. Open file: ${colors.cyan}COMBINED_MIGRATIONS.sql${colors.reset} in VS Code`);
    console.log(`3. Select All (Cmd/Ctrl + A), Copy (Cmd/Ctrl + C)`);
    console.log(`4. Paste into Supabase SQL Editor (Cmd/Ctrl + V)`);
    console.log(`5. Click "Run" button or press Cmd/Ctrl + Enter`);
    console.log(`6. Wait for success message (~10 seconds)\n`);
    console.log(`${colors.green}✅ Then your database will be ready!${colors.reset}\n`);
    process.exit(2);
  }

  if (result.error) {
    console.log(`${colors.red}❌ Migration failed${colors.reset}`);
    console.error(result.error);
    process.exit(1);
  }

  console.log(`${colors.green}✅ Migrations applied successfully!${colors.reset}\n`);
  console.log(`${colors.bright}🎉 Database is ready!${colors.reset}\n`);
  console.log(`Next steps:`);
  console.log(`  1. Go to http://localhost:8081`);
  console.log(`  2. Try creating a schedule`);
  console.log(`  3. It should work! ✅\n`);
}

main().catch(console.error);
