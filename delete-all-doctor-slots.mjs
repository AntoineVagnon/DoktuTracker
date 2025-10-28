import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

console.log('\n🗑️  Deleting All Slots for Dr. Rodriguez (ID: 9)\n');
console.log('='.repeat(80));

async function deleteAllSlots() {
  const client = await pool.connect();

  try {
    // First, count how many slots exist
    const countResult = await client.query(`
      SELECT COUNT(*) FROM doctor_time_slots WHERE doctor_id = 9
    `);
    
    const slotCount = parseInt(countResult.rows[0].count);
    console.log(`\n📊 Found ${slotCount} slots for doctor 9`);
    
    if (slotCount === 0) {
      console.log('   ✅ No slots to delete');
      client.release();
      await pool.end();
      process.exit(0);
    }
    
    // Delete all slots
    const deleteResult = await client.query(`
      DELETE FROM doctor_time_slots WHERE doctor_id = 9
      RETURNING id
    `);
    
    console.log(`\n✅ Deleted ${deleteResult.rowCount} slots`);
    console.log('\n🔄 Now refresh your doctor calendar - it should be completely empty');

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

deleteAllSlots()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
