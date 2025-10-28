import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

console.log('\n🔍 Checking Dr. Rodriguez Availability for Today\n');
console.log('='.repeat(80));

async function checkRodriguezSlots() {
  const client = await pool.connect();

  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD

    console.log(`\n📅 Current Time: ${now.toLocaleString('en-US', { timeZone: 'Europe/Paris' })}`);
    console.log(`📅 Today's Date: ${today}`);
    console.log(`⏰ Current Hour: ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`);

    // Find Dr. Rodriguez
    const doctorResult = await client.query(`
      SELECT d.id, d.user_id, u.first_name, u.last_name
      FROM doctors d
      INNER JOIN users u ON d.user_id = u.id
      WHERE u.first_name ILIKE '%rodriguez%' OR u.last_name ILIKE '%rodriguez%'
      LIMIT 1
    `);

    if (doctorResult.rows.length === 0) {
      console.log('❌ Dr. Rodriguez not found');
      client.release();
      await pool.end();
      process.exit(0);
    }

    const doctor = doctorResult.rows[0];
    console.log(`\n👨‍⚕️ Doctor Found: Dr. ${doctor.first_name} ${doctor.last_name} (ID: ${doctor.id})`);

    // Get all slots for today with appointment info
    const slotsResult = await client.query(`
      SELECT
        dts.id,
        dts.doctor_id,
        dts.date,
        dts.start_time,
        dts.end_time,
        dts.is_available,
        dts.locked_until,
        dts.locked_by,
        dts.created_at,
        a.id as appointment_id,
        a.patient_id,
        a.status as appointment_status,
        EXTRACT(HOUR FROM dts.start_time::time) as hour,
        EXTRACT(MINUTE FROM dts.start_time::time) as minute
      FROM doctor_time_slots dts
      LEFT JOIN appointments a ON dts.id = a.slot_id
      WHERE dts.doctor_id = $1
        AND dts.date = $2
      ORDER BY dts.start_time
    `, [doctor.id, today]);

    console.log(`\n📋 Total Slots for Today: ${slotsResult.rows.length}`);

    if (slotsResult.rows.length === 0) {
      console.log('   No slots found for today!');
    } else {
      console.log('\n');
      let availableCount = 0;
      let bookedCount = 0;
      let pastCount = 0;

      for (const slot of slotsResult.rows) {
        // Combine date and time to check if past
        const slotDateTime = new Date(`${slot.date}T${slot.start_time}`);
        const isPast = slotDateTime < now;
        const timeStr = `${Math.floor(slot.hour)}:${Math.floor(slot.minute).toString().padStart(2, '0')}`;
        const isBooked = slot.appointment_id !== null;

        let status = '';
        let icon = '';

        if (isPast) {
          status = 'PAST';
          icon = '⏰';
          pastCount++;
        } else if (isBooked) {
          status = 'BOOKED';
          icon = '❌';
          bookedCount++;
        } else if (!slot.is_available) {
          status = 'UNAVAILABLE (marked as unavailable)';
          icon = '🚫';
        } else {
          status = 'AVAILABLE';
          icon = '✅';
          availableCount++;
        }

        console.log(`${icon} Slot ID: ${slot.id}`);
        console.log(`   Date: ${slot.date}`);
        console.log(`   Time: ${timeStr} (${slot.start_time})`);
        console.log(`   Status: ${status}`);
        console.log(`   is_available flag: ${slot.is_available}`);
        if (isBooked) {
          console.log(`   Appointment ID: ${slot.appointment_id}`);
          console.log(`   Patient ID: ${slot.patient_id}`);
          console.log(`   Appointment Status: ${slot.appointment_status}`);
        }
        if (slot.locked_until) {
          console.log(`   Locked Until: ${slot.locked_until} (by ${slot.locked_by})`);
        }
        if (isPast) {
          console.log(`   ⚠️  This slot is in the past (before current time ${now.toISOString()})`);
        }
        console.log('');
      }

      console.log('📊 Summary:');
      console.log(`   ✅ Available (future): ${availableCount}`);
      console.log(`   ❌ Booked: ${bookedCount}`);
      console.log(`   ⏰ Past (unavailable): ${pastCount}`);
      console.log(`   📝 Total: ${slotsResult.rows.length}`);
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

checkRodriguezSlots()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
