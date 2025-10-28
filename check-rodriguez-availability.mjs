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

console.log('\n🔍 Checking Dr. Rodriguez Availability');
console.log('═'.repeat(80));

// Find Dr. Rodriguez
const doctors = await sql`
  SELECT d.id, d.user_id, u.first_name, u.last_name, u.email
  FROM doctors d
  JOIN users u ON d.user_id = u.id
  WHERE LOWER(u.last_name) LIKE '%rodriguez%'
  LIMIT 5
`;

if (doctors.length === 0) {
  console.log('❌ No doctor found with last name containing "rodriguez"');
  await sql.end();
  process.exit(0);
}

console.log(`\n✅ Found ${doctors.length} doctor(s):\n`);

for (const doc of doctors) {
  console.log(`📋 Dr. ${doc.first_name} ${doc.last_name}`);
  console.log(`   Doctor ID: ${doc.id}`);
  console.log(`   User ID: ${doc.user_id}`);
  console.log(`   Email: ${doc.email}`);

  // Get all time slot records
  const slots = await sql`
    SELECT
      id,
      date,
      start_time,
      end_time,
      is_available,
      locked_until,
      locked_by,
      created_at
    FROM doctor_time_slots
    WHERE doctor_id = ${doc.id}
    ORDER BY date, start_time
  `;

  console.log(`\n   📅 Time Slot Records: ${slots.length}`);

  if (slots.length === 0) {
    console.log('   ⚠️  No time slots found!');
    console.log('   💡 Tip: You need to create time slots, not just "availability"');
  } else {
    console.log('');
    const now = new Date();
    let futureCount = 0;
    let availableCount = 0;

    for (const slot of slots.slice(0, 10)) { // Show first 10
      const status = slot.is_available ? '✅ Available' : '❌ Booked';
      const slotDate = new Date(slot.date);
      const isFuture = slotDate >= now;
      if (isFuture) futureCount++;
      if (slot.is_available && isFuture) availableCount++;

      const futureMarker = isFuture ? '📅' : '⏳';
      console.log(`   ${futureMarker} ${status} | ${slot.date} | ${slot.start_time}-${slot.end_time}`);
      if (slot.locked_until) {
        console.log(`      🔒 Locked until: ${slot.locked_until}`);
      }
    }

    if (slots.length > 10) {
      console.log(`   ... and ${slots.length - 10} more slots`);
    }

    console.log(`\n   📊 Summary:`);
    console.log(`      Total slots: ${slots.length}`);
    console.log(`      Future slots: ${futureCount}`);
    console.log(`      Available future slots: ${availableCount}`);
  }

  // Check recent appointments
  const recentApts = await sql`
    SELECT id, appointment_date, status, created_at
    FROM appointments
    WHERE doctor_id = ${doc.id}
    AND created_at >= NOW() - INTERVAL '7 days'
    ORDER BY created_at DESC
    LIMIT 5
  `;

  console.log(`\n   🗓️  Recent Appointments (last 7 days): ${recentApts.length}`);
  if (recentApts.length > 0) {
    for (const apt of recentApts) {
      console.log(`      #${apt.id} | ${apt.appointment_date} | ${apt.status}`);
    }
  }

  console.log('\n' + '─'.repeat(80) + '\n');
}

// Check if there are any future available slots generated
console.log('🔍 Checking slot generation...\n');

const now = new Date();
const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

console.log(`Current time: ${now.toISOString()}`);
console.log(`Looking for slots between now and: ${oneWeekFromNow.toISOString()}`);

await sql.end();
