// Script to restore missing time slots for July 31, 2025 for Dr. James Rodriguez
const { createClient } = require('@supabase/supabase-js');

// Use environment variable
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable not found');
  process.exit(1);
}

console.log('🔗 Connecting to database...');

async function restoreJuly31Slots() {
  console.log('🔧 Restoring missing time slots for July 31, 2025...');
  
  try {
    const doctorId = 9; // Dr. James Rodriguez
    const date = '2025-07-31';
    
    // First, check existing slots for this date
    const existingSlots = await sql`
      SELECT "startTime", "isAvailable" 
      FROM "timeSlots" 
      WHERE "doctorId" = ${doctorId} AND date = ${date}
      ORDER BY "startTime"
    `;
    
    console.log(`📋 Existing slots for ${date}:`, existingSlots);
    
    // Define the complete set of time slots that should exist
    const timeSlots = [
      { startTime: '09:00:00', endTime: '09:30:00', isAvailable: true },
      { startTime: '09:30:00', endTime: '10:00:00', isAvailable: true },
      { startTime: '10:00:00', endTime: '10:30:00', isAvailable: true },
      { startTime: '10:30:00', endTime: '11:00:00', isAvailable: true },
      { startTime: '11:00:00', endTime: '11:30:00', isAvailable: true },
      { startTime: '11:30:00', endTime: '12:00:00', isAvailable: true },
      { startTime: '14:00:00', endTime: '14:30:00', isAvailable: false }, // Already booked
      { startTime: '14:30:00', endTime: '15:00:00', isAvailable: false }, // Already booked
      { startTime: '15:00:00', endTime: '15:30:00', isAvailable: true },
      { startTime: '15:30:00', endTime: '16:00:00', isAvailable: true },
      { startTime: '16:00:00', endTime: '16:30:00', isAvailable: true },
      { startTime: '16:30:00', endTime: '17:00:00', isAvailable: true },
    ];
    
    // Get existing start times to avoid duplicates
    const existingStartTimes = new Set(existingSlots.map(slot => slot.startTime));
    
    // Insert missing slots
    let insertedCount = 0;
    for (const slot of timeSlots) {
      if (!existingStartTimes.has(slot.startTime)) {
        await sql`
          INSERT INTO "timeSlots" (
            "doctorId", 
            date, 
            "startTime", 
            "endTime", 
            "isAvailable", 
            "createdAt", 
            "updatedAt"
          ) VALUES (
            ${doctorId},
            ${date},
            ${slot.startTime},
            ${slot.endTime},
            ${slot.isAvailable},
            NOW(),
            NOW()
          )
        `;
        insertedCount++;
        console.log(`✅ Added slot: ${slot.startTime} (${slot.isAvailable ? 'available' : 'unavailable'})`);
      } else {
        console.log(`⏭️  Slot already exists: ${slot.startTime}`);
      }
    }
    
    console.log(`🎉 Successfully restored ${insertedCount} missing time slots for ${date}`);
    
    // Verify the result
    const finalSlots = await sql`
      SELECT "startTime", "isAvailable" 
      FROM "timeSlots" 
      WHERE "doctorId" = ${doctorId} AND date = ${date}
      ORDER BY "startTime"
    `;
    
    console.log(`📋 Final slots for ${date}:`, finalSlots);
    console.log(`📊 Total slots: ${finalSlots.length}`);
    
  } catch (error) {
    console.error('❌ Error restoring slots:', error);
  } finally {
    await sql.end();
  }
}

restoreJuly31Slots();