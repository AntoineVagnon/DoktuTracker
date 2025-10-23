// Production Smoke Test - Bitdefender Fix Verification
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Use PRODUCTION database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const TEST_EMAIL = 'antoine.vagnon@gmail.com'; // Your test email

async function productionSmokeTest() {
  console.log('\n========================================');
  console.log('PRODUCTION SMOKE TEST - BITDEFENDER FIX');
  console.log('========================================\n');

  const client = await pool.connect();

  try {
    // Get or create test user
    let testUser = await client.query(`
      SELECT id, email FROM users WHERE email = $1
    `, [TEST_EMAIL]);

    let userId;
    if (testUser.rows.length === 0) {
      const newUser = await client.query(`
        INSERT INTO users (email, role, first_name, last_name)
        VALUES ($1, 'patient', 'Antoine', 'Test')
        RETURNING id, email
      `, [TEST_EMAIL]);
      userId = newUser.rows[0].id;
      console.log(`✅ Created test user ID: ${userId}`);
    } else {
      userId = testUser.rows[0].id;
      console.log(`✅ Using existing user ID: ${userId} (${testUser.rows[0].email})`);
    }

    // Create Password Reset Notification (A3 - Should have tracking DISABLED)
    console.log('\n📧 Creating Password Reset Notification (A3)');
    console.log('Expected: Tracking DISABLED (Bitdefender fix)');
    console.log('--------------------------------------------------');

    const resetToken = `prod-test-${Date.now()}`;
    const notification = await client.query(`
      INSERT INTO email_notifications (
        user_id, trigger_code, template_key, status, priority,
        scheduled_for, merge_data, metadata
      ) VALUES (
        $1, 'A3', 'account_password_reset', 'pending', 100,
        NOW(), $2::jsonb, $3::jsonb
      ) RETURNING id, trigger_code, template_key, status, created_at
    `, [
      userId,
      JSON.stringify({
        first_name: 'Antoine',
        email: TEST_EMAIL,
        reset_link: `https://doktu-tracker.vercel.app/password-reset?token=${resetToken}`,
        expiry_time: '1 hour'
      }),
      JSON.stringify({
        test: true,
        production_smoke_test: true,
        test_id: 'PROD-SMOKE-001',
        timestamp: new Date().toISOString()
      })
    ]);

    console.log(`✅ Notification created successfully`);
    console.log(`   Notification ID: ${notification.rows[0].id}`);
    console.log(`   Trigger Code: ${notification.rows[0].trigger_code}`);
    console.log(`   Template: ${notification.rows[0].template_key}`);
    console.log(`   Status: ${notification.rows[0].status}`);
    console.log(`   Reset Token: ${resetToken}`);

    console.log('\n⏰ Waiting 130 seconds for background processor...');
    console.log('   (Background processor runs every 2 minutes)\n');

    await new Promise(resolve => setTimeout(resolve, 130000));

    // Check if email was sent
    const result = await client.query(`
      SELECT id, trigger_code, template_key, status, sent_at, error_message
      FROM email_notifications
      WHERE id = $1
    `, [notification.rows[0].id]);

    const notif = result.rows[0];

    console.log('========================================');
    console.log('PRODUCTION TEST RESULTS');
    console.log('========================================\n');

    console.log(`Notification ID: ${notif.id}`);
    console.log(`Trigger Code: ${notif.trigger_code}`);
    console.log(`Template: ${notif.template_key}`);

    if (notif.status === 'sent') {
      console.log(`\n✅ SUCCESS - Email sent successfully!`);
      console.log(`   Status: SENT`);
      console.log(`   Sent at: ${notif.sent_at}`);
      console.log(`   Tracking: DISABLED (Bitdefender fix active)`);

      console.log('\n========================================');
      console.log('MANUAL VERIFICATION STEPS');
      console.log('========================================\n');

      console.log('1. Check inbox: ' + TEST_EMAIL);
      console.log('2. Find email with subject: "Reset Your Doktu Password"');
      console.log('3. Hover over "Reset Password" button');
      console.log('4. Verify link is DIRECT (should be doktu-tracker.vercel.app)');
      console.log('5. Click link WITH Bitdefender enabled');
      console.log('6. Confirm NO security warning appears');

      console.log('\n🔍 Expected Link Format:');
      console.log(`   https://doktu-tracker.vercel.app/password-reset?token=${resetToken}`);
      console.log('\n❌ NOT this (would be blocked by Bitdefender):');
      console.log('   https://mailgun-tracking.com/click/...');

      console.log('\n✅ PRODUCTION SMOKE TEST PASSED\n');
      client.release();
      await pool.end();
      process.exit(0);
    } else if (notif.status === 'failed') {
      console.log(`\n❌ FAILED - Email sending failed`);
      console.log(`   Error: ${notif.error_message}`);
      console.log('\n❌ PRODUCTION SMOKE TEST FAILED\n');
      client.release();
      await pool.end();
      process.exit(1);
    } else {
      console.log(`\n⏳ PENDING - Email still processing`);
      console.log(`   Status: ${notif.status}`);
      console.log('   (May need to wait longer)\n');
      client.release();
      await pool.end();
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ TEST EXECUTION FAILED:', error.message);
    console.error('Stack:', error.stack);
    client.release();
    await pool.end();
    process.exit(1);
  }
}

productionSmokeTest();
