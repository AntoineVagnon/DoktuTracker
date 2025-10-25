import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

console.log('\n🔍 Checking Doctor Approval Notifications\n');
console.log('='.repeat(80));

async function checkDoctorApprovalNotification() {
  const client = await pool.connect();

  try {
    // Find the most recently approved doctor
    const recentDoctorResult = await client.query(`
      SELECT
        d.id as doctor_id,
        d.user_id,
        u.first_name,
        u.last_name,
        u.email,
        d.status,
        d.approved_at
      FROM doctors d
      INNER JOIN users u ON d.user_id = u.id
      WHERE d.status = 'active'
      ORDER BY d.approved_at DESC NULLS LAST
      LIMIT 1
    `);

    if (recentDoctorResult.rows.length === 0) {
      console.log('❌ No approved doctors found');
      client.release();
      await pool.end();
      process.exit(0);
    }

    const recentDoctor = recentDoctorResult.rows[0];

    console.log('\n📋 Most Recently Approved Doctor:');
    console.log(`   Name: ${recentDoctor.first_name} ${recentDoctor.last_name}`);
    console.log(`   Email: ${recentDoctor.email}`);
    console.log(`   User ID: ${recentDoctor.user_id}`);
    console.log(`   Doctor ID: ${recentDoctor.doctor_id}`);
    console.log(`   Status: ${recentDoctor.status}`);
    console.log(`   Approved At: ${recentDoctor.approved_at}`);

    // Check for D1 (DOCTOR_APP_APPROVED) notifications for this doctor
    const notificationsResult = await client.query(`
      SELECT
        id,
        trigger_code,
        template_key,
        status,
        scheduled_for,
        sent_at,
        error_message,
        created_at
      FROM email_notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [recentDoctor.user_id]);

    console.log(`\n📧 All Email Notifications for User ${recentDoctor.user_id}:`);
    console.log(`   Total: ${notificationsResult.rows.length}`);

    if (notificationsResult.rows.length === 0) {
      console.log('\n❌ NO notifications found for this doctor!');
      console.log('   Expected: D1 (DOCTOR_APP_APPROVED) notification');
    } else {
      console.log('\n');
      for (const notif of notificationsResult.rows) {
        const icon = notif.trigger_code === 'D1' ? '✅' : '📨';
        console.log(`${icon} Notification ID: ${notif.id}`);
        console.log(`   Trigger Code: ${notif.trigger_code}`);
        console.log(`   Template Key: ${notif.template_key}`);
        console.log(`   Status: ${notif.status}`);
        console.log(`   Scheduled For: ${notif.scheduled_for}`);
        console.log(`   Sent At: ${notif.sent_at || 'NOT SENT YET'}`);
        if (notif.error_message) {
          console.log(`   ❌ Error: ${notif.error_message}`);
        }
        console.log(`   Created At: ${notif.created_at}`);
        console.log('');
      }

      const d1Notif = notificationsResult.rows.find(n => n.trigger_code === 'D1');
      if (!d1Notif) {
        console.log('⚠️  WARNING: No D1 (DOCTOR_APP_APPROVED) notification found!');
        console.log('   This notification should have been created when the doctor was approved.');
        console.log('\n💡 POSSIBLE CAUSES:');
        console.log('   1. The scheduleNotification() call failed silently (caught by try-catch)');
        console.log('   2. The doctor was approved before the notification system was deployed');
        console.log('   3. The approval endpoint was not hit (admin used direct database update)');
      } else {
        console.log('✅ D1 notification exists!');
        if (d1Notif.status === 'sent') {
          console.log('   ✅ Email was sent successfully');
        } else if (d1Notif.status === 'failed') {
          console.log('   ❌ Email failed to send');
          console.log(`      Error: ${d1Notif.error_message}`);
        } else {
          console.log('   ⏳ Email is pending/scheduled');
        }
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

checkDoctorApprovalNotification()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
