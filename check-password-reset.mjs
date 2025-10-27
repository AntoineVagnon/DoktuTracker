import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

console.log('\n🔍 Checking Password Reset Notification for avagnonperso@gmail.com\n');
console.log('='.repeat(80));

async function checkPasswordResetNotification() {
  const client = await pool.connect();

  try {
    // Find the user
    const userResult = await client.query(`
      SELECT id, email, first_name, last_name, created_at
      FROM users
      WHERE email = $1
    `, ['avagnonperso@gmail.com']);

    if (userResult.rows.length === 0) {
      console.log('❌ User not found with email: avagnonperso@gmail.com');
      client.release();
      await pool.end();
      process.exit(0);
    }

    const user = userResult.rows[0];
    console.log('\n📋 User Found:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.first_name} ${user.last_name}`);
    console.log(`   Created: ${user.created_at}`);

    // Find recent password reset notifications (last 24 hours)
    const notificationsResult = await client.query(`
      SELECT
        id,
        trigger_code,
        template_key,
        status,
        scheduled_for,
        sent_at,
        error_message,
        merge_data,
        created_at
      FROM email_notifications
      WHERE user_id = $1
        AND trigger_code = 'A3'
        AND created_at > NOW() - INTERVAL '24 hours'
      ORDER BY created_at DESC
    `, [user.id]);

    console.log(`\n📧 Password Reset Notifications (Last 24 hours):`);
    console.log(`   Total: ${notificationsResult.rows.length}`);

    if (notificationsResult.rows.length === 0) {
      console.log('\n❌ NO password reset notifications found!');
      console.log('   Expected: A3 (ACCOUNT_PASSWORD_RESET) notification');
      console.log('\n💡 POSSIBLE CAUSES:');
      console.log('   1. Password reset endpoint was never called');
      console.log('   2. The notification creation failed silently');
      console.log('   3. Email validation failed');
    } else {
      console.log('\n');
      for (const notif of notificationsResult.rows) {
        const icon = notif.status === 'sent' ? '✅' : notif.status === 'failed' ? '❌' : '⏳';
        console.log(`${icon} Notification ID: ${notif.id}`);
        console.log(`   Trigger Code: ${notif.trigger_code}`);
        console.log(`   Template Key: ${notif.template_key}`);
        console.log(`   Status: ${notif.status}`);
        console.log(`   Scheduled For: ${notif.scheduled_for}`);
        console.log(`   Sent At: ${notif.sent_at || 'NOT SENT YET'}`);
        if (notif.error_message) {
          console.log(`   ❌ Error: ${notif.error_message}`);
        }
        console.log(`   Merge Data: ${JSON.stringify(notif.merge_data, null, 2)}`);
        console.log(`   Created At: ${notif.created_at}`);
        console.log('');
      }
    }

    // Check all recent notifications for this user
    const allRecentResult = await client.query(`
      SELECT
        trigger_code,
        template_key,
        status,
        created_at
      FROM email_notifications
      WHERE user_id = $1
        AND created_at > NOW() - INTERVAL '24 hours'
      ORDER BY created_at DESC
    `, [user.id]);

    if (allRecentResult.rows.length > 0) {
      console.log('\n📨 All Recent Notifications (Last 24 hours):');
      for (const notif of allRecentResult.rows) {
        console.log(`   ${notif.trigger_code} (${notif.template_key}) - ${notif.status} - ${notif.created_at}`);
      }
    }

    client.release();

  } catch (error) {
    console.error('\n❌ Error:', error);
    client.release();
    await pool.end();
    process.exit(1);
  }

  console.log('\n' + '='.repeat(80));
  await pool.end();
}

checkPasswordResetNotification()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
