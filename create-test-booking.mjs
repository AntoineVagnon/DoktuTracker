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

console.log('\n🧪 Creating test booking to verify P0 fix...\n');

// Find a test patient
const patients = await sql`
  SELECT id, first_name, last_name, email
  FROM users
  WHERE role = 'patient'
    AND email LIKE '%test%'
  LIMIT 1
`;

if (patients.length === 0) {
  console.log('❌ No test patient found. Using any patient...');
  const anyPatient = await sql`
    SELECT id, first_name, last_name, email
    FROM users
    WHERE role = 'patient'
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if (anyPatient.length === 0) {
    console.log('❌ No patients found in database!');
    await sql.end();
    process.exit(1);
  }

  patients.push(anyPatient[0]);
}

const patient = patients[0];
console.log(`✅ Using patient: ${patient.first_name} ${patient.last_name} (${patient.email})`);

// Find an approved doctor from doctors table
const doctors = await sql`
  SELECT d.id, u.first_name, u.last_name
  FROM doctors d
  JOIN users u ON d.user_id = u.id
  WHERE u.approved = true
  LIMIT 1
`;

if (doctors.length === 0) {
  console.log('❌ No approved doctors found!');
  await sql.end();
  process.exit(1);
}

const doctor = doctors[0];
console.log(`✅ Using doctor: ${doctor.first_name} ${doctor.last_name} (Doctor ID: ${doctor.id})\n`);

// Create appointment
const appointmentDate = new Date();
appointmentDate.setDate(appointmentDate.getDate() + 7); // 7 days from now
appointmentDate.setHours(14, 0, 0, 0); // 2 PM

console.log('📅 Creating appointment...');

const [appointment] = await sql`
  INSERT INTO appointments (
    patient_id,
    doctor_id,
    appointment_date,
    status,
    price,
    created_at,
    updated_at
  ) VALUES (
    ${patient.id},
    ${doctor.id},
    ${appointmentDate.toISOString()},
    'scheduled',
    '35.00',
    NOW(),
    NOW()
  )
  RETURNING id, appointment_date, status
`;

console.log(`✅ Appointment created: ID ${appointment.id}`);
console.log(`   Date: ${new Date(appointment.appointment_date).toISOString()}`);
console.log(`   Status: ${appointment.status}\n`);

console.log('⏳ Waiting 5 seconds for notification processing...\n');
await new Promise(resolve => setTimeout(resolve, 5000));

// Check notification_queue
const queueEntries = await sql`
  SELECT id, trigger_code, status, created_at
  FROM notification_queue
  WHERE appointment_id = ${appointment.id}
  ORDER BY created_at DESC
`;

console.log('📬 Notification Queue:');
if (queueEntries.length === 0) {
  console.log('   ⚠️  No entries found - notification may not have been triggered');
} else {
  queueEntries.forEach(q => {
    console.log(`   - Queue ID ${q.id}: ${q.trigger_code} (${q.status})`);
  });
}
console.log('');

// Check email_notifications
const emails = await sql`
  SELECT id, template_key, status, error_message, created_at
  FROM email_notifications
  WHERE appointment_id = ${appointment.id}
  ORDER BY created_at DESC
`;

console.log('📧 Email Notifications:');
if (emails.length === 0) {
  console.log('   ⚠️  No emails found - notification processing may be delayed\n');
  console.log('💡 Run this to check later:');
  console.log(`   node -e "import('postgres').then(p => { const sql = p.default('${process.env.DATABASE_URL}'); sql\\\`SELECT * FROM email_notifications WHERE appointment_id = ${appointment.id}\\\`.then(r => { console.log(r); sql.end(); }); });"`);
} else {
  let success = false;
  emails.forEach(e => {
    console.log(`   - Email ID ${e.id}: ${e.template_key}`);
    console.log(`     Status: ${e.status}`);
    if (e.status === 'sent') {
      console.log('     ✅ EMAIL SENT SUCCESSFULLY!');
      success = true;
    } else if (e.status === 'failed') {
      console.log('     ❌ EMAIL FAILED');
      if (e.error_message) {
        console.log(`     Error: ${e.error_message.substring(0, 100)}`);
        if (e.error_message.includes('Cannot convert undefined or null to object')) {
          console.log('     🚨 THIS IS THE OLD ERROR - P0 FIX NOT WORKING!');
        }
      }
    } else {
      console.log(`     ⏳ Status: ${e.status}`);
    }
  });

  console.log('');
  if (success) {
    console.log('✅✅✅ P0 FIX VERIFIED: Email sent successfully!');
    console.log('   No template rendering errors occurred.');
  } else {
    console.log('⚠️  Email did not send successfully - check error details above');
  }
}

console.log(`\n📝 Test appointment ID: ${appointment.id}`);
console.log('   Use this to query details later if needed\n');

await sql.end();
