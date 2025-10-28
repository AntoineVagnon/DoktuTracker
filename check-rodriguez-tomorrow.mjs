import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

console.log('\n🔍 Checking Dr. Rodriguez Availability for Tomorrow\n');
console.log('='.repeat(80));

async function checkRodriguezSlotsTomorrow() {
  const client = await pool.connect();

  try {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD

    console.log(`\n📅 Current Time: ${now.toLocaleString('en-US', { timeZone: 'Europe/Paris' })}`);
    console.log(`📅 Tomorrow's Date: ${tomorrowDate}`);

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

    // Get all slots for tomorrow
    const slotsResult = await client.query(`
      SELECT
        dts.id,
        dts.doctor_id,
        dts.date,
        dts.start_time,
        dts.end_time,
        dts.is_available,
        EXTRACT(HOUR FROM dts.start_time::time) as hour,
        EXTRACT(MINUTE FROM dts.start_time::time) as minute
      FROM doctor_time_slots dts
      WHERE dts.doctor_id = $1
        AND dts.date = $2
      ORDER BY dts.start_time
    `, [doctor.id, tomorrowDate]);

    console.log(`\n📋 Total Slots for Tomorrow: ${slotsResult.rows.length}`);

    if (slotsResult.rows.length === 0) {
      console.log('   ❌ No slots found for tomorrow!');
      console.log('   ⚠️  This is the problem - doctor needs to create slots for tomorrow including evening slots!');
    } else {
      console.log('\n');
      let morningCount = 0;
      let afternoonCount = 0;
      let eveningCount = 0;

      for (const slot of slotsResult.rows) {
        const timeStr = `${Math.floor(slot.hour)}:${Math.floor(slot.minute).toString().padStart(2, '0')}`;
        const hour = Math.floor(slot.hour);

        if (hour < 12) {
          morningCount++;
        } else if (hour < 18) {
          afternoonCount++;
        } else {
          eveningCount++;
        }

        const icon = slot.is_available ? '✅' : '❌';
        console.log(`${icon} ${timeStr} - ${slot.is_available ? 'AVAILABLE' : 'BOOKED'}`);
      }

      console.log('\n📊 Summary by Time of Day:');
      console.log(`   🌅 Morning (before 12:00): ${morningCount}`);
      console.log(`   ☀️  Afternoon (12:00-17:59): ${afternoonCount}`);
      console.log(`   🌙 Evening (18:00+): ${eveningCount}`);
      console.log(`   📝 Total: ${slotsResult.rows.length}`);

      if (eveningCount === 0) {
        console.log('\n⚠️  NO EVENING SLOTS (18:00+) found for tomorrow!');
        console.log('   This confirms the issue - doctor needs to create evening availability.');
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

checkRodriguezSlotsTomorrow()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
