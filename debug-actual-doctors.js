import { db } from './server/db.ts';

console.log('🔍 Checking actual doctor IDs in database...');

try {
  // Check actual doctor data with raw SQL to see real IDs
  const doctorsRaw = await db.execute(`
    SELECT d.id as doctor_id, u.email, u.first_name, u.last_name 
    FROM doctors d 
    JOIN users u ON d.user_id = u.id 
    WHERE u.email LIKE '%james%'
  `);
  
  console.log('👨‍⚕️ James Rodriguez actual doctor data:');
  console.table(doctorsRaw.rows);

  // Check time slots with raw SQL
  const slotsRaw = await db.execute(`
    SELECT * FROM doctor_time_slots 
    WHERE doctor_id = (
      SELECT d.id FROM doctors d 
      JOIN users u ON d.user_id = u.id 
      WHERE u.email = 'james.rodriguez@doktu.com'
    )
  `);
  
  console.log('📅 Time slots for James:');
  console.table(slotsRaw.rows);

  // Show all doctors with their actual IDs
  const allDoctors = await db.execute(`
    SELECT d.id, u.email, u.first_name, u.last_name
    FROM doctors d 
    JOIN users u ON d.user_id = u.id
  `);
  
  console.log('👥 All doctors with actual IDs:');
  console.table(allDoctors.rows);

} catch (error) {
  console.error('❌ Error:', error);
}

process.exit(0);