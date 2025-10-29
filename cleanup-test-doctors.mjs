#!/usr/bin/env node

/**
 * Cleanup script for test doctor registrations
 * Removes doctors and users with test email patterns
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function cleanupTestDoctors() {
  const client = await pool.connect();

  try {
    console.log('\n🔍 Searching for test doctor registrations...\n');

    // Find test doctors (emails with 'test', 'demo', or specific patterns)
    const testDoctorsQuery = `
      SELECT
        d.id as doctor_id,
        d.license_number,
        d.status,
        u.id as user_id,
        u.email,
        u.first_name,
        u.last_name,
        u.created_at
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      WHERE
        u.email ILIKE '%test%'
        OR u.email ILIKE '%demo%'
        OR u.email ILIKE '%example.com%'
      ORDER BY u.created_at DESC;
    `;

    const { rows: testDoctors } = await client.query(testDoctorsQuery);

    if (testDoctors.length === 0) {
      console.log('✅ No test doctors found.');
      return;
    }

    console.log(`📋 Found ${testDoctors.length} test doctor(s):\n`);
    testDoctors.forEach((doc, idx) => {
      console.log(`${idx + 1}. Doctor ID: ${doc.doctor_id}, User ID: ${doc.user_id}`);
      console.log(`   Email: ${doc.email}`);
      console.log(`   Name: ${doc.first_name} ${doc.last_name}`);
      console.log(`   License: ${doc.license_number}`);
      console.log(`   Status: ${doc.status}`);
      console.log(`   Created: ${doc.created_at}`);
      console.log('');
    });

    // Ask for confirmation (auto-confirm for script usage)
    console.log('🗑️  Deleting test doctors and related data...\n');

    await client.query('BEGIN');

    for (const doctor of testDoctors) {
      // Delete doctor application audit logs
      await client.query(
        'DELETE FROM doctor_application_audit WHERE doctor_id = $1',
        [doctor.doctor_id]
      );
      console.log(`   ✓ Deleted audit logs for doctor ${doctor.doctor_id}`);

      // Delete doctor availability slots
      await client.query(
        'DELETE FROM availability_slots WHERE doctor_id = $1',
        [doctor.doctor_id]
      );
      console.log(`   ✓ Deleted availability slots for doctor ${doctor.doctor_id}`);

      // Delete doctor record
      await client.query(
        'DELETE FROM doctors WHERE id = $1',
        [doctor.doctor_id]
      );
      console.log(`   ✓ Deleted doctor ${doctor.doctor_id}`);

      // Delete user record
      await client.query(
        'DELETE FROM users WHERE id = $1',
        [doctor.user_id]
      );
      console.log(`   ✓ Deleted user ${doctor.user_id} (${doctor.email})`);
      console.log('');
    }

    await client.query('COMMIT');

    console.log(`\n✅ Successfully deleted ${testDoctors.length} test doctor(s) and related data.`);
    console.log('⚠️  Note: Supabase auth users still exist. Delete them manually from Supabase dashboard if needed.\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error cleaning up test doctors:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run cleanup
cleanupTestDoctors()
  .then(() => {
    console.log('✨ Cleanup complete!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Cleanup failed:', error.message);
    process.exit(1);
  });
