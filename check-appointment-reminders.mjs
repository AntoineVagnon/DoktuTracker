import pg from 'pg';
const { Client } = pg;

const dbClient = new Client({
  connectionString: 'postgresql://postgres.hzmrkvooqjbxptqjqxii:ArnuVVZ0mS4ZbMR8@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require'
});

await dbClient.connect();

console.log('\n🔍 CHECKING APPOINTMENT REMINDERS FOR avagnonperso@gmail.com\n');
console.log('='.repeat(80));

// 1. Get user info
const userResult = await dbClient.query(`
  SELECT id, email, first_name, last_name
  FROM users
  WHERE email = 'avagnonperso@gmail.com'
`);

const user = userResult.rows[0];
console.log('✅ User:', { id: user.id, email: user.email, name: `${user.first_name} ${user.last_name}` });

// 2. Get upcoming and recent appointments
const now = new Date();
const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

console.log(`\n⏰ Current time: ${now.toISOString()}`);
console.log(`⏰ Checking appointments from: ${oneDayAgo.toISOString()}`);
console.log(`⏰ To: ${twoDaysFromNow.toISOString()}\n`);

const appointmentsResult = await dbClient.query(`
  SELECT
    a.id,
    a.appointment_date,
    a.status,
    a.created_at,
    d.specialty,
    u.first_name as doctor_first_name,
    u.last_name as doctor_last_name,
    (a.appointment_date - NOW()) as time_until_appointment
  FROM appointments a
  JOIN doctors d ON a.doctor_id = d.id
  JOIN users u ON d.user_id = u.id
  WHERE a.patient_id = $1
    AND a.appointment_date >= $2
    AND a.appointment_date <= $3
  ORDER BY a.appointment_date ASC
`, [user.id, oneDayAgo.toISOString(), twoDaysFromNow.toISOString()]);

console.log(`📅 Found ${appointmentsResult.rows.length} appointments:\n`);

appointmentsResult.rows.forEach((apt, idx) => {
  const aptDate = new Date(apt.appointment_date);
  const hoursUntil = (aptDate - now) / (1000 * 60 * 60);

  console.log(`Appointment #${idx + 1}:`);
  console.log(`  ID: ${apt.id}`);
  console.log(`  Date: ${apt.appointment_date}`);
  console.log(`  Status: ${apt.status}`);
  console.log(`  Doctor: Dr. ${apt.doctor_first_name} ${apt.doctor_last_name}`);
  console.log(`  Specialty: ${apt.specialty}`);
  console.log(`  Hours until appointment: ${hoursUntil.toFixed(2)}`);
  console.log(`  Should have 24h reminder: ${hoursUntil > 23 && hoursUntil < 25 ? 'YES' : 'NO'}`);
  console.log(`  Should have 1h reminder: ${hoursUntil > 0.5 && hoursUntil < 1.5 ? 'YES' : 'NO'}`);
  console.log('');
});

// 3. Check for reminder notifications (B4 = 24h reminder, B5 = 1h reminder)
console.log('📬 Checking for appointment reminder notifications...\n');

const remindersResult = await dbClient.query(`
  SELECT
    id,
    trigger_code,
    template_key,
    status,
    scheduled_for,
    sent_at,
    created_at,
    merge_data
  FROM email_notifications
  WHERE user_id = $1
    AND trigger_code IN ('B4', 'B5')
  ORDER BY created_at DESC
  LIMIT 10
`, [user.id]);

console.log(`Found ${remindersResult.rows.length} reminder notifications:\n`);

if (remindersResult.rows.length > 0) {
  remindersResult.rows.forEach((reminder, idx) => {
    console.log(`Reminder #${idx + 1}:`);
    console.log(`  ID: ${reminder.id}`);
    console.log(`  Trigger: ${reminder.trigger_code} (${reminder.trigger_code === 'B4' ? '24h reminder' : '1h reminder'})`);
    console.log(`  Template: ${reminder.template_key}`);
    console.log(`  Status: ${reminder.status}`);
    console.log(`  Scheduled for: ${reminder.scheduled_for}`);
    console.log(`  Sent at: ${reminder.sent_at || 'Not sent'}`);
    console.log(`  Created: ${reminder.created_at}`);
    console.log('');
  });
} else {
  console.log('❌ NO reminder notifications found!\n');
  console.log('This means the reminder notifications were never scheduled.');
  console.log('Reminders should be scheduled by a background worker/cron job.');
}

// 4. Check if there's a reminder scheduler running
console.log('='.repeat(80));
console.log('💡 Analysis:\n');
console.log('Appointment reminders (24h and 1h before) are typically scheduled by:');
console.log('  1. A cron job or scheduled task that runs periodically');
console.log('  2. Or a worker process that checks upcoming appointments');
console.log('  3. These should create email_notifications with trigger_code B4 or B5');
console.log('\nIf no reminders are being created, the reminder scheduler may not be running.');
console.log('='.repeat(80) + '\n');

await dbClient.end();
