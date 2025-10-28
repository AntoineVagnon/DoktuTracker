import pg from 'pg';
const { Client } = pg;

const dbClient = new Client({
  connectionString: 'postgresql://postgres.hzmrkvooqjbxptqjqxii:ArnuVVZ0mS4ZbMR8@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require'
});

await dbClient.connect();

console.log('\n🔍 INVESTIGATING NOTIFICATION FAILURE FOR avagnonperso@gmail.com\n');
console.log('='.repeat(80));

// 1. Get user info
const userResult = await dbClient.query(`
  SELECT id, email, first_name, last_name
  FROM users
  WHERE email = 'avagnonperso@gmail.com'
`);

const user = userResult.rows[0];
console.log('✅ User:', { id: user.id, email: user.email });

// 2. Get the most recent appointment
const appointmentResult = await dbClient.query(`
  SELECT a.id, a.appointment_date, a.status, a.doctor_id, a.created_at,
         d.specialty,
         u.first_name as doctor_first_name, u.last_name as doctor_last_name
  FROM appointments a
  JOIN doctors d ON a.doctor_id = d.id
  JOIN users u ON d.user_id = u.id
  WHERE a.patient_id = $1
  ORDER BY a.created_at DESC
  LIMIT 1
`, [user.id]);

const appointment = appointmentResult.rows[0];
console.log('\n📅 Most recent appointment:');
console.log('   ID:', appointment.id);
console.log('   Created:', appointment.created_at);
console.log('   Doctor:', `Dr. ${appointment.doctor_first_name} ${appointment.doctor_last_name}`);
console.log('   Status:', appointment.status);

// 3. Check for notifications in the notifications table
console.log('\n📬 Checking notifications table...');
const notificationsResult = await dbClient.query(`
  SELECT id, trigger_code, type, title, message, status, created_at, sent_at, error_message
  FROM notifications
  WHERE user_id = $1
  ORDER BY created_at DESC
  LIMIT 5
`, [user.id]);

console.log(`   Found ${notificationsResult.rows.length} notifications in notifications table`);
if (notificationsResult.rows.length > 0) {
  notificationsResult.rows.forEach((notif, idx) => {
    console.log(`\n   Notification #${idx + 1}:`);
    console.log(`   - ID: ${notif.id}`);
    console.log(`   - Trigger: ${notif.trigger_code}`);
    console.log(`   - Type: ${notif.type}`);
    console.log(`   - Status: ${notif.status}`);
    console.log(`   - Created: ${notif.created_at}`);
    console.log(`   - Sent: ${notif.sent_at || 'Not sent'}`);
    if (notif.error_message) {
      console.log(`   - Error: ${notif.error_message}`);
    }
  });
} else {
  console.log('   ❌ NO notifications found in notifications table!');
}

// 4. Check email_notifications table
console.log('\n📧 Checking email_notifications table...');
const emailNotificationsResult = await dbClient.query(`
  SELECT id, trigger_code, template_key, status, created_at, sent_at, error_message, merge_data
  FROM email_notifications
  WHERE user_id = $1
  ORDER BY created_at DESC
  LIMIT 5
`, [user.id]);

console.log(`   Found ${emailNotificationsResult.rows.length} email notifications`);
if (emailNotificationsResult.rows.length > 0) {
  emailNotificationsResult.rows.forEach((notif, idx) => {
    console.log(`\n   Email Notification #${idx + 1}:`);
    console.log(`   - ID: ${notif.id}`);
    console.log(`   - Trigger: ${notif.trigger_code}`);
    console.log(`   - Template: ${notif.template_key}`);
    console.log(`   - Status: ${notif.status}`);
    console.log(`   - Created: ${notif.created_at}`);
    console.log(`   - Sent: ${notif.sent_at || 'Not sent'}`);
    if (notif.error_message) {
      console.log(`   - Error: ${notif.error_message}`);
    }
    if (notif.merge_data) {
      console.log(`   - Data: ${JSON.stringify(notif.merge_data)}`);
    }
  });
} else {
  console.log('   ❌ NO email notifications found!');
}

// 5. Check notification preferences
console.log('\n⚙️  Checking notification preferences...');
const prefsResult = await dbClient.query(`
  SELECT email_enabled, sms_enabled, transactional_enabled, appointment_reminders_enabled, locale
  FROM notification_preferences
  WHERE user_id = $1
`, [user.id]);

if (prefsResult.rows.length > 0) {
  const prefs = prefsResult.rows[0];
  console.log('   Email enabled:', prefs.email_enabled);
  console.log('   SMS enabled:', prefs.sms_enabled);
  console.log('   Transactional enabled:', prefs.transactional_enabled);
  console.log('   Appointment reminders enabled:', prefs.appointment_reminders_enabled);
  console.log('   Locale:', prefs.locale);
} else {
  console.log('   ⚠️  No notification preferences found (using defaults)');
}

console.log('\n' + '='.repeat(80));
console.log('🔍 Investigation complete');
console.log('='.repeat(80) + '\n');

await dbClient.end();
