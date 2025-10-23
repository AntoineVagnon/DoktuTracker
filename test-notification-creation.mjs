// Quick P0 Notification Creation Test (No wait for processor)
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const TEST_EMAIL = process.env.TEST_EMAIL || 'noreply@mg.doktu.co';

async function testNotificationCreation() {
  console.log('\n========================================');
  console.log('P0 NOTIFICATION CREATION TEST');
  console.log('========================================\n');

  const client = await pool.connect();

  try {
    // Get or create test user (using correct schema)
    let testUser = await client.query(`
      SELECT id, email FROM users ORDER BY id LIMIT 1
    `);

    let userId;
    if (testUser.rows.length === 0) {
      console.log('Creating test user...');
      const newUser = await client.query(`
        INSERT INTO users (email, role, first_name, last_name)
        VALUES ($1, 'patient', 'QA', 'Test')
        RETURNING id, email
      `, [TEST_EMAIL]);
      userId = newUser.rows[0].id;
      console.log(`✅ Created test user ID: ${userId}\n`);
    } else {
      userId = testUser.rows[0].id;
      console.log(`✅ Using existing user ID: ${userId} (${testUser.rows[0].email})\n`);
    }

    // TEST 1: Registration Email (A1)
    console.log('TEST 1: Account Registration Success (A1)');
    console.log('--------------------------------------------------');
    const reg = await client.query(`
      INSERT INTO email_notifications (
        user_id, trigger_code, template_key, status, priority,
        scheduled_for, merge_data, metadata
      ) VALUES (
        $1, 'A1', 'account_registration_success', 'pending', 100,
        NOW(), $2::jsonb, $3::jsonb
      ) RETURNING id, trigger_code, priority, scheduled_for
    `, [
      userId,
      JSON.stringify({ first_name: 'QA', email: TEST_EMAIL }),
      JSON.stringify({ test: true, test_id: 'NT-001' })
    ]);
    console.log(`✅ Created notification ID: ${reg.rows[0].id}`);
    console.log(`   Priority: ${reg.rows[0].priority}`);
    console.log(`   Scheduled: ${reg.rows[0].scheduled_for}\n`);

    // TEST 2: Password Reset (A3)
    console.log('TEST 2: Password Reset Request (A3)');
    console.log('--------------------------------------------------');
    const pwd = await client.query(`
      INSERT INTO email_notifications (
        user_id, trigger_code, template_key, status, priority,
        scheduled_for, merge_data, metadata
      ) VALUES (
        $1, 'A3', 'account_password_reset', 'pending', 100,
        NOW(), $2::jsonb, $3::jsonb
      ) RETURNING id, trigger_code, priority
    `, [
      userId,
      JSON.stringify({
        first_name: 'QA',
        email: TEST_EMAIL,
        reset_link: 'https://app.doktu.co/reset?token=test',
        expiry_time: '1 hour'
      }),
      JSON.stringify({ test: true, test_id: 'NT-002' })
    ]);
    console.log(`✅ Created notification ID: ${pwd.rows[0].id}`);
    console.log(`   Priority: ${pwd.rows[0].priority}\n`);

    // TEST 3: Booking Confirmation (B3)
    console.log('TEST 3: Booking Confirmed (B3)');
    console.log('--------------------------------------------------');
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const booking = await client.query(`
      INSERT INTO email_notifications (
        user_id, trigger_code, template_key, status, priority,
        scheduled_for, merge_data, metadata
      ) VALUES (
        $1, 'B3', 'booking_confirmation', 'pending', 100,
        NOW(), $2::jsonb, $3::jsonb
      ) RETURNING id, trigger_code, priority
    `, [
      userId,
      JSON.stringify({
        patient_first_name: 'QA',
        appointment_id: '999',
        appointment_datetime_utc: tomorrow.toISOString(),
        appointment_datetime_local: tomorrow.toLocaleString(),
        patient_timezone: 'Europe/Paris',
        doctor_name: 'Dr. Smith',
        doctor_specialization: 'General Practice',
        join_link: 'https://app.doktu.co/join/test',
        price: '35',
        currency: '€'
      }),
      JSON.stringify({ test: true, test_id: 'NT-003' })
    ]);
    console.log(`✅ Created notification ID: ${booking.rows[0].id}`);
    console.log(`   Priority: ${booking.rows[0].priority}\n`);

    // Verify queue
    const queue = await client.query(`
      SELECT id, trigger_code, template_key, status, priority, scheduled_for
      FROM email_notifications
      WHERE user_id = $1 AND status = 'pending'
        AND created_at > NOW() - INTERVAL '1 minute'
      ORDER BY priority DESC, scheduled_for ASC
    `, [userId]);

    console.log('NOTIFICATION QUEUE:');
    console.log('--------------------------------------------------');
    console.log(`Found ${queue.rows.length} pending notifications:\n`);
    queue.rows.forEach(n => {
      console.log(`   - ${n.trigger_code} (${n.template_key})`);
      console.log(`     ID: ${n.id}, Priority: ${n.priority}`);
      console.log(`     Scheduled: ${n.scheduled_for}\n`);
    });

    console.log('========================================');
    console.log('✅ ALL NOTIFICATIONS CREATED SUCCESSFULLY');
    console.log('========================================\n');

    console.log('⏰ Background processor will send these emails within 2 minutes');
    console.log(`📧 Check inbox: ${TEST_EMAIL}`);
    console.log('📧 Also check spam folder\n');

    // Show how to monitor
    console.log('To monitor processing status, run:');
    console.log(`   SELECT id, trigger_code, status, sent_at, error_message FROM email_notifications WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 5;\n`);

    client.release();
    return true;

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('Stack:', error.stack);
    return false;
  } finally {
    await pool.end();
  }
}

testNotificationCreation()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
