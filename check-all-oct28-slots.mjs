import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

console.log('\n🔍 Checking ALL Slots for Oct 28, 2025\n');
console.log('='.repeat(80));

async function checkAllSlots() {
  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT id, date, start_time, end_time, is_available, created_at
      FROM doctor_time_slots
      WHERE doctor_id = 9 AND date = '2025-10-28'
      ORDER BY start_time
    `);

    console.log(`\n📋 Total Slots in Database: ${result.rows.length}\n`);

    for (const slot of result.rows) {
      const time = slot.start_time.slice(0, 5);
      const created = new Date(slot.created_at).toLocaleString();
      console.log(`${time} - ${slot.is_available ? 'Available' : 'Booked'} (created: ${created})`);
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

checkAllSlots()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
