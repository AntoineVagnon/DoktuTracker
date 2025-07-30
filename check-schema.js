import { db } from './server/db.ts';

console.log('🔍 Checking actual database schema...');

try {
  // Check the actual structure of doctor_time_slots table
  const result = await db.execute(`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'doctor_time_slots' 
    ORDER BY ordinal_position;
  `);
  
  console.log('📊 doctor_time_slots table schema:');
  console.table(result.rows);

  // Also check doctors table
  const doctorsResult = await db.execute(`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'doctors' 
    ORDER BY ordinal_position;
  `);
  
  console.log('📊 doctors table schema:');
  console.table(doctorsResult.rows);

  // Check if any time slots exist
  const slotsCount = await db.execute(`SELECT COUNT(*) as count FROM doctor_time_slots;`);
  console.log('📅 Total time slots in database:', slotsCount.rows[0]);

  // Check actual data types being used
  const sampleSlot = await db.execute(`SELECT * FROM doctor_time_slots LIMIT 1;`);
  console.log('📝 Sample time slot:', sampleSlot.rows[0]);

} catch (error) {
  console.error('❌ Error:', error);
}

process.exit(0);