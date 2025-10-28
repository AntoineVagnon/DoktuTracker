import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

console.log('\n🗑️  Deleting Slots for This Week (Oct 27 - Nov 2) for Dr. Rodriguez\n');
console.log('='.repeat(80));

async function deleteWeekSlots() {
  const client = await pool.connect();

  try {
    // First, check which slots would be deleted and if they have appointments
    const checkResult = await client.query(`
      SELECT 
        dts.id,
        dts.date,
        dts.start_time,
        COUNT(a.id) as appointment_count
      FROM doctor_time_slots dts
      LEFT JOIN appointments a ON dts.id = a.slot_id
      WHERE dts.doctor_id = 9 
        AND dts.date >= '2025-10-27' 
        AND dts.date <= '2025-11-02'
      GROUP BY dts.id, dts.date, dts.start_time
      ORDER BY dts.date, dts.start_time
    `);
    
    console.log(`\n📊 Found ${checkResult.rows.length} slots for this week`);
    
    const slotsWithAppointments = checkResult.rows.filter(r => r.appointment_count > 0);
    const slotsWithoutAppointments = checkResult.rows.filter(r => r.appointment_count === 0);
    
    console.log(`   - ${slotsWithAppointments.length} slots have appointments (can't delete)`);
    console.log(`   - ${slotsWithoutAppointments.length} slots are free (can delete)`);
    
    if (slotsWithAppointments.length > 0) {
      console.log('\n⚠️  Slots with appointments:');
      slotsWithAppointments.forEach(s => {
        console.log(`     ${s.date} ${s.start_time} - ${s.appointment_count} appointment(s)`);
      });
    }
    
    if (slotsWithoutAppointments.length === 0) {
      console.log('\n✅ No free slots to delete');
      client.release();
      await pool.end();
      process.exit(0);
    }
    
    // Delete only slots without appointments
    const deleteResult = await client.query(`
      DELETE FROM doctor_time_slots 
      WHERE doctor_id = 9 
        AND date >= '2025-10-27' 
        AND date <= '2025-11-02'
        AND id NOT IN (
          SELECT DISTINCT slot_id 
          FROM appointments 
          WHERE slot_id IS NOT NULL
        )
      RETURNING id, date, start_time
    `);
    
    console.log(`\n✅ Deleted ${deleteResult.rowCount} free slots:`);
    const deletedByDate = {};
    deleteResult.rows.forEach(r => {
      if (!deletedByDate[r.date]) deletedByDate[r.date] = 0;
      deletedByDate[r.date]++;
    });
    
    Object.keys(deletedByDate).sort().forEach(date => {
      console.log(`   ${date}: ${deletedByDate[date]} slots`);
    });
    
    console.log('\n🔄 Now refresh your doctor calendar - this week should show minimal slots');

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

deleteWeekSlots()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
