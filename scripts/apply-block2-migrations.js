#!/usr/bin/env node
/**
 * Phase 0 Block 2: Database Migration Executor
 * Applies workspace_members, planning_system, and storage_buckets migrations
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase connection via direct DB
const client = new Client({
  host: 'db.cenugzabuzglswikoewy.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD || 'Datman2023!',
  ssl: {
    rejectUnauthorized: false
  }
});

async function executeMigration() {
  console.log('🚀 Phase 0 Block 2: Database Migration\n');
  console.log('📋 Migrations: workspace_members, planning_system, storage_buckets\n');

  try {
    // Connect
    console.log('🔌 Connecting to Supabase database...');
    await client.connect();
    console.log('✅ Connected\n');

    // Read migration file
    console.log('📖 Reading PHASE0_BLOCK2_MIGRATIONS.sql...');
    const migrationPath = resolve(__dirname, '../PHASE0_BLOCK2_MIGRATIONS.sql');
    const sql = readFileSync(migrationPath, 'utf-8');
    console.log(`✅ Loaded ${sql.split('\n').length} lines of SQL\n`);

    // Execute migration
    console.log('⚙️  Executing migrations...');
    console.log('   This will create:');
    console.log('   - workspace_members table + RLS policies');
    console.log('   - 5 planning system tables (zones, routes, facilities, audit)');
    console.log('   - 3 storage buckets (vlms-documents, vlms-photos, documents)');
    console.log('   - All indexes, triggers, and functions\n');

    const startTime = Date.now();

    await client.query(sql);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Migration executed in ${duration}s\n`);

    // Verify workspace_members table
    console.log('🔍 Verifying database state...\n');

    const wmCheck = await client.query(`
      SELECT COUNT(*) as count FROM public.workspace_members
    `);
    console.log(`✅ workspace_members: ${wmCheck.rows[0].count} members`);

    // Verify planning tables
    const tables = [
      'zone_configurations',
      'route_sketches',
      'facility_assignments',
      'map_action_audit',
      'forensics_query_log'
    ];

    for (const table of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) as count FROM public.${table}`);
        console.log(`✅ ${table}: ${result.rows[0].count} rows`);
      } catch (err) {
        console.log(`❌ ${table}: NOT FOUND`);
      }
    }

    // Verify storage buckets
    const bucketsCheck = await client.query(`
      SELECT id, name, public, file_size_limit
      FROM storage.buckets
      WHERE id IN ('vlms-documents', 'vlms-photos', 'documents')
      ORDER BY id
    `);

    console.log(`\n📦 Storage Buckets: ${bucketsCheck.rows.length}/3 created`);
    bucketsCheck.rows.forEach(bucket => {
      const sizeMB = (bucket.file_size_limit / 1024 / 1024).toFixed(0);
      console.log(`   ✅ ${bucket.id} (${bucket.public ? 'public' : 'private'}, ${sizeMB}MB limit)`);
    });

    console.log('\n🎉 Block 2: Database Deployment COMPLETE!\n');
    console.log('Next: Regenerate TypeScript types with:');
    console.log('  npx supabase gen types typescript --linked > src/types/supabase.ts\n');

  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(error.message);
    if (error.message.includes('already exists')) {
      console.log('\n⚠️  Some objects already exist - this is normal for re-runs');
      console.log('Checking current state...\n');

      // Still verify what exists
      try {
        const wmCheck = await client.query(`SELECT COUNT(*) FROM public.workspace_members`);
        console.log(`✅ workspace_members exists (${wmCheck.rows[0].count} members)`);
      } catch (e) {
        console.log('❌ workspace_members missing');
      }
    } else {
      throw error;
    }
  } finally {
    await client.end();
  }
}

executeMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
