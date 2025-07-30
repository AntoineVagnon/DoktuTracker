import { db } from './server/db.ts';

console.log('🔍 Testing direct query for James Rodriguez time slots...');

try {
  // Test if James Rodriguez (doctor ID 1) has any time slots
  const testQuery = `
    SELECT 
      d.id as doctor_id,
      u.email,
      COUNT(ts.id) as slot_count
    FROM doctors d
    JOIN users u ON d.user_id = u.id
    LEFT JOIN doctor_time_slots ts ON ts.doctor_id::text = d.id::text
    WHERE d.id = 1
    GROUP BY d.id, u.email
  `;
  
  const result = await db.execute(testQuery);
  console.log('📊 Query result:');
  console.table(result.rows);

  // Also check what's actually in doctor_time_slots
  const allSlots = await db.execute(`
    SELECT doctor_id, date, start_time, end_time, is_available 
    FROM doctor_time_slots 
    LIMIT 10
  `);
  
  console.log('📅 Sample time slots in database:');
  console.table(allSlots.rows);

  // Check James's actual UUID
  const jamesUuid = await db.execute(`
    SELECT d.id, u.email, u.first_name, u.last_name 
    FROM doctors d 
    JOIN users u ON d.user_id = u.id 
    WHERE u.email = 'james.rodriguez@doktu.com'
  `);
  
  console.log('👨‍⚕️ James actual doctor record:');
  console.table(jamesUuid.rows);

} catch (error) {
  console.error('❌ Error:', error);
}

process.exit(0);