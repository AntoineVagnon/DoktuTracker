import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

console.log('\n🧪 Testing Evening Slot Creation Directly\n');
console.log('='.repeat(80));

async function testCreateEveningSlot() {
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

    const today = new Date().toISOString().split('T')[0];

    // Test slot data - evening slot 18:00-18:30
    const testSlot = {
      doctor_id: doctor.id,
      date: today,
      start_time: '18:00:00',
      end_time: '18:30:00',
      is_available: true
    };

    console.log('\n📝 Test Slot Data:');
    console.log(JSON.stringify(testSlot, null, 2));

    // Try to insert
    console.log('\n🚀 Attempting to insert...');
    const result = await client.query(`
      INSERT INTO doctor_time_slots (doctor_id, date, start_time, end_time, is_available)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [testSlot.doctor_id, testSlot.date, testSlot.start_time, testSlot.end_time, testSlot.is_available]);

    console.log('\n✅ SUCCESS! Slot created:');
    console.log(JSON.stringify(result.rows[0], null, 2));

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

testCreateEveningSlot()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
