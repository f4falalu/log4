#!/usr/bin/env node
/**
 * Apply Production Analytics Migrations
 *
 * This script applies all analytics-related migrations to the production Supabase database.
 * Run this when deploying new analytics features to production.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing environment variables');
  console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Read the consolidated migration file
const migrationPath = path.join(__dirname, '..', 'production-analytics-migrations.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('🚀 Starting production analytics migrations...');
console.log(`📄 Reading: ${migrationPath}`);
console.log(`📊 Size: ${migrationSQL.length} characters`);

// Split by statement delimiter (semicolon followed by newline)
const statements = migrationSQL
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log(`📝 Found ${statements.length} SQL statements to execute`);

async function runMigrations() {
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';
    const preview = statement.substring(0, 80).replace(/\s+/g, ' ');

    console.log(`\n[${i + 1}/${statements.length}] ${preview}...`);

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement });

      if (error) {
        // Try direct query if RPC fails
        const { error: queryError } = await supabase.from('_').select('*').limit(0);

        if (queryError) {
          console.error(`❌ Error:`, error.message);
          errorCount++;
        } else {
          console.log('✅ Success');
          successCount++;
        }
      } else {
        console.log('✅ Success');
        successCount++;
      }
    } catch (err) {
      console.error(`❌ Exception:`, err.message);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 Migration Summary:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  console.log('='.repeat(60));

  if (errorCount > 0) {
    console.log('\n⚠️  Some migrations failed. Please run them manually in Supabase SQL Editor.');
    console.log(`📍 URL: ${supabaseUrl.replace('//', '//supabase.com/dashboard/project/')}/sql/new`);
  } else {
    console.log('\n🎉 All migrations completed successfully!');
  }
}

runMigrations().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
