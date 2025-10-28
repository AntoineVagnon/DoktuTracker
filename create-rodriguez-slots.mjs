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

console.log('\n🔧 Creating Time Slots for Dr. Rodriguez');
console.log('═'.repeat(80));

const doctorId = 9; // Dr. Rodriguez

// Generate slots for next 14 days
const startDate = new Date();
startDate.setHours(0, 0, 0, 0);

const slots = [];

// For each day in the next 14 days
for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
  const date = new Date(startDate);
  date.setDate(date.getDate() + dayOffset);

  // Skip Sundays (0 = Sunday)
  if (date.getDay() === 0) continue;

  // Format date as YYYY-MM-DD
  const dateStr = date.toISOString().split('T')[0];

  // Morning slots: 9:00 - 12:00 (30-minute slots)
  const morningSlots = [
    { start: '09:00:00', end: '09:30:00' },
    { start: '09:30:00', end: '10:00:00' },
    { start: '10:00:00', end: '10:30:00' },
    { start: '10:30:00', end: '11:00:00' },
    { start: '11:00:00', end: '11:30:00' },
    { start: '11:30:00', end: '12:00:00' },
  ];

  // Afternoon slots: 14:00 - 18:00 (30-minute slots)
  const afternoonSlots = [
    { start: '14:00:00', end: '14:30:00' },
    { start: '14:30:00', end: '15:00:00' },
    { start: '15:00:00', end: '15:30:00' },
    { start: '15:30:00', end: '16:00:00' },
    { start: '16:00:00', end: '16:30:00' },
    { start: '16:30:00', end: '17:00:00' },
    { start: '17:00:00', end: '17:30:00' },
    { start: '17:30:00', end: '18:00:00' },
  ];

  const daySlots = [...morningSlots, ...afternoonSlots];

  for (const slot of daySlots) {
    slots.push({
      date: dateStr,
      startTime: slot.start,
      endTime: slot.end,
    });
  }
}

console.log(`\n📅 Generating ${slots.length} slots for next 14 days (Mon-Sat)...\n`);

// Get existing slots to avoid duplicates
console.log('🔍 Checking for existing slots...');

const today = new Date().toISOString().split('T')[0];
const existingSlots = await sql`
  SELECT date, start_time
  FROM doctor_time_slots
  WHERE doctor_id = ${doctorId}
  AND date >= ${today}
`;

const existingSet = new Set(
  existingSlots.map(s => `${s.date}_${s.start_time}`)
);

console.log(`✅ Found ${existingSlots.length} existing future slots\n`);

// Filter out slots that already exist
const newSlots = slots.filter(slot => {
  const key = `${slot.date}_${slot.startTime}`;
  return !existingSet.has(key);
});

console.log(`📝 Creating ${newSlots.length} new slots (skipping ${slots.length - newSlots.length} existing)...\n`);

let insertedCount = 0;

for (const slot of newSlots) {
  try {
    await sql`
      INSERT INTO doctor_time_slots (doctor_id, date, start_time, end_time, is_available, created_at)
      VALUES (${doctorId}, ${slot.date}, ${slot.startTime}, ${slot.endTime}, true, NOW())
    `;
    insertedCount++;

    if (insertedCount % 20 === 0) {
      console.log(`   Inserted ${insertedCount}/${newSlots.length} slots...`);
    }
  } catch (err) {
    console.error(`Failed to insert slot ${slot.date} ${slot.startTime}:`, err.message);
  }
}

console.log(`\n✅ Successfully created ${insertedCount} time slots!\n`);

// Verify creation
const verifySlots = await sql`
  SELECT COUNT(*) as count
  FROM doctor_time_slots
  WHERE doctor_id = ${doctorId}
  AND date >= ${today}
  AND is_available = true
`;

console.log('─'.repeat(80));
console.log(`\n📊 Verification:`);
console.log(`   Total available future slots: ${verifySlots[0].count}`);
console.log(`\n✅ Dr. Rodriguez now has ${verifySlots[0].count} available slots!`);
console.log(`\n🎯 Next step: Refresh the frontend and try booking an appointment!\n`);

await sql.end();
