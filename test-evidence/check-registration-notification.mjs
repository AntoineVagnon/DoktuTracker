import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const u = new URL(process.env.DATABASE_URL);
const sql = postgres({
  host: u.hostname,
  port: Number(u.port) || 5432,
  database: u.pathname.slice(1),
  user: decodeURIComponent(u.username),
  password: decodeURIComponent(u.password || ''),
  ssl: { rejectUnauthorized: false },
  prepare: false,
});

async function checkRegistrationNotification() {
  try {
    console.log('✅ Connected to database\n');

    // Get the user ID for our test user
    const users = await sql`
      SELECT id, email, first_name, last_name, created_at
      FROM users
      WHERE email = 'qa.test.2025.10.25.001@doktu.co'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (users.length === 0) {
      console.log('❌ Test user not found in database');
      await sql.end();
      return;
    }

    const user = users[0];
    console.log('📧 Test User Found:');
    console.log(`   User ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.first_name} ${user.last_name}`);
    console.log(`   Created: ${user.created_at}\n`);

    // Check for registration notification (A1)
    const notifications = await sql`
      SELECT
        id,
        trigger_code,
        user_id,
        status,
        error_message,
        sent_at,
        created_at
      FROM email_notifications
      WHERE user_id = ${user.id}
        AND trigger_code = 'A1'
      ORDER BY created_at DESC
    `;

    console.log('📬 Registration Notifications (A1):');
    console.log(`   Total Count: ${notifications.length}\n`);

    if (notifications.length === 0) {
      console.log('❌ NO REGISTRATION NOTIFICATION FOUND');
      console.log('   Expected: 1 notification with trigger_code = A1');
      console.log('   Actual: 0 notifications');
    } else if (notifications.length > 1) {
      console.log('⚠️  DUPLICATE NOTIFICATIONS DETECTED');
      console.log(`   Expected: 1 notification`);
      console.log(`   Actual: ${notifications.length} notifications\n`);

      notifications.forEach((n, idx) => {
        console.log(`   Notification ${idx + 1}:`);
        console.log(`     ID: ${n.id}`);
        console.log(`     Status: ${n.status}`);
        console.log(`     Sent At: ${n.sent_at}`);
        console.log(`     Created: ${n.created_at}`);
        console.log(`     Error: ${n.error_message || 'None'}\n`);
      });
    } else {
      const notification = notifications[0];
      console.log('✅ SINGLE NOTIFICATION FOUND (No Duplicates)');
      console.log(`   ID: ${notification.id}`);
      console.log(`   Status: ${notification.status}`);
      console.log(`   Sent At: ${notification.sent_at || 'Pending'}`);
      console.log(`   Created: ${notification.created_at}`);
      console.log(`   Error: ${notification.error_message || 'None'}\n`);

      if (notification.status === 'sent') {
        console.log('✅ NOTIFICATION SUCCESSFULLY SENT');
      } else if (notification.status === 'pending') {
        console.log('⏳ NOTIFICATION PENDING (Check Mailgun queue)');
      } else if (notification.status === 'failed') {
        console.log('❌ NOTIFICATION FAILED');
        console.log(`   Error: ${notification.error_message}`);
      }
    }

    // Check for ANY duplicates in the system
    const duplicates = await sql`
      SELECT
        user_id,
        trigger_code,
        COUNT(*) as count
      FROM email_notifications
      WHERE user_id = ${user.id}
      GROUP BY user_id, trigger_code
      HAVING COUNT(*) > 1
    `;

    console.log('\n🔍 Duplicate Check:');
    if (duplicates.length === 0) {
      console.log('   ✅ No duplicate notifications found');
    } else {
      console.log('   ❌ Duplicates detected:');
      duplicates.forEach(row => {
        console.log(`      ${row.trigger_code}: ${row.count} notifications`);
      });
    }

  } catch (error) {
    console.error('❌ Database Error:', error.message);
  } finally {
    await sql.end();
  }
}

checkRegistrationNotification();
