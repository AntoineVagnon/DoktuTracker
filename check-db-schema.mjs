/**
 * Check what tables actually exist in the database
 */

import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: 'postgresql://postgres.hzmrkvooqjbxptqjqxii:ArnuVVZ0mS4ZbMR8@aws-0-eu-central-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
  try {
    await client.connect();
    console.log('✅ Connected\n');

    // List all tables
    const tables = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename LIKE '%notification%'
      ORDER BY tablename;
    `);

    console.log('📋 Notification-related tables:');
    tables.rows.forEach(row => {
      console.log(`   - ${row.tablename}`);
    });

    // Check if email_notifications exists
    console.log('\n📧 Checking email_notifications table...');
    const emailTableCheck = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename = 'email_notifications';
    `);

    if (emailTableCheck.rows.length > 0) {
      console.log('✅ email_notifications table exists');

      // Get columns
      const cols = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'email_notifications'
        ORDER BY ordinal_position;
      `);

      console.log('\n   Columns:');
      cols.rows.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type})`);
      });
    } else {
      console.log('❌ email_notifications table does NOT exist');
    }

    // Check recent appointments
    console.log('\n\n📅 Recent appointments:');
    const apts = await client.query(`
      SELECT id, patient_id, doctor_id, status, price, created_at
      FROM appointments
      WHERE created_at > NOW() - INTERVAL '1 hour'
      ORDER BY created_at DESC
      LIMIT 5;
    `);

    apts.rows.forEach(apt => {
      console.log(`   - ID: ${apt.id}, Patient: ${apt.patient_id}, Status: ${apt.status}, Created: ${apt.created_at}`);
    });

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkSchema();
