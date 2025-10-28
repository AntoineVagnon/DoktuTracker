import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

console.log('\n🧪 Testing Evening Slot Creation for Tomorrow\n');
console.log('='.repeat(80));

async function testCreateEveningSlotTomorrow() {
  const client = await pool.connect();

  try {
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
    console.log(`\n👨‍⚕️ Testing slot creation for: Dr. ${doctor.first_name} ${doctor.last_name} (ID: ${doctor.id})`);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];

    // Test evening slots - 20:00-20:30 and 20:30-21:00
    const eveningSlots = [
      {
        doctor_id: doctor.id,
        date: tomorrowDate,
        start_time: '20:00:00',
        end_time: '20:30:00',
        is_available: true
      },
      {
        doctor_id: doctor.id,
        date: tomorrowDate,
        start_time: '20:30:00',
        end_time: '21:00:00',
        is_available: true
      }
    ];

    console.log(`\n📝 Creating 2 evening slots for tomorrow (${tomorrowDate}):`);
    console.log('   - 20:00-20:30 (8:00 PM - 8:30 PM)');
    console.log('   - 20:30-21:00 (8:30 PM - 9:00 PM)');

    for (const slot of eveningSlots) {
      console.log(`\n🚀 Creating slot: ${slot.start_time}...`);
      const result = await client.query(`
        INSERT INTO doctor_time_slots (doctor_id, date, start_time, end_time, is_available)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [slot.doctor_id, slot.date, slot.start_time, slot.end_time, slot.is_available]);

      console.log(`✅ Created slot ID: ${result.rows[0].id}`);
    }

    console.log('\n✅ SUCCESS! Evening slots created for tomorrow.');
    console.log('\n📋 Now check the patient-facing doctor profile to see if these slots appear!');
    console.log(`   Visit: https://web-production-b2ce.up.railway.app/doctor/${doctor.id}`);

    client.release();

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Error details:', error);
    client.release();
    await pool.end();
    process.exit(1);
  }

  console.log('\n' + '='.repeat(80));
  await pool.end();
}

testCreateEveningSlotTomorrow()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
