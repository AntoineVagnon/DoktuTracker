import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

console.log('\n🔍 Detailed Check for Oct 28 Slots\n');
console.log('='.repeat(80));

async function checkDetailed() {
  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT 
        dts.id,
        dts.date,
        dts.start_time,
        dts.is_available,
        a.id as appointment_id,
        a.status as appointment_status
      FROM doctor_time_slots dts
      LEFT JOIN appointments a ON dts.id = a.slot_id
      WHERE dts.doctor_id = 9 
        AND dts.date = '2025-10-28'
      ORDER BY dts.start_time
    `);
    
    console.log(`\n📋 Oct 28 Slots (${result.rows.length} total):\n`);
    
    for (const row of result.rows) {
      const hasApt = row.appointment_id ? `📅 Apt #${row.appointment_id} (${row.appointment_status})` : '✅ No appointment';
      const avail = row.is_available ? 'Available' : 'Not Available';
      console.log(`${row.start_time} - ${avail} - ${hasApt}`);
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

checkDetailed()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
