import { db } from './server/db.ts';

console.log('🔍 Checking if James Rodriguez has any time slots...');

try {
  // Check if James has any time slots created
  const jamesSlots = await db.execute(`
    SELECT COUNT(*) as count 
    FROM doctor_time_slots 
    WHERE doctor_id = 1
  `);
  
  console.log('📊 Time slots count for James (doctor ID 1):', jamesSlots.rows[0]?.count);

  // Show all time slots in the system to see what's there
  const allSlots = await db.execute(`
    SELECT doctor_id, date, start_time, end_time, is_available 
    FROM doctor_time_slots 
    ORDER BY doctor_id, date, start_time
    LIMIT 20
  `);
  
  console.log('📅 All time slots in database:');
  console.table(allSlots.rows);

  // Check the exact structure of the table
  const structure = await db.execute(`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'doctor_time_slots'
    ORDER BY ordinal_position
  `);
  
  console.log('🏗️ doctor_time_slots table structure:');
  console.table(structure.rows);

} catch (error) {
  console.error('❌ Error:', error);
}

process.exit(0);