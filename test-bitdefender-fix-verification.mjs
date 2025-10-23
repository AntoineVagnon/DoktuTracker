// Quick Bitdefender Fix Verification - Check if Railway deployed latest code
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const TEST_EMAIL = 'antoine.vagnon@gmail.com';

async function quickTest() {
  console.log('\n========================================');
  console.log('BITDEFENDER FIX VERIFICATION TEST');
  console.log('Testing if Railway deployed latest code');
  console.log('========================================\n');

  const client = await pool.connect();

  try {
    const user = await client.query(`SELECT id FROM users WHERE email = $1`, [TEST_EMAIL]);
    const userId = user.rows[0].id;

    console.log('Creating new password reset notification...');
    const resetToken = `verify-fix-${Date.now()}`;

    const notification = await client.query(`
      INSERT INTO email_notifications (
        user_id, trigger_code, template_key, status, priority,
        scheduled_for, merge_data, metadata
      ) VALUES (
        $1, 'A3', 'account_password_reset', 'pending', 100,
        NOW(), $2::jsonb, $3::jsonb
      ) RETURNING id, created_at
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
        bitdefender_verification: true,
        test_id: 'VERIFY-FIX-' + Date.now()
      })
    ]);

    console.log(`✅ Created notification: ${notification.rows[0].id}`);
    console.log(`   Token: ${resetToken}`);
    console.log(`   Created at: ${notification.rows[0].created_at}`);
    console.log('\n⏰ Waiting 130 seconds for processor...\n');

    await new Promise(resolve => setTimeout(resolve, 130000));

    const result = await client.query(`
      SELECT id, status, sent_at, error_message
      FROM email_notifications WHERE id = $1
    `, [notification.rows[0].id]);

    const notif = result.rows[0];

    console.log('========================================');
    console.log('TEST RESULT');
    console.log('========================================\n');

    if (notif.status === 'sent') {
      console.log('✅ Email sent successfully');
      console.log(`   Sent at: ${notif.sent_at}`);
      console.log('\n📧 CHECK YOUR EMAIL NOW:');
      console.log(`   To: ${TEST_EMAIL}`);
      console.log('   Subject: "Reset Your Doktu Password"');
      console.log('\n🔍 VERIFY THE LINK:');
      console.log('   1. Hover over "Reset Password" button');
      console.log('   2. Check if link starts with:');
      console.log('      ✅ https://doktu-tracker.vercel.app (CORRECT - fix working)');
      console.log('      ❌ https://email.mg.doktu.co/c/... (WRONG - fix not deployed)');
      console.log('\n   Expected token in URL: ' + resetToken);
    } else {
      console.log(`❌ Email status: ${notif.status}`);
      if (notif.error_message) {
        console.log(`   Error: ${notif.error_message}`);
      }
    }

    client.release();
    await pool.end();
    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    client.release();
    await pool.end();
    process.exit(1);
  }
}

quickTest();
