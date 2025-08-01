import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { doctorTimeSlots } from './shared/schema.js';

const sql = postgres(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function addFutureSlots() {
  try {
    const doctorId = 9; // Dr. James Rodriguez
    const today = new Date('2025-08-01'); // Current date based on logs
    
    const slots = [];
    
    // Create slots for the next 7 days starting from August 3rd
    for (let day = 2; day <= 8; day++) {
      const date = new Date(today);
      date.setDate(date.getDate() + day);
      const dateStr = date.toISOString().split('T')[0];
      
      // Morning slots
      const morningSlots = [
        { startTime: '09:00:00', endTime: '09:30:00' },
        { startTime: '09:30:00', endTime: '10:00:00' },
        { startTime: '10:00:00', endTime: '10:30:00' },
        { startTime: '10:30:00', endTime: '11:00:00' },
        { startTime: '11:00:00', endTime: '11:30:00' }
      ];
      
      // Afternoon slots
      const afternoonSlots = [
        { startTime: '14:00:00', endTime: '14:30:00' },
        { startTime: '14:30:00', endTime: '15:00:00' },
        { startTime: '15:00:00', endTime: '15:30:00' },
        { startTime: '15:30:00', endTime: '16:00:00' },
        { startTime: '16:00:00', endTime: '16:30:00' }
      ];
      
      [...morningSlots, ...afternoonSlots].forEach(({ startTime, endTime }) => {
        slots.push({
          doctorId,
          date: dateStr,
          startTime,
          endTime,
          isAvailable: true
        });
      });
    }
    
    console.log(`Creating ${slots.length} future slots for Dr. James Rodriguez...`);
    console.log('First 5 slots:', slots.slice(0, 5).map(s => `${s.date} ${s.startTime}`));
    
    // Insert the slots
    await db.insert(doctorTimeSlots).values(slots);
    
    console.log('✅ Successfully created future slots!');
    
  } catch (error) {
    console.error('Error creating slots:', error);
  } finally {
    await sql.end();
  }
}

addFutureSlots();