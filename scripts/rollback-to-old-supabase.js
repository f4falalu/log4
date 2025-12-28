/**
 * Rollback Script: Restore Old Supabase Configuration
 *
 * This script restores the old Lovable-managed Supabase configuration
 * in case you need to rollback from the new Supabase project.
 */

import { copyFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️${colors.reset}  ${msg}`),
};

async function rollback() {
  console.log('');
  log.warning('Rollback to Old Supabase Configuration');
  console.log('');
  log.info('This will restore your old Lovable-managed Supabase credentials');
  console.log('');

  const rootDir = join(__dirname, '..');

  // Check if backups exist
  const envBackup = join(rootDir, '.env.backup');
  const configBackup = join(rootDir, 'supabase/config.toml.backup');

  if (!existsSync(envBackup)) {
    log.error('Backup file .env.backup not found');
    log.info('Cannot rollback - no backup available');
    process.exit(1);
  }

  if (!existsSync(configBackup)) {
    log.error('Backup file supabase/config.toml.backup not found');
    log.info('Cannot rollback - no backup available');
    process.exit(1);
  }

  try {
    // Restore .env
    log.info('Restoring .env from backup...');
    copyFileSync(envBackup, join(rootDir, '.env'));
    log.success('.env restored');

    // Restore config.toml
    log.info('Restoring supabase/config.toml from backup...');
    copyFileSync(configBackup, join(rootDir, 'supabase/config.toml'));
    log.success('supabase/config.toml restored');

    console.log('');
    log.success('Rollback completed successfully!');
    console.log('');
    log.info('Your app is now connected to the old Supabase project:');
    console.log('  Project ID: fgkjhpytntgmbuxegntr');
    console.log('  URL: https://fgkjhpytntgmbuxegntr.supabase.co');
    console.log('');
    log.info('Next steps:');
    console.log('  1. Restart your dev server: npm run dev');
    console.log('  2. Your app will connect to the old database');
    console.log('');

  } catch (error) {
    log.error('Rollback failed');
    console.error(error);
    process.exit(1);
  }
}

// Run rollback
rollback();
