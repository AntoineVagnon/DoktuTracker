// Create future slots directly in the database
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { doctorTimeSlots } from './shared/schema.js';

const sql = postgres(process.env.DATABASE_URL);
const db = drizzle(sql);

async function createFutureSlots() {
  try {
    const doctorId = 9; // Dr. James Rodriguez
    const slots = [];
    
    // Create slots for August 3rd to August 9th
    for (let dayOffset = 2; dayOffset <= 8; dayOffset++) {
      const date = new Date('2025-08-01');
      date.setDate(date.getDate() + dayOffset);
      const dateStr = date.toISOString().split('T')[0];
      
      // Morning slots
      const times = [
        { start: '09:00:00', end: '09:30:00' },
        { start: '09:30:00', end: '10:00:00' },
        { start: '10:00:00', end: '10:30:00' },
        { start: '10:30:00', end: '11:00:00' },
        { start: '11:00:00', end: '11:30:00' },
        { start: '11:30:00', end: '12:00:00' },
        // Afternoon slots
        { start: '14:00:00', end: '14:30:00' },
        { start: '14:30:00', end: '15:00:00' },
        { start: '15:00:00', end: '15:30:00' },
        { start: '15:30:00', end: '16:00:00' },
        { start: '16:00:00', end: '16:30:00' },
        { start: '16:30:00', end: '17:00:00' }
      ];
      
      for (const { start, end } of times) {
        slots.push({
          doctorId,
          date: dateStr,
          startTime: start,
          endTime: end,
          isAvailable: true
        });
      }
    }
    
    console.log(`Creating ${slots.length} slots from ${slots[0].date} to ${slots[slots.length - 1].date}`);
    console.log('Sample slots:', slots.slice(0, 3));
    
    // Insert the slots
    const result = await db.insert(doctorTimeSlots).values(slots);
    console.log(`✅ Successfully created ${slots.length} future slots!`);
    
  } catch (error) {
    console.error('❌ Error creating slots:', error);
  } finally {
    await sql.end();
  }
}

createFutureSlots();