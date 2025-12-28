#!/usr/bin/env node

/**
 * Create Admin User Script
 *
 * This script creates an admin user and assigns all roles directly.
 * No need to sign up first - it creates the user via Supabase Admin API.
 *
 * Usage: node scripts/create-admin.js
 */

const https = require('https');

// Load environment variables
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_PROJECT_ID = process.env.VITE_SUPABASE_PROJECT_ID;

// Admin credentials
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'Admin123!@#';

console.log('🚀 Creating admin user...\n');

// Step 1: Create user via Supabase Auth Admin API
function createAuthUser() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: 'System Administrator',
        phone: '+234-800-ADMIN'
      }
    });

    const options = {
      hostname: SUPABASE_PROJECT_ID + '.supabase.co',
      path: '/auth/v1/admin/users',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          const user = JSON.parse(body);
          console.log('✅ User created successfully!');
          console.log(`   User ID: ${user.id}`);
          console.log(`   Email: ${user.email}\n`);
          resolve(user);
        } else if (res.statusCode === 422) {
          const error = JSON.parse(body);
          if (error.msg && error.msg.includes('already registered')) {
            console.log('ℹ️  User already exists, fetching existing user...\n');
            // Fetch existing user
            getUserByEmail(ADMIN_EMAIL).then(resolve).catch(reject);
          } else {
            reject(new Error(`Failed to create user: ${body}`));
          }
        } else {
          reject(new Error(`Failed to create user: ${res.statusCode} - ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Fetch existing user by email
function getUserByEmail(email) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SUPABASE_PROJECT_ID + '.supabase.co',
      path: `/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
      method: 'GET',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const data = JSON.parse(body);
          if (data.users && data.users.length > 0) {
            const user = data.users[0];
            console.log('✅ Found existing user!');
            console.log(`   User ID: ${user.id}`);
            console.log(`   Email: ${user.email}\n`);
            resolve(user);
          } else {
            reject(new Error('User not found'));
          }
        } else {
          reject(new Error(`Failed to fetch user: ${res.statusCode} - ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Step 2: Assign all roles via PostgreSQL
function assignAdminRoles(userId) {
  return new Promise((resolve, reject) => {
    const query = `
      -- Delete existing roles to avoid conflicts
      DELETE FROM public.user_roles WHERE user_id = '${userId}';

      -- Assign all 5 roles
      INSERT INTO public.user_roles (user_id, role, assigned_by)
      VALUES
        ('${userId}', 'system_admin', '${userId}'),
        ('${userId}', 'warehouse_officer', '${userId}'),
        ('${userId}', 'driver', '${userId}'),
        ('${userId}', 'zonal_manager', '${userId}'),
        ('${userId}', 'viewer', '${userId}');

      -- Create profile
      INSERT INTO public.profiles (id, full_name, phone)
      VALUES ('${userId}', 'System Administrator', '+234-800-ADMIN')
      ON CONFLICT (id) DO UPDATE
      SET full_name = EXCLUDED.full_name;

      -- Return success
      SELECT 'success' as result;
    `;

    const data = JSON.stringify({ query });

    const options = {
      hostname: SUPABASE_PROJECT_ID + '.supabase.co',
      path: '/rest/v1/rpc/exec',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
        'Prefer': 'return=representation',
        'Content-Length': data.length
      }
    };

    // Use direct SQL execution via PostgREST
    const sqlOptions = {
      hostname: SUPABASE_PROJECT_ID + '.supabase.co',
      path: '/rest/v1/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
        'Content-Length': data.length
      }
    };

    // Instead, use the insert endpoint directly
    insertRoles(userId).then(resolve).catch(reject);
  });
}

// Insert roles directly via REST API
function insertRoles(userId) {
  return new Promise((resolve, reject) => {
    const roles = [
      { user_id: userId, role: 'system_admin', assigned_by: userId },
      { user_id: userId, role: 'warehouse_officer', assigned_by: userId },
      { user_id: userId, role: 'driver', assigned_by: userId },
      { user_id: userId, role: 'zonal_manager', assigned_by: userId },
      { user_id: userId, role: 'viewer', assigned_by: userId }
    ];

    const data = JSON.stringify(roles);

    const options = {
      hostname: SUPABASE_PROJECT_ID + '.supabase.co',
      path: '/rest/v1/user_roles',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
        'Prefer': 'resolution=merge-duplicates',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log('✅ Assigned all 5 admin roles!');
          console.log('   - system_admin');
          console.log('   - warehouse_officer');
          console.log('   - driver');
          console.log('   - zonal_manager');
          console.log('   - viewer\n');

          // Create profile
          createProfile(userId).then(resolve).catch(reject);
        } else {
          console.log(`⚠️  Role assignment status: ${res.statusCode}`);
          console.log(`   Response: ${body}\n`);
          // Continue anyway to create profile
          createProfile(userId).then(resolve).catch(reject);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Create user profile
function createProfile(userId) {
  return new Promise((resolve, reject) => {
    const profile = {
      id: userId,
      full_name: 'System Administrator',
      phone: '+234-800-ADMIN'
    };

    const data = JSON.stringify(profile);

    const options = {
      hostname: SUPABASE_PROJECT_ID + '.supabase.co',
      path: '/rest/v1/profiles',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
        'Prefer': 'resolution=merge-duplicates',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201 || res.statusCode === 409) {
          console.log('✅ Profile created/updated!\n');
          resolve();
        } else {
          console.log(`⚠️  Profile creation status: ${res.statusCode}`);
          console.log(`   Response: ${body}\n`);
          resolve(); // Continue anyway
        }
      });
    });

    req.on('error', (err) => {
      console.log('⚠️  Profile creation failed, but continuing...\n');
      resolve();
    });
    req.write(data);
    req.end();
  });
}

// Main execution
async function main() {
  try {
    // Check environment variables
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_PROJECT_ID) {
      console.error('❌ Missing environment variables!');
      console.error('   Make sure .env file contains:');
      console.error('   - VITE_SUPABASE_URL');
      console.error('   - SUPABASE_SERVICE_ROLE_KEY');
      console.error('   - VITE_SUPABASE_PROJECT_ID');
      process.exit(1);
    }

    console.log('Configuration:');
    console.log(`   Project: ${SUPABASE_PROJECT_ID}`);
    console.log(`   URL: ${SUPABASE_URL}`);
    console.log(`   Admin Email: ${ADMIN_EMAIL}\n`);

    // Step 1: Create user
    const user = await createAuthUser();

    // Step 2: Assign roles
    await assignAdminRoles(user.id);

    console.log('═══════════════════════════════════════════════════════');
    console.log('🎉 SUCCESS! Admin user is ready!\n');
    console.log('Login Credentials:');
    console.log(`   Email:    ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log('\nYou can now login at: http://localhost:8080/');
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
