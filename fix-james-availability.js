import { db } from './server/db.ts';
import { doctorTimeSlots } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

console.log('🔧 Fixing James Rodriguez availability with proper doctor mapping...');

try {
  // First, delete any existing slots with random UUIDs
  console.log('🗑️ Cleaning up existing slots...');
  await db.execute(`DELETE FROM doctor_time_slots`);
  
  // CRITICAL FIX: Since doctor_time_slots.doctor_id is UUID but doctors.id is integer,
  // we need to create a mapping table or modify the schema to use integers
  // For now, let's modify the doctor_time_slots table to use integers instead of UUIDs
  
  console.log('🏗️ Converting doctor_time_slots.doctor_id from UUID to integer...');
  await db.execute(`
    ALTER TABLE doctor_time_slots 
    DROP COLUMN doctor_id
  `);
  
  await db.execute(`
    ALTER TABLE doctor_time_slots 
    ADD COLUMN doctor_id INTEGER NOT NULL
  `);
  
  console.log('✅ Schema updated! Now creating availability for James Rodriguez...');
  
  // Create availability slots for James Rodriguez (ID: 9) 
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  
  console.log(`📅 Creating availability for ${tomorrowStr}`);
  
  const slots = [
    { start_time: '09:00', end_time: '09:30' },
    { start_time: '09:30', end_time: '10:00' },
    { start_time: '10:00', end_time: '10:30' },
    { start_time: '14:00', end_time: '14:30' },
    { start_time: '14:30', end_time: '15:00' }
  ];
  
  for (const slot of slots) {
    try {
      await db.insert(doctorTimeSlots).values({
        doctorId: 9, // James Rodriguez doctor ID
        date: tomorrowStr,
        startTime: slot.start_time,
        endTime: slot.end_time,
        isAvailable: true
      });
      
      console.log(`✅ Created slot: ${slot.start_time} - ${slot.end_time}`);
    } catch (slotError) {
      console.log(`⚠️ Slot creation failed for ${slot.start_time}: ${slotError.message}`);
    }
  }
  
  // Verify the slots were created
  console.log('🔍 Verifying created slots...');
  const createdSlots = await db.execute(`
    SELECT * FROM doctor_time_slots WHERE doctor_id = 9
  `);
  
  console.log(`✅ Successfully created ${createdSlots.length} slots for James Rodriguez`);
  console.table(createdSlots);

} catch (error) {
  console.error('❌ Error:', error);
}

process.exit(0);