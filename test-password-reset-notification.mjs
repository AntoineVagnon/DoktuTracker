// Password Reset Notification Test (TEST-NT-002)
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const TEST_EMAIL = process.env.TEST_EMAIL || 'antoine.vagnon@gmail.com';

async function testPasswordResetNotification() {
  console.log('\n========================================');
  console.log('TEST-NT-002: PASSWORD RESET NOTIFICATION');
  console.log('========================================\n');

  const client = await pool.connect();

  try {
    // Get or create test user
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

    // Create password reset notification (A3)
    console.log('Creating password reset notification (A3)...');
    console.log('--------------------------------------------------');

    const resetToken = `test-reset-token-${Date.now()}`;
    const passwordReset = await client.query(`
      INSERT INTO email_notifications (
        user_id, trigger_code, template_key, status, priority,
        scheduled_for, merge_data, metadata
      ) VALUES (
        $1, 'A3', 'account_password_reset', 'pending', 100,
        NOW(), $2::jsonb, $3::jsonb
      ) RETURNING id, trigger_code, priority, scheduled_for
    `, [
      userId,
      JSON.stringify({
        first_name: 'QA',
        email: TEST_EMAIL,
        reset_link: `https://app.doktu.co/reset-password?token=${resetToken}`,
        expiry_time: '1 hour'
      }),
      JSON.stringify({ test: true, test_id: 'NT-002' })
    ]);

    console.log(`✅ Created notification ID: ${passwordReset.rows[0].id}`);
    console.log(`   Priority: ${passwordReset.rows[0].priority}`);
    console.log(`   Scheduled: ${passwordReset.rows[0].scheduled_for}`);
    console.log(`   Template: account_password_reset`);
    console.log(`   Reset Token: ${resetToken}\n`);

    // Wait for background processor (130 seconds = 2min + 10sec buffer)
    console.log('⏰ Waiting 130 seconds for background processor...\n');
    await new Promise(resolve => setTimeout(resolve, 130000));

    // Check notification status
    console.log('Checking notification status...');
    console.log('--------------------------------------------------');
    const status = await client.query(`
      SELECT id, trigger_code, template_key, status, sent_at, error_message, retry_count
      FROM email_notifications
      WHERE id = $1
    `, [passwordReset.rows[0].id]);

    const notification = status.rows[0];

    if (notification.status === 'sent') {
      console.log('✅ TEST PASSED: Password reset email sent successfully!');
      console.log(`   Status: ${notification.status}`);
      console.log(`   Sent at: ${notification.sent_at}`);
      console.log(`   Template: ${notification.template_key}`);
      console.log(`   Recipient: ${TEST_EMAIL}\n`);

      console.log('========================================');
      console.log('✅ TEST-NT-002: PASSED');
      console.log('========================================\n');

      console.log(`📧 Check inbox: ${TEST_EMAIL}`);
      console.log('📧 Also check spam folder\n');

      client.release();
      return true;

    } else if (notification.status === 'failed') {
      console.log('❌ TEST FAILED: Email failed to send');
      console.log(`   Status: ${notification.status}`);
      console.log(`   Error: ${notification.error_message}`);
      console.log(`   Retry count: ${notification.retry_count}\n`);

      console.log('========================================');
      console.log('❌ TEST-NT-002: FAILED');
      console.log('========================================\n');

      client.release();
      return false;

    } else {
      console.log('⏳ TEST INCONCLUSIVE: Email still pending');
      console.log(`   Status: ${notification.status}`);
      console.log(`   Retry count: ${notification.retry_count}`);
      console.log('   Try running check-notification-status.cjs for updates\n');

      console.log('========================================');
      console.log('⏳ TEST-NT-002: INCONCLUSIVE');
      console.log('========================================\n');

      client.release();
      return false;
    }

  } catch (error) {
    console.error('\n❌ TEST EXECUTION FAILED:', error.message);
    console.error('Stack:', error.stack);
    return false;
  } finally {
    await pool.end();
  }
}

testPasswordResetNotification()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
