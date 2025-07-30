import { db } from './server/db.ts';

console.log('🔧 Creating test availability for James Rodriguez...');

try {
  // First, get James's actual doctor UUID from the database
  const jamesQuery = `
    SELECT d.id, u.email, u.first_name, u.last_name 
    FROM doctors d 
    JOIN users u ON d.user_id = u.id 
    WHERE u.email = 'james.rodriguez@doktu.com'
  `;
  
  const jamesResult = await db.execute(jamesQuery);
  
  if (jamesResult.rows.length === 0) {
    console.log('❌ James Rodriguez not found in database');
    process.exit(1);
  }
  
  const james = jamesResult.rows[0];
  console.log('👨‍⚕️ Found James:', james);
  
  // Create some test availability slots for tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD format
  
  console.log(`📅 Creating availability for ${tomorrowStr}`);
  
  // Create morning slots
  const slots = [
    { start_time: '09:00', end_time: '09:30' },
    { start_time: '09:30', end_time: '10:00' },
    { start_time: '10:00', end_time: '10:30' },
    { start_time: '14:00', end_time: '14:30' },
    { start_time: '14:30', end_time: '15:00' },
  ];
  
  for (const slot of slots) {
    try {
      const insertQuery = `
        INSERT INTO doctor_time_slots (doctor_id, date, start_time, end_time, is_available)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT DO NOTHING
      `;
      
      await db.execute(insertQuery, [
        james.id,
        tomorrowStr,
        slot.start_time,
        slot.end_time,
        true
      ]);
      
      console.log(`✅ Created slot: ${slot.start_time} - ${slot.end_time}`);
    } catch (slotError) {
      console.log(`⚠️ Slot creation failed for ${slot.start_time}: ${slotError.message}`);
    }
  }
  
  // Verify the slots were created
  const verifyQuery = `
    SELECT COUNT(*) as count 
    FROM doctor_time_slots 
    WHERE doctor_id = $1 AND date = $2
  `;
  
  const verifyResult = await db.execute(verifyQuery, [james.id, tomorrowStr]);
  console.log(`📊 Total slots created: ${verifyResult.rows[0]?.count || 0}`);

} catch (error) {
  console.error('❌ Error:', error);
}

process.exit(0);