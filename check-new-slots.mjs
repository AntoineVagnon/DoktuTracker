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

console.log('\n🔍 Checking Recent Slots for Dr. Rodriguez');
console.log('═'.repeat(80));

const doctorId = 9; // Dr. Rodriguez

// Get slots created in last 10 minutes
const recentSlots = await sql`
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
  WHERE doctor_id = ${doctorId}
  AND created_at >= NOW() - INTERVAL '10 minutes'
  ORDER BY created_at DESC, date, start_time
`;

console.log(`\n📅 Slots Created in Last 10 Minutes: ${recentSlots.length}\n`);

if (recentSlots.length === 0) {
  console.log('❌ No slots created in the last 10 minutes');
  console.log('   This means the slot creation failed or didn\'t reach the database\n');
} else {
  for (const slot of recentSlots) {
    const status = slot.is_available ? '✅ Available' : '❌ Booked';
    console.log(`${status} | ${slot.date} | ${slot.start_time}-${slot.end_time}`);
    console.log(`   Slot ID: ${slot.id}`);
    console.log(`   Created: ${slot.created_at}`);
    if (slot.locked_until) {
      console.log(`   🔒 Locked until: ${slot.locked_until}`);
    }
    console.log('');
  }
}

// Get all October/November slots
console.log('─'.repeat(80));
console.log('\n📅 All October/November 2025 Slots:\n');

const futureSlots = await sql`
  SELECT
    id,
    date,
    start_time,
    end_time,
    is_available,
    locked_until,
    created_at
  FROM doctor_time_slots
  WHERE doctor_id = ${doctorId}
  AND date >= '2025-10-24'
  AND date <= '2025-11-30'
  ORDER BY date, start_time
  LIMIT 50
`;

console.log(`Found ${futureSlots.length} slots for Oct-Nov 2025:\n`);

if (futureSlots.length === 0) {
  console.log('❌ NO FUTURE SLOTS FOUND!');
  console.log('   Slots need to be created for October-November 2025\n');
} else {
  // Group by date
  const byDate = {};
  for (const slot of futureSlots) {
    if (!byDate[slot.date]) {
      byDate[slot.date] = [];
    }
    byDate[slot.date].push(slot);
  }

  for (const [date, slots] of Object.entries(byDate)) {
    const available = slots.filter(s => s.is_available).length;
    console.log(`📆 ${date}: ${slots.length} slots (${available} available)`);

    // Show first 3 slots
    slots.slice(0, 3).forEach(s => {
      const status = s.is_available ? '✅' : '❌';
      console.log(`   ${status} ${s.start_time}-${s.end_time} (ID: ${s.id})`);
    });
    if (slots.length > 3) {
      console.log(`   ... and ${slots.length - 3} more`);
    }
    console.log('');
  }
}

// Check what the API endpoint would return
console.log('─'.repeat(80));
console.log('\n🔍 Testing API Query Logic:\n');

const now = new Date();
console.log(`Current time: ${now.toISOString()}`);

const apiSlots = await sql`
  SELECT
    id,
    date,
    start_time,
    end_time,
    is_available
  FROM doctor_time_slots
  WHERE doctor_id = ${doctorId}
  AND is_available = true
  AND date >= CURRENT_DATE
  ORDER BY date, start_time
  LIMIT 10
`;

console.log(`\nSlots API would return: ${apiSlots.length}\n`);

if (apiSlots.length === 0) {
  console.log('❌ API Query Returns NO SLOTS!');
  console.log('   This is why the frontend shows nothing.\n');
} else {
  apiSlots.forEach(s => {
    console.log(`✅ ${s.date} | ${s.start_time}-${s.end_time} (ID: ${s.id})`);
  });
}

await sql.end();
