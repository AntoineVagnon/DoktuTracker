import { db } from './server/db.ts';

console.log('🔍 Debug: Finding the actual structure and IDs...');

try {
  // Check the exact structure of tables and mappings
  console.log('📊 Checking doctors table structure:');
  const doctorsStructure = await db.execute(`
    SELECT d.id as doctor_id, d.user_id, u.id as user_id_check, u.email 
    FROM doctors d 
    JOIN users u ON d.user_id = u.id 
    WHERE u.email = 'james.rodriguez@doku.com'
  `);
  console.table(doctorsStructure);

  // Check what type of ID the doctors table actually uses
  console.log('🏗️ Doctors table column structure:');
  const doctorsColumns = await db.execute(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_name = 'doctors' AND column_name IN ('id', 'user_id')
    ORDER BY column_name
  `);
  console.table(doctorsColumns);

  // Check doctor_time_slots table structure
  console.log('🏗️ doctor_time_slots table column structure:');  
  const timeSlotsColumns = await db.execute(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_name = 'doctor_time_slots' 
    ORDER BY ordinal_position
  `);
  console.table(timeSlotsColumns);

  // Check if there are any existing time slots and their doctor_id format
  console.log('📅 Existing time slots:');
  const existingSlots = await db.execute(`
    SELECT doctor_id, date, start_time, end_time 
    FROM doctor_time_slots 
    LIMIT 5
  `);
  console.table(existingSlots);

} catch (error) {
  console.error('❌ Error:', error);
}

process.exit(0);