import fetch from 'node-fetch';
import pg from 'pg';
const { Client } = pg;

const dbClient = new Client({
  connectionString: 'postgresql://postgres.hzmrkvooqjbxptqjqxii:ArnuVVZ0mS4ZbMR8@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require'
});

await dbClient.connect();

console.log('\n🔍 CHECKING APPOINTMENT AND NOTIFICATION FOR avagnonperso@gmail.com\n');
console.log('='.repeat(80));

// 1. Get user info
console.log('\n1️⃣ Fetching user info...');
const userResult = await dbClient.query(`
  SELECT id, email, first_name, last_name, role, created_at
  FROM users
  WHERE email = 'avagnonperso@gmail.com'
`);

if (userResult.rows.length === 0) {
  console.log('❌ User not found!');
  process.exit(1);
}

const user = userResult.rows[0];
console.log('✅ User found:', {
  id: user.id,
  email: user.email,
  name: `${user.first_name} ${user.last_name}`,
  role: user.role
});

// 2. Get recent appointments
console.log('\n2️⃣ Fetching recent appointments...');
const appointmentResult = await dbClient.query(`
  SELECT a.id, a.appointment_date, a.status, a.doctor_id, a.created_at,
         d.specialty,
         u.first_name as doctor_first_name, u.last_name as doctor_last_name
  FROM appointments a
  JOIN doctors d ON a.doctor_id = d.id
  JOIN users u ON d.user_id = u.id
  WHERE a.patient_id = $1
  ORDER BY a.created_at DESC
  LIMIT 3
`, [user.id]);

console.log(`📅 Found ${appointmentResult.rows.length} recent appointments:`);
appointmentResult.rows.forEach((apt, idx) => {
  console.log(`\n   Appointment #${idx + 1}:`);
  console.log(`   - ID: ${apt.id}`);
  console.log(`   - Date: ${apt.appointment_date}`);
  console.log(`   - Status: ${apt.status}`);
  console.log(`   - Doctor: Dr. ${apt.doctor_first_name} ${apt.doctor_last_name} (ID: ${apt.doctor_id})`);
  console.log(`   - Specialty: ${apt.specialty}`);
  console.log(`   - Created: ${apt.created_at}`);
});

if (appointmentResult.rows.length === 0) {
  console.log('❌ No appointments found!');
  process.exit(1);
}

const latestAppointment = appointmentResult.rows[0];

// 3. Check notification preferences
console.log('\n3️⃣ Checking notification preferences...');
const prefsResult = await dbClient.query(`
  SELECT email_enabled, sms_enabled, locale
  FROM notification_preferences
  WHERE user_id = $1
`, [user.id]);

if (prefsResult.rows.length > 0) {
  const prefs = prefsResult.rows[0];
  console.log('📧 Notification preferences:', {
    email: prefs.email_enabled,
    sms: prefs.sms_enabled,
    locale: prefs.locale
  });
} else {
  console.log('⚠️  No notification preferences found (using defaults)');
}

// 4. Check notifications for this appointment
console.log('\n4️⃣ Checking notifications for latest appointment...');
const notificationsResult = await dbClient.query(`
  SELECT id, trigger_code, channel, status, sent_at, error_message, created_at
  FROM notifications
  WHERE user_id = $1
  ORDER BY created_at DESC
  LIMIT 10
`, [user.id]);

console.log(`📬 Found ${notificationsResult.rows.length} total notifications for user`);

if (notificationsResult.rows.length > 0) {
  console.log('\n   Recent notifications:');
  notificationsResult.rows.forEach((notif, idx) => {
    console.log(`\n   Notification #${idx + 1}:`);
    console.log(`   - ID: ${notif.id}`);
    console.log(`   - Trigger: ${notif.trigger_code}`);
    console.log(`   - Channel: ${notif.channel}`);
    console.log(`   - Status: ${notif.status}`);
    console.log(`   - Created: ${notif.created_at}`);
    console.log(`   - Sent: ${notif.sent_at || 'Not sent'}`);
    if (notif.error_message) {
      console.log(`   - Error: ${notif.error_message}`);
    }
  });

  // Check for appointment confirmation notification
  const confirmationNotif = notificationsResult.rows.find(n =>
    n.trigger_code === 'APPOINTMENT_CONFIRMED' &&
    new Date(n.created_at) >= new Date(latestAppointment.created_at)
  );

  if (confirmationNotif) {
    console.log('\n✅ Appointment confirmation notification found!');
  } else {
    console.log('\n❌ NO appointment confirmation notification found for the latest booking!');
    console.log('   Expected trigger_code: APPOINTMENT_CONFIRMED');
    console.log('   After: ' + latestAppointment.created_at);
  }
} else {
  console.log('❌ No notifications found for this user at all!');
}

// 5. Check server logs via API
console.log('\n5️⃣ Testing production notification endpoint...');
try {
  const response = await fetch('https://web-production-b2ce.up.railway.app/api/test/notification/status', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (response.ok) {
    const data = await response.json();
    console.log('📊 Notification system status:', data);
  } else {
    console.log('⚠️  Could not fetch notification system status:', response.status);
  }
} catch (error) {
  console.log('⚠️  Error checking notification system:', error.message);
}

console.log('\n' + '='.repeat(80));
console.log('✅ Investigation complete');
console.log('='.repeat(80) + '\n');

await dbClient.end();
