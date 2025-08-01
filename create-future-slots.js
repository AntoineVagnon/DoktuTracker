import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { doctorTimeSlots } from './server/schema.js';

const sql = postgres(process.env.DATABASE_URL);
const db = drizzle(sql);

async function createFutureSlots() {
  try {
    const doctorId = 9; // Dr. James Rodriguez
    const slots = [];
    const today = new Date();
    
    // Create slots for the next 7 days
    for (let day = 1; day <= 7; day++) {
      const date = new Date(today);
      date.setDate(date.getDate() + day);
      const dateStr = date.toISOString().split('T')[0];
      
      // Create morning slots (9:00, 9:30, 10:00, 10:30, 11:00)
      const morningTimes = ['09:00:00', '09:30:00', '10:00:00', '10:30:00', '11:00:00'];
      
      // Create afternoon slots (14:00, 14:30, 15:00, 15:30, 16:00)
      const afternoonTimes = ['14:00:00', '14:30:00', '15:00:00', '15:30:00', '16:00:00'];
      
      [...morningTimes, ...afternoonTimes].forEach((startTime, index) => {
        const [hours, minutes] = startTime.split(':');
        const endHours = parseInt(hours);
        const endMinutes = parseInt(minutes) + 30;
        const endTime = `${endHours}:${endMinutes < 10 ? '0' : ''}${endMinutes}:00`;
        
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
    
    // Insert slots
    await db.insert(doctorTimeSlots).values(slots);
    
    console.log('✅ Successfully created future slots!');
    
    // Show first few slots
    console.log('\nFirst 5 slots created:');
    slots.slice(0, 5).forEach(slot => {
      console.log(`- ${slot.date} ${slot.startTime} - ${slot.endTime}`);
    });
    
  } catch (error) {
    console.error('Error creating slots:', error);
  } finally {
    await sql.end();
  }
}

createFutureSlots();