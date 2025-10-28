import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

console.log('\n🔍 CALENDAR ISSUE DIAGNOSTIC REPORT\n');
console.log('='.repeat(80));

async function diagnose() {
  const client = await pool.connect();

  try {
    // Check what the actual API endpoint returns
    console.log('\n📊 Step 1: Checking Oct 28 slots for Doctor 9 from database\n');

    const slotsResult = await client.query(`
      SELECT
        id,
        doctor_id,
        date,
        start_time,
        end_time,
        is_available,
        created_at,
        EXTRACT(HOUR FROM start_time::time) as hour
      FROM doctor_time_slots
      WHERE doctor_id = 9
        AND date = '2025-10-28'
      ORDER BY start_time
    `);

    console.log(`Total slots found: ${slotsResult.rows.length}\n`);

    // Group by time of day
    let morning = [];
    let afternoon = [];
    let evening = [];

    for (const slot of slotsResult.rows) {
      const hour = parseInt(slot.hour);
      const timeStr = slot.start_time.slice(0, 5);
      const slotInfo = {
        time: timeStr,
        id: slot.id,
        available: slot.is_available,
        created: slot.created_at
      };

      if (hour < 12) {
        morning.push(slotInfo);
      } else if (hour < 18) {
        afternoon.push(slotInfo);
      } else {
        evening.push(slotInfo);
      }
    }

    console.log('🌅 Morning Slots (before 12:00):');
    if (morning.length === 0) {
      console.log('   ❌ NO MORNING SLOTS FOUND');
    } else {
      morning.forEach(s => {
        console.log(`   ${s.available ? '✅' : '❌'} ${s.time} - ${s.available ? 'Available' : 'Booked'}`);
      });
    }

    console.log('\n☀️  Afternoon Slots (12:00-17:59):');
    if (afternoon.length === 0) {
      console.log('   ⚠️  No afternoon slots');
    } else {
      afternoon.forEach(s => {
        console.log(`   ${s.available ? '✅' : '❌'} ${s.time} - ${s.available ? 'Available' : 'Booked'}`);
      });
    }

    console.log('\n🌙 Evening Slots (18:00+):');
    if (evening.length === 0) {
      console.log('   ⚠️  No evening slots');
    } else {
      evening.forEach(s => {
        console.log(`   ${s.available ? '✅' : '❌'} ${s.time} - ${s.available ? 'Available' : 'Booked'}`);
      });
    }

    // Check if there are appointments blocking any slots
    console.log('\n\n📅 Step 2: Checking for appointments on Oct 28\n');

    const appointmentsResult = await client.query(`
      SELECT
        a.id,
        a.slot_id,
        a.status,
        dts.start_time,
        dts.end_time
      FROM appointments a
      JOIN doctor_time_slots dts ON a.slot_id = dts.id
      WHERE dts.doctor_id = 9
        AND dts.date = '2025-10-28'
      ORDER BY dts.start_time
    `);

    if (appointmentsResult.rows.length === 0) {
      console.log('✅ No appointments found for Oct 28 - all slots should be available');
    } else {
      console.log(`⚠️  Found ${appointmentsResult.rows.length} appointments:`);
      appointmentsResult.rows.forEach(apt => {
        console.log(`   ${apt.start_time.slice(0, 5)} - ${apt.status}`);
      });
    }

    // Summary
    console.log('\n\n📋 SUMMARY\n');
    console.log(`Total slots on Oct 28: ${slotsResult.rows.length}`);
    console.log(`Morning slots: ${morning.length}`);
    console.log(`Afternoon slots: ${afternoon.length}`);
    console.log(`Evening slots: ${evening.length}`);
    console.log(`Appointments: ${appointmentsResult.rows.length}`);

    if (morning.length > 0) {
      console.log('\n✅ MORNING SLOTS EXIST IN DATABASE');
      console.log('   If you cannot see them in the calendar, the issue is:');
      console.log('   1. Frontend not fetching the data correctly');
      console.log('   2. Frontend filtering out morning times');
      console.log('   3. Browser cache still showing old data');
    } else {
      console.log('\n❌ NO MORNING SLOTS IN DATABASE');
      console.log('   You need to create morning availability first');
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

diagnose()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
