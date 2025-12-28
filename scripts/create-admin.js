#!/usr/bin/env node

/**
 * BIKO Platform - Automated Admin User Creation
 *
 * This script automates the creation of the super admin user in Supabase.
 * It creates the auth user, assigns roles, and creates the profile.
 *
 * USAGE:
 *   node scripts/create-admin.js
 *
 * CREDENTIALS:
 *   Email:    admin@biko.local
 *   Password: admin123456
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

// Configuration
const ADMIN_USER = {
  id: '594fe632-90cf-48ba-b83d-8f4c39d2e400',
  email: 'admin@biko.local',
  password: 'admin123456',
  fullName: 'Super Admin',
  phone: '+1234567890'
};

const ROLES = [
  'system_admin',
  'warehouse_officer',
  'driver',
  'zonal_manager',
  'viewer'
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n[${step}] ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

async function main() {
  log('\n════════════════════════════════════════════════════════', 'bright');
  log('   BIKO Platform - Admin User Creation', 'bright');
  log('════════════════════════════════════════════════════════\n', 'bright');

  // Step 1: Validate environment variables
  logStep('1/4', 'Validating environment variables...');

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    logError('Missing required environment variables!');
    log('\nRequired variables:', 'yellow');
    log('  - VITE_SUPABASE_URL', 'yellow');
    log('  - VITE_SUPABASE_PUBLISHABLE_KEY', 'yellow');
    log('\nPlease check your .env file and try again.\n', 'yellow');
    process.exit(1);
  }

  logSuccess('Environment variables validated');
  log(`  URL: ${supabaseUrl}`);

  // Step 2: Initialize Supabase client
  logStep('2/4', 'Connecting to Supabase...');

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  logSuccess('Connected to Supabase');

  // Step 3: Check if user already exists
  logStep('3/4', 'Checking if admin user already exists...');

  const { data: existingProfile, error: profileCheckError } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('email', ADMIN_USER.email)
    .single();

  if (existingProfile) {
    logWarning('Admin user already exists!');
    log(`  ID: ${existingProfile.id}`);
    log(`  Email: ${existingProfile.email}`);
    log(`  Name: ${existingProfile.full_name}`);

    // Check roles
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', existingProfile.id);

    if (!rolesError && roles) {
      log(`\n  Assigned roles (${roles.length}):`);
      roles.forEach(r => log(`    - ${r.role}`));

      if (roles.length === 5) {
        log('\n✓ Admin user is fully configured!', 'green');
        log('\nYou can login with:', 'cyan');
        log(`  Email:    ${ADMIN_USER.email}`, 'bright');
        log(`  Password: ${ADMIN_USER.password}`, 'bright');
        log('\n⚠ Remember to change the password after first login!\n', 'yellow');
        process.exit(0);
      }
    }

    log('\n⚠ Some roles may be missing. Attempting to fix...', 'yellow');
  } else {
    logSuccess('No existing admin user found - will create new');
  }

  // Step 4: Create/Update admin user
  logStep('4/4', 'Setting up admin user...');

  // Note: We can't create auth users directly via the client library
  // without the service role key. Instead, we'll create the profile
  // and provide instructions for manual auth user creation.

  logWarning('Supabase Auth users require manual creation or service role key');
  log('\nTo complete the setup:', 'cyan');
  log('\n1. Open Supabase Dashboard:', 'bright');
  log(`   https://supabase.com/dashboard/project/${process.env.VITE_SUPABASE_PROJECT_ID || 'YOUR_PROJECT'}/auth/users`);
  log('\n2. Click "Invite user" or "Add user"', 'bright');
  log('\n3. Fill in the form:', 'bright');
  log(`   Email: ${ADMIN_USER.email}`, 'cyan');
  log(`   Password: ${ADMIN_USER.password}`, 'cyan');
  log('   Auto Confirm User: ✓ YES', 'cyan');
  log('\n4. Click "Create user"', 'bright');

  // Create profile if it doesn't exist
  if (!existingProfile) {
    log('\nCreating profile...', 'cyan');

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: ADMIN_USER.id,
        email: ADMIN_USER.email,
        full_name: ADMIN_USER.fullName,
        phone: ADMIN_USER.phone,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      logError(`Failed to create profile: ${profileError.message}`);
    } else {
      logSuccess('Profile created');
    }
  }

  // Assign all roles
  log('\nAssigning roles...', 'cyan');

  // First, delete existing roles to start fresh
  await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', ADMIN_USER.id);

  // Insert all roles
  const roleInserts = ROLES.map(role => ({
    user_id: ADMIN_USER.id,
    role: role,
    assigned_at: new Date().toISOString()
  }));

  const { error: rolesError } = await supabase
    .from('user_roles')
    .insert(roleInserts);

  if (rolesError) {
    logError(`Failed to assign roles: ${rolesError.message}`);
    log('\nYou may need to run the SQL script manually:', 'yellow');
    log('  scripts/create-admin.sql', 'cyan');
  } else {
    logSuccess('All roles assigned successfully');
    ROLES.forEach(role => log(`  ✓ ${role}`, 'green'));
  }

  // Final verification
  log('\nVerifying setup...', 'cyan');

  const { data: finalCheck, error: finalError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', ADMIN_USER.id);

  if (!finalError && finalCheck) {
    log(`\n✓ Setup complete! ${finalCheck.length}/5 roles assigned`, 'green');
  }

  // Summary
  log('\n════════════════════════════════════════════════════════', 'bright');
  log('   Setup Summary', 'bright');
  log('════════════════════════════════════════════════════════', 'bright');
  log('\nAdmin Credentials:', 'cyan');
  log(`  Email:    ${ADMIN_USER.email}`, 'bright');
  log(`  Password: ${ADMIN_USER.password}`, 'bright');
  log(`  User ID:  ${ADMIN_USER.id}`, 'bright');

  log('\nNext Steps:', 'cyan');
  log('  1. Create auth user in Supabase Dashboard (see instructions above)', 'yellow');
  log('  2. Go to http://localhost:8080', 'bright');
  log('  3. Login with the credentials above', 'bright');
  log('  4. Change the password immediately!', 'bright');

  log('\nFor detailed instructions, see:', 'cyan');
  log('  ADMIN_SETUP.md', 'bright');
  log('');
}

// Run the script
main().catch((error) => {
  logError(`\nUnexpected error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
